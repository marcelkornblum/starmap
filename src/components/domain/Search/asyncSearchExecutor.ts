import {
  fetchSearchShard,
  getCachedCorpusForFilter,
  loadSearchCorpusForFilter,
  mergeSearchShards,
} from '../../../data/searchRepository';
import type {
  GroupedSearchResults,
  SearchCategoryFilter,
} from '../../../services/searchService';
import type { CompactSearchEntry } from '../../../utils/compactDataCodec';
import { searchCatalog } from './searchHelpers';

export const expandStarsShardIfEmpty = async (
  syncCorpus: readonly CompactSearchEntry[],
  activeQuery: string,
  activeFilter: SearchCategoryFilter,
  limitPerCategory: number | undefined,
  cachedAllCorpus: readonly CompactSearchEntry[] | undefined,
  isCurrent: () => boolean,
): Promise<GroupedSearchResults | null> => {
  try {
    const fullStars = await fetchSearchShard('stars');
    if (!isCurrent()) return null;
    const expandedCorpus = mergeSearchShards([syncCorpus, fullStars]);
    return searchCatalog(expandedCorpus, {
      query: activeQuery,
      filter: activeFilter,
      limitPerCategory,
      systemEntries: cachedAllCorpus,
    });
  } catch {
    return null;
  }
};

export const fetchAndComputeAsyncSearch = async (
  activeQuery: string,
  activeFilter: SearchCategoryFilter,
  limitPerCategory: number | undefined,
  isCurrent: () => boolean,
): Promise<GroupedSearchResults | null> => {
  const [corpus, coreShard] = await Promise.all([
    loadSearchCorpusForFilter(activeFilter),
    activeFilter === 'all'
      ? Promise.resolve(undefined)
      : fetchSearchShard('core').catch(() => undefined),
  ]);
  if (!isCurrent()) return null;

  const systemEntries = coreShard ?? getCachedCorpusForFilter('all');
  let computed = searchCatalog(corpus, {
    query: activeQuery,
    filter: activeFilter,
    limitPerCategory,
    systemEntries,
  });

  if (
    activeFilter === 'all' &&
    computed.totalMatches === 0 &&
    activeQuery.trim().length >= 3
  ) {
    const fullStars = await fetchSearchShard('stars');
    if (!isCurrent()) return null;
    const expandedCorpus = mergeSearchShards([corpus, fullStars]);
    computed = searchCatalog(expandedCorpus, {
      query: activeQuery,
      filter: activeFilter,
      limitPerCategory,
      systemEntries,
    });
  }

  return computed;
};
