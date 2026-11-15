import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  expandStarsShardIfEmpty,
  fetchAndComputeAsyncSearch,
} from './asyncSearchExecutor';
import * as searchRepo from '../../../data/searchRepository';
import type { CompactSearchEntry } from '../../../utils/compactDataTypes';

const SAMPLE_STAR: CompactSearchEntry = {
  i: 'sol',
  n: 'Sol',
  m: [-26.74, 'G2V', 8, 1],
  h: 1,
};

const EXTRA_STAR: CompactSearchEntry = {
  i: 'tau-ceti',
  n: 'Tau Ceti',
  m: [3.49, 'G8V', 4, 1],
  h: 1,
};

describe('asyncSearchExecutor', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('expandStarsShardIfEmpty', () => {
    it('returns null if isCurrent returns false after fetching stars', async () => {
      vi.spyOn(searchRepo, 'fetchSearchShard').mockResolvedValue([EXTRA_STAR]);

      const res = await expandStarsShardIfEmpty(
        [SAMPLE_STAR],
        'Tau Ceti',
        'all',
        undefined,
        undefined,
        () => false, // not current
      );

      expect(res).toBeNull();
    });

    it('expands corpus and computes search when isCurrent returns true', async () => {
      vi.spyOn(searchRepo, 'fetchSearchShard').mockResolvedValue([EXTRA_STAR]);

      const res = await expandStarsShardIfEmpty(
        [SAMPLE_STAR],
        'Tau Ceti',
        'all',
        undefined,
        undefined,
        () => true,
      );

      expect(res).not.toBeNull();
      expect(res?.totalMatches).toBeGreaterThanOrEqual(1);
      expect(res?.groups.stars.items.some((i) => i.id === 'tau-ceti')).toBe(true);
    });

    it('returns null when fetchSearchShard rejects', async () => {
      vi.spyOn(searchRepo, 'fetchSearchShard').mockRejectedValue(new Error('Network failure'));

      const res = await expandStarsShardIfEmpty(
        [SAMPLE_STAR],
        'Tau Ceti',
        'all',
        undefined,
        undefined,
        () => true,
      );

      expect(res).toBeNull();
    });
  });

  describe('fetchAndComputeAsyncSearch', () => {
    it('fetches corpus and computes catalog search', async () => {
      vi.spyOn(searchRepo, 'loadSearchCorpusForFilter').mockResolvedValue([SAMPLE_STAR, EXTRA_STAR]);
      vi.spyOn(searchRepo, 'fetchSearchShard').mockResolvedValue([SAMPLE_STAR]);

      const res = await fetchAndComputeAsyncSearch(
        'Tau Ceti',
        'stars',
        undefined,
        () => true,
      );

      expect(res).not.toBeNull();
      expect(res?.groups.stars.items.some((i) => i.id === 'tau-ceti')).toBe(true);
    });

    it('returns null if isCurrent returns false after loading corpus', async () => {
      vi.spyOn(searchRepo, 'loadSearchCorpusForFilter').mockResolvedValue([SAMPLE_STAR]);

      const res = await fetchAndComputeAsyncSearch(
        'Tau Ceti',
        'all',
        undefined,
        () => false,
      );

      expect(res).toBeNull();
    });

    it('expands stars shard if totalMatches is 0 and filter is "all" with query length >= 3', async () => {
      vi.spyOn(searchRepo, 'loadSearchCorpusForFilter').mockResolvedValue([SAMPLE_STAR]);
      const fetchShardSpy = vi.spyOn(searchRepo, 'fetchSearchShard').mockResolvedValue([EXTRA_STAR]);

      const res = await fetchAndComputeAsyncSearch(
        'Tau Ceti',
        'all',
        undefined,
        () => true,
      );

      expect(fetchShardSpy).toHaveBeenCalledWith('stars');
      expect(res?.groups.stars.items.some((i) => i.id === 'tau-ceti')).toBe(true);
    });
  });
});
