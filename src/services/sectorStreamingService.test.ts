import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SectorStreamingManager } from './sectorStreamingService';
import type { DisposableGpuResource } from './sectorSelection';
import { DEVICE_TIER_BUDGETS } from './deviceTierService';
import { encodeBinarySector } from '../utils/binarySectorCodec';
import type { SectorPartitionManifest } from '../types/astroCoordinates';

function createMockSectorBuffer(sectorId: string, origin: [number, number, number] = [0, 0, 0], starCount = 10): ArrayBuffer {
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

describe('SectorStreamingManager', () => {
  let mockBuffers: Map<string, ArrayBuffer>;
  let fetchCalls: Array<{ sectorId: string; priority: 'high' | 'low' }>;
  let customFactoryCalls: string[];
  let customDisposedIds: string[];

  beforeEach(() => {
    mockBuffers = new Map();
    fetchCalls = [];
    customFactoryCalls = [];
    customDisposedIds = [];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createMockFetcher() {
    return vi.fn(async (sectorId: string, priority: 'high' | 'low') => {
      fetchCalls.push({ sectorId, priority });
      let buf = mockBuffers.get(sectorId);
      if (!buf) {
        buf = createMockSectorBuffer(sectorId, [0, 0, 0], 10);
        mockBuffers.set(sectorId, buf);
      }
      return buf;
    });
  }

  function createTrackingGpuFactory() {
    return (_decoded: unknown, sectorId: string): DisposableGpuResource => {
      customFactoryCalls.push(sectorId);
      return {
        dispose: () => {
          customDisposedIds.push(sectorId);
        },
      };
    };
  }

  it('fetches active sectors with high priority and prefetch with low priority', async () => {
    const fetcher = createMockFetcher();
    const manager = new SectorStreamingManager({
      budget: DEVICE_TIER_BUDGETS.tier1, // 12 active, 4 prefetch
      fetcher,
      gpuResourceFactory: createTrackingGpuFactory(),
    });

    const plan = await manager.updateCameraPosition([0, 0, 0]);

    expect(plan.activeSectorIds.length).toBe(12);
    expect(plan.prefetchSectorIds.length).toBe(4);

    const highCalls = fetchCalls.filter((c) => c.priority === 'high');
    const lowCalls = fetchCalls.filter((c) => c.priority === 'low');

    expect(highCalls.length).toBe(12);
    expect(lowCalls.length).toBe(4);

    for (const call of highCalls) {
      expect(plan.activeSectorIds).toContain(call.sectorId);
    }
    for (const call of lowCalls) {
      expect(plan.prefetchSectorIds).toContain(call.sectorId);
    }

    expect(customFactoryCalls.length).toBe(0);

    const telemetry = manager.getTelemetry();
    expect(telemetry.cachedSectorCount).toBe(16);
    expect(telemetry.uploadedSectorCount).toBe(0);
    expect(telemetry.pendingUploadCount).toBe(12);

    manager.dispose();
  });

  it('staggers GPU uploads per frame respecting maxGpuUploadsPerFrame', async () => {
    const fetcher = createMockFetcher();
    const manager = new SectorStreamingManager({
      budget: DEVICE_TIER_BUDGETS.tier2, // maxGpuUploadsPerFrame: 2, 27 active sectors
      fetcher,
      gpuResourceFactory: createTrackingGpuFactory(),
    });

    await manager.updateCameraPosition([0, 0, 0]);

    const frame1 = manager.processFrameUploads();
    expect(frame1.length).toBe(2);
    expect(manager.getTelemetry().uploadedSectorCount).toBe(2);
    expect(manager.getTelemetry().pendingUploadCount).toBe(25);

    const frame2 = manager.processFrameUploads();
    expect(frame2.length).toBe(2);
    expect(manager.getTelemetry().uploadedSectorCount).toBe(4);
    expect(manager.getTelemetry().pendingUploadCount).toBe(23);
    expect(manager.hasPendingUploads()).toBe(true);

    while (manager.hasPendingUploads()) {
      manager.processFrameUploads(10);
    }
    expect(manager.hasPendingUploads()).toBe(false);

    manager.dispose();
  });

  it('promotes prefetched sector from RAM with 0 network re-fetches and disposes departed sector GPU resources', async () => {
    const fetcher = createMockFetcher();
    const manager = new SectorStreamingManager({
      budget: DEVICE_TIER_BUDGETS.tier1, // 12 active, 4 prefetch
      fetcher,
      gpuResourceFactory: createTrackingGpuFactory(),
    });

    const plan1 = await manager.updateCameraPosition([0, 0, 0]);
    while (manager.getTelemetry().pendingUploadCount > 0) {
      manager.processFrameUploads(10);
    }
    expect(manager.getTelemetry().uploadedSectorCount).toBe(12);

    const prefetchedSectorId = plan1.prefetchSectorIds[0]!;
    expect(prefetchedSectorId).toBeDefined();

    const fetchCallsCountBefore = fetchCalls.length;

    const match = /^sector_([+-]\d+)_([+-]\d+)_([+-]\d+)$/.exec(prefetchedSectorId);
    expect(match).not.toBeNull();
    const targetPos: [number, number, number] = [
      parseInt(match![1]!, 10) + 12.5,
      parseInt(match![2]!, 10) + 12.5,
      parseInt(match![3]!, 10) + 12.5,
    ];

    const plan2 = await manager.updateCameraPosition(targetPos);
    expect(plan2.activeSectorIds).toContain(prefetchedSectorId);

    const callsForPrefetched = fetchCalls
      .slice(fetchCallsCountBefore)
      .filter((c) => c.sectorId === prefetchedSectorId);
    expect(callsForPrefetched.length).toBe(0);

    expect(customDisposedIds.length).toBeGreaterThan(0);

    const demotedToPrefetch = plan1.activeSectorIds.find((id) =>
      plan2.prefetchSectorIds.includes(id),
    );
    if (demotedToPrefetch) {
      const cached = manager.getCachedEntry(demotedToPrefetch);
      expect(cached).toBeDefined();
      expect(cached?.state).toBe('decoded');
      expect(cached?.gpuResource).toBeNull();
      expect(customDisposedIds).toContain(demotedToPrefetch);
    }

    manager.dispose();
  });

  it('enforces LRU capacity eviction and calls dispose on evicted GPU resources', async () => {
    const fetcher = createMockFetcher();
    const manager = new SectorStreamingManager({
      budget: DEVICE_TIER_BUDGETS.tier1, // lruCacheMaxSectors: 16
      fetcher,
      gpuResourceFactory: createTrackingGpuFactory(),
    });

    await manager.updateCameraPosition([0, 0, 0]);
    expect(manager.getTelemetry().cachedSectorCount).toBe(16);

    await manager.updateCameraPosition([50, 50, 50]);

    const telemetry = manager.getTelemetry();
    expect(telemetry.cachedSectorCount).toBeLessThanOrEqual(16);
    expect(telemetry.evictedCount).toBeGreaterThan(0);

    manager.dispose();
  });

  it('caches null/404 fetch responses in missingSectors to prevent repeated re-fetching', async () => {
    const nullFetcher = vi.fn(async () => null);
    const manager = new SectorStreamingManager({
      budget: DEVICE_TIER_BUDGETS.tier1,
      fetcher: nullFetcher,
      gpuResourceFactory: createTrackingGpuFactory(),
    });

    await manager.updateCameraPosition([0, 0, 0]);
    const initialCallCount = nullFetcher.mock.calls.length;
    expect(initialCallCount).toBeGreaterThan(0);

    await manager.updateCameraPosition([0, 0, 0]);
    expect(nullFetcher.mock.calls.length).toBe(initialCallCount);

    manager.dispose();
  });

  it('returns false until all active sectors are fetched or marked missing (isActiveRingReady)', async () => {
    let resolveSlowFetch: (buf: ArrayBuffer | null) => void = () => {};
    const slowFetchPromise = new Promise<ArrayBuffer | null>((resolve) => {
      resolveSlowFetch = resolve;
    });

    const fetcher = vi.fn(async (sectorId: string) => {
      if (sectorId === '0_0_0') {
        return slowFetchPromise;
      }
      return createMockSectorBuffer(sectorId);
    });

    const manager = new SectorStreamingManager({
      budget: DEVICE_TIER_BUDGETS.tier1,
      fetcher,
      gpuResourceFactory: createTrackingGpuFactory(),
    });

    expect(manager.isActiveRingReady()).toBe(false);

    const updatePromise = manager.updateCameraPosition([0, 0, 0]);
    expect(manager.isActiveRingReady()).toBe(false);

    resolveSlowFetch(createMockSectorBuffer('0_0_0'));
    await updatePromise;

    expect(manager.isActiveRingReady()).toBe(true);
    manager.dispose();
  });

  it('disposes all GPU resources and cancels active processing on manager.dispose()', async () => {
    const fetcher = createMockFetcher();
    const manager = new SectorStreamingManager({
      budget: DEVICE_TIER_BUDGETS.tier1,
      fetcher,
      gpuResourceFactory: createTrackingGpuFactory(),
    });

    await manager.updateCameraPosition([0, 0, 0]);
    manager.processFrameUploads(5);

    const uploadedBeforeDispose = manager.getTelemetry().uploadedSectorCount;
    expect(uploadedBeforeDispose).toBe(5);

    manager.dispose();

    expect(customDisposedIds.length).toBe(uploadedBeforeDispose);
    expect(manager.getTelemetry().cachedSectorCount).toBe(0);
    expect(manager.getTelemetry().uploadedSectorCount).toBe(0);
  });

  it('prevents stale in-flight fetches from leaking GPU resources after camera moves away', async () => {
    let resolveSlowFetch: (buf: ArrayBuffer | null) => void;
    const slowFetchPromise = new Promise<ArrayBuffer | null>((resolve) => {
      resolveSlowFetch = resolve;
    });

    const fetcher = vi.fn(async (sectorId: string) => {
      if (sectorId === 'sector_+000_+000_+000') {
        return slowFetchPromise;
      }
      return createMockSectorBuffer(sectorId);
    });

    const manager = new SectorStreamingManager({
      budget: DEVICE_TIER_BUDGETS.tier1,
      fetcher,
      gpuResourceFactory: createTrackingGpuFactory(),
    });

    const p1 = manager.updateCameraPosition([0, 0, 0]);
    await manager.updateCameraPosition([100, 100, 100]);

    resolveSlowFetch!(createMockSectorBuffer('sector_+000_+000_+000'));
    await p1;

    manager.processFrameUploads(10);
    expect(customFactoryCalls).not.toContain('sector_+000_+000_+000');

    manager.dispose();
  });

  describe('100-Sector Continuous Camera Translation Memory Audit', () => {
    it('translates camera across >100 distinct sectors with 0 GPU buffer leaks and strict budget conformance', async () => {
      let createdGeometriesCount = 0;
      let disposedGeometriesCount = 0;

      const trackingFactory = (_decoded: unknown, _sectorId: string): DisposableGpuResource => {
        createdGeometriesCount++;
        return {
          dispose: () => {
            disposedGeometriesCount++;
          },
        };
      };

      const budget = DEVICE_TIER_BUDGETS.tier2; // maxActiveSectors: 27, lruCacheMaxSectors: 40, maxBufferBytes: 5_242_880
      const manager = new SectorStreamingManager({
        budget,
        fetcher: async (sectorId) => createMockSectorBuffer(sectorId, [0, 0, 0], 20),
        gpuResourceFactory: trackingFactory,
      });

      const stepCoordinates = [-50, -25, 0, 25, 50];
      let stepsCount = 0;

      for (const x of stepCoordinates) {
        for (const y of stepCoordinates) {
          for (const z of stepCoordinates) {
            stepsCount++;
            await manager.updateCameraPosition([x, y, z]);
            manager.processFrameUploads(10);

            const telemetry = manager.getTelemetry();
            expect(telemetry.uploadedSectorCount).toBeLessThanOrEqual(budget.maxActiveSectors);
            expect(telemetry.cachedSectorCount).toBeLessThanOrEqual(budget.lruCacheMaxSectors);
            expect(telemetry.allocatedGpuBytes).toBeLessThanOrEqual(budget.maxBufferBytes);
            expect(createdGeometriesCount - disposedGeometriesCount).toBe(telemetry.uploadedSectorCount);
          }
        }
      }

      expect(stepsCount).toBe(125);
      expect(createdGeometriesCount).toBeGreaterThan(100);

      manager.dispose();
      expect(disposedGeometriesCount).toBe(createdGeometriesCount);
    });
  });
});
