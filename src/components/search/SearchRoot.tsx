import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type ReactNode,
} from 'react';
import {
  useLayerIndex,
  useLoadedLayerManifests,
} from '../../hooks/useLayerData';
import {
  fetchSearchShard,
  getCachedCorpusForFilter,
  loadSearchCorpusForFilter,
  mergeSearchShards,
} from '../../data/searchRepository';
import {
  extractUrlFocusSlug,
  findFocusedEntryInCorpus,
  type GroupedSearchResults,
  type SearchCategoryFilter,
  type SearchResultItem,
} from '../../services/searchService';
import { mergeActiveStarsIntoCorpus } from '../../services/detailsService';
import { useActiveStarsStore } from '../../stores/useActiveStarsStore';
import type { CompactSearchEntry } from '../../utils/compactDataCodec';
import { useSpatialEntityStoreApi } from '../canvas/entity/SpatialEntityContext';
import {
  SearchContext,
  type SearchContextValue,
  type SearchExecutionStatus,
} from './SearchContext';
import {
  SEARCH_DEBOUNCE_MS,
  SEARCH_MIN_QUERY_LENGTH,
  prefetchSearchResultsDetails,
  searchCatalog,
} from './searchHelpers';
import {
  resolveInitialFilter,
  resolveInitialQuery,
  syncSearchUrlParams,
} from './searchUrlSync';
import {
  syncSelectedSystemsToStore,
  syncUrlFocusToStore,
} from './searchStoreSync';
import styles from './Search.module.css';

export interface SearchRootProps {
  readonly children?: ReactNode;
  readonly initialQuery?: string;
  readonly initialFilter?: SearchCategoryFilter;
  readonly initialCorpus?: readonly CompactSearchEntry[];
  readonly limitPerCategory?: number;
  readonly syncUrl?: boolean;
  readonly syncMode?: boolean;
  readonly debounceMs?: number;
  readonly locationPathname?: string;
  readonly locationSearch?: string;
  readonly onSelectResult?: (item: SearchResultItem) => void;
}

const getSearchRelevantUrlKey = (pathname: string, search: string): string => {
  const params = new URLSearchParams(search);
  return `${pathname}?q=${params.get('q') ?? ''}&cat=${params.get('searchCategory') ?? ''}&select=${params.getAll('select').join(',')}&layer=${params.getAll('layer').join(',')}`;
};

