/**
 * Sector Streaming and LRU Cache Management Service.
 *
 * Implements the Frontier-defined streaming state machine, ring hysteresis resolver,
 * staggered GPU upload queue, and memory-bounded LRU eviction.
 */

import * as THREE from 'three';
import {
  formatSectorId,
  getSectorBounds,
  getSectorCoordinate,
  DEFAULT_SECTOR_SIZE_PC,
} from '../utils/astroMath';
import {
  decodeBinarySector,
  type DecodedBinarySector,
} from '../utils/binarySectorCodec';
import {
  getDeviceTierBudget,
  canAllocateSector,
  type DeviceTierBudget,
  type DevicePerformanceTier,
} from './deviceTierService';
import { resolveDataUrl } from '../utils/url';

export interface DisposableGpuResource {
  dispose(): void;
}

export type SectorLifecycleState = 'fetching' | 'decoded' | 'uploaded' | 'missing';

export interface CachedSectorEntry {
  readonly sectorId: string;
  readonly decoded: DecodedBinarySector;
  readonly byteLength: number;
  state: 'decoded' | 'uploaded';
  gpuResource: DisposableGpuResource | null;
  lastAccessedTick: number;
  distanceSq: number;
}

export interface SectorRingPlan {
  readonly centerSectorId: string;
  readonly centerOrigin: readonly [number, number, number];
  /** Active 1-ring sectors sorted nearest-first, capped to budget.maxActiveSectors */
  readonly activeSectorIds: readonly string[];
  /** Outer prefetch ring sectors sorted nearest-first, capped to remaining LRU capacity */
  readonly prefetchSectorIds: readonly string[];
}

export interface SectorStreamingTelemetry {
  readonly tier: DevicePerformanceTier;
  readonly activeSectorCount: number;
  readonly uploadedSectorCount: number;
  readonly cachedSectorCount: number;
  readonly pendingUploadCount: number;
  readonly inFlightFetchCount: number;
  readonly activePointCount: number;
  readonly allocatedGpuBytes: number;
  readonly cachedRamBytes: number;
  readonly evictedCount: number;
  readonly disposedGpuCount: number;
}

export interface SectorStreamingOptions {
  readonly budget?: DeviceTierBudget;
  readonly sectorSizePc?: number;
  readonly maxCatalogRadiusPc?: number;
  readonly fetcher?: (sectorId: string, priority: 'high' | 'low') => Promise<ArrayBuffer | null>;
  readonly gpuResourceFactory?: (decoded: DecodedBinarySector, sectorId: string) => DisposableGpuResource;
}

interface SectorCandidate {
  readonly sectorId: string;
  readonly distSq: number;
}

/**
 * Parses sectorId into center coordinates [x, y, z] in parsecs.
 */
function getSectorCenterFromId(sectorId: string, sectorSize: number): [number, number, number] {
  const bounds = getSectorBounds(sectorId, sectorSize);
  if (!bounds) return [0, 0, 0];
  const half = sectorSize * 0.5;
  return [bounds.min.x + half, bounds.min.y + half, bounds.min.z + half];
}

/**
 * Computes the active 1-ring and outer prefetch rings around a camera position in parsecs.
 */
