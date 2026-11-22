import type {
  DatasetLayerIndexEntry,
  DatasetLayerManifest,
} from '../../../types/datasetLayers';
import {
  fetchSearchShard,
  getCachedCorpusForFilter,
  loadSearchCorpusForFilter,
  mergeSearchShards,
} from '../../../data/searchRepository';
import { escalateSearchBackgroundWarmup } from '../../../data/searchBackgroundWarmup';
import { findFocusedEntryInCorpus } from '../../../services/search/searchCorpusHelpers';
import type { GroupedSearchResults } from '../../../services/search/searchTypes';
import type { SearchCategoryFilter } from '../../../types/search';
import { mergeActiveStarsIntoCorpus } from '../../../services/details/activeStarsCorpus';
import { useActiveStarsStore } from '../../../stores/useActiveStarsStore';
import type { CompactSearchEntry } from '../../../utils/compactDataTypes';
import type { SpatialScale } from '../../../utils/referenceFrameOrientation';
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
  readonly isSearchRoute?: boolean;
  readonly activeScope?: SpatialScale;
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
  isSearchRoute = false,
  activeScope = 'galaxy',
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
  const startQuery = resolveInitialQuery(syncUrl, activeSearch, initialQuery);
  const hasActiveSearchIntent =
    isSearchRoute ||
    startQuery.trim().length >= SEARCH_MIN_QUERY_LENGTH ||
    initialFilter !== 'all';

  if (hasActiveSearchIntent) {
    escalateSearchBackgroundWarmup();
  }

  const targetScope = hasActiveSearchIntent ? initialFilter : 'startup';
  const [corpus, coreShard] = await Promise.all([
    loadSearchCorpusForFilter(targetScope),
    hasActiveSearchIntent && initialFilter !== 'all'
      ? fetchSearchShard('core').catch(() => undefined)
      : Promise.resolve(undefined),
  ]);
  if (isCancelled()) return undefined;

  const systemEntries = coreShard ?? getCachedCorpusForFilter('all') ?? corpus;
  let focusCorpus =
    coreShard && coreShard !== corpus
      ? mergeSearchShards([corpus, coreShard])
      : corpus;

  const initialFocusSlug = resolveCurrentFocusSlug(activeSearch);
  if (initialFocusSlug && !findFocusedEntryInCorpus(initialFocusSlug, focusCorpus)) {
    escalateSearchBackgroundWarmup();
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
      activeScope,
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
