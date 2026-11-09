import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearSearchRepositoryCache,
  fetchSearchShard,
  getCachedCorpusForFilter,
  loadSearchCorpusForFilter,
} from './searchRepository';

const makeShardResponse = (shard: string) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: async () => ({
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
});
