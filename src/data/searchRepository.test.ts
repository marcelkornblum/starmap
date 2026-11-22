import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearSearchRepositoryCache,
  fetchSearchShard,
  getCachedCorpusForFilter,
  getCachedSearchEntryById,
  loadSearchCorpusForFilter,
  mergeSearchShards,
  subscribeSearchRepository,
} from './searchRepository';

const makeShardResponse = (shard: string, version: unknown = 1) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: async () => ({
    ...(version !== undefined ? { v: version } : {}),
    d: [
      {
        i: `entity-${shard}`,
        n: `Entity in ${shard}`,
        t: 'star',
        p: [0, 0, 0],
      },
    ],
  }),
});

describe('searchRepository (AUD-090 & DEC-R043)', () => {
  beforeEach(() => {
    clearSearchRepositoryCache();
  });

  describe('AbortSignal forwarding and cancellation', () => {
    it('forwards AbortSignal to fetcher in fetchSearchShard and cancels properly', async () => {
      const controller = new AbortController();
      controller.abort();

      const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.signal?.aborted) {
          throw new DOMException('The user aborted a request.', 'AbortError');
        }
        return makeShardResponse('stars') as unknown as Response;
      });

      await expect(
        fetchSearchShard('stars', fetchMock as unknown as typeof fetch, controller.signal),
      ).rejects.toThrow(/aborted/);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/data/search/stars.json'),
        { signal: controller.signal },
      );
    });

    it('forwards AbortSignal to fetcher in loadSearchCorpusForFilter for specific filter', async () => {
      const controller = new AbortController();
      controller.abort();

      const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.signal?.aborted) {
          throw new DOMException('The user aborted a request.', 'AbortError');
        }
        return makeShardResponse('planets') as unknown as Response;
      });

      await expect(
        loadSearchCorpusForFilter('planets', fetchMock as unknown as typeof fetch, controller.signal),
      ).rejects.toThrow(/aborted/);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/data/search/planets.json'),
        { signal: controller.signal },
      );
    });

    it('forwards AbortSignal to fetcher in loadSearchCorpusForFilter for "all" filter', async () => {
      const controller = new AbortController();
      controller.abort();

      const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.signal?.aborted) {
          throw new DOMException('The user aborted a request.', 'AbortError');
        }
        return makeShardResponse('core') as unknown as Response;
      });

      await expect(
        loadSearchCorpusForFilter('all', fetchMock as unknown as typeof fetch, controller.signal),
      ).rejects.toThrow(/aborted/);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/data/search/'),
        { signal: controller.signal },
      );
    });
  });

  describe('Bounded LRU cache', () => {
    it('clears caches cleanly and exposes cached corpus via getCachedCorpusForFilter', async () => {
      const fetchMock = vi.fn(async (url: string) => {
        if (url.includes('stars.json')) return makeShardResponse('stars') as unknown as Response;
        return makeShardResponse('default') as unknown as Response;
      });

      expect(getCachedCorpusForFilter('stars')).toBeUndefined();
      await fetchSearchShard('stars', fetchMock as unknown as typeof fetch);
      expect(getCachedCorpusForFilter('stars')).toBeDefined();

      clearSearchRepositoryCache();
      expect(getCachedCorpusForFilter('stars')).toBeUndefined();
    });
  });

  describe('Cache subscription (AUD-087 & DEC-R042)', () => {
    it('notifies subscribers when search shard cache updates', async () => {
      const listener = vi.fn();
      const unsubscribe = subscribeSearchRepository(listener);

      const fetchMock = vi.fn(async () => makeShardResponse('stars') as unknown as Response);
      await fetchSearchShard('stars', fetchMock as unknown as typeof fetch);

      expect(listener).toHaveBeenCalled();

      listener.mockClear();
      unsubscribe();
      await fetchSearchShard('planets', fetchMock as unknown as typeof fetch);
      expect(listener).not.toHaveBeenCalled();
    });

    it('notifies subscribers when filter corpus cache updates', async () => {
      const listener = vi.fn();
      const unsubscribe = subscribeSearchRepository(listener);

      const fetchMock = vi.fn(async () => makeShardResponse('default') as unknown as Response);
      await loadSearchCorpusForFilter('all', fetchMock as unknown as typeof fetch);

      expect(listener).toHaveBeenCalled();

      unsubscribe();
    });
  });

  describe('Shard Merging and Parallel Loading', () => {
    it('merges shards and deduplicates by entry ID', () => {
      const merged = mergeSearchShards([
        [
          { i: 'sol', n: 'Sol' },
          { i: 'tau-ceti', n: 'Tau Ceti' },
        ],
        [
          { i: 'tau-ceti', n: 'Tau Ceti' },
          { i: 'keid', n: 'Keid' },
        ],
      ]);
      expect(merged).toHaveLength(3);
      expect(merged.map((e) => e.i)).toEqual(['sol', 'tau-ceti', 'keid']);
    });

    it('loads core, structures, and minor-bodies shards in parallel when filter is all', async () => {
      clearSearchRepositoryCache();
      const mockFetch = vi.fn().mockImplementation(async (url: string) => ({
        ok: true,
        status: 200,
        json: async () => ({
          v: 1,
          i: url,
          n: url,
          c: 1,
          t: '2026-10-17T00:00:00Z',
          d: url.includes('minor-bodies')
            ? [{ i: 'mpc-433', n: '433 Eros' }]
            : url.includes('structures')
              ? [{ i: 'ngc-1976', n: 'Orion Nebula' }]
              : [{ i: 'sol', n: 'Sol' }],
        }),
      }));

      const entries = await loadSearchCorpusForFilter(
        'all',
        mockFetch as unknown as typeof fetch,
      );
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(entries.map((e) => e.i)).toEqual(['sol', 'ngc-1976', 'mpc-433']);
    });

    it('throws a descriptive error when shard fetch fails or returns invalid schema', async () => {
      const failingFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({}),
      });

      await expect(
        fetchSearchShard('layers', failingFetch as unknown as typeof fetch),
      ).rejects.toThrow(/Failed to load search shard "layers"/);

      const invalidSchemaFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ invalid: true }),
      });

      await expect(
        fetchSearchShard('layers', invalidSchemaFetch as unknown as typeof fetch),
      ).rejects.toThrow(/Invalid search index envelope/);

      const missingVersionFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({ d: [] }),
      });
      await expect(
        fetchSearchShard('layers', missingVersionFetch as unknown as typeof fetch),
      ).rejects.toThrow(/Unsupported schema version/);

      const wrongVersionFetch = vi.fn().mockResolvedValue(
        makeShardResponse('layers', 99),
      );
      await expect(
        fetchSearchShard('layers', wrongVersionFetch as unknown as typeof fetch),
      ).rejects.toThrow(/Unsupported schema version/);
    });

    it('loads only startup shard for startup scope and seamlessly upgrades when background shards arrive', async () => {
      clearSearchRepositoryCache();
      const mockFetch = vi.fn().mockImplementation(async (url: string) => ({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          v: 1,
          i: url,
          n: url,
          c: 1,
          t: '2026-10-17T00:00:00Z',
          d: url.includes('startup')
            ? [{ i: 'sol', n: 'Sol' }]
            : url.includes('stars')
              ? [{ i: 'faint-star', n: 'Faint Star' }]
              : [{ i: 'faint-planet', n: 'Faint Planet' }],
        }),
      }));

      const startupEntries = await loadSearchCorpusForFilter(
        'startup',
        mockFetch as unknown as typeof fetch,
      );
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/data/search/startup.json'));
      expect(startupEntries.map((e) => e.i)).toEqual(['sol']);

      await fetchSearchShard('stars', mockFetch as unknown as typeof fetch);
      await fetchSearchShard('planets', mockFetch as unknown as typeof fetch);

      const upgraded = getCachedCorpusForFilter('startup');
      expect(upgraded?.map((e) => e.i)).toEqual(['sol', 'faint-star', 'faint-planet']);
    });

    it('upgrades startup corpus as soon as structures shard is cached alone', async () => {
      clearSearchRepositoryCache();
      const mockFetch = vi.fn().mockImplementation(async (url: string) => ({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          v: 1,
          i: url,
          n: url,
          c: 1,
          t: '2026-10-17T00:00:00Z',
          d: url.includes('startup')
            ? [{ i: 'sol', n: 'Sol' }]
            : [{ i: 'crab-nebula', n: 'Crab Nebula' }],
        }),
      }));

      await loadSearchCorpusForFilter('startup', mockFetch as unknown as typeof fetch);
      await fetchSearchShard('structures', mockFetch as unknown as typeof fetch);

      const upgraded = getCachedCorpusForFilter('startup');
      expect(upgraded?.map((e) => e.i)).toEqual(['sol', 'crab-nebula']);
    });

    it('resolves cached search entries in O(1) via getCachedSearchEntryById and invalidates on cache updates', async () => {
      clearSearchRepositoryCache();
      expect(getCachedSearchEntryById('entity-stars')).toBeUndefined();

      const mockFetch = vi.fn(async (url: string) => {
        if (url.includes('stars.json')) {
          return makeShardResponse('stars') as unknown as Response;
        }
        return makeShardResponse('structures') as unknown as Response;
      });

      await fetchSearchShard('stars', mockFetch as unknown as typeof fetch);
      expect(getCachedSearchEntryById('entity-stars')?.i).toBe('entity-stars');
      expect(getCachedSearchEntryById('entity-structures')).toBeUndefined();

      await fetchSearchShard('structures', mockFetch as unknown as typeof fetch);
      expect(getCachedSearchEntryById('entity-structures')?.i).toBe('entity-structures');

      clearSearchRepositoryCache();
      expect(getCachedSearchEntryById('entity-stars')).toBeUndefined();
    });
  });
});