export function computeSectorRings(
  positionPc: readonly [number, number, number],
  budget: DeviceTierBudget,
  options?: { sectorSizePc?: number; maxCatalogRadiusPc?: number },
): SectorRingPlan {
  const posX = Number.isFinite(positionPc?.[0]) ? (positionPc[0] as number) : 0;
  const posY = Number.isFinite(positionPc?.[1]) ? (positionPc[1] as number) : 0;
  const posZ = Number.isFinite(positionPc?.[2]) ? (positionPc[2] as number) : 0;

  const size =
    options?.sectorSizePc && Number.isFinite(options.sectorSizePc) && options.sectorSizePc > 0
      ? options.sectorSizePc
      : DEFAULT_SECTOR_SIZE_PC;
  const maxRadius =
    options?.maxCatalogRadiusPc &&
    Number.isFinite(options.maxCatalogRadiusPc) &&
    options.maxCatalogRadiusPc > 0
      ? options.maxCatalogRadiusPc
      : 125;

  const cx = getSectorCoordinate(posX, size);
  const cy = getSectorCoordinate(posY, size);
  const cz = getSectorCoordinate(posZ, size);
  const centerSectorId = formatSectorId(cx, cy, cz, size);
  const centerOrigin: readonly [number, number, number] = [cx, cy, cz];

  const maxDistFromOrigin = maxRadius + size * 0.87;

  // 1-ring generation (dx, dy, dz in [-1, 0, 1])
  const candidates1Ring: SectorCandidate[] = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dz = -1; dz <= 1; dz++) {
        const sx = cx + dx * size;
        const sy = cy + dy * size;
        const sz = cz + dz * size;

        const scx = sx + size * 0.5;
        const scy = sy + size * 0.5;
        const scz = sz + size * 0.5;

        if (Math.hypot(scx, scy, scz) > maxDistFromOrigin) {
          continue;
        }

        const sectorId = formatSectorId(sx, sy, sz, size);
        const distSq = (posX - scx) ** 2 + (posY - scy) ** 2 + (posZ - scz) ** 2;
        candidates1Ring.push({ sectorId, distSq });
      }
    }
  }

  // Sort 1-ring candidates nearest-first, prioritizing center sector in boundary ties
  candidates1Ring.sort((a, b) => {
    if (Math.abs(a.distSq - b.distSq) > 1e-6) {
      return a.distSq - b.distSq;
    }
    if (a.sectorId === centerSectorId) return -1;
    if (b.sectorId === centerSectorId) return 1;
    return a.sectorId.localeCompare(b.sectorId);
  });

  const activeSectorCandidates = candidates1Ring.slice(0, budget.maxActiveSectors);
  const activeSectorIds = activeSectorCandidates.map((c) => c.sectorId);
  const overflow1Ring = candidates1Ring.slice(budget.maxActiveSectors);

  // Outer prefetch ring generation
  const ringRadius = Math.max(1, budget.prefetchRingRadius);
  const outerPrefetchCandidates: SectorCandidate[] = [];

  for (let dx = -ringRadius; dx <= ringRadius; dx++) {
    for (let dy = -ringRadius; dy <= ringRadius; dy++) {
      for (let dz = -ringRadius; dz <= ringRadius; dz++) {
        const chebyshev = Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz));
        if (chebyshev <= 1) {
          continue; // Already processed in 1-ring
        }

        const sx = cx + dx * size;
        const sy = cy + dy * size;
        const sz = cz + dz * size;

        const scx = sx + size * 0.5;
        const scy = sy + size * 0.5;
        const scz = sz + size * 0.5;

        if (Math.hypot(scx, scy, scz) > maxDistFromOrigin) {
          continue;
        }

        const sectorId = formatSectorId(sx, sy, sz, size);
        const distSq = (posX - scx) ** 2 + (posY - scy) ** 2 + (posZ - scz) ** 2;
        outerPrefetchCandidates.push({ sectorId, distSq });
      }
    }
  }

  const allPrefetchCandidates = [...overflow1Ring, ...outerPrefetchCandidates];
  allPrefetchCandidates.sort((a, b) => a.distSq - b.distSq || a.sectorId.localeCompare(b.sectorId));

  const prefetchCap = Math.max(0, budget.lruCacheMaxSectors - activeSectorIds.length);
  const prefetchSectorIds = allPrefetchCandidates.slice(0, prefetchCap).map((c) => c.sectorId);

  return {
    centerSectorId,
    centerOrigin,
    activeSectorIds,
    prefetchSectorIds,
  };
}

/**
 * Creates default Three.js BufferGeometry with precomputed bounding sphere.
 */