export const SearchRoot = ({
  children,
  initialQuery = '',
  initialFilter = 'all',
  initialCorpus,
  limitPerCategory,
  syncUrl = true,
  syncMode = false,
  debounceMs = SEARCH_DEBOUNCE_MS,
  locationPathname,
  locationSearch,
  onSelectResult,
}: SearchRootProps) => {
  const store = useSpatialEntityStoreApi();
  const fallbackFocusIdRef = useRef<string | null>(null);

  const [windowLocation, setWindowLocation] = useState<{
    readonly pathname: string;
    readonly search: string;
  }>(() => ({
    pathname:
      typeof window !== 'undefined' ? window.location.pathname : '/',
    search:
      typeof window !== 'undefined' ? window.location.search : '',
  }));

  const activePathname =
    locationPathname ?? (syncUrl ? windowLocation.pathname : '/');
  const activeSearch =
    locationSearch ?? (syncUrl ? windowLocation.search : '');

  const layerIndex = useLayerIndex();
  const loadedLayers = useLoadedLayerManifests(activeSearch);
  const layerDataRef = useRef({ layerIndex, loadedLayers });
  useEffect(() => {
    layerDataRef.current = { layerIndex, loadedLayers };
  });
  const [query, setQueryState] = useState<string>(() =>
    resolveInitialQuery(syncUrl, activeSearch, initialQuery),
  );
  const [filter, setFilterState] = useState<SearchCategoryFilter>(() =>
    resolveInitialFilter(syncUrl, activeSearch, initialFilter),
  );

  const initialAvailableCorpus =
    initialCorpus ?? getCachedCorpusForFilter(filter);
  const initialSystemEntries = getCachedCorpusForFilter('all');

  const [status, setStatus] = useState<SearchExecutionStatus>(() =>
    initialAvailableCorpus && query.trim().length > 0 ? 'ready' : 'idle',
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pure initial state computation with zero side effects or store mutations
  const [results, setResults] = useState<GroupedSearchResults>(() =>
    initialAvailableCorpus && query.trim().length > 0
      ? searchCatalog(initialAvailableCorpus, {
          query,
          filter,
          limitPerCategory,
          systemEntries: initialSystemEntries,
        })
      : searchCatalog([], {
          query,
          filter,
          limitPerCategory,
        }),
  );

  // Synchronise store on SSR / Node render where effects do not execute
  if (typeof window === 'undefined') {
    const focusCorpus =
      initialCorpus ??
      initialSystemEntries ??
      initialAvailableCorpus ??
      [];
    syncSelectedSystemsToStore(
      store,
      results,
      activeSearch,
      focusCorpus,
      layerIndex,
      loadedLayers,
    );

    if (
      syncUrl ||
      locationPathname !== undefined ||
      locationSearch !== undefined
    ) {
      const initialFocusSlug = extractUrlFocusSlug(
        activePathname,
        activeSearch,
      );
      syncUrlFocusToStore(
        store,
        initialFocusSlug,
        focusCorpus,
        undefined,
        activeSearch,
      );
    }
  }

  // Synchronise store on client mount to keep useState initializer 100% pure
  useEffect(() => {
    const focusCorpus =
      initialCorpus ??
      initialSystemEntries ??
      initialAvailableCorpus ??
      [];
    syncSelectedSystemsToStore(
      store,
      results,
      activeSearch,
      focusCorpus,
      layerIndex,
      loadedLayers,
    );

    if (
      syncUrl ||
      locationPathname !== undefined ||
      locationSearch !== undefined
    ) {
      const initialFocusSlug = extractUrlFocusSlug(
        activePathname,
        activeSearch,
      );
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

  const requestSeqRef = useRef<number>(0);
  const searchRootRef = useRef<HTMLDivElement>(null);
  const prevUrlKeyRef = useRef<string>(getSearchRelevantUrlKey(activePathname, activeSearch));
  const prevLoadedLayerKeyRef = useRef<string>('');
  const deferredSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Query most recently written to the URL by typing; its echo must not overwrite the live input.
  const lastWrittenUrlQueryRef = useRef<string | null>(null);

  const effectiveDebounceMs = debounceMs ?? SEARCH_DEBOUNCE_MS;
  const isSync = Boolean(syncMode) || effectiveDebounceMs === 0;

  // Clean up deferred search timer on unmount
  useEffect(() => {
    return () => {
      if (deferredSearchTimerRef.current !== null) {
        clearTimeout(deferredSearchTimerRef.current);
        deferredSearchTimerRef.current = null;
      }
    };
  }, []);

  const updateResultsAndSelection = useCallback(
    (
      nextResults: GroupedSearchResults,
      overrideSearch?: string,
      overrideCorpus?: readonly CompactSearchEntry[],
    ): void => {
      // 1. Immediately update DOM search results and status
      setResults(nextResults);

      // 2. Synchronise 3D spatial store selection in startTransition so heavy 3D mutations don't block DOM
      const effectiveSearch = overrideSearch ?? activeSearch;
      const effectiveCorpus =
        overrideCorpus ??
        initialCorpus ??
        getCachedCorpusForFilter('all') ??
        getCachedCorpusForFilter(nextResults.filter) ??
        [];

      startTransition(() => {
        syncSelectedSystemsToStore(
          store,
          nextResults,
          effectiveSearch,
          effectiveCorpus,
          layerDataRef.current.layerIndex,
          layerDataRef.current.loadedLayers,
        );
      });

      if (nextResults.query.trim().length >= 3) {
        prefetchSearchResultsDetails(nextResults);
      }
    },
    [activeSearch, initialCorpus, store],
  );

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

  const submitSearch = useCallback(
    async (
      overrideQuery?: string,
      overrideFilter?: SearchCategoryFilter,
    ): Promise<void> => {
      const requestedQuery = overrideQuery ?? query;
      // Every search path (typing, URL echo, filter change) honours the minimum query length.
      const activeQuery =
        requestedQuery.trim().length >= SEARCH_MIN_QUERY_LENGTH ? requestedQuery : '';
      const activeFilter = overrideFilter ?? filter;
      const currentSeq = ++requestSeqRef.current;

      if (!activeQuery.trim()) {
        updateResultsAndSelection(
          searchCatalog([], {
            query: '',
            filter: activeFilter,
            limitPerCategory,
          }),
        );
        setStatus('idle');
        setErrorMessage(null);
        return;
      }

      const syncCorpus =
        initialCorpus ?? getCachedCorpusForFilter(activeFilter);
      const cachedAllCorpus = getCachedCorpusForFilter('all');

      if (syncCorpus) {
        const computed = searchCatalog(syncCorpus, {
          query: activeQuery,
          filter: activeFilter,
          limitPerCategory,
          systemEntries: cachedAllCorpus,
        });
        updateResultsAndSelection(computed);
        setStatus('ready');
        setErrorMessage(null);

        if (
          !initialCorpus &&
          activeFilter === 'all' &&
          computed.totalMatches === 0 &&
          activeQuery.trim().length >= 3
        ) {
          try {
            const fullStars = await fetchSearchShard('stars');
            if (requestSeqRef.current !== currentSeq) {
              return;
            }
            const expandedCorpus = mergeSearchShards([syncCorpus, fullStars]);
            const expandedComputed = searchCatalog(expandedCorpus, {
              query: activeQuery,
              filter: activeFilter,
              limitPerCategory,
              systemEntries: cachedAllCorpus,
            });
            updateResultsAndSelection(expandedComputed);
          } catch {
            // Retain existing core results if background stars shard fails
          }
        }
        return;
      }

      setStatus('loading');
      setErrorMessage(null);

      try {
        const [corpus, coreShard] = await Promise.all([
          loadSearchCorpusForFilter(activeFilter),
          activeFilter === 'all'
            ? Promise.resolve(undefined)
            : fetchSearchShard('core').catch(() => undefined),
        ]);
        if (requestSeqRef.current !== currentSeq) {
          return;
        }
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
          if (requestSeqRef.current !== currentSeq) {
            return;
          }
          const expandedCorpus = mergeSearchShards([corpus, fullStars]);
          computed = searchCatalog(expandedCorpus, {
            query: activeQuery,
            filter: activeFilter,
            limitPerCategory,
            systemEntries,
          });
        }

        updateResultsAndSelection(computed);
        setStatus('ready');
      } catch (err: unknown) {
        if (requestSeqRef.current !== currentSeq) {
          return;
        }
        const message =
          err instanceof Error
            ? err.message
            : 'Unable to execute catalog search.';
        setErrorMessage(message);
        setStatus('error');
      }
    },
    [filter, initialCorpus, limitPerCategory, query, updateResultsAndSelection],
  );

  // Listen to browser popstate navigation when syncUrl is active
  useEffect(() => {
    if (!syncUrl || typeof window === 'undefined') {
      return;
    }
    const handlePopState = (): void => {
      setWindowLocation({
        pathname: window.location.pathname,
        search: window.location.search,
      });
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [syncUrl]);

  // React to URL transitions across views and clear non-URL state on unmount
  useEffect(() => {
    const currentUrlKey = getSearchRelevantUrlKey(activePathname, activeSearch);
    if (prevUrlKeyRef.current !== currentUrlKey) {
      prevUrlKeyRef.current = currentUrlKey;
      const nextQuery = resolveInitialQuery(syncUrl, activeSearch, initialQuery);
      const nextFilter = resolveInitialFilter(syncUrl, activeSearch, initialFilter);
      if (
        lastWrittenUrlQueryRef.current !== null &&
        nextQuery === lastWrittenUrlQueryRef.current
      ) {
        // Echo of our own typing: the input already holds the newest text and search already ran.
        return;
      }
      lastWrittenUrlQueryRef.current = null;
      setQueryState(nextQuery);
      setFilterState(nextFilter);
      void submitSearch(nextQuery, nextFilter);
    }
  }, [activePathname, activeSearch, initialFilter, initialQuery, submitSearch, syncUrl]);

  const prewarmedCorpusRef = useRef<readonly CompactSearchEntry[] | null>(null);
  const initialPrewarmFiredRef = useRef<boolean>(false);

  // Pre-warm the base search corpus in the background on mount
  useEffect(() => {
    if (initialCorpus || typeof window === 'undefined' || initialPrewarmFiredRef.current) {
      return;
    }
    initialPrewarmFiredRef.current = true;

    let cancelled = false;
    void Promise.all([
      loadSearchCorpusForFilter(initialFilter),
      initialFilter === 'all'
        ? Promise.resolve(undefined)
        : fetchSearchShard('core').catch(() => undefined),
    ])
      .then(async ([corpus, coreShard]) => {
        if (cancelled) {
          return;
        }

        const systemEntries = coreShard ?? getCachedCorpusForFilter('all');
        let focusCorpus = systemEntries
          ? mergeSearchShards([corpus, systemEntries])
          : corpus;

        const initialFocusSlug = extractUrlFocusSlug(activePathname, activeSearch);
        if (initialFocusSlug && !findFocusedEntryInCorpus(initialFocusSlug, focusCorpus)) {
          const planetsShard = await fetchSearchShard('planets').catch(() => undefined);
          if (cancelled) return;
          if (planetsShard) {
            focusCorpus = mergeSearchShards([focusCorpus, planetsShard]);
          }
        }
        if (initialFocusSlug && !findFocusedEntryInCorpus(initialFocusSlug, focusCorpus)) {
          const starsShard = await fetchSearchShard('stars').catch(() => undefined);
          if (cancelled) return;
          if (starsShard) {
            focusCorpus = mergeSearchShards([focusCorpus, starsShard]);
          }
        }
        prewarmedCorpusRef.current = focusCorpus;

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
          activeSearch.includes('layer=') ||
          (typeof window !== 'undefined' &&
            (window.location.search.includes('select=') ||
              window.location.search.includes('layer=')))
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
            layerDataRef.current.layerIndex,
            layerDataRef.current.loadedLayers,
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
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [
    activePathname,
    activeSearch,
    fallbackFocusIdRef,
    initialCorpus,
    initialFilter,
    initialQuery,
    limitPerCategory,
    store,
    syncUrl,
    updateResultsAndSelection,
  ]);

  // Synchronise URL focus changes to store
  const prevFocusSlugRef = useRef<string | null>(null);
  useEffect(() => {
    const focusSlug =
      syncUrl ||
      locationPathname !== undefined ||
      locationSearch !== undefined
        ? extractUrlFocusSlug(activePathname, activeSearch)
        : null;

    if (prevFocusSlugRef.current === focusSlug) {
      return;
    }

    const baseCorpus =
      initialCorpus ??
      prewarmedCorpusRef.current ??
      getCachedCorpusForFilter('all') ??
      getCachedCorpusForFilter(filter) ??
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
    activeSearch,
    fallbackFocusIdRef,
    filter,
    initialCorpus,
    locationPathname,
    locationSearch,
    store,
    syncUrl,
  ]);

  // Clear non-persistent selection and focus states when unmounting the view
  useEffect(() => {
    return () => {
      if (deferredSearchTimerRef.current !== null) {
        clearTimeout(deferredSearchTimerRef.current);
        deferredSearchTimerRef.current = null;
      }
      const state = store.getState();
      state.setSelectedIds([]);
      state.setFocused(null);
    };
  }, [store]);

  const setQuery = useCallback(
    (nextQuery: string): void => {
      setQueryState(nextQuery);

      if (deferredSearchTimerRef.current !== null) {
        clearTimeout(deferredSearchTimerRef.current);
        deferredSearchTimerRef.current = null;
      }

      // Below the minimum length the query is too broad to match usefully (thousands of hits, all
      // pushed into the 3D selection store), so treat it as empty and keep keystrokes responsive.
      const searchQuery =
        nextQuery.trim().length >= SEARCH_MIN_QUERY_LENGTH ? nextQuery : '';
      const executeSync = searchQuery.length === 0 || isSync;

      if (executeSync) {
        if (syncUrl) {
          syncSearchUrlParams(nextQuery, filter);
          lastWrittenUrlQueryRef.current = nextQuery;
          if (typeof window !== 'undefined') {
            const nextSearch = window.location.search;
            prevUrlKeyRef.current = getSearchRelevantUrlKey(window.location.pathname, nextSearch);
            setWindowLocation({
              pathname: window.location.pathname,
              search: nextSearch,
            });
          }
        }
        void submitSearch(searchQuery, filter);
        return;
      }

      deferredSearchTimerRef.current = setTimeout(() => {
        deferredSearchTimerRef.current = null;
        if (syncUrl) {
          syncSearchUrlParams(nextQuery, filter);
          lastWrittenUrlQueryRef.current = nextQuery;
          if (typeof window !== 'undefined') {
            const nextSearch = window.location.search;
            prevUrlKeyRef.current = getSearchRelevantUrlKey(window.location.pathname, nextSearch);
            setWindowLocation({
              pathname: window.location.pathname,
              search: nextSearch,
            });
          }
        }
        void submitSearch(searchQuery, filter);
      }, effectiveDebounceMs);
    },
    [effectiveDebounceMs, filter, isSync, submitSearch, syncUrl],
  );

  const setFilter = useCallback(
    (nextFilter: SearchCategoryFilter): void => {
      if (deferredSearchTimerRef.current !== null) {
        clearTimeout(deferredSearchTimerRef.current);
        deferredSearchTimerRef.current = null;
      }
      setFilterState(nextFilter);
      if (syncUrl) {
        syncSearchUrlParams(query, nextFilter);
        if (typeof window !== 'undefined') {
          const nextSearch = window.location.search;
          prevUrlKeyRef.current = getSearchRelevantUrlKey(window.location.pathname, nextSearch);
          setWindowLocation({
            pathname: window.location.pathname,
            search: nextSearch,
          });
        }
      }
      void submitSearch(query, nextFilter);
    },
    [query, submitSearch, syncUrl],
  );

  const [isFocused, setIsFocused] = useState<boolean>(false);

  const dismissSearch = useCallback(
    (item?: SearchResultItem): void => {
      if (deferredSearchTimerRef.current !== null) {
        clearTimeout(deferredSearchTimerRef.current);
        deferredSearchTimerRef.current = null;
      }
      setQueryState('');
      setIsFocused(false);
      if (
        typeof document !== 'undefined' &&
        searchRootRef.current &&
        document.activeElement instanceof HTMLElement &&
        searchRootRef.current.contains(document.activeElement)
      ) {
        document.activeElement.blur();
      }
      if (syncUrl) {
        syncSearchUrlParams('', filter);
      }
      void submitSearch('', filter);
      if (item && onSelectResult) {
        onSelectResult(item);
      }
    },
    [filter, onSelectResult, submitSearch, syncUrl],
  );

  const handleFocusCapture = useCallback((): void => {
    setIsFocused(true);
  }, []);

  const handleBlurCapture = useCallback(
    (event: FocusEvent<HTMLDivElement>): void => {
      const nextTarget = event.relatedTarget as Node | null;
      if (nextTarget !== null && !event.currentTarget.contains(nextTarget)) {
        setIsFocused(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleClick = (event: MouseEvent): void => {
      if (searchRootRef.current && !searchRootRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, []);

  const contextValue: SearchContextValue = {
    query,
    filter,
    status,
    errorMessage,
    results,
    isFocused,
    setIsFocused,
    dismissSearch,
    setQuery,
    setFilter,
    submitSearch,
    onSelectResult,
  };

  return (
    <SearchContext.Provider value={contextValue}>
      <div
        ref={searchRootRef}
        className={styles.searchRoot}
        data-testid="search-root"
        data-search-focused={isFocused ? 'true' : 'false'}
        onFocusCapture={handleFocusCapture}
        onBlurCapture={handleBlurCapture}
      >
        {children}
      </div>
    </SearchContext.Provider>
  );
};
