import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import {
  computeSectorRings,
  createDefaultSectorGeometry,
  createSceneSectorPointsFactory,
  SectorStreamingManager,
  type DisposableGpuResource,
} from '../sectorStreamingService';
import { DEVICE_TIER_BUDGETS } from '../deviceTierService';
import { encodeBinarySector, decodeBinarySector } from '../../utils/binarySectorCodec';
import type { SectorPartitionManifest } from '../../types/astro';

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

describe('sectorStreamingService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('computeSectorRings', () => {
    const tier2Budget = DEVICE_TIER_BUDGETS.tier2; // maxActiveSectors: 27, lruCacheMaxSectors: 40, prefetchRingRadius: 2
    const tier1Budget = DEVICE_TIER_BUDGETS.tier1; // maxActiveSectors: 12, lruCacheMaxSectors: 16, prefetchRingRadius: 1

    it('resolves centerSectorId and nearest-first 1-ring at origin [0, 0, 0]', () => {
      const plan = computeSectorRings([0, 0, 0], tier2Budget);
      expect(plan.centerSectorId).toBe('sector_+000_+000_+000');
      expect(plan.centerOrigin).toEqual([0, 0, 0]);

      // At [0, 0, 0], sector_+000_+000_+000 is one of the closest sectors (corner at origin)
      // Due to '+' tie-breaker, it is first in the list
      expect(plan.activeSectorIds[0]).toBe('sector_+000_+000_+000');

      // Tier 2 allows up to 27 active sectors; 1-ring has 27 sectors
      expect(plan.activeSectorIds.length).toBe(27);
    });

    it('caps activeSectorIds to budget.maxActiveSectors on Tier 1 and overflows rest to prefetch', () => {
      const plan = computeSectorRings([0, 0, 0], tier1Budget);
      expect(plan.activeSectorIds.length).toBe(12);

      // Remaining 1-ring sectors overflow into prefetch
      // Total active + prefetch is capped to lruCacheMaxSectors (16 on Tier 1)
      expect(plan.prefetchSectorIds.length).toBe(4);
      expect(plan.activeSectorIds.length + plan.prefetchSectorIds.length).toBe(16);

      // Prefetch sectors must not overlap active sectors
      const activeSet = new Set(plan.activeSectorIds);
      for (const pref of plan.prefetchSectorIds) {
        expect(activeSet.has(pref)).toBe(false);
      }
    });

    it('handles negative and fractional coordinates accurately', () => {
      // [-12.6, 30.2, -5.0]
      // x: floor(-12.6 / 25) * 25 = -25
      // y: floor(30.2 / 25) * 25 = 25
      // z: floor(-5.0 / 25) * 25 = -25
      const plan = computeSectorRings([-12.6, 30.2, -5.0], tier2Budget);
      expect(plan.centerSectorId).toBe('sector_-025_+025_-025');
      expect(plan.centerOrigin).toEqual([-25, 25, -25]);
      expect(plan.activeSectorIds).toContain('sector_-025_+025_-025');
    });

    it('sanitises non-finite coordinates with fallback to [0, 0, 0]', () => {
      const plan = computeSectorRings([NaN, Infinity, -Infinity], tier2Budget);
      expect(plan.centerSectorId).toBe('sector_+000_+000_+000');
      expect(plan.centerOrigin).toEqual([0, 0, 0]);
    });

    it('strictly enforces activeSectorIds.length + prefetchSectorIds.length <= budget.lruCacheMaxSectors', () => {
      const plan = computeSectorRings([0, 0, 0], tier2Budget);
      expect(plan.activeSectorIds.length + plan.prefetchSectorIds.length).toBeLessThanOrEqual(
        tier2Budget.lruCacheMaxSectors,
      );
    });
  });

  describe('createDefaultSectorGeometry', () => {
    it('creates THREE.BufferGeometry with position, starId, and precomputed boundingSphere', () => {
      const buffer = createMockSectorBuffer('sector_+000_+000_+000', [0, 0, 0], 5);
      const decoded = decodeBinarySector(buffer);

      const geometry = createDefaultSectorGeometry(decoded);
      expect(geometry).toBeInstanceOf(THREE.BufferGeometry);

      const posAttr = geometry.getAttribute('position');
      expect(posAttr).toBeDefined();
      expect(posAttr.itemSize).toBe(3);
      expect(posAttr.count).toBe(5);

      const idAttr = geometry.getAttribute('starId');
      expect(idAttr).toBeDefined();
      expect(idAttr.itemSize).toBe(1);
      expect(idAttr.count).toBe(5);

      expect(geometry.boundingSphere).toBeDefined();
      expect(geometry.boundingSphere?.center).toEqual(new THREE.Vector3(12.5, 12.5, 12.5));
      // Radius of cube side 25 is 12.5 * sqrt(3) ~= 21.6506
      expect(geometry.boundingSphere?.radius).toBeCloseTo(12.5 * Math.sqrt(3), 4);

      geometry.dispose();
    });
  });

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

      // Verify priorities
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

      // Prefetch sectors remain as 'decoded' in RAM and are not automatically uploaded to GPU
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

      // Frame 1: uploads up to 2 sectors
      const frame1 = manager.processFrameUploads();
      expect(frame1.length).toBe(2);
      expect(manager.getTelemetry().uploadedSectorCount).toBe(2);
      expect(manager.getTelemetry().pendingUploadCount).toBe(25);

      // Frame 2: uploads next 2 sectors
      const frame2 = manager.processFrameUploads();
      expect(frame2.length).toBe(2);
      expect(manager.getTelemetry().uploadedSectorCount).toBe(4);
      expect(manager.getTelemetry().pendingUploadCount).toBe(23);

      manager.dispose();
    });

    it('promotes prefetched sector from RAM with 0 network re-fetches and disposes departed sector GPU resources', async () => {
      const fetcher = createMockFetcher();
      const manager = new SectorStreamingManager({
        budget: DEVICE_TIER_BUDGETS.tier1, // 12 active, 4 prefetch
        fetcher,
        gpuResourceFactory: createTrackingGpuFactory(),
      });

      // Initial position
      const plan1 = await manager.updateCameraPosition([0, 0, 0]);
      // Fully upload active sectors
      while (manager.getTelemetry().pendingUploadCount > 0) {
        manager.processFrameUploads(10);
      }
      expect(manager.getTelemetry().uploadedSectorCount).toBe(12);

      const prefetchedSectorId = plan1.prefetchSectorIds[0]!;
      expect(prefetchedSectorId).toBeDefined();

      const fetchCallsCountBefore = fetchCalls.length;

      // Move camera slightly into the prefetched sector region
      const match = /^sector_([+-]\d+)_([+-]\d+)_([+-]\d+)$/.exec(prefetchedSectorId);
      expect(match).not.toBeNull();
      const targetPos: [number, number, number] = [
        parseInt(match![1]!, 10) + 12.5,
        parseInt(match![2]!, 10) + 12.5,
        parseInt(match![3]!, 10) + 12.5,
      ];

      const plan2 = await manager.updateCameraPosition(targetPos);
      expect(plan2.activeSectorIds).toContain(prefetchedSectorId);

      // Prefetched sector was already cached in RAM -> no new fetch for this sector!
      const callsForPrefetched = fetchCalls
        .slice(fetchCallsCountBefore)
        .filter((c) => c.sectorId === prefetchedSectorId);
      expect(callsForPrefetched.length).toBe(0);

      // Sectors leaving the active ring had their GPU resource disposed
      expect(customDisposedIds.length).toBeGreaterThan(0);

      // A sector demoted from active ring to prefetch ring remains in RAM with disposed GPU resource
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

      // Position 1
      await manager.updateCameraPosition([0, 0, 0]);
      expect(manager.getTelemetry().cachedSectorCount).toBe(16);

      // Translate to a disjoint region [50, 50, 50] (distance 86.6 pc < 125 pc max catalog radius)
      await manager.updateCameraPosition([50, 50, 50]);

      // Telemetry should report evictions
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

      // Second update at same position should not re-query missing sectors
      await manager.updateCameraPosition([0, 0, 0]);
      expect(nullFetcher.mock.calls.length).toBe(initialCallCount);

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

      // Start update 1 where sector_+000_+000_+000 is active
      const p1 = manager.updateCameraPosition([0, 0, 0]);

      // Move camera far away before slow fetch completes
      await manager.updateCameraPosition([100, 100, 100]);

      // Now slow fetch finishes
      resolveSlowFetch!(createMockSectorBuffer('sector_+000_+000_+000'));
      await p1;

      // Process frame uploads at new position
      manager.processFrameUploads(10);

      // sector_+000_+000_+000 should NEVER have been uploaded to GPU
      expect(customFactoryCalls).not.toContain('sector_+000_+000_+000');

      manager.dispose();
    });
  });

  describe('createSceneSectorPointsFactory', () => {
    it('creates THREE.Points attached to group and detaches on dispose', () => {
      const group = new THREE.Group();
      const material = new THREE.PointsMaterial({ size: 2 });
      const factory = createSceneSectorPointsFactory(() => ({ group, material }));

      const buffer = createMockSectorBuffer('sector_+000_+000_+000', [0, 0, 0], 5);
      const decoded = decodeBinarySector(buffer);

      const resource = factory(decoded, 'sector_+000_+000_+000');
      expect(group.children.length).toBe(1);
      const points = group.children[0] as THREE.Points;
      expect(points.name).toBe('sector-points-sector_+000_+000_+000');
      expect(points.frustumCulled).toBe(true);

      resource.dispose();
      expect(group.children.length).toBe(0);
      material.dispose();
    });
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

      // Grid of 5 x 5 x 5 = 125 positions covering distinct sectors within 87 pc of origin
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

            // Invariant: allocated GPU resources minus disposed must strictly equal currently uploaded count
            expect(createdGeometriesCount - disposedGeometriesCount).toBe(telemetry.uploadedSectorCount);
          }
        }
      }

      expect(stepsCount).toBe(125);
      expect(createdGeometriesCount).toBeGreaterThan(100);

      // Final disposal must clean up 100% of remaining GPU resources
      manager.dispose();
      expect(disposedGeometriesCount).toBe(createdGeometriesCount);
    });
  });
});