export function createDefaultSectorGeometry(decoded: DecodedBinarySector): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(decoded.positions, 3));
  geometry.setAttribute('starId', new THREE.BufferAttribute(decoded.ids, 1));

  const size = decoded.header.sectorSize;
  const halfSize = size * 0.5;
  const cx = decoded.header.origin[0] + halfSize;
  const cy = decoded.header.origin[1] + halfSize;
  const cz = decoded.header.origin[2] + halfSize;
  const radius = halfSize * Math.sqrt(3);

  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(cx, cy, cz), radius);
  return geometry;
}

/**
 * Factory creating Three.js Points added to a parent Group with deterministic disposal.
 */
export function createSceneSectorPointsFactory(
  getTarget: () => { group: THREE.Group | null; material: THREE.Material | null },
): (decoded: DecodedBinarySector, sectorId: string) => DisposableGpuResource {
  return (decoded: DecodedBinarySector, sectorId: string) => {
    const geometry = createDefaultSectorGeometry(decoded);
    const { group, material } = getTarget();
    let points: THREE.Points | null = null;
    if (group && material) {
      points = new THREE.Points(geometry, material);
      points.name = `sector-points-${sectorId}`;
      points.frustumCulled = true;
      group.add(points);
    }
    return {
      dispose: () => {
        if (points && points.parent) {
          points.parent.remove(points);
        }
        geometry.dispose();
      },
    };
  };
}

/**
 * Fetches sector binary partition over network.
 */
export async function fetchSectorBinaryBuffer(
  sectorId: string,
  priority: 'high' | 'low' = 'low',
): Promise<ArrayBuffer | null> {
  const url = resolveDataUrl(`data/partitions/${sectorId}.bin`);
  try {
    const response = await fetch(url, {
      priority: priority === 'high' ? 'high' : 'low',
    } as RequestInit);
    if (!response.ok) {
      return null;
    }
    return await response.arrayBuffer();
  } catch {
    return null;
  }
}

const EMPTY_UPLOADS: readonly string[] = Object.freeze([]);

/**
 * Stateful manager orchestrating sector ring streaming, LRU eviction, and staggered GPU uploads.
 */
export class SectorStreamingManager {
  private readonly budget: DeviceTierBudget;
  private readonly sectorSizePc: number;
  private readonly maxCatalogRadiusPc: number;
  private readonly fetcher: (sectorId: string, priority: 'high' | 'low') => Promise<ArrayBuffer | null>;
  private readonly gpuResourceFactory: (
    decoded: DecodedBinarySector,
    sectorId: string,
  ) => DisposableGpuResource;

  private readonly cache = new Map<string, CachedSectorEntry>();
  private readonly inFlight = new Map<string, Promise<DecodedBinarySector | null>>();
  private readonly latestDistanceSq = new Map<string, number>();
  private readonly missingSectors = new Set<string>();
  private readonly onSectorsLoadedListeners = new Set<() => void>();
  private activeSet = new Set<string>();
  private prefetchSet = new Set<string>();
  private pendingUploadQueue: string[] = [];

  private evictedCount = 0;
  private disposedGpuCount = 0;
  private tick = 0;
  private isDisposed = false;

  constructor(options?: SectorStreamingOptions) {
    this.budget = options?.budget ?? getDeviceTierBudget();
    this.sectorSizePc = options?.sectorSizePc ?? DEFAULT_SECTOR_SIZE_PC;
    this.maxCatalogRadiusPc = options?.maxCatalogRadiusPc ?? 125;
    this.fetcher = options?.fetcher ?? fetchSectorBinaryBuffer;
    this.gpuResourceFactory = options?.gpuResourceFactory ?? createDefaultSectorGeometry;
  }

