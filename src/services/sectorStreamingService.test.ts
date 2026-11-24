import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SectorStreamingManager } from './sectorStreamingService';
import type { DisposableGpuResource } from './sectorSelection';
import {
  DEVICE_TIER_BUDGETS,
  registerWebGLGpuTelemetry,
  resetDeviceTierRuntimeState,
} from './deviceTierService';
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
    vi.unstubAllGlobals();
    resetDeviceTierRuntimeState();
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

  it('sorts pendingUploadQueue only when dirty and skips redundant re-sorts on unchanged frames', async () => {
    const fetcher = createMockFetcher();
    const manager = new SectorStreamingManager({
      budget: DEVICE_TIER_BUDGETS.tier2, // maxGpuUploadsPerFrame: 2, 27 active sectors
      fetcher,
      gpuResourceFactory: createTrackingGpuFactory(),
    });

    await manager.updateCameraPosition([0, 0, 0]);

    const sortSpy = vi.spyOn(Array.prototype, 'sort');

    manager.processFrameUploads();
    expect(sortSpy).toHaveBeenCalledTimes(1);

    manager.processFrameUploads();
    manager.processFrameUploads();
    expect(sortSpy).toHaveBeenCalledTimes(1);

    await manager.updateCameraPosition([12.5, 12.5, 12.5]);
    sortSpy.mockClear();
    manager.processFrameUploads();
    expect(sortSpy).toHaveBeenCalledTimes(1);
    manager.processFrameUploads();
    expect(sortSpy).toHaveBeenCalledTimes(1);

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

  it('streams 27 active + 53 prefetch sectors on tier3 with rate-limited uploads within budget', async () => {
    const fetcher = createMockFetcher();
    const tier3Budget = DEVICE_TIER_BUDGETS.tier3;
    const manager = new SectorStreamingManager({
      budget: tier3Budget,
      fetcher,
      gpuResourceFactory: createTrackingGpuFactory(),
    });

    const plan = await manager.updateCameraPosition([0, 0, 0]);
    expect(plan.activeSectorIds.length).toBe(27);
    expect(plan.prefetchSectorIds.length).toBe(53);

    const highCalls = fetchCalls.filter((c) => c.priority === 'high');
    const lowCalls = fetchCalls.filter((c) => c.priority === 'low');
    expect(highCalls.length).toBe(27);
    expect(lowCalls.length).toBe(53);

    const initialTelemetry = manager.getTelemetry();
    expect(initialTelemetry.cachedSectorCount).toBe(80);
    expect(initialTelemetry.pendingUploadCount).toBe(27);
    expect(initialTelemetry.uploadedSectorCount).toBe(0);

    let frames = 0;
    while (manager.hasPendingUploads()) {
      const uploadedThisFrame = manager.processFrameUploads();
      expect(uploadedThisFrame.length).toBeLessThanOrEqual(tier3Budget.maxGpuUploadsPerFrame);
      const telemetry = manager.getTelemetry();
      expect(telemetry.uploadedSectorCount).toBeLessThanOrEqual(27);
      expect(telemetry.allocatedGpuBytes).toBeLessThanOrEqual(tier3Budget.maxBufferBytes);
      expect(telemetry.activePointCount).toBeLessThanOrEqual(tier3Budget.maxActivePoints);
      frames++;
    }

    expect(frames).toBe(14);
    const finalTelemetry = manager.getTelemetry();
    expect(finalTelemetry.uploadedSectorCount).toBe(27);
    expect(finalTelemetry.cachedSectorCount).toBe(80);
    expect(finalTelemetry.pendingUploadCount).toBe(0);

    manager.dispose();
  });

  describe('Reactive Device Tier Subscription', () => {
    it('keeps 1-ring activeSet at 27, expands prefetch cache to 80, and notifies listeners on tier2 -> tier3 upgrade when options.budget is omitted', async () => {
      vi.stubGlobal('navigator', { hardwareConcurrency: 6, deviceMemory: 8 });
      const fetcher = createMockFetcher();
      const manager = new SectorStreamingManager({
        fetcher,
        gpuResourceFactory: createTrackingGpuFactory(),
      });

      const initialPlan = await manager.updateCameraPosition([0, 0, 0]);
      expect(initialPlan.activeSectorIds.length).toBe(27);
      expect(manager.getTelemetry().tier).toBe('tier2');
      expect(manager.getTelemetry().cachedSectorCount).toBe(40);

      const listener = vi.fn();
      manager.subscribe(listener);

      registerWebGLGpuTelemetry({
        gpuRenderer: 'NVIDIA GeForce RTX 4090',
        maxTextureSize: 16384,
        maxVertexAttribs: 16,
      });

      await vi.waitFor(() => {
        expect(listener).toHaveBeenCalled();
      });

      const upgraded = manager.getTelemetry();
      expect(upgraded.tier).toBe('tier3');
      expect(upgraded.activeSectorCount).toBe(27);
      expect(upgraded.pendingUploadCount).toBe(27);
      expect(upgraded.cachedSectorCount).toBe(80);
      expect(listener).toHaveBeenCalled();

      manager.dispose();
    });

    it('shrinks activeSet to 12, demotes departed/excess uploaded sectors, and enforces LRU capacity on tier2 -> tier1 downgrade', async () => {
      vi.stubGlobal('navigator', { hardwareConcurrency: 6, deviceMemory: 8 });
      const fetcher = createMockFetcher();
      const manager = new SectorStreamingManager({
        fetcher,
        gpuResourceFactory: createTrackingGpuFactory(),
      });

      await manager.updateCameraPosition([0, 0, 0]);
      while (manager.hasPendingUploads()) {
        manager.processFrameUploads(10);
      }
      expect(manager.getTelemetry().uploadedSectorCount).toBe(27);
      expect(manager.getTelemetry().cachedSectorCount).toBe(40);

      registerWebGLGpuTelemetry({ gpuRenderer: 'SwiftShader' });

      // Immediate synchronous downgrade trimming
      const immediateTelemetry = manager.getTelemetry();
      expect(immediateTelemetry.tier).toBe('tier1');
      expect(immediateTelemetry.uploadedSectorCount).toBeLessThanOrEqual(
        DEVICE_TIER_BUDGETS.tier1.maxActiveSectors,
      );
      expect(immediateTelemetry.allocatedGpuBytes).toBeLessThanOrEqual(
        DEVICE_TIER_BUDGETS.tier1.maxBufferBytes,
      );
      expect(immediateTelemetry.activePointCount).toBeLessThanOrEqual(
        DEVICE_TIER_BUDGETS.tier1.maxActivePoints,
      );

      await vi.waitFor(() => {
        expect(manager.getTelemetry().activeSectorCount).toBe(12);
        expect(manager.getTelemetry().cachedSectorCount).toBeLessThanOrEqual(
          DEVICE_TIER_BUDGETS.tier1.lruCacheMaxSectors,
        );
      });

      expect(customDisposedIds.length).toBeGreaterThanOrEqual(15);

      manager.dispose();
    });

    it('demotes farthest uploaded sectors by distanceSq when active points exceed downgraded budget', async () => {
      vi.stubGlobal('navigator', { hardwareConcurrency: 6, deviceMemory: 8 });
      // 10,000 stars per sector: 8 sectors = 80,000 pts (> tier1 75,000 maxActivePoints, <= tier2 200,000)
      const denseFetcher = vi.fn(async (sectorId: string, priority: 'high' | 'low') => {
        fetchCalls.push({ sectorId, priority });
        let buf = mockBuffers.get(sectorId);
        if (!buf) {
          buf = createMockSectorBuffer(sectorId, [0, 0, 0], 10_000);
          mockBuffers.set(sectorId, buf);
        }
        return buf;
      });

      const manager = new SectorStreamingManager({
        fetcher: denseFetcher,
        gpuResourceFactory: createTrackingGpuFactory(),
      });

      await manager.updateCameraPosition([0, 0, 0]);
      manager.processFrameUploads(8);
      expect(manager.getTelemetry().uploadedSectorCount).toBe(8);
      expect(manager.getTelemetry().activePointCount).toBe(80_000);

      registerWebGLGpuTelemetry({ gpuRenderer: 'SwiftShader' });

      const afterDowngrade = manager.getTelemetry();
      expect(afterDowngrade.uploadedSectorCount).toBe(7);
      expect(afterDowngrade.activePointCount).toBe(70_000);
      expect(afterDowngrade.activePointCount).toBeLessThanOrEqual(
        DEVICE_TIER_BUDGETS.tier1.maxActivePoints,
      );
      expect(customDisposedIds.length).toBe(1);

      await vi.waitFor(() => {
        expect(manager.getTelemetry().activeSectorCount).toBe(12);
      });

      manager.dispose();
    });

    it('does not react to tier changes when options.budget is explicitly pinned or after dispose()', async () => {
      vi.stubGlobal('navigator', { hardwareConcurrency: 6, deviceMemory: 8 });
      const fetcher = createMockFetcher();
      const pinnedManager = new SectorStreamingManager({
        budget: DEVICE_TIER_BUDGETS.tier2,
        fetcher,
        gpuResourceFactory: createTrackingGpuFactory(),
      });

      await pinnedManager.updateCameraPosition([0, 0, 0]);
      registerWebGLGpuTelemetry({ gpuRenderer: 'SwiftShader' });
      expect(pinnedManager.getTelemetry().tier).toBe('tier2');
      expect(pinnedManager.getTelemetry().activeSectorCount).toBe(27);
      pinnedManager.dispose();

      resetDeviceTierRuntimeState();
      const unpinnedManager = new SectorStreamingManager({
        fetcher,
        gpuResourceFactory: createTrackingGpuFactory(),
      });
      await unpinnedManager.updateCameraPosition([0, 0, 0]);
      unpinnedManager.dispose();

      const callsAtDispose = fetchCalls.length;
      registerWebGLGpuTelemetry({
        gpuRenderer: 'NVIDIA GeForce RTX 4090',
        maxTextureSize: 16384,
        maxVertexAttribs: 16,
      });
      expect(fetchCalls.length).toBe(callsAtDispose);
    });
  });

  describe('C-2: GPU budget deferral and re-promotion', () => {
    it('moves budget-blocked active sectors out of pendingUploadQueue so hasPendingUploads() stops spinning', async () => {
      // Each sector has 10,000 points; tier1 maxActivePoints is 75,000 -> at most 7 sectors fit.
      // 12 active sectors are fetched; 5 cannot fit in GPU point budget.
      const denseFetcher = vi.fn(async (sectorId: string, priority: 'high' | 'low') => {
        fetchCalls.push({ sectorId, priority });
        let buf = mockBuffers.get(sectorId);
        if (!buf) {
          buf = createMockSectorBuffer(sectorId, [0, 0, 0], 10_000);
          mockBuffers.set(sectorId, buf);
        }
        return buf;
      });

      const manager = new SectorStreamingManager({
        budget: DEVICE_TIER_BUDGETS.tier1,
        fetcher: denseFetcher,
        gpuResourceFactory: createTrackingGpuFactory(),
      });

      await manager.updateCameraPosition([10, 10, 10]);
      expect(manager.hasPendingUploads()).toBe(true);

      // Process uploads frame by frame (maxGpuUploadsPerFrame = 1 on tier1)
      let frames = 0;
      while (manager.hasPendingUploads() && frames < 20) {
        manager.processFrameUploads();
        frames++;
      }

      expect(frames).toBeLessThan(20);
      expect(manager.hasPendingUploads()).toBe(false);
      expect(manager.getTelemetry().uploadedSectorCount).toBe(7);
      expect(manager.getTelemetry().pendingUploadCount).toBe(0);

      // Calling updateCameraPosition with the same activeSet and no freed space must NOT re-queue deferred sectors
      await manager.updateCameraPosition([10.1, 10.1, 10.1]);
      expect(manager.hasPendingUploads()).toBe(false);

      manager.dispose();
    });

    it('re-promotes budget-deferred active sectors when departed uploaded sectors are demoted or budget upgrades', async () => {
      const denseFetcher = vi.fn(async (sectorId: string, priority: 'high' | 'low') => {
        fetchCalls.push({ sectorId, priority });
        let buf = mockBuffers.get(sectorId);
        if (!buf) {
          buf = createMockSectorBuffer(sectorId, [0, 0, 0], 10_000);
          mockBuffers.set(sectorId, buf);
        }
        return buf;
      });

      vi.stubGlobal('navigator', { hardwareConcurrency: 6, deviceMemory: 8 });
      registerWebGLGpuTelemetry({ gpuRenderer: 'SwiftShader' });
      const manager = new SectorStreamingManager({
        fetcher: denseFetcher,
        gpuResourceFactory: createTrackingGpuFactory(),
      });

      // tier1: 12 active sectors of 10k pts each, maxActivePoints = 75k -> 7 upload, 5 deferred
      await manager.updateCameraPosition([0, 0, 0]);
      while (manager.hasPendingUploads()) {
        manager.processFrameUploads(10);
      }
      expect(manager.getTelemetry().uploadedSectorCount).toBe(7);
      expect(manager.hasPendingUploads()).toBe(false);

      // Move camera so some uploaded sectors depart and space frees up for deferred active sectors
      await manager.updateCameraPosition([25, 0, 0]);
      expect(manager.hasPendingUploads()).toBe(true);
      while (manager.hasPendingUploads()) {
        manager.processFrameUploads(10);
      }
      expect(manager.getTelemetry().uploadedSectorCount).toBe(7);
      expect(manager.hasPendingUploads()).toBe(false);

      // Upgrade tier1 -> tier3 (maxActivePoints: 350_000): deferred sectors must be promoted and uploaded
      const listener = vi.fn();
      manager.subscribe(listener);
      registerWebGLGpuTelemetry({
        gpuRenderer: 'NVIDIA GeForce RTX 4090',
        maxTextureSize: 16384,
        maxVertexAttribs: 16,
      });

      await vi.waitFor(() => {
        expect(manager.getTelemetry().tier).toBe('tier3');
      });
      expect(manager.hasPendingUploads()).toBe(true);
      while (manager.hasPendingUploads()) {
        manager.processFrameUploads(20);
      }
      expect(manager.getTelemetry().uploadedSectorCount).toBe(27);
      expect(manager.hasPendingUploads()).toBe(false);

      manager.dispose();
    });
  });

  describe('H-4a: Concurrent updateCameraPosition sequencing', () => {
    it('suppresses stale notifyListeners() when an earlier updateCameraPosition settles after a newer one', async () => {
      let resolveSlowFirst: (buf: ArrayBuffer | null) => void = () => {};
      const slowFirstPromise = new Promise<ArrayBuffer | null>((resolve) => {
        resolveSlowFirst = resolve;
      });

      let firstCall = true;
      const fetcher = vi.fn(async (sectorId: string) => {
        if (firstCall && sectorId === 'sector_+000_+000_+000') {
          firstCall = false;
          return slowFirstPromise;
        }
        return createMockSectorBuffer(sectorId);
      });

      const manager = new SectorStreamingManager({
        budget: DEVICE_TIER_BUDGETS.tier1,
        fetcher,
        gpuResourceFactory: createTrackingGpuFactory(),
      });

      const listener = vi.fn();
      manager.subscribe(listener);

      const p1 = manager.updateCameraPosition([0, 0, 0]);
      const p2 = manager.updateCameraPosition([100, 100, 100]);

      await p2;
      expect(listener).toHaveBeenCalledTimes(1);

      resolveSlowFirst(createMockSectorBuffer('sector_+000_+000_+000'));
      await p1;

      expect(listener).toHaveBeenCalledTimes(1);
      manager.dispose();
    });
  });
});
