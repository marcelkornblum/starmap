import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SectorBufferCache, fetchSectorBinaryBuffer } from './sectorBufferCache';
import { encodeBinarySector } from '../utils/binarySectorCodec';
import type { SectorPartitionManifest } from '../types/astroCoordinates';
import { seedDataManifest, clearDataManifestCache } from '../data/dataManifestRepository';
import { COMPACT_SCHEMA_VERSION } from '../utils/compactDataConstants';

function createMockSectorBuffer(sectorId: string, origin: [number, number, number] = [0, 0, 0], starCount = 5): ArrayBuffer {
  const manifest: SectorPartitionManifest = {
    sectorId,
    bounds: {
      min: { x: origin[0], y: origin[1], z: origin[2] },
      max: { x: origin[0] + 25, y: origin[1] + 25, z: origin[2] + 25 },
    },
    count: starCount,
    systems: Array.from({ length: starCount }, (_, i) => ({
      id: `${sectorId}-sys-${i}`,
      name: `Star ${i}`,
      x: origin[0] + i,
      y: origin[1] + i,
      z: origin[2] + i,
      dist: Math.hypot(origin[0] + i, origin[1] + i, origin[2] + i),
      mag: 5,
      absmag: 4.8,
      spect: 'G2V',
      starCount: 1,
      planetCount: 0,
      hasHabitableCandidate: false,
      sectorId,
    })),
  };
  const encoded = encodeBinarySector(manifest);
  return encoded.buffer.slice(
    encoded.byteOffset,
    encoded.byteOffset + encoded.byteLength,
  ) as ArrayBuffer;
}