  /**
   * Updates camera position, resolving active/prefetch rings and triggering streaming fetches.
   */
  async updateCameraPosition(positionPc: readonly [number, number, number]): Promise<SectorRingPlan> {
    if (this.isDisposed) {
      throw new Error('SectorStreamingManager has been disposed');
    }

    const posX = Number.isFinite(positionPc?.[0]) ? positionPc[0] : 0;
    const posY = Number.isFinite(positionPc?.[1]) ? positionPc[1] : 0;
    const posZ = Number.isFinite(positionPc?.[2]) ? positionPc[2] : 0;
    const sanitizedPos: readonly [number, number, number] = [posX, posY, posZ];

    this.tick++;
    const plan = computeSectorRings(sanitizedPos, this.budget, {
      sectorSizePc: this.sectorSizePc,
      maxCatalogRadiusPc: this.maxCatalogRadiusPc,
    });

    const newActiveSet = new Set(plan.activeSectorIds);
    const newPrefetchSet = new Set(plan.prefetchSectorIds);

    // Deterministically dispose GPU resources for sectors no longer in active set
    for (const entry of this.cache.values()) {
      if (entry.state === 'uploaded' && !newActiveSet.has(entry.sectorId)) {
        entry.gpuResource?.dispose();
        entry.gpuResource = null;
        entry.state = 'decoded';
        this.disposedGpuCount++;
      }
    }

    this.activeSet = newActiveSet;
    this.prefetchSet = newPrefetchSet;
    this.latestDistanceSq.clear();

    // Prune pending uploads that are no longer active
    this.pendingUploadQueue = this.pendingUploadQueue.filter((id) => this.activeSet.has(id));

    const fetchPromises: Promise<DecodedBinarySector | null>[] = [];

    // Process active sectors
    for (const sectorId of plan.activeSectorIds) {
      const center = getSectorCenterFromId(sectorId, this.sectorSizePc);
      const distSq =
        (posX - center[0]) ** 2 +
        (posY - center[1]) ** 2 +
        (posZ - center[2]) ** 2;
      this.latestDistanceSq.set(sectorId, distSq);

      const cached = this.cache.get(sectorId);
      if (cached) {
        cached.lastAccessedTick = this.tick;
        cached.distanceSq = distSq;
        if (cached.state === 'decoded' && !this.pendingUploadQueue.includes(sectorId)) {
          this.pendingUploadQueue.push(sectorId);
        }
      } else if (!this.missingSectors.has(sectorId)) {
        fetchPromises.push(this.fetchAndCacheSector(sectorId, 'high', distSq));
      }
    }

    // Process prefetch sectors
    for (const sectorId of plan.prefetchSectorIds) {
      const center = getSectorCenterFromId(sectorId, this.sectorSizePc);
      const distSq =
        (posX - center[0]) ** 2 +
        (posY - center[1]) ** 2 +
        (posZ - center[2]) ** 2;
      this.latestDistanceSq.set(sectorId, distSq);

      const cached = this.cache.get(sectorId);
      if (cached) {
        cached.lastAccessedTick = this.tick;
        cached.distanceSq = distSq;
      } else if (!this.missingSectors.has(sectorId)) {
        fetchPromises.push(this.fetchAndCacheSector(sectorId, 'low', distSq));
      }
    }

    await Promise.allSettled(fetchPromises);
    if (!this.isDisposed) {
      this.notifyListeners();
    }
    return plan;
  }

