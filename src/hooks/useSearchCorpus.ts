import { useEffect, useState, useSyncExternalStore } from 'react';
import {
  getCachedCorpusForFilter,
  loadSearchCorpusForFilter,
  subscribeSearchRepository,
  type SearchCorpusScope,
} from '../data/searchRepository';
import type { CompactSearchEntry } from '../utils/compactDataTypes';

export interface UseSearchCorpusResult {
  readonly corpus: readonly CompactSearchEntry[] | undefined;
  readonly isLoading: boolean;
}

/**
 * Reactive hook providing the compact search corpus for a category filter or `'startup'` tier.
 * Resolves synchronously on initial render if already cached in memory.
 * Subscribes to cache updates via useSyncExternalStore (keyed to the requested filter's
 * cached array reference so unrelated background shard loads do not trigger re-renders)
 * and automatically cancels in-flight AbortSignal on unmount or filter change.
 */
export function useSearchCorpus(
  filter: SearchCorpusScope = 'startup',
  initialCorpus?: readonly CompactSearchEntry[],
): UseSearchCorpusResult {
  const cachedCorpus = useSyncExternalStore(
    subscribeSearchRepository,
    () => getCachedCorpusForFilter(filter),
    () => getCachedCorpusForFilter(filter),
  );

  const [completedFilter, setCompletedFilter] = useState<SearchCorpusScope | null>(null);
  const activeCorpus = initialCorpus ?? cachedCorpus;

  const isPending = Boolean(!activeCorpus && completedFilter !== filter);

  useEffect(() => {
    if (initialCorpus || getCachedCorpusForFilter(filter)) {
      return undefined;
    }

    const controller = new AbortController();

    void loadSearchCorpusForFilter(filter, fetch, controller.signal)
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) {
          setCompletedFilter(filter);
        }
      });

    return () => {
      controller.abort();
    };
  }, [filter, initialCorpus]);

  return {
    corpus: activeCorpus,
    isLoading: isPending,
  };
}