describe('SectorBufferCache', () => {
  let mockBuffers: Map<string, ArrayBuffer>;
  let fetchCalls: Array<{ sectorId: string; priority: 'high' | 'low' }>;

  beforeEach(() => {
    clearDataManifestCache();
    mockBuffers = new Map();
    fetchCalls = [];
  });

  afterEach(() => {
    clearDataManifestCache();
    vi.restoreAllMocks();
  });

  function createMockFetcher() {
    return vi.fn(async (sectorId: string, priority: 'high' | 'low') => {
      fetchCalls.push({ sectorId, priority });
      let buf = mockBuffers.get(sectorId);
      if (!buf) {
        buf = createMockSectorBuffer(sectorId);
        mockBuffers.set(sectorId, buf);
      }
      return buf;
    });
  }

  it('deduplicates concurrent fetches for the same sector', async () => {
    const fetcher = createMockFetcher();
    const cache = new SectorBufferCache(fetcher);

    const [res1, res2] = await Promise.all([
      cache.fetchAndCacheSector('sec1', 'high', 10, 1, () => true, 10),
      cache.fetchAndCacheSector('sec1', 'high', 10, 1, () => true, 10),
    ]);

    expect(fetchCalls.length).toBe(1);
    expect(res1).toBe(res2);
    expect(cache.size).toBe(1);
    expect(cache.has('sec1')).toBe(true);
  });

  it('caches missing sectors (null response) and does not re-fetch', async () => {
    const fetcher = vi.fn(async () => null);
    const cache = new SectorBufferCache(fetcher);

    const res1 = await cache.fetchAndCacheSector('missing_sec', 'low', 50, 1, () => true, 10);
    expect(res1).toBeNull();
    expect(cache.isMissing('missing_sec')).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);

    const res2 = await cache.fetchAndCacheSector('missing_sec', 'low', 50, 2, () => true, 10);
    expect(res2).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('marks sector missing on fetcher error', async () => {
    const fetcher = vi.fn(async () => {
      throw new Error('Network error');
    });
    const cache = new SectorBufferCache(fetcher);

    const res = await cache.fetchAndCacheSector('error_sec', 'low', 50, 1, () => true, 10);
    expect(res).toBeNull();
    expect(cache.isMissing('error_sec')).toBe(true);
  });

  it('evicts oldest non-active sectors when exceeding LRU capacity', async () => {
    const fetcher = createMockFetcher();
    const cache = new SectorBufferCache(fetcher);
    const disposedIds: string[] = [];

    // Add 3 sectors with max capacity 2
    await cache.fetchAndCacheSector('sec1', 'high', 10, 1, () => true, 2);
    await cache.fetchAndCacheSector('sec2', 'high', 20, 2, () => true, 2);

    const entry1 = cache.get('sec1')!;
    entry1.gpuResource = {
      dispose: () => disposedIds.push('sec1'),
    };
    entry1.state = 'uploaded';

    // Active set contains only sec2
    const activeSet = new Set(['sec2']);
    const evicted = cache.enforceLruCapacity(2, activeSet);
    expect(evicted.length).toBe(0);

    // Fetch sec3 with capacity 2
    await cache.fetchAndCacheSector('sec3', 'high', 30, 3, () => true, 2);
    const evictedAfter3 = cache.enforceLruCapacity(2, activeSet);

    // sec1 was not in activeSet and oldest tick (1) -> evicted
    expect(evictedAfter3).toContain('sec1');
    expect(cache.has('sec1')).toBe(false);
    expect(cache.has('sec2')).toBe(true);
    expect(cache.has('sec3')).toBe(true);
    expect(disposedIds).toContain('sec1');
    expect(cache.totalEvictedCount).toBe(1);
    expect(cache.totalDisposedGpuCount).toBe(1);
  });

  it('demoteDepartedActive disposes GPU resources for sectors no longer in activeSet', async () => {
    const fetcher = createMockFetcher();
    const cache = new SectorBufferCache(fetcher);
    const disposedIds: string[] = [];

    await cache.fetchAndCacheSector('sec1', 'high', 10, 1, () => true, 5);
    const entry = cache.get('sec1')!;
    entry.gpuResource = {
      dispose: () => disposedIds.push('sec1'),
    };
    entry.state = 'uploaded';

    cache.demoteDepartedActive(new Set(['other_sec']));
    expect(disposedIds).toContain('sec1');
    expect(entry.gpuResource).toBeNull();
    expect(entry.state).toBe('decoded');
    expect(cache.totalDisposedGpuCount).toBe(1);
  });

  it('computes metrics and tracks ring readiness', async () => {
    const fetcher = createMockFetcher();
    const cache = new SectorBufferCache(fetcher);

    await cache.fetchAndCacheSector('sec1', 'high', 10, 1, () => true, 5);
    const entry = cache.get('sec1')!;
    entry.state = 'uploaded';

    expect(cache.getActivePointCount()).toBe(5);
    expect(cache.getUploadedSectorCount()).toBe(1);
    expect(cache.getAllocatedGpuBytes()).toBe(entry.byteLength);
    expect(cache.getCachedRamBytes()).toBe(entry.byteLength);

    const activeSet = new Set(['sec1']);
    expect(cache.isRingReady(activeSet)).toBe(true);

    activeSet.add('unloaded_sec');
    expect(cache.isRingReady(activeSet)).toBe(false);
  });

  it('disposes all GPU resources on cache.dispose()', async () => {
    const fetcher = createMockFetcher();
    const cache = new SectorBufferCache(fetcher);
    let disposed = false;

    await cache.fetchAndCacheSector('sec1', 'high', 10, 1, () => true, 5);
    const entry = cache.get('sec1')!;
    entry.gpuResource = {
      dispose: () => {
        disposed = true;
      },
    };

    cache.dispose();
    expect(disposed).toBe(true);
    expect(cache.size).toBe(0);
  });

  it('short-circuits fetchSectorBinaryBuffer when seeded manifest omits partitions/<sectorId>.bin', async () => {
    const mockBuf = createMockSectorBuffer('sector_+000_+000_+000');
    seedDataManifest({
      v: COMPACT_SCHEMA_VERSION,
      generatedAt: '2026-01-01T00:00:00.000Z',
      files: {
        'partitions/sector_+000_+000_+000.bin': 'partitions/sector_+000_+000_+000.abc123.bin',
      },
    });

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      arrayBuffer: async () => mockBuf,
    } as Response);

    const missingResult = await fetchSectorBinaryBuffer('sector_+025_+000_+000');
    expect(missingResult).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();

    const presentResult = await fetchSectorBinaryBuffer('sector_+000_+000_+000');
    expect(presentResult).toBe(mockBuf);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0]?.[0]).toContain('partitions/sector_+000_+000_+000.abc123.bin');
  });

  it('falls back to unhashed sector fetch when manifest.json is unavailable', async () => {
    const mockBuf = createMockSectorBuffer('sector_+000_+000_+000');
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes('manifest.json')) {
        return { ok: false, status: 404 } as Response;
      }
      return {
        ok: true,
        arrayBuffer: async () => mockBuf,
      } as Response;
    });

    const result = await fetchSectorBinaryBuffer('sector_+000_+000_+000', 'high');
    expect(result).toBe(mockBuf);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(String(fetchSpy.mock.calls[1]?.[0])).toContain('partitions/sector_+000_+000_+000.bin');
  });
});
