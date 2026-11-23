import { useCallback, useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { DatasetLayerIndexEntry, DatasetLayerManifest } from '../../../types/datasetLayers';
import { getCachedCorpusForFilter } from '../../../data/searchRepository';
import { toUrlSlug } from '../../../utils/datasetLayerSlugs';
import type { GroupedSearchResults } from '../../../services/search/searchTypes';
import type { SearchCategoryFilter } from '../../../types/search';
import { mergeActiveStarsIntoCorpus } from '../../../services/details/activeStarsCorpus';
import { useActiveStarsStore } from '../../../stores/useActiveStarsStore';
import type { CompactSearchEntry } from '../../../utils/compactDataTypes';
import type { SpatialEntityStore } from '../../canvas/entity/SpatialEntityStore';
import type { SearchExecutionStatus } from './SearchContext';
import {
  resolveInitialFilter,
  resolveInitialQuery,
  type SelfWrittenSearchParams,
} from './searchUrlSync';
import { syncSelectedSystemsToStore, syncUrlFocusToStore } from './searchStoreSync';
import { runSearchCorpusPrewarm } from './searchCorpusPrewarm';
import { parseSpatialRouteTarget } from '../../../utils/spatialRoute';

export const getSearchRelevantUrlKey = (pathname: string, search: string): string => {
  const params = new URLSearchParams(search);
  return `${pathname}?q=${params.get('q') ?? ''}&cat=${params.get('searchCategory') ?? ''}&select=${params.getAll('select').join(',')}&layer=${params.getAll('layer').join(',')}`;
};

export interface UseSearchUrlSyncEffectOptions {
  readonly activePathname: string;
  readonly activeSearch: string;
  readonly syncUrl: boolean;
  readonly locationPathname?: string;
  readonly locationSearch?: string;
  readonly initialQuery: string;
  readonly initialFilter: SearchCategoryFilter;
  readonly initialCorpus?: readonly CompactSearchEntry[];
  readonly limitPerCategory?: number;
  readonly store: SpatialEntityStore;
  readonly layerIndex: readonly DatasetLayerIndexEntry[];
  readonly loadedLayers: readonly DatasetLayerManifest[];
  readonly results: GroupedSearchResults;
  readonly filter: SearchCategoryFilter;
  readonly setQueryState: Dispatch<SetStateAction<string>>;
  readonly setFilterState: Dispatch<SetStateAction<SearchCategoryFilter>>;
  readonly setStatus: Dispatch<SetStateAction<SearchExecutionStatus>>;
  readonly submitSearch: (
    overrideQuery?: string,
    overrideFilter?: SearchCategoryFilter,
  ) => Promise<void>;
  readonly updateResultsAndSelection: (
    nextResults: GroupedSearchResults,
    overrideSearch?: string,
    overrideCorpus?: readonly CompactSearchEntry[],
  ) => void;
  readonly lastSelfWrittenSearchRef?: { current: SelfWrittenSearchParams | null };
}

export const useSearchUrlSyncEffect = ({
  activePathname,
  activeSearch,
  syncUrl,
  locationPathname,
  locationSearch,
  initialQuery,
  initialFilter,
  initialCorpus,
  limitPerCategory,
  store,
  layerIndex,
  loadedLayers,
  results,
  filter,
  setQueryState,
  setFilterState,
  setStatus,
  submitSearch,
  updateResultsAndSelection,
  lastSelfWrittenSearchRef,
}: UseSearchUrlSyncEffectOptions): void => {
  const fallbackFocusIdRef = useRef<string | null>(null);
  const initialResultsRef = useRef(results);
  const prevUrlKeyRef = useRef<string>(getSearchRelevantUrlKey(activePathname, activeSearch));
  const prevLoadedLayerKeyRef = useRef<string>('');
  const prewarmedCorpusRef = useRef<readonly CompactSearchEntry[] | null>(null);
  const initialPrewarmFiredRef = useRef<boolean>(false);
  const prevFocusSlugRef = useRef<string | null>(null);
  const activeScope = parseSpatialRouteTarget(activePathname)?.scope ?? 'galaxy';

  const resolveCurrentFocusSlug = useCallback(
    (searchStr: string): string | null => {
      const focusVal = new URLSearchParams(searchStr).get('focus');
      if (!focusVal) return null;
      const slug = toUrlSlug(focusVal);
      return slug.length > 0 ? slug : null;
    },
    [],
  );

  // Synchronise store on client mount
  useEffect(() => {
    const focusCorpus =
      initialCorpus ??
      getCachedCorpusForFilter('all') ??
      getCachedCorpusForFilter(initialFilter) ??
      getCachedCorpusForFilter('startup') ??
      [];
    syncSelectedSystemsToStore(
      store,
      initialResultsRef.current,
      activeSearch,
      focusCorpus,
      layerIndex,
      loadedLayers,
      activeScope,
    );

    if (
      syncUrl ||
      locationPathname !== undefined ||
      locationSearch !== undefined
    ) {
      const initialFocusSlug = resolveCurrentFocusSlug(activeSearch);
      syncUrlFocusToStore(
        store,
        initialFocusSlug,
        focusCorpus,
        undefined,
        activeSearch,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-apply URL layer selection once the referenced layer manifests have loaded
  const loadedLayerKey = loadedLayers.map((layer) => layer.layerId).join(',');
  useEffect(() => {
    if (
      loadedLayerKey.length > 0 &&
      prevLoadedLayerKeyRef.current !== loadedLayerKey
    ) {
      prevLoadedLayerKeyRef.current = loadedLayerKey;
      updateResultsAndSelection(results);
    } else if (loadedLayerKey.length === 0) {
      prevLoadedLayerKeyRef.current = '';
    }
  }, [loadedLayerKey, results, updateResultsAndSelection]);

  // React to URL transitions across views
  useEffect(() => {
    const currentUrlKey = getSearchRelevantUrlKey(activePathname, activeSearch);
    if (prevUrlKeyRef.current !== currentUrlKey) {
      prevUrlKeyRef.current = currentUrlKey;
      const params = new URLSearchParams(activeSearch);
      const urlQ = (params.get('q') ?? '').trim();
      const urlCat = params.get('searchCategory') ?? '';
      const urlLayer = params.getAll('layer').join(',');
      const selfWritten = lastSelfWrittenSearchRef?.current;
      if (
        selfWritten &&
        selfWritten.pathname === activePathname &&
        selfWritten.q === urlQ &&
        selfWritten.cat === urlCat &&
        selfWritten.layer === urlLayer
      ) {
        lastSelfWrittenSearchRef.current = null;
        return;
      }
      if (lastSelfWrittenSearchRef) {
        lastSelfWrittenSearchRef.current = null;
      }
      const nextQuery = resolveInitialQuery(syncUrl, activeSearch, initialQuery);
      const nextFilter = resolveInitialFilter(syncUrl, activeSearch, initialFilter);
      setQueryState(nextQuery);
      setFilterState(nextFilter);
      void submitSearch(nextQuery, nextFilter);
    }
  }, [activePathname, activeSearch, initialFilter, initialQuery, lastSelfWrittenSearchRef, submitSearch, syncUrl, setQueryState, setFilterState]);

  // Pre-warm the base search corpus in the background on mount
  useEffect(() => {
    if (initialCorpus || typeof window === 'undefined' || initialPrewarmFiredRef.current) {
      return;
    }
    initialPrewarmFiredRef.current = true;

    let cancelled = false;
    void runSearchCorpusPrewarm({
      initialFilter,
      activeSearch,
      initialQuery,
      syncUrl,
      isSearchRoute: activePathname === '/search',
      activeScope,
      limitPerCategory,
      store,
      layerIndex,
      loadedLayers,
      resolveCurrentFocusSlug,
      updateResultsAndSelection,
      setStatus,
      fallbackFocusIdRef,
      isCancelled: () => cancelled,
    }).then((focusCorpus) => {
      if (!cancelled && focusCorpus) {
        prewarmedCorpusRef.current = focusCorpus;
      }
    }).catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [
    activePathname,
    activeScope,
    activeSearch,
    initialCorpus,
    initialFilter,
    initialQuery,
    layerIndex,
    limitPerCategory,
    loadedLayers,
    resolveCurrentFocusSlug,
    setStatus,
    store,
    syncUrl,
    updateResultsAndSelection,
  ]);

  // Synchronise URL focus changes to store
  useEffect(() => {
    const focusSlug =
      syncUrl ||
      locationPathname !== undefined ||
      locationSearch !== undefined
        ? resolveCurrentFocusSlug(activeSearch)
        : null;

    if (prevFocusSlugRef.current === focusSlug) {
      return;
    }

    const baseCorpus =
      initialCorpus ??
      prewarmedCorpusRef.current ??
      getCachedCorpusForFilter('all') ??
      getCachedCorpusForFilter(filter) ??
      getCachedCorpusForFilter('startup') ??
      [];
    const availableCorpus = mergeActiveStarsIntoCorpus(
      baseCorpus,
      useActiveStarsStore.getState().summaries,
    );

    if (focusSlug && availableCorpus.length === 0) {
      return;
    }

    prevFocusSlugRef.current = focusSlug;

    syncUrlFocusToStore(
      store,
      focusSlug,
      availableCorpus,
      fallbackFocusIdRef,
      activeSearch,
    );
  }, [
    activePathname,
    activeScope,
    activeSearch,
    filter,
    initialCorpus,
    locationPathname,
    locationSearch,
    resolveCurrentFocusSlug,
    store,
    syncUrl,
  ]);

  // Clear non-persistent selection and focus states when unmounting
  useEffect(() => {
    return () => {
      const state = store.getState();
      state.setSelectedIds([]);
      state.setFocused(null);
    };
  }, [store]);
};