  /**
   * Fetches binary buffer, decodes, and enters into cache with LRU enforcement.
   */
  private fetchAndCacheSector(
    sectorId: string,
    priority: 'high' | 'low',
    distSq: number,
  ): Promise<DecodedBinarySector | null> {
    if (this.isDisposed || this.missingSectors.has(sectorId)) {
      return Promise.resolve(null);
    }

    const existingPromise = this.inFlight.get(sectorId);
    if (existingPromise) {
      return existingPromise;
    }

    const promise = (async () => {
      try {
        const buffer = await this.fetcher(sectorId, priority);
        if (this.isDisposed) {
          return null;
        }
        if (!buffer) {
          this.missingSectors.add(sectorId);
          return null;
        }

        const decoded = decodeBinarySector(buffer);
        if (this.isDisposed) {
          return null;
        }

        const isStillRelevant = this.activeSet.has(sectorId) || this.prefetchSet.has(sectorId);
        if (!isStillRelevant && this.cache.size >= this.budget.lruCacheMaxSectors) {
          return decoded;
        }

        const resolvedDistSq = this.latestDistanceSq.get(sectorId) ?? distSq;
        const entry: CachedSectorEntry = {
          sectorId,
          decoded,
          byteLength: buffer.byteLength,
          state: 'decoded',
          gpuResource: null,
          lastAccessedTick: isStillRelevant ? this.tick : 0,
          distanceSq: resolvedDistSq,
        };

        this.cache.set(sectorId, entry);

        // Enqueue for GPU upload only if currently in active set
        if (this.activeSet.has(sectorId) && !this.pendingUploadQueue.includes(sectorId)) {
          this.pendingUploadQueue.push(sectorId);
        }

        this.enforceLruCapacity();
        return decoded;
      } catch {
        if (!this.isDisposed) {
          this.missingSectors.add(sectorId);
        }
        return null;
      } finally {
        this.inFlight.delete(sectorId);
      }
    })();

    this.inFlight.set(sectorId, promise);
    return promise;
  }

  /**
   * Enforces LRU memory capacity, evicting oldest non-active entries first.
   */
  private enforceLruCapacity(): void {
    while (this.cache.size > this.budget.lruCacheMaxSectors) {
      let oldestCandidate: CachedSectorEntry | null = null;

      // Prefer evicting non-active sectors
      for (const entry of this.cache.values()) {
        if (!this.activeSet.has(entry.sectorId)) {
          if (!oldestCandidate || entry.lastAccessedTick < oldestCandidate.lastAccessedTick) {
            oldestCandidate = entry;
          }
        }
      }

      // If all are active, evict overall oldest
      if (!oldestCandidate) {
        for (const entry of this.cache.values()) {
          if (!oldestCandidate || entry.lastAccessedTick < oldestCandidate.lastAccessedTick) {
            oldestCandidate = entry;
          }
        }
      }

      if (!oldestCandidate) {
        break;
      }

      if (oldestCandidate.gpuResource) {
        oldestCandidate.gpuResource.dispose();
        oldestCandidate.gpuResource = null;
        this.disposedGpuCount++;
      }

      this.cache.delete(oldestCandidate.sectorId);
      const qIdx = this.pendingUploadQueue.indexOf(oldestCandidate.sectorId);
      if (qIdx !== -1) {
        this.pendingUploadQueue.splice(qIdx, 1);
      }
      this.evictedCount++;
    }
  }

