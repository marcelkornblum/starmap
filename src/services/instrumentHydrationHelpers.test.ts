import { describe, it, expect } from 'vitest';
import {
  computeBoxMinDistSq,
  scanSectorWithinSphere,
  partitionAndSortHits,
  evictStaleMetadata,
  resolveHitsSummaries,
  executeStarHydration,
} from './instrumentHydrationHelpers';
import type { SpatialStarHit } from './instrumentHydrationService';
import type { SystemSummaryNode } from '../types/astro';

describe('instrumentHydrationHelpers', () => {
  describe('computeBoxMinDistSq', () => {
    it('returns 0 when focus point is inside the box', () => {
      const distSq = computeBoxMinDistSq(10, 10, 10, 0, 0, 0, 25);
      expect(distSq).toBe(0);
    });

    it('computes correct squared distance when focus point is outside the box', () => {
      const distSq = computeBoxMinDistSq(-5, 10, 10, 0, 0, 0, 25);
      expect(distSq).toBe(25);
    });
  });

  describe('scanSectorWithinSphere', () => {
    it('populates seenHashes for stars inside query radius', () => {
      const mockSector = {
        sectorId: 'test-sector',
        decoded: {
          header: {
            magic: 0x53544152,
            version: 1,
            count: 2,
            sectorSize: 25,
            origin: [0, 0, 0] as [number, number, number],
          },
          positions: new Float32Array([1, 1, 1, 100, 100, 100]),
          ids: new Uint32Array([1001, 1002]),
          types: new Uint8Array([1, 1]),
          subtypes: new Uint8Array([0, 0]),
          luminosityClasses: new Uint8Array([5, 5]),
          temperatures: new Uint16Array([5500, 6000]),
          interleavedFloats: new Float32Array(0),
          interleavedUints: new Uint32Array(0),
          buffer: new ArrayBuffer(0),
        },
      };

      const seenHashes = new Map<number, SpatialStarHit>();
      scanSectorWithinSphere(mockSector, 0, 0, 0, 100, 25, seenHashes);

      expect(seenHashes.has(1001)).toBe(true);
      expect(seenHashes.has(1002)).toBe(false);
      const hit = seenHashes.get(1001)!;
      expect(hit.inInnerAperture).toBe(true);
      expect(hit.sectorId).toBe('test-sector');
    });
  });

  describe('partitionAndSortHits', () => {
    it('partitions hits into active and lead buffer and sorts by distance', () => {
      const seenHashes = new Map<number, SpatialStarHit>([
        [
          1,
          {
            idHash: 1,
            x: 0,
            y: 0,
            z: 5,
            distancePc: 5,
            inInnerAperture: true,
          },
        ],
        [
          2,
          {
            idHash: 2,
            x: 0,
            y: 0,
            z: 2,
            distancePc: 2,
            inInnerAperture: true,
          },
        ],
        [
          3,
          {
            idHash: 3,
            x: 0,
            y: 0,
            z: 10,
            distancePc: 10,
            inInnerAperture: false,
          },
        ],
      ]);

      const result = partitionAndSortHits(seenHashes);
      expect(result.activeStars.map((s) => s.idHash)).toEqual([2, 1]);
      expect(result.leadBufferStars.map((s) => s.idHash)).toEqual([3]);
      expect(result.allPerimeterHashes.has(1)).toBe(true);
      expect(result.allPerimeterHashes.has(2)).toBe(true);
      expect(result.allPerimeterHashes.has(3)).toBe(true);
    });
  });

  describe('evictStaleMetadata', () => {
    it('evicts entries from hydratedMap and unresolvableHashes outside perimeter', () => {
      const hydratedMap = new Map<number, SystemSummaryNode>([
        [1, { id: 'star-1', name: 'Star 1' } as unknown as SystemSummaryNode],
        [2, { id: 'star-2', name: 'Star 2' } as unknown as SystemSummaryNode],
      ]);
      const unresolvable = new Set<number>([3, 4]);
      const perimeter = new Set<number>([1, 4]);

      const evicted = evictStaleMetadata(hydratedMap, unresolvable, perimeter);

      expect(evicted).toBe(1);
      expect(hydratedMap.has(1)).toBe(true);
      expect(hydratedMap.has(2)).toBe(false);
      expect(unresolvable.has(4)).toBe(true);
      expect(unresolvable.has(3)).toBe(false);
    });
  });

  describe('resolveHitsSummaries', () => {
    it('collects hydrated summaries for hits', () => {
      const node1 = { id: 'star-1' } as unknown as SystemSummaryNode;
      const hydratedMap = new Map<number, SystemSummaryNode>([[10, node1]]);
      const hits: SpatialStarHit[] = [
        { idHash: 10, x: 0, y: 0, z: 0, distancePc: 1, inInnerAperture: true },
        { idHash: 20, x: 0, y: 0, z: 0, distancePc: 2, inInnerAperture: true },
      ];

      const summaries = resolveHitsSummaries(hits, hydratedMap);
      expect(summaries).toEqual([node1]);
    });
  });

  describe('executeStarHydration', () => {
    it('hydrates and adds to hydratedMap when in perimeter', async () => {
      const node = { id: 'test-node' } as unknown as SystemSummaryNode;
      const hydratedMap = new Map<number, SystemSummaryNode>();
      const unresolvable = new Set<number>();
      const perimeter = new Set<number>([123]);

      const res = await executeStarHydration(
        123,
        async () => node,
        () => false,
        (h) => perimeter.has(h),
        hydratedMap,
        unresolvable,
      );

      expect(res).toBe(node);
      expect(hydratedMap.get(123)).toBe(node);
      expect(unresolvable.size).toBe(0);
    });

    it('marks unresolvable if hydration returns undefined', async () => {
      const hydratedMap = new Map<number, SystemSummaryNode>();
      const unresolvable = new Set<number>();
      const perimeter = new Set<number>([456]);

      const res = await executeStarHydration(
        456,
        async () => undefined,
        () => false,
        (h) => perimeter.has(h),
        hydratedMap,
        unresolvable,
      );

      expect(res).toBeUndefined();
      expect(hydratedMap.size).toBe(0);
      expect(unresolvable.has(456)).toBe(true);
    });
  });
});
