/**
 * LRU Sector Buffer Cache and Fetch Coordinator.
 *
 * Manages in-memory sector decoded buffers, network fetch deduplication,
 * missing-sector caching, and LRU memory capacity eviction.
 */

import { decodeBinarySector, type DecodedBinarySector } from '../utils/binarySectorCodec';
import {
  fetchDataManifest,
  getCachedDataManifest,
  hasManifestDataPath,
  resolveManifestDataUrl,
} from '../data/dataManifestRepository';
import { resolveDataUrl } from '../utils/url';
import type { CachedSectorEntry } from './sectorSelection';

export async function fetchSectorBinaryBuffer(
  sectorId: string,
  priority: 'high' | 'low' = 'low',
): Promise<ArrayBuffer | null> {
  const logicalPath = `partitions/${sectorId}.bin`;
  const manifest = getCachedDataManifest() ?? (await fetchDataManifest().catch(() => null));
  if (hasManifestDataPath(logicalPath) === false) {
    return null;
  }

  const url = manifest
    ? await resolveManifestDataUrl(logicalPath)
    : resolveDataUrl(`/data/${logicalPath}`);
  try {
    const response = await fetch(url, { priority } as RequestInit);
    return response.ok ? await response.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export type SectorFetcher = (sectorId: string, priority: 'high' | 'low') => Promise<ArrayBuffer | null>;

export class SectorBufferCache {
  private readonly cache = new Map<string, CachedSectorEntry>();
  private readonly inFlight = new Map<string, Promise<DecodedBinarySector | null>>();
  private readonly latestDistanceSq = new Map<string, number>();
  private readonly missingSectors = new Set<string>();
  private readonly fetcher: SectorFetcher;

  private evictedCount = 0;
  private disposedGpuCount = 0;
  private isDisposed = false;

  constructor(fetcher: SectorFetcher = fetchSectorBinaryBuffer) {
    this.fetcher = fetcher;
  }

  get size(): number { return this.cache.size; }
  get inFlightCount(): number { return this.inFlight.size; }
  get totalEvictedCount(): number { return this.evictedCount; }
  get totalDisposedGpuCount(): number { return this.disposedGpuCount; }

  get(sectorId: string): CachedSectorEntry | undefined { return this.cache.get(sectorId); }
  has(sectorId: string): boolean { return this.cache.has(sectorId); }
  isMissing(sectorId: string): boolean { return this.missingSectors.has(sectorId); }
  setDistance(sectorId: string, distSq: number): void { this.latestDistanceSq.set(sectorId, distSq); }
  clearDistances(): void { this.latestDistanceSq.clear(); }

  demoteDepartedActive(activeSet: ReadonlySet<string>): void {
    for (const entry of this.cache.values()) {
      if (entry.state === 'uploaded' && !activeSet.has(entry.sectorId)) {
        entry.gpuResource?.dispose();
        entry.gpuResource = null;
        entry.state = 'decoded';
        this.disposedGpuCount++;
      }
    }
  }

  demoteUploadedSector(sectorId: string): boolean {
    const entry = this.cache.get(sectorId);
    if (!entry || entry.state !== 'uploaded') return false;
    entry.gpuResource?.dispose();
    entry.gpuResource = null;
    entry.state = 'decoded';
    this.disposedGpuCount++;
    return true;
  }

  async fetchAndCacheSector(
    sectorId: string,
    priority: 'high' | 'low',
    distSq: number,
    tick: number,
    isStillRelevant: () => boolean,
    maxLruSectors: number,
    onNewlyCached?: (sectorId: string) => void,
  ): Promise<DecodedBinarySector | null> {
    if (this.isDisposed || this.missingSectors.has(sectorId)) return null;

    const existingPromise = this.inFlight.get(sectorId);
    if (existingPromise) return existingPromise;

    const promise = (async () => {
      try {
        const buffer = await this.fetcher(sectorId, priority);
        if (this.isDisposed) return null;
        if (!buffer) {
          this.missingSectors.add(sectorId);
          return null;
        }

        const decoded = decodeBinarySector(buffer);
        if (this.isDisposed) return null;

        const relevant = isStillRelevant();
        if (!relevant && this.cache.size >= maxLruSectors) return decoded;

        const resolvedDistSq = this.latestDistanceSq.get(sectorId) ?? distSq;
        this.cache.set(sectorId, {
          sectorId,
          decoded,
          byteLength: buffer.byteLength,
          state: 'decoded',
          gpuResource: null,
          lastAccessedTick: relevant ? tick : 0,
          distanceSq: resolvedDistSq,
        });

        onNewlyCached?.(sectorId);
        return decoded;
      } catch {
        if (!this.isDisposed) this.missingSectors.add(sectorId);
        return null;
      } finally {
        this.inFlight.delete(sectorId);
      }
    })();

    this.inFlight.set(sectorId, promise);
    return promise;
  }

  enforceLruCapacity(maxSectors: number, activeSet: ReadonlySet<string>): string[] {
    const evictedIds: string[] = [];
    while (this.cache.size > maxSectors) {
      let candidate: CachedSectorEntry | null = null;
      for (const entry of this.cache.values()) {
        if (!activeSet.has(entry.sectorId)) {
          if (!candidate || entry.lastAccessedTick < candidate.lastAccessedTick) candidate = entry;
        }
      }
      if (!candidate) {
        for (const entry of this.cache.values()) {
          if (!candidate || entry.lastAccessedTick < candidate.lastAccessedTick) candidate = entry;
        }
      }
      if (!candidate) break;

      if (candidate.gpuResource) {
        candidate.gpuResource.dispose();
        candidate.gpuResource = null;
        this.disposedGpuCount++;
      }
      this.cache.delete(candidate.sectorId);
      evictedIds.push(candidate.sectorId);
      this.evictedCount++;
    }
    return evictedIds;
  }

  getActivePointCount(): number {
    let pts = 0;
    for (const e of this.cache.values()) if (e.state === 'uploaded') pts += e.decoded.header.count;
    return pts;
  }

  getUploadedSectorCount(): number {
    let count = 0;
    for (const e of this.cache.values()) if (e.state === 'uploaded') count++;
    return count;
  }

  getAllocatedGpuBytes(): number {
    let bytes = 0;
    for (const e of this.cache.values()) if (e.state === 'uploaded') bytes += e.byteLength;
    return bytes;
  }

  getCachedRamBytes(): number {
    let bytes = 0;
    for (const e of this.cache.values()) bytes += e.byteLength;
    return bytes;
  }

  getActiveDecodedSectors(activeSet: ReadonlySet<string>): readonly DecodedBinarySector[] {
    const res: DecodedBinarySector[] = [];
    for (const e of this.cache.values()) if (activeSet.has(e.sectorId)) res.push(e.decoded);
    return res;
  }

  getUploadedEntries(): readonly CachedSectorEntry[] {
    const res: CachedSectorEntry[] = [];
    for (const e of this.cache.values()) if (e.state === 'uploaded') res.push(e);
    return res;
  }

  getActiveSectorQueryInputs(activeSet: ReadonlySet<string>): readonly { readonly sectorId: string; readonly decoded: DecodedBinarySector }[] {
    const res: { sectorId: string; decoded: DecodedBinarySector }[] = [];
    for (const e of this.cache.values()) if (activeSet.has(e.sectorId)) res.push({ sectorId: e.sectorId, decoded: e.decoded });
    return res;
  }

  isRingReady(activeSet: ReadonlySet<string>): boolean {
    if (activeSet.size === 0) return false;
    for (const id of activeSet) if (!this.cache.has(id) && !this.missingSectors.has(id)) return false;
    return true;
  }

  dispose(): void {
    this.isDisposed = true;
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
  }
}
