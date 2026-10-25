import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  DEFAULT_INSTRUMENT_LEAD_BUFFER_PC,
  querySectorsWithinInstrumentSphere,
  InstrumentHydrationBridge,
  type SectorQueryInput,
} from '../instrumentHydrationService';
import {
  getCachedSummaryNodeByHash,
  fetchSummaryNodeByHash,
  clearDetailsRepositoryCache,
} from '../../data/detailsRepository';
import { fnv1a32, encodeBinarySector, decodeBinarySector } from '../../utils/binarySectorCodec';
import type { SectorPartitionManifest, SystemSummaryNode } from '../../types/astro';

function createMockSector(
  sectorId: string,
  origin: [number, number, number],
  stars: Array<{ id: string; x: number; y: number; z: number }>,
): SectorQueryInput {
  const manifest: SectorPartitionManifest = {
    sectorId,
    bounds: {
      min: { x: origin[0], y: origin[1], z: origin[2] },
      max: { x: origin[0] + 25, y: origin[1] + 25, z: origin[2] + 25 },
    },
    count: stars.length,
    systems: stars.map((s) => ({
      id: s.id,
      name: s.id,
      x: s.x,
      y: s.y,
      z: s.z,
      dist: Math.hypot(s.x, s.y, s.z),
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
  const buffer = encoded.buffer.slice(
    encoded.byteOffset,
    encoded.byteOffset + encoded.byteLength,
  ) as ArrayBuffer;
  const decoded = decodeBinarySector(buffer);
  return { sectorId, decoded };
}

function createMockSummaryNode(id: string, x = 0, y = 0, z = 0): SystemSummaryNode {
  return {
    id,
    name: id,
    x,
    y,
    z,
    dist: Math.hypot(x, y, z),
    mag: 5,
    absmag: 4.8,
    spect: 'G2V',
    starCount: 1,
    planetCount: 0,
    hasHabitableCandidate: false,
    sectorId: 'sector_+000_+000_+000',
  };
}

describe('instrumentHydrationService', () => {
  beforeEach(() => {
    clearDetailsRepositoryCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearDetailsRepositoryCache();
  });

  describe('detailsRepository hash-based lookup', () => {
    it('synchronously and asynchronously resolves summary nodes by 32-bit FNV-1a hash', async () => {
      const tauCetiHash = fnv1a32('tau-ceti');
      const solHash = fnv1a32('sol');

      expect(getCachedSummaryNodeByHash(tauCetiHash)).toBeUndefined();

      // Mock fetch for tau-ceti summary bucket
      const mockFetch = vi.fn(async (url: string | URL | Request) => {
        const urlStr = String(url);
        if (urlStr.includes('/data/summaries/')) {
          // Sharded bucket format: { d: { id: compactRecord } }
          const payload = {
            d: {
              'tau-ceti': {
                i: 'tau-ceti',
                n: 'Tau Ceti',
                p: [-1.6, 2.1, -2.8],
                m: 3.5,
                M: 5.68,
                s: 'G8V',
                u: 1,
                k: 4,
                h: 1,
                q: 'sector_-025_+025_-025',
              },
              sol: {
                i: 'sol',
                n: 'Sol',
                p: [0, 0, 0],
                m: -26.7,
                M: 4.83,
                s: 'G2V',
                u: 1,
                k: 8,
                h: 1,
                q: 'sector_+000_+000_+000',
              },
            },
          };
          return new Response(JSON.stringify(payload), { status: 200 });
        }
        return new Response('Not Found', { status: 404 });
      });

      // Async fetch by hash
      const node = await fetchSummaryNodeByHash(tauCetiHash, mockFetch as unknown as typeof fetch);
      expect(node).toBeDefined();
      expect(node?.id).toBe('tau-ceti');
      expect(node?.name).toBe('Tau Ceti');

      // Now synchronous lookup works immediately from cached bucket
      const syncNode = getCachedSummaryNodeByHash(tauCetiHash);
      expect(syncNode).toEqual(node);

      // Fetch sol by hash
      const solNode = await fetchSummaryNodeByHash(solHash, mockFetch as unknown as typeof fetch);
      expect(solNode).toBeDefined();
      expect(solNode?.id).toBe('sol');
      expect(getCachedSummaryNodeByHash(solHash)).toEqual(solNode);

      // Invalid or non-finite hashes return undefined
      expect(getCachedSummaryNodeByHash(NaN)).toBeUndefined();
      expect(await fetchSummaryNodeByHash(NaN)).toBeUndefined();
    });
  });

  describe('querySectorsWithinInstrumentSphere', () => {
    it('performs broad-phase AABB rejection of distant sectors in O(1)', () => {
      const sectorNear = createMockSector('sector_+000_+000_+000', [0, 0, 0], [
        { id: 'star-near', x: 2, y: 2, z: 2 },
      ]);
      const sectorFar = createMockSector('sector_+100_+100_+100', [100, 100, 100], [
        { id: 'star-far', x: 105, y: 105, z: 105 },
      ]);

      const result = querySectorsWithinInstrumentSphere(
        [sectorNear, sectorFar],
        [0, 0, 0],
        5.0, // aperture
        2.0, // lead buffer
      );

      expect(result.activeStars.length).toBe(1);
      expect(result.activeStars[0]?.idHash).toBe(fnv1a32('star-near'));
      expect(result.allPerimeterHashes.has(fnv1a32('star-far'))).toBe(false);
    });

    it('accurately divides stars into inner aperture (<= R) and lead buffer (R, R + 2pc]', () => {
      // Focus at [0, 0, 0]
      // Star 1 at [3, 0, 0] -> dist 3 <= 5 -> inner aperture
      // Star 2 at [6, 0, 0] -> dist 6 in (5, 7] -> lead buffer
      // Star 3 at [8, 0, 0] -> dist 8 > 7 -> out of range
      const sector = createMockSector('sector_+000_+000_+000', [0, 0, 0], [
        { id: 'star-aperture', x: 3, y: 0, z: 0 },
        { id: 'star-lead', x: 6, y: 0, z: 0 },
        { id: 'star-outside', x: 8, y: 0, z: 0 },
      ]);

      const result = querySectorsWithinInstrumentSphere(
        [sector],
        [0, 0, 0],
        5.0,
        2.0,
      );

      expect(result.apertureRadiusPc).toBe(5.0);
      expect(result.leadBufferPc).toBe(2.0);
      expect(result.queryRadiusPc).toBe(7.0);

      expect(result.activeStars.length).toBe(1);
      expect(result.activeStars[0]?.idHash).toBe(fnv1a32('star-aperture'));
      expect(result.activeStars[0]?.inInnerAperture).toBe(true);

      expect(result.leadBufferStars.length).toBe(1);
      expect(result.leadBufferStars[0]?.idHash).toBe(fnv1a32('star-lead'));
      expect(result.leadBufferStars[0]?.inInnerAperture).toBe(false);

      expect(result.allPerimeterHashes.has(fnv1a32('star-aperture'))).toBe(true);
      expect(result.allPerimeterHashes.has(fnv1a32('star-lead'))).toBe(true);
      expect(result.allPerimeterHashes.has(fnv1a32('star-outside'))).toBe(false);
    });

    it('sorts hits nearest-first and deduplicates identical idHashes across sectors', () => {
      const starHash = fnv1a32('shared-star');
      const sector1 = createMockSector('sector_+000_+000_+000', [0, 0, 0], [
        { id: 'shared-star', x: 4, y: 0, z: 0 },
        { id: 'star-close', x: 1, y: 0, z: 0 },
      ]);
      const sector2 = createMockSector('sector_+025_+000_+000', [25, 0, 0], [
        // Duplicate star reported in second sector with larger distance
        { id: 'shared-star', x: 4.5, y: 0, z: 0 },
      ]);

      const result = querySectorsWithinInstrumentSphere(
        [sector1, sector2],
        [0, 0, 0],
        10.0,
        DEFAULT_INSTRUMENT_LEAD_BUFFER_PC,
      );

      // Deduplication keeps closer hit
      const sharedHits = result.activeStars.filter((h) => h.idHash === starHash);
      expect(sharedHits.length).toBe(1);
      expect(sharedHits[0]?.distancePc).toBe(4);

      // Nearest first sorting
      expect(result.activeStars[0]?.idHash).toBe(fnv1a32('star-close'));
      expect(result.activeStars[1]?.idHash).toBe(starHash);
    });

    it('handles non-finite focus coordinates and negative radii defensively', () => {
      const sector = createMockSector('sector_+000_+000_+000', [0, 0, 0], [
        { id: 'star-zero', x: 0, y: 0, z: 0 },
      ]);

      const result = querySectorsWithinInstrumentSphere(
        [sector],
        [NaN, Infinity, -Infinity],
        -5.0,
        -2.0,
      );

      expect(result.focusPointPc).toEqual([0, 0, 0]);
      expect(result.apertureRadiusPc).toBe(0);
      expect(result.leadBufferPc).toBe(0);
      expect(result.queryRadiusPc).toBe(0);

      // Star at [0, 0, 0] exactly matches dist 0 <= 0
      expect(result.activeStars.length).toBe(1);
    });
  });

  describe('InstrumentHydrationBridge', () => {
    it('triggers on-demand hydration for active stars and lead buffer stars', async () => {
      const hydratedNodes = new Map<number, SystemSummaryNode>();
      const hydrateByHash = vi.fn(async (idHash: number) => {
        const id = idHash === fnv1a32('star-active') ? 'star-active' : 'star-lead';
        const node = createMockSummaryNode(id);
        hydratedNodes.set(idHash, node);
        return node;
      });

      const bridge = new InstrumentHydrationBridge({ hydrateByHash });

      const sector = createMockSector('sector_+000_+000_+000', [0, 0, 0], [
        { id: 'star-active', x: 2, y: 0, z: 0 },
        { id: 'star-lead', x: 6, y: 0, z: 0 },
      ]);

      const state = await bridge.updateInstrumentPerimeter([sector], [0, 0, 0], 5.0, 2.0);

      expect(hydrateByHash).toHaveBeenCalledTimes(2);
      expect(state.activeSummaries.length).toBe(1);
      expect(state.activeSummaries[0]?.id).toBe('star-active');
      expect(state.leadBufferSummaries.length).toBe(1);
      expect(state.leadBufferSummaries[0]?.id).toBe('star-lead');
      expect(state.hydratedByHash.size).toBe(2);

      bridge.dispose();
    });

    it('performs zero duplicate network fetches when a lead-buffer star transitions into the active aperture', async () => {
      const hydrateByHash = vi.fn(async (idHash: number) => {
        return createMockSummaryNode(`star-${idHash}`);
      });

      const bridge = new InstrumentHydrationBridge({ hydrateByHash });

      // Star is initially in lead buffer (distance 6, aperture 5, lead 2)
      const sector = createMockSector('sector_+000_+000_+000', [0, 0, 0], [
        { id: 'star-moving', x: 6, y: 0, z: 0 },
      ]);

      const state1 = await bridge.updateInstrumentPerimeter([sector], [0, 0, 0], 5.0, 2.0);
      expect(state1.leadBufferSummaries.length).toBe(1);
      expect(state1.activeSummaries.length).toBe(0);
      expect(hydrateByHash).toHaveBeenCalledTimes(1);

      // Camera dollies forward to [2, 0, 0] so star is at distance 4 (<= 5 inner aperture)
      const state2 = await bridge.updateInstrumentPerimeter([sector], [2, 0, 0], 5.0, 2.0);
      expect(state2.activeSummaries.length).toBe(1);
      expect(state2.leadBufferSummaries.length).toBe(0);

      // ZERO additional network requests!
      expect(hydrateByHash).toHaveBeenCalledTimes(1);

      bridge.dispose();
    });

    it('evicts transient metadata when camera moves away and stars exit the instrument perimeter', async () => {
      const hydrateByHash = vi.fn(async (idHash: number) => {
        return createMockSummaryNode(`star-${idHash}`);
      });

      const bridge = new InstrumentHydrationBridge({ hydrateByHash });

      const sector = createMockSector('sector_+000_+000_+000', [0, 0, 0], [
        { id: 'star-orig', x: 1, y: 0, z: 0 },
      ]);

      // Position 1: star-orig is in perimeter
      const state1 = await bridge.updateInstrumentPerimeter([sector], [0, 0, 0], 5.0, 2.0);
      expect(state1.activeSummaries.length).toBe(1);
      expect(state1.evictedMetadataCount).toBe(0);

      const origHash = fnv1a32('star-orig');
      expect(bridge.getHydratedSummary(origHash)).toBeDefined();

      // Position 2: camera moves far away to [50, 50, 50]
      const state2 = await bridge.updateInstrumentPerimeter([sector], [50, 50, 50], 5.0, 2.0);
      expect(state2.activeSummaries.length).toBe(0);
      expect(state2.evictedMetadataCount).toBe(1);
      expect(bridge.getEvictedMetadataCount()).toBe(1);

      // star-orig was evicted from memory
      expect(bridge.getHydratedSummary(origHash)).toBeUndefined();

      bridge.dispose();
    });

    it('guards against stale hydration race conditions when camera moves away during fetch', async () => {
      let resolveSlowFetch: (node: SystemSummaryNode | undefined) => void;
      const slowFetchPromise = new Promise<SystemSummaryNode | undefined>((resolve) => {
        resolveSlowFetch = resolve;
      });

      const hydrateByHash = vi.fn(async (idHash: number) => {
        if (idHash === fnv1a32('star-slow')) {
          return slowFetchPromise;
        }
        return createMockSummaryNode(`star-${idHash}`);
      });

      const bridge = new InstrumentHydrationBridge({ hydrateByHash });

      const sector = createMockSector('sector_+000_+000_+000', [0, 0, 0], [
        { id: 'star-slow', x: 1, y: 0, z: 0 },
      ]);

      // Trigger update 1 where star-slow is inside perimeter
      const p1 = bridge.updateInstrumentPerimeter([sector], [0, 0, 0], 5.0, 2.0);

      // Move camera away before slow fetch completes
      await bridge.updateInstrumentPerimeter([sector], [50, 50, 50], 5.0, 2.0);

      // Now slow fetch completes
      const slowHash = fnv1a32('star-slow');
      resolveSlowFetch!(createMockSummaryNode('star-slow', 1, 0, 0));
      await p1;

      // star-slow must NOT be cached because it was outside perimeter upon resolution
      expect(bridge.getHydratedSummary(slowHash)).toBeUndefined();

      bridge.dispose();
    });

    it('caches unresolvable hashes within perimeter to prevent repeated query thrashing', async () => {
      const hydrateByHash = vi.fn(async () => undefined);
      const bridge = new InstrumentHydrationBridge({ hydrateByHash });

      const sector = createMockSector('sector_+000_+000_+000', [0, 0, 0], [
        { id: 'star-404', x: 1, y: 0, z: 0 },
      ]);

      await bridge.updateInstrumentPerimeter([sector], [0, 0, 0], 5.0, 2.0);
      expect(hydrateByHash).toHaveBeenCalledTimes(1);

      // Second update at same position does not re-query unresolvable hash
      await bridge.updateInstrumentPerimeter([sector], [0, 0, 0], 5.0, 2.0);
      expect(hydrateByHash).toHaveBeenCalledTimes(1);

      bridge.dispose();
    });
  });
});
