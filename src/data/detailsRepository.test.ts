import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearDetailsRepositoryCache,
  fetchDetailRecord,
  fetchDetailsRoutingTable,
  fetchSummaryNode,
  fetchSummaryNodeByHash,
  getCachedDetailRecord,
  getCachedSummaryNode,
  seedDetailRecord,
  seedSummaryNode,
  subscribeDetailsRepository,
  decodeDetailRecord,
  type DecodedDetailRecord,
} from './detailsRepository';
import { COMPACT_SOLAR_BODY_TAG } from '../config/referenceTargets';
import {
  DETAIL_RECORD_CACHE_LIMIT,
  SUMMARY_NODE_CACHE_LIMIT,
} from '../config/cacheConfig';
import { clearDataManifestCache, seedDataManifest } from './dataManifestRepository';
import { clearSearchRepositoryCache, fetchSearchShard } from './searchRepository';
import { fnv1a32 } from '../utils/binarySectorCodec';
import { getShardKey } from '../utils/compactDataCodec';
import type { SystemSummaryNode } from '../types/astro';

const makeRoutingResponse = (
  k: string[],
  s: Record<string, number>,
  d: Record<string, number>,
  version: unknown = 1,
) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: async () => ({
    ...(version !== undefined ? { v: version } : {}),
    k,
    s,
    d,
  }),
});

const makeSummaryResponse = (id: string, sectorId = 'sector_+000_+000_+000', version: unknown = 1) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: async () => ({
    ...(version !== undefined ? { v: version } : {}),
    i: sectorId,
    c: 1,
    d: {
      [id]: {
        n: `Star ${id}`,
        p: [1, 2, 3],
        m: 5.5,
        M: 4.2,
        s: 'G',
        c: 0.65,
      },
    },
  }),
});

const makeDetailResponse = (id: string, sectorId = 'sector_+000_+000_+000', version: unknown = 1) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: async () => ({
    ...(version !== undefined ? { v: version } : {}),
    i: sectorId,
    c: 1,
    d: {
      [id]: {
        t: 'sys',
        n: `System ${id}`,
        p: [1, 2, 3],
        S: [{ i: id, n: `Star ${id}`, c: 'A', s: 'G2V', m: 5.5, M: 4.2, rt: 'stellar-system' }],
        E: [],
      },
    },
  }),
});