  /**
   * Rate-limits GPU buffer uploads per frame, checking memory and point budgets.
   */
  processFrameUploads(maxUploads = this.budget.maxGpuUploadsPerFrame): string[] {
    if (this.isDisposed || maxUploads <= 0 || this.pendingUploadQueue.length === 0) {
      return EMPTY_UPLOADS as string[];
    }

    // Sort pending uploads nearest-first
    this.pendingUploadQueue.sort((a, b) => {
      const entryA = this.cache.get(a);
      const entryB = this.cache.get(b);
      const distA = entryA ? entryA.distanceSq : Infinity;
      const distB = entryB ? entryB.distanceSq : Infinity;
      return distA - distB;
    });

    const uploadedThisFrame: string[] = [];
    const remainingQueue: string[] = [];

    let currentActivePoints = this.getActivePointCount();
    let currentUploadedSectors = this.getUploadedSectorCount();
    let currentGpuBytes = this.getAllocatedGpuBytes();

    for (let i = 0; i < this.pendingUploadQueue.length; i++) {
      const sectorId = this.pendingUploadQueue[i]!;
      if (uploadedThisFrame.length >= maxUploads) {
        remainingQueue.push(sectorId);
        continue;
      }

      const entry = this.cache.get(sectorId);
      if (!entry || entry.state === 'uploaded' || !this.activeSet.has(sectorId)) {
        continue;
      }

      const fitsPoints =
        currentActivePoints + entry.decoded.header.count <= this.budget.maxActivePoints;
      const canAllocate = canAllocateSector(
        this.budget,
        currentUploadedSectors,
        currentGpuBytes,
        entry.byteLength,
      );

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
    if (uploadedThisFrame.length > 0) {
      this.notifyListeners();
    }
    return uploadedThisFrame;
  }

  private getActivePointCount(): number {
    let points = 0;
    for (const entry of this.cache.values()) {
      if (entry.state === 'uploaded') {
        points += entry.decoded.header.count;
      }
    }
    return points;
  }

  private getUploadedSectorCount(): number {
    let count = 0;
    for (const entry of this.cache.values()) {
      if (entry.state === 'uploaded') {
        count++;
      }
    }
    return count;
  }

  private getAllocatedGpuBytes(): number {
    let bytes = 0;
    for (const entry of this.cache.values()) {
      if (entry.state === 'uploaded') {
        bytes += entry.byteLength;
      }
    }
    return bytes;
  }

  private getCachedRamBytes(): number {
    let bytes = 0;
    for (const entry of this.cache.values()) {
      bytes += entry.byteLength;
    }
    return bytes;
  }

  getActiveDecodedSectors(): readonly DecodedBinarySector[] {
    const result: DecodedBinarySector[] = [];
    for (const entry of this.cache.values()) {
      if (this.activeSet.has(entry.sectorId)) {
        result.push(entry.decoded);
      }
    }
    return result;
  }

  getUploadedEntries(): readonly CachedSectorEntry[] {
    const result: CachedSectorEntry[] = [];
    for (const entry of this.cache.values()) {
      if (entry.state === 'uploaded') {
        result.push(entry);
      }
    }
    return result;
  }

  getCachedEntry(sectorId: string): CachedSectorEntry | undefined {
    return this.cache.get(sectorId);
  }

  getTelemetry(): SectorStreamingTelemetry {
    return {
      tier: this.budget.tier,
      activeSectorCount: this.activeSet.size,
      uploadedSectorCount: this.getUploadedSectorCount(),
      cachedSectorCount: this.cache.size,
      pendingUploadCount: this.pendingUploadQueue.length,
      inFlightFetchCount: this.inFlight.size,
      activePointCount: this.getActivePointCount(),
      allocatedGpuBytes: this.getAllocatedGpuBytes(),
      cachedRamBytes: this.getCachedRamBytes(),
      evictedCount: this.evictedCount,
      disposedGpuCount: this.disposedGpuCount,
    };
  }

  getActiveSectorQueryInputs(): readonly { readonly sectorId: string; readonly decoded: DecodedBinarySector }[] {
    const result: { sectorId: string; decoded: DecodedBinarySector }[] = [];
    for (const entry of this.cache.values()) {
      if (this.activeSet.has(entry.sectorId)) {
        result.push({ sectorId: entry.sectorId, decoded: entry.decoded });
      }
    }
    return result;
  }

  subscribe(listener: () => void): () => void {
    this.onSectorsLoadedListeners.add(listener);
    return () => {
      this.onSectorsLoadedListeners.delete(listener);
    };
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
    for (const entry of this.cache.values()) {
      if (entry.gpuResource) {
        entry.gpuResource.dispose();
        entry.gpuResource = null;
        this.disposedGpuCount++;
      }
    }
    this.cache.clear();
    this.inFlight.clear();
    this.latestDistanceSq.clear();
    this.missingSectors.clear();
    this.activeSet.clear();
    this.prefetchSet.clear();
    this.pendingUploadQueue = [];
  }
}
