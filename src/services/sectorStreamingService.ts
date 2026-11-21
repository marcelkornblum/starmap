/**
 * Sector Streaming Orchestrator and GPU Upload Manager.
 *
 * Coordinates camera tracking, ring selection, buffer caching,
 * and rate-limited GPU uploads within device hardware budgets.
 */

import { DEFAULT_SECTOR_SIZE_PC } from '../utils/sectorMath';
import type { DecodedBinarySector } from '../utils/binarySectorCodec';
import { getDeviceTierBudget, canAllocateSector, type DeviceTierBudget } from './deviceTierService';
import {
  DEFAULT_MAX_CATALOG_RADIUS_PC,
  computeSectorRings,
  getSectorCenterFromId,
  type DisposableGpuResource,
  type CachedSectorEntry,
  type SectorRingPlan,
  type SectorStreamingTelemetry,
  type SectorStreamingOptions,
} from './sectorSelection';
import { SectorBufferCache, fetchSectorBinaryBuffer } from './sectorBufferCache';

const EMPTY_UPLOADS: readonly string[] = Object.freeze([]);

export class SectorStreamingManager {
  private readonly budget: DeviceTierBudget;
  private readonly sectorSizePc: number;
  private readonly maxCatalogRadiusPc: number;
  private readonly gpuResourceFactory: (decoded: DecodedBinarySector, sectorId: string) => DisposableGpuResource;
  private readonly bufferCache: SectorBufferCache;

  private readonly onSectorsLoadedListeners = new Set<() => void>();
  private activeSet = new Set<string>();
  private prefetchSet = new Set<string>();
  private pendingUploadQueue: string[] = [];
  private tick = 0;
  private isDisposed = false;

  constructor(options?: SectorStreamingOptions) {
    this.budget = options?.budget ?? getDeviceTierBudget();
    this.sectorSizePc = options?.sectorSizePc ?? DEFAULT_SECTOR_SIZE_PC;
    this.maxCatalogRadiusPc = options?.maxCatalogRadiusPc ?? DEFAULT_MAX_CATALOG_RADIUS_PC;
    this.gpuResourceFactory = options?.gpuResourceFactory ?? (() => ({ dispose: () => {} }));
    this.bufferCache = new SectorBufferCache(options?.fetcher ?? fetchSectorBinaryBuffer);
  }

  async updateCameraPosition(positionPc: readonly [number, number, number]): Promise<SectorRingPlan> {
    if (this.isDisposed) throw new Error('SectorStreamingManager has been disposed');

    const posX = Number.isFinite(positionPc?.[0]) ? positionPc[0] : 0;
    const posY = Number.isFinite(positionPc?.[1]) ? positionPc[1] : 0;
    const posZ = Number.isFinite(positionPc?.[2]) ? positionPc[2] : 0;

    this.tick++;
    const plan = computeSectorRings([posX, posY, posZ], this.budget, {
      sectorSizePc: this.sectorSizePc,
      maxCatalogRadiusPc: this.maxCatalogRadiusPc,
    });

    this.activeSet = new Set(plan.activeSectorIds);
    this.prefetchSet = new Set(plan.prefetchSectorIds);
    this.bufferCache.demoteDepartedActive(this.activeSet);
    this.bufferCache.clearDistances();
    this.pendingUploadQueue = this.pendingUploadQueue.filter((id) => this.activeSet.has(id));

    const fetchPromises: Promise<DecodedBinarySector | null>[] = [];
    const onNewlyCached = (sectorId: string) => {
      if (this.activeSet.has(sectorId) && !this.pendingUploadQueue.includes(sectorId)) {
        this.pendingUploadQueue.push(sectorId);
      }
      const evicted = this.bufferCache.enforceLruCapacity(this.budget.lruCacheMaxSectors, this.activeSet);
      for (const ev of evicted) {
        const qIdx = this.pendingUploadQueue.indexOf(ev);
        if (qIdx !== -1) this.pendingUploadQueue.splice(qIdx, 1);
      }
    };

    const processRing = (sectorIds: readonly string[], priority: 'high' | 'low') => {
      for (const sectorId of sectorIds) {
        const center = getSectorCenterFromId(sectorId, this.sectorSizePc);
        const distSq = (posX - center[0]) ** 2 + (posY - center[1]) ** 2 + (posZ - center[2]) ** 2;
        this.bufferCache.setDistance(sectorId, distSq);

        const cached = this.bufferCache.get(sectorId);
        if (cached) {
          cached.lastAccessedTick = this.tick;
          cached.distanceSq = distSq;
          if (priority === 'high' && cached.state === 'decoded' && !this.pendingUploadQueue.includes(sectorId)) {
            this.pendingUploadQueue.push(sectorId);
          }
        } else if (!this.bufferCache.isMissing(sectorId)) {
          fetchPromises.push(
            this.bufferCache.fetchAndCacheSector(
              sectorId,
              priority,
              distSq,
              this.tick,
              () => this.activeSet.has(sectorId) || this.prefetchSet.has(sectorId),
              this.budget.lruCacheMaxSectors,
              onNewlyCached,
            ),
          );
        }
      }
    };

    processRing(plan.activeSectorIds, 'high');
    processRing(plan.prefetchSectorIds, 'low');

    await Promise.allSettled(fetchPromises);
    if (!this.isDisposed) this.notifyListeners();
    return plan;
  }