describe('detailsRepository (hybrid spatial + domain sharding)', () => {
  beforeEach(() => {
    clearDetailsRepositoryCache();
    clearDataManifestCache();
    clearSearchRepositoryCache();
    vi.restoreAllMocks();
  });

  describe('AbortSignal forwarding and cancellation', () => {
    it('forwards AbortSignal to fetchImpl in fetchSummaryNode and cancels properly', async () => {
      const controller = new AbortController();
      controller.abort();

      const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.signal?.aborted) {
          throw new DOMException('The user aborted a request.', 'AbortError');
        }
        return makeSummaryResponse('test-1') as unknown as Response;
      });

      await expect(
        fetchSummaryNode('test-1', fetchMock as unknown as typeof fetch, controller.signal),
      ).rejects.toThrow(/aborted/);
    });

    it('forwards AbortSignal to fetchImpl in fetchSummaryNodeByHash with sectorId', async () => {
      const controller = new AbortController();
      controller.abort();

      const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.signal?.aborted) {
          throw new DOMException('The user aborted a request.', 'AbortError');
        }
        return makeSummaryResponse('test-hash-1') as unknown as Response;
      });

      const hash = fnv1a32('test-hash-1') >>> 0;
      await expect(
        fetchSummaryNodeByHash(
          hash,
          fetchMock as unknown as typeof fetch,
          controller.signal,
          'sector_+000_+000_+000',
        ),
      ).rejects.toThrow(/aborted/);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/data/summaries/sector_+000_+000_+000.json'),
        { signal: controller.signal },
      );
    });

    it('forwards AbortSignal to fetchImpl in fetchDetailRecord and cancels properly', async () => {
      const controller = new AbortController();
      controller.abort();

      const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.signal?.aborted) {
          throw new DOMException('The user aborted a request.', 'AbortError');
        }
        return makeDetailResponse('pha-00433') as unknown as Response;
      });

      await expect(
        fetchDetailRecord('pha-00433', fetchMock as unknown as typeof fetch, controller.signal),
      ).rejects.toThrow(/aborted/);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining(`/data/details/sol-minor/${getShardKey('pha-00433')}.json`),
        { signal: controller.signal },
      );
    });
  });

  describe('Bounded LRU cache eviction', () => {
    it('bounds RESOLVED_DETAIL_RECORD_CACHE to DETAIL_RECORD_CACHE_LIMIT', () => {
      for (let i = 0; i < DETAIL_RECORD_CACHE_LIMIT; i++) {
        const dummy: DecodedDetailRecord = {
          kind: 'structure',
          record: {
            id: `record-${i}`,
            name: `Structure ${i}`,
            type: 'EmissionNebula',
            x: 0,
            y: 0,
            z: 0,
            dist: 10,
            designations: [],
            description: 'test',
          },
        };
        seedDetailRecord(`record-${i}`, dummy);
      }

      expect(getCachedDetailRecord('record-0')).toBeDefined();
      expect(getCachedDetailRecord(`record-${DETAIL_RECORD_CACHE_LIMIT - 1}`)).toBeDefined();

      // Adding one more beyond limit should evict the least recently used
      // Since record-0 was accessed above, record-1 should be the oldest!
      const extra: DecodedDetailRecord = {
        kind: 'structure',
        record: {
          id: 'record-overflow',
          name: 'Structure Overflow',
          type: 'EmissionNebula',
          x: 0,
          y: 0,
          z: 0,
          dist: 10,
          designations: [],
          description: 'overflow',
        },
      };
      seedDetailRecord('record-overflow', extra);

      expect(getCachedDetailRecord('record-1')).toBeUndefined();
      expect(getCachedDetailRecord('record-0')).toBeDefined();
      expect(getCachedDetailRecord('record-overflow')).toBeDefined();
    });

    it('bounds RESOLVED_SUMMARY_NODE_CACHE to SUMMARY_NODE_CACHE_LIMIT', () => {
      for (let i = 0; i < SUMMARY_NODE_CACHE_LIMIT; i++) {
        const dummy: SystemSummaryNode = {
          id: `node-${i}`,
          name: `Star ${i}`,
          x: 1,
          y: 2,
          z: 3,
          dist: 3.74,
          mag: 5.5,
          absmag: 4.2,
          spect: 'G',
          ci: 0.65,
          starCount: 1,
          planetCount: 0,
          hasHabitableCandidate: false,
          sectorId: 'sector_0_0_0',
        };
        seedSummaryNode(`node-${i}`, dummy);
      }

      // Access node-0 so node-1 becomes the oldest
      expect(getCachedSummaryNode('node-0')).toBeDefined();

      // Seed one more beyond limit
      const extra: SystemSummaryNode = {
        id: 'node-overflow',
        name: 'Star Overflow',
        x: 1,
        y: 2,
        z: 3,
        dist: 3.74,
        mag: 5.5,
        absmag: 4.2,
        spect: 'G',
        ci: 0.65,
        starCount: 1,
        planetCount: 0,
        hasHabitableCandidate: false,
        sectorId: 'sector_0_0_0',
      };
      seedSummaryNode('node-overflow', extra);

      expect(getCachedSummaryNode('node-1')).toBeUndefined();
      expect(getCachedSummaryNode('node-0')).toBeDefined();
      expect(getCachedSummaryNode('node-overflow')).toBeDefined();
    });
  });

  describe('Cache subscription (AUD-087 & DEC-R042)', () => {
    it('notifies subscribers when summary cache updates', async () => {
      const listener = vi.fn();
      const unsubscribe = subscribeDetailsRepository(listener);

      const fetchMock = vi.fn(async (url: string | URL | Request) => {
        const urlStr = String(url);
        if (urlStr.includes('/data/details/routing.json')) {
          return makeRoutingResponse(
            ['sector_+000_+000_+000', 'sector_+025_+000_+000'],
            { 'sys-sub-1': 0, 'sys-sub-2': 1 },
            {},
          ) as unknown as Response;
        }
        if (urlStr.includes('sector_+025_+000_+000')) {
          return makeSummaryResponse('sys-sub-2', 'sector_+025_+000_+000') as unknown as Response;
        }
        return makeSummaryResponse('sys-sub-1', 'sector_+000_+000_+000') as unknown as Response;
      });
      await fetchSummaryNode('sys-sub-1', fetchMock as unknown as typeof fetch);

      expect(listener).toHaveBeenCalled();

      listener.mockClear();
      unsubscribe();
      await fetchSummaryNode('sys-sub-2', fetchMock as unknown as typeof fetch);
      expect(listener).not.toHaveBeenCalled();
    });

    it('notifies subscribers when detail cache updates', async () => {
      const listener = vi.fn();
      const unsubscribe = subscribeDetailsRepository(listener);

      const fetchMock = vi.fn(async (url: string | URL | Request) => {
        const urlStr = String(url);
        if (urlStr.includes('/data/details/routing.json')) {
          return makeRoutingResponse(
            ['sector_+000_+000_+000'],
            {},
            { 'sys-sub-3': 0 },
          ) as unknown as Response;
        }
        return makeDetailResponse('sys-sub-3') as unknown as Response;
      });
      await fetchDetailRecord('sys-sub-3', fetchMock as unknown as typeof fetch);

      expect(listener).toHaveBeenCalled();

      unsubscribe();
    });

    it('notifies subscribers when seeding summary or detail nodes', () => {
      const listener = vi.fn();
      const unsubscribe = subscribeDetailsRepository(listener);

      seedSummaryNode('seed-node-1', {
        id: 'seed-node-1',
        name: 'Seed Star',
        x: 0,
        y: 0,
        z: 0,
        dist: 0,
        mag: 0,
        absmag: 0,
        spect: 'G',
        ci: 0,
        starCount: 1,
        planetCount: 0,
        hasHabitableCandidate: false,
        sectorId: 'sector_0_0_0',
      });
      expect(listener).toHaveBeenCalledTimes(1);

      seedDetailRecord('seed-detail-1', {
        kind: 'structure',
        record: {
          id: 'seed-detail-1',
          name: 'Nebula',
          type: 'EmissionNebula',
          x: 0,
          y: 0,
          z: 0,
          dist: 10,
          designations: [],
          description: '',
        },
      });
      expect(listener).toHaveBeenCalledTimes(2);

      unsubscribe();
    });
  });

  describe('decodeDetailRecord & COMPACT_SOLAR_BODY_TAG (DEC-GBZ-004)', () => {
    it('decodes solar-body record using COMPACT_SOLAR_BODY_TAG discriminator', () => {
      expect(COMPACT_SOLAR_BODY_TAG).toBe('sol');

      const decoded = decodeDetailRecord(
        {
          t: COMPACT_SOLAR_BODY_TAG,
          n: 'Mars',
          k: 1,
          s: 'sol',
          r: 3389.5,
        },
        'mars',
      );

      expect(decoded.kind).toBe('solar-body');
      expect(decoded.record.id).toBe('mars');
      expect(decoded.record.name).toBe('Mars');
    });
  });

  describe('Hybrid spatial + domain detail routing & Schema version enforcement (M16)', () => {
    it('routes pha-/distant-/comet- minor bodies directly to details/sol-minor/<0..z>.json without routing.json', async () => {
      const bucket = getShardKey('pha-00433');
      const fetchMock = vi.fn(async (url: string | URL | Request) => {
        const urlStr = String(url);
        expect(urlStr).toBe(`/data/details/sol-minor/${bucket}.json`);
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          json: async () => ({
            v: 1,
            i: bucket,
            c: 1,
            d: {
              'pha-00433': { t: 'sol', n: '(433) Eros', k: 5, r: 8.42 },
            },
          }),
        } as unknown as Response;
      });

      const rec = await fetchDetailRecord('pha-00433', fetchMock as unknown as typeof fetch);
      expect(rec?.kind).toBe('solar-body');
      expect(rec?.record.name).toBe('(433) Eros');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('routes cached summary systems directly to details/sectors/<sectorId>.json and passes fallbackSectorId', async () => {
      seedSummaryNode('hip-123', {
        id: 'hip-123',
        name: 'HIP 123',
        x: 26,
        y: 0,
        z: 0,
        dist: 26,
        mag: 3.2,
        absmag: 1.1,
        spect: 'G2V',
        starCount: 1,
        planetCount: 0,
        hasHabitableCandidate: false,
        sectorId: 'sector_+025_+000_+000',
      });

      const fetchMock = vi.fn(async (url: string | URL | Request) => {
        expect(String(url)).toBe('/data/details/sectors/sector_+025_+000_+000.json');
        return makeDetailResponse('hip-123', 'sector_+025_+000_+000') as unknown as Response;
      });

      const rec = await fetchDetailRecord('hip-123', fetchMock as unknown as typeof fetch);
      expect(rec?.kind).toBe('system');
      if (rec?.kind === 'system') {
        expect(rec.record.sectorId).toBe('sector_+025_+000_+000');
      }
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('routes cached search entries (star systems, structures, Sol primary bodies) O(1) without routing.json', async () => {
      const searchFetch = vi.fn(async (url: string | URL | Request) => {
        const u = String(url);
        if (u.includes('structures.json')) {
          return new Response(
            JSON.stringify({
              v: 1,
              i: 'structures',
              n: 'Structures',
              c: 1,
              t: '2026',
              d: [{ i: 'pleiades', k: 5, n: 'Pleiades', p: [-40, 120, -50] }],
            }),
            { status: 200 },
          );
        }
        return new Response(
          JSON.stringify({
            v: 1,
            i: 'core',
            n: 'Core',
            c: 2,
            t: '2026',
            d: [
              { i: 'sol', n: 'Sol', m: [-26.74, 'G2V', 8, 1], h: 1 },
              { i: 'earth', k: 2, n: 'Earth', s: 'sol', h: 1 },
            ],
          }),
          { status: 200 },
        );
      });
      await fetchSearchShard('core', searchFetch as unknown as typeof fetch);
      await fetchSearchShard('structures', searchFetch as unknown as typeof fetch);

      const detailFetch = vi.fn(async (url: string | URL | Request) => {
        const u = String(url);
        if (u.includes('routing.json')) {
          throw new Error('Unexpected fetch to routing.json');
        }
        if (u === '/data/details/sectors/sector_+000_+000_+000.json') {
          return makeDetailResponse('sol', 'sector_+000_+000_+000') as unknown as Response;
        }
        if (u === '/data/details/sol-primary.json') {
          return {
            ok: true,
            status: 200,
            statusText: 'OK',
            json: async () => ({
              v: 1,
              i: 'sol-primary',
              c: 2,
              d: {
                'sol-A': { t: 'sol', n: 'Sol (Sun)', k: 1, r: 696340 },
                earth: { t: 'sol', n: 'Earth', k: 2, r: 6371 },
              },
            }),
          } as unknown as Response;
        }
        if (u === '/data/details/structures.json') {
          return {
            ok: true,
            status: 200,
            statusText: 'OK',
            json: async () => ({
              v: 1,
              i: 'structures',
              c: 1,
              d: {
                pleiades: { t: 'str', n: 'Pleiades', k: 1, p: [-40, 120, -50] },
              },
            }),
          } as unknown as Response;
        }
        return new Response('Not Found', { status: 404 }) as unknown as Response;
      });

      const solRec = await fetchDetailRecord('sol', detailFetch as unknown as typeof fetch);
      expect(solRec?.kind).toBe('system');
      const earthRec = await fetchDetailRecord('earth', detailFetch as unknown as typeof fetch);
      expect(earthRec?.kind).toBe('solar-body');
      const pleiadesRec = await fetchDetailRecord('pleiades', detailFetch as unknown as typeof fetch);
      expect(pleiadesRec?.kind).toBe('structure');
      // sol-A is resolved from already-loaded sol-primary shard with zero extra fetches
      const solARec = await fetchDetailRecord('sol-A', detailFetch as unknown as typeof fetch);
      expect(solARec?.kind).toBe('solar-body');
      expect(detailFetch).toHaveBeenCalledTimes(3);
    });

    it('falls back to details/routing.json for unknown IDs including sol-A and returns undefined when manifest marks shard absent', async () => {
      seedDataManifest({
        v: 1,
        generatedAt: '2026-01-01T00:00:00.000Z',
        files: {
          'details/routing.json': 'details/routing.11223344.json',
          'details/sol-primary.json': 'details/sol-primary.22334455.json',
        },
      });

      const fetchMock = vi.fn(async (url: string | URL | Request) => {
        const u = String(url);
        if (u === '/data/details/routing.11223344.json') {
          return makeRoutingResponse(
            ['sector_+075_+000_+000'],
            {},
            { 'sol-A': -1, 'absent-sector-star': 0 },
          ) as unknown as Response;
        }
        if (u === '/data/details/sol-primary.22334455.json') {
          return new Response(
            JSON.stringify({
              v: 1,
              i: 'sol-primary',
              c: 1,
              d: { 'sol-A': { t: 'sol', n: 'Sol (Sun)', k: 1, r: 696340 } },
            }),
            { status: 200 },
          );
        }
        throw new Error(`Unexpected HTTP request for ${u}`);
      });

      const solA = await fetchDetailRecord('sol-A', fetchMock as unknown as typeof fetch);
      expect(solA?.kind).toBe('solar-body');

      // sector_+075_+000_+000 is absent from manifest -> returns undefined with zero HTTP requests
      const absent = await fetchDetailRecord(
        'absent-sector-star',
        fetchMock as unknown as typeof fetch,
      );
      expect(absent).toBeUndefined();
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('rejects routing index and summary/detail shards with missing or mismatched v', async () => {
      const missingRouting = vi.fn(async () => ({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({ k: [], s: {}, d: {} }),
      }) as unknown as Response);
      await expect(
        fetchDetailsRoutingTable(missingRouting as unknown as typeof fetch),
      ).rejects.toThrow(/unsupported schema version/i);

      clearDetailsRepositoryCache();
      const missingFetch = vi.fn(async () => ({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({ d: {} }),
      }) as unknown as Response);
      await expect(
        fetchSummaryNode('bad-sum-1', missingFetch as unknown as typeof fetch),
      ).rejects.toThrow(/unsupported schema version/i);

      clearDetailsRepositoryCache();
      const wrongSummaryFetch = vi.fn(async (url: string | URL | Request) => {
        if (String(url).includes('routing.json')) {
          return makeRoutingResponse(
            ['sector_+000_+000_+000'],
            { 'bad-sum-2': 0 },
            {},
          ) as unknown as Response;
        }
        return makeSummaryResponse('bad-sum-2', 'sector_+000_+000_+000', 99) as unknown as Response;
      });
      await expect(
        fetchSummaryNode('bad-sum-2', wrongSummaryFetch as unknown as typeof fetch),
      ).rejects.toThrow(/unsupported schema version/i);

      clearDetailsRepositoryCache();
      const wrongDetailFetch = vi.fn(async (url: string | URL | Request) => {
        if (String(url).includes('routing.json')) {
          return makeRoutingResponse(
            ['sector_+000_+000_+000'],
            {},
            { 'bad-det-2': 0 },
          ) as unknown as Response;
        }
        return makeDetailResponse('bad-det-2', 'sector_+000_+000_+000', 99) as unknown as Response;
      });
      await expect(
        fetchDetailRecord('bad-det-2', wrongDetailFetch as unknown as typeof fetch),
      ).rejects.toThrow(/unsupported schema version/i);
    });
  });
});
