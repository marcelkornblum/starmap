import type {
  DatasetLayerIndexEntry,
  DatasetLayerManifest,
} from '../../../types/astro';
import {
  fetchSearchShard,
  getCachedCorpusForFilter,
  loadSearchCorpusForFilter,
  mergeSearchShards,
} from '../../../data/searchRepository';
import {
  findFocusedEntryInCorpus,
  type GroupedSearchResults,
  type SearchCategoryFilter,
} from '../../../services/searchService';
import { mergeActiveStarsIntoCorpus } from '../../../services/detailsService';
import { useActiveStarsStore } from '../../../stores/useActiveStarsStore';
import type { CompactSearchEntry } from '../../../utils/compactDataCodec';
import type { SpatialEntityStore } from '../../canvas/entity/SpatialEntityStore';
import type { SearchExecutionStatus } from './SearchContext';
import {
  SEARCH_MIN_QUERY_LENGTH,
  searchCatalog,
} from './searchHelpers';
import { resolveInitialQuery } from './searchUrlSync';
import {
  syncSelectedSystemsToStore,
  syncUrlFocusToStore,
} from './searchStoreSync';

export interface PrewarmCorpusParams {
  readonly initialFilter: SearchCategoryFilter;
  readonly activeSearch: string;
  readonly initialQuery: string;
  readonly syncUrl: boolean;
  readonly limitPerCategory?: number;
  readonly store: SpatialEntityStore;
  readonly layerIndex: readonly DatasetLayerIndexEntry[];
  readonly loadedLayers: readonly DatasetLayerManifest[];
  readonly resolveCurrentFocusSlug: (searchStr: string) => string | null;
  readonly updateResultsAndSelection: (computed: GroupedSearchResults) => void;
  readonly setStatus: (status: SearchExecutionStatus) => void;
  readonly fallbackFocusIdRef: { current: string | null };
  readonly isCancelled: () => boolean;
}

export const runSearchCorpusPrewarm = async ({
  initialFilter,
  activeSearch,
  initialQuery,
  syncUrl,
  limitPerCategory,
  store,
  layerIndex,
  loadedLayers,
  resolveCurrentFocusSlug,
  updateResultsAndSelection,
  setStatus,
  fallbackFocusIdRef,
  isCancelled,
}: PrewarmCorpusParams): Promise<readonly CompactSearchEntry[] | undefined> => {
  const [corpus, coreShard] = await Promise.all([
    loadSearchCorpusForFilter(initialFilter),
    initialFilter === 'all'
      ? Promise.resolve(undefined)
      : fetchSearchShard('core').catch(() => undefined),
  ]);
  if (isCancelled()) return undefined;

  const systemEntries = coreShard ?? getCachedCorpusForFilter('all');
  let focusCorpus = systemEntries
    ? mergeSearchShards([corpus, systemEntries])
    : corpus;

  const initialFocusSlug = resolveCurrentFocusSlug(activeSearch);
  if (initialFocusSlug && !findFocusedEntryInCorpus(initialFocusSlug, focusCorpus)) {
    const planetsShard = await fetchSearchShard('planets').catch(() => undefined);
    if (isCancelled()) return undefined;
    if (planetsShard) {
      focusCorpus = mergeSearchShards([focusCorpus, planetsShard]);
    }
  }
  if (initialFocusSlug && !findFocusedEntryInCorpus(initialFocusSlug, focusCorpus)) {
    const starsShard = await fetchSearchShard('stars').catch(() => undefined);
    if (isCancelled()) return undefined;
    if (starsShard) {
      focusCorpus = mergeSearchShards([focusCorpus, starsShard]);
    }
  }

  const startQuery = resolveInitialQuery(syncUrl, activeSearch, initialQuery);
  if (startQuery.trim().length >= SEARCH_MIN_QUERY_LENGTH) {
    const computed = searchCatalog(corpus, {
      query: startQuery,
      filter: initialFilter,
      limitPerCategory,
      systemEntries,
    });
    updateResultsAndSelection(computed);
    setStatus('ready');
  } else if (
    activeSearch.includes('select=') ||
    activeSearch.includes('layer=')
  ) {
    syncSelectedSystemsToStore(
      store,
      searchCatalog([], {
        query: '',
        filter: initialFilter,
        limitPerCategory,
      }),
      activeSearch,
      focusCorpus,
      layerIndex,
      loadedLayers,
    );
  }

  if (initialFocusSlug) {
    const combinedFocusCorpus = mergeActiveStarsIntoCorpus(
      focusCorpus,
      useActiveStarsStore.getState().summaries,
    );
    syncUrlFocusToStore(
      store,
      initialFocusSlug,
      combinedFocusCorpus,
      fallbackFocusIdRef,
      activeSearch,
    );
  }

  return focusCorpus;
};