  processFrameUploads(maxUploads = this.budget.maxGpuUploadsPerFrame): string[] {
    if (this.isDisposed || maxUploads <= 0 || this.pendingUploadQueue.length === 0) {
      return EMPTY_UPLOADS as string[];
    }

    this.pendingUploadQueue.sort((a, b) => {
      const distA = this.bufferCache.get(a)?.distanceSq ?? Infinity;
      const distB = this.bufferCache.get(b)?.distanceSq ?? Infinity;
      return distA - distB;
    });

    const uploadedThisFrame: string[] = [];
    const remainingQueue: string[] = [];
    let currentActivePoints = this.bufferCache.getActivePointCount();
    let currentUploadedSectors = this.bufferCache.getUploadedSectorCount();
    let currentGpuBytes = this.bufferCache.getAllocatedGpuBytes();

    for (let i = 0; i < this.pendingUploadQueue.length; i++) {
      const sectorId = this.pendingUploadQueue[i]!;
      if (uploadedThisFrame.length >= maxUploads) {
        remainingQueue.push(sectorId);
        continue;
      }

      const entry = this.bufferCache.get(sectorId);
      if (!entry || entry.state === 'uploaded' || !this.activeSet.has(sectorId)) continue;

      const fitsPoints = currentActivePoints + entry.decoded.header.count <= this.budget.maxActivePoints;
      const canAllocate = canAllocateSector(this.budget, currentUploadedSectors, currentGpuBytes, entry.byteLength);

      if (fitsPoints && canAllocate) {
        entry.gpuResource = this.gpuResourceFactory(entry.decoded, entry.sectorId);
        entry.state = 'uploaded';
        currentActivePoints += entry.decoded.header.count;
        currentUploadedSectors++;
        currentGpuBytes += entry.byteLength;
        uploadedThisFrame.push(sectorId);
      } else {
        remainingQueue.push(sectorId);
      }
    }

    this.pendingUploadQueue = remainingQueue;
    if (uploadedThisFrame.length > 0) this.notifyListeners();
    return uploadedThisFrame;
  }

  getActiveDecodedSectors(): readonly DecodedBinarySector[] {
    return this.bufferCache.getActiveDecodedSectors(this.activeSet);
  }

  getUploadedEntries(): readonly CachedSectorEntry[] {
    return this.bufferCache.getUploadedEntries();
  }

  getCachedEntry(sectorId: string): CachedSectorEntry | undefined {
    return this.bufferCache.get(sectorId);
  }

  isActiveRingReady(): boolean {
    return this.bufferCache.isRingReady(this.activeSet);
  }

  hasPendingUploads(): boolean {
    return this.pendingUploadQueue.length > 0;
  }

  getTelemetry(): SectorStreamingTelemetry {
    return {
      tier: this.budget.tier,
      activeSectorCount: this.activeSet.size,
      uploadedSectorCount: this.bufferCache.getUploadedSectorCount(),
      cachedSectorCount: this.bufferCache.size,
      pendingUploadCount: this.pendingUploadQueue.length,
      inFlightFetchCount: this.bufferCache.inFlightCount,
      activePointCount: this.bufferCache.getActivePointCount(),
      allocatedGpuBytes: this.bufferCache.getAllocatedGpuBytes(),
      cachedRamBytes: this.bufferCache.getCachedRamBytes(),
      evictedCount: this.bufferCache.totalEvictedCount,
      disposedGpuCount: this.bufferCache.totalDisposedGpuCount,
    };
  }

  getActiveSectorQueryInputs(): readonly { readonly sectorId: string; readonly decoded: DecodedBinarySector }[] {
    return this.bufferCache.getActiveSectorQueryInputs(this.activeSet);
  }

  subscribe(listener: () => void): () => void {
    this.onSectorsLoadedListeners.add(listener);
    return () => this.onSectorsLoadedListeners.delete(listener);
  }

  private notifyListeners(): void {
    for (const listener of this.onSectorsLoadedListeners) {
      try {
        listener();
      } catch {
        // Prevent listener error from disrupting loop
      }
    }
  }

  dispose(): void {
    this.isDisposed = true;
    this.onSectorsLoadedListeners.clear();
    this.bufferCache.dispose();
    this.activeSet.clear();
    this.prefetchSet.clear();
    this.pendingUploadQueue = [];
  }
}
