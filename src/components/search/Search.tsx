import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type FormEvent,
  type ReactNode,
} from 'react';
import {
  useLayerIndex,
  useLoadedLayerManifests,
} from '../../hooks/useLayerData';
import type {
  DatasetLayerIndexEntry,
  DatasetLayerManifest,
} from '../../types/astro';
import {
  fetchDetailRecord,
  fetchSummaryNode,
} from '../../data/detailsRepository';
import {
  fetchEntityAnnotations,
  fetchLayerManifest,
} from '../../data/layerRepository';
import {
  fetchSearchShard,
  getCachedCorpusForFilter,
  loadSearchCorpusForFilter,
  mergeSearchShards,
} from '../../data/searchRepository';
import {
  SEARCH_CATEGORIES,
  buildSearchViewHref,
  buildUpdatedSearchUrl,
  executeCatalogSearch,
  extractUrlFocusSlug,
  findFocusedEntryInCorpus,
  isSearchCategoryFilter,
  parseSearchUrlParams,
  resolveFocusedEntityFromCorpus,
  resolveSelectedSystemsFromSearchResults,
  resolveSelectedSystemsFromUrlSelect,
  type GroupedSearchResults,
  type SearchCategoryFilter,
  type SearchResultItem,
} from '../../services/searchService';
import type { CompactSearchEntry } from '../../utils/compactDataCodec';
import { useRouter } from '@tanstack/react-router';
import { extractUrlRouteStops } from '../../services/journeyService';
import { parseLayerQueryParam, pickRandomLayerOverviewHref } from '../../services/layerCardService';
import { Button, Heading, Input, Select } from '../interface';
import { useSpatialEntityStoreApi } from '../canvas/entity/SpatialEntityContext';
import type { SpatialEntityStore } from '../canvas/entity/SpatialEntityStore';
import { SearchResultItem as SearchResultItemRow } from '../domain';
import {
  SearchContext,
  useSearchContext,
  type SearchContextValue,
  type SearchExecutionStatus,
} from './SearchContext';
import styles from './Search.module.css';

declare module './SearchContext' {
  interface SearchContextValue {
    readonly dismissSearch?: (item?: SearchResultItem) => void;
    readonly setIsFocused?: (focused: boolean) => void;
  }
}

export interface SearchRootProps {
  readonly children?: ReactNode;
  readonly initialQuery?: string;
  readonly initialFilter?: SearchCategoryFilter;
  readonly initialCorpus?: readonly CompactSearchEntry[];
  readonly limitPerCategory?: number;
  readonly syncUrl?: boolean;
  readonly locationPathname?: string;
  readonly locationSearch?: string;
  readonly onSelectResult?: (item: SearchResultItem) => void;
}

const resolveInitialQuery = (
  syncUrl: boolean,
  searchString: string,
  fallbackQuery: string,
): string => {
  if (!syncUrl || fallbackQuery.length > 0) {
    return fallbackQuery;
  }
  return parseSearchUrlParams(searchString, fallbackQuery).query;
};

const resolveInitialFilter = (
  syncUrl: boolean,
  searchString: string,
  fallbackFilter: SearchCategoryFilter,
): SearchCategoryFilter => {
  if (!syncUrl || fallbackFilter !== 'all') {
    return fallbackFilter;
  }
  return parseSearchUrlParams(searchString, '', fallbackFilter).filter;
};

const syncSearchUrlParams = (
  nextQuery: string,
  nextFilter: SearchCategoryFilter,
): void => {
  if (typeof window === 'undefined') {
    return;
  }
  const nextHref = buildUpdatedSearchUrl(
    window.location.pathname,
    window.location.search,
    window.location.hash,
    nextQuery,
    nextFilter,
  );
  window.history.replaceState(window.history.state, '', nextHref);
};

const syncSelectedSystemsToStore = (
  store: SpatialEntityStore,
  results: GroupedSearchResults,
  activeSearch: string,
  corpus: readonly CompactSearchEntry[],
  layerIndex: readonly DatasetLayerIndexEntry[],
  loadedLayers: readonly DatasetLayerManifest[],
): void => {
  const windowSearch =
    typeof window !== 'undefined' ? window.location.search : '';
  const searchToUse =
    windowSearch && !activeSearch.includes('layer=') && windowSearch.includes('layer=')
      ? `${activeSearch}${activeSearch.includes('?') ? '&' : '?'}${windowSearch.replace(/^\?/, '')}`
      : activeSearch || windowSearch;

  const urlSelected =
    results.query.trim().length === 0
      ? resolveSelectedSystemsFromUrlSelect(
          searchToUse,
          corpus,
          layerIndex,
          loadedLayers,
        )
      : [];
  const selectedSystems =
    urlSelected.length > 0
      ? urlSelected
      : resolveSelectedSystemsFromSearchResults(results);
  const state = store.getState();
  for (const system of selectedSystems) {
    state.registerEntity(system);
  }
  state.setSelectedIds(selectedSystems.map((s) => s.id));
};

const syncUrlFocusToStore = (
  store: SpatialEntityStore,
  focusSlug: string | null,
  corpus: readonly CompactSearchEntry[],
  fallbackFocusIdRef?: { current: string | null },
  activeSearch = '',
): void => {
  const state = store.getState();
  const routeStops = extractUrlRouteStops(activeSearch);
  const firstRouteStop = routeStops && routeStops.length > 0 ? routeStops[0] : null;

  if (!focusSlug && !firstRouteStop) {
    if (fallbackFocusIdRef?.current) {
      state.unregisterEntity(fallbackFocusIdRef.current);
      fallbackFocusIdRef.current = null;
    }
    state.setFocused(null);
    return;
  }

  const primaryEntity = focusSlug
    ? resolveFocusedEntityFromCorpus(focusSlug, corpus)
    : null;
  const routeOriginEntity = firstRouteStop
    ? resolveFocusedEntityFromCorpus(firstRouteStop, corpus)
    : null;

  if (!primaryEntity && !routeOriginEntity) {
    state.setFocused(null);
    return;
  }

  if (
    fallbackFocusIdRef?.current &&
    fallbackFocusIdRef.current !== primaryEntity?.id &&
    fallbackFocusIdRef.current !== routeOriginEntity?.id
  ) {
    state.unregisterEntity(fallbackFocusIdRef.current);
  }
  if (fallbackFocusIdRef && focusSlug && primaryEntity) {
    const matchedInCorpus = findFocusedEntryInCorpus(focusSlug, corpus);
    fallbackFocusIdRef.current = matchedInCorpus ? null : primaryEntity.id;
  }

  const focusedIds: string[] = [];
  if (primaryEntity) {
    state.registerEntity(primaryEntity);
    focusedIds.push(primaryEntity.id);
  }
  if (routeOriginEntity) {
    state.registerEntity(routeOriginEntity);
    if (!focusedIds.includes(routeOriginEntity.id)) {
      focusedIds.push(routeOriginEntity.id);
    }
  }

  if (focusedIds.length === 1) {
    state.setFocused(focusedIds[0]);
  } else {
    state.setFocusedIds(focusedIds);
  }
};

export const isJsdomEnv =
  typeof window !== 'undefined' &&
  /jsdom/i.test(window.navigator?.userAgent ?? '');

/** Minimum trimmed query length before the catalogue is searched and results are suggested. */
export const SEARCH_MIN_QUERY_LENGTH = 3;

/** Idle time after the last keystroke before a search runs, so typing is never blocked by matching. */
export const SEARCH_DEBOUNCE_MS = 150;

/**
 * Lazily prefetches summary nodes, detail records, layer manifests, and entity annotations
 * for top search results once at least 3 characters have been entered.
 */
export const prefetchSearchResultsDetails = (
  results: GroupedSearchResults,
): void => {
  if (!results || !results.query || results.query.trim().length < 3) {
    return;
  }

  const groups = results.groups;
  if (!groups) {
    return;
  }

  const seenSummaryNodes = new Set<string>();
  const seenDetailRecords = new Set<string>();
  const seenEntityAnnotations = new Set<string>();
  const seenLayerManifests = new Set<string>();

  for (const [groupKey, group] of Object.entries(groups)) {
    if (!group || !Array.isArray(group.items)) {
      continue;
    }

    const isLayerGroup = groupKey === 'layers';

    for (const item of group.items) {
      if (!item) {
        continue;
      }

      const isLayer = isLayerGroup || item.category === 'layers';

      if (isLayer) {
        const itemWithLayerId = item as unknown as { layerId?: string };
        const rawLayerId =
          itemWithLayerId.layerId ??
          item.canonLayerId ??
          (item.id.includes(':') ? item.id.split(':')[0] : item.id);

        if (rawLayerId && !seenLayerManifests.has(rawLayerId)) {
          seenLayerManifests.add(rawLayerId);
          void fetchLayerManifest(rawLayerId).catch(() => undefined);
        }

        const targetSystemId =
          item.systemId ??
          (item.id.includes(':') ? item.id.split(':')[1] : undefined);

        if (targetSystemId) {
          if (!seenSummaryNodes.has(targetSystemId)) {
            seenSummaryNodes.add(targetSystemId);
            void fetchSummaryNode(targetSystemId).catch(() => undefined);
          }
          if (!seenDetailRecords.has(targetSystemId)) {
            seenDetailRecords.add(targetSystemId);
            void fetchDetailRecord(targetSystemId).catch(() => undefined);
          }
        }

        if (item.id.includes(':')) {
          const targetEntityId = item.id.split(':')[1];
          if (targetEntityId && !seenDetailRecords.has(targetEntityId)) {
            seenDetailRecords.add(targetEntityId);
            void fetchDetailRecord(targetEntityId).catch(() => undefined);
          }
        }
      } else {
        const entityId = item.id;
        const systemId = item.systemId ?? item.id;

        if (systemId && !seenSummaryNodes.has(systemId)) {
          seenSummaryNodes.add(systemId);
          void fetchSummaryNode(systemId).catch(() => undefined);
        }

        if (systemId && !seenDetailRecords.has(systemId)) {
          seenDetailRecords.add(systemId);
          void fetchDetailRecord(systemId).catch(() => undefined);
        }

        if (entityId && entityId !== systemId && !seenDetailRecords.has(entityId)) {
          seenDetailRecords.add(entityId);
          void fetchDetailRecord(entityId).catch(() => undefined);
        }

        const annotationIds = [
          entityId,
          ...(item.systemId ? [item.systemId] : []),
        ].filter(Boolean);
        const annotationKey = annotationIds.join(',');
        if (annotationIds.length > 0 && !seenEntityAnnotations.has(annotationKey)) {
          seenEntityAnnotations.add(annotationKey);
          void fetchEntityAnnotations(annotationIds).catch(() => undefined);
        }
      }
    }
  }
};

export const SearchRoot = ({
  children,
  initialQuery = '',
  initialFilter = 'all',
  initialCorpus,
  limitPerCategory,
  syncUrl = true,
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
  const [results, setResults] = useState<GroupedSearchResults>(() => {
    const computed =
      initialAvailableCorpus && query.trim().length > 0
        ? executeCatalogSearch(initialAvailableCorpus, {
            query,
            filter,
            limitPerCategory,
            systemEntries: initialSystemEntries,
          })
        : executeCatalogSearch([], {
            query,
            filter,
            limitPerCategory,
          });

    const focusCorpus =
      initialCorpus ??
      initialSystemEntries ??
      initialAvailableCorpus ??
      [];
    syncSelectedSystemsToStore(
      store,
      computed,
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

    return computed;
  });

  const requestSeqRef = useRef<number>(0);
  const prevUrlKeyRef = useRef<string>(`${activePathname}${activeSearch}`);
  const prevLoadedLayerKeyRef = useRef<string>('');
  const deferredSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isJsdomEnv =
    typeof window !== 'undefined' &&
    /jsdom/i.test(window.navigator?.userAgent ?? '');

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
      const applyUpdates = (): void => {
        setResults(nextResults);
        const effectiveSearch = overrideSearch ?? activeSearch;
        const effectiveCorpus =
          overrideCorpus ??
          initialCorpus ??
          getCachedCorpusForFilter('all') ??
          getCachedCorpusForFilter(nextResults.filter) ??
          [];
        syncSelectedSystemsToStore(
          store,
          nextResults,
          effectiveSearch,
          effectiveCorpus,
          layerDataRef.current.layerIndex,
          layerDataRef.current.loadedLayers,
        );
      };

      if (!isJsdomEnv) {
        startTransition(() => {
          applyUpdates();
        });
      } else {
        applyUpdates();
      }

      if (nextResults.query.trim().length >= 3) {
        prefetchSearchResultsDetails(nextResults);
      }
    },
    [activeSearch, initialCorpus, isJsdomEnv, store],
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
      const activeQuery = overrideQuery ?? query;
      const activeFilter = overrideFilter ?? filter;
      const currentSeq = ++requestSeqRef.current;

      if (!activeQuery.trim()) {
        updateResultsAndSelection(
          executeCatalogSearch([], {
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
        const computed = executeCatalogSearch(syncCorpus, {
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
            const expandedComputed = executeCatalogSearch(expandedCorpus, {
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
        let computed = executeCatalogSearch(corpus, {
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
          computed = executeCatalogSearch(expandedCorpus, {
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
    const currentUrlKey = `${activePathname}${activeSearch}`;
    if (prevUrlKeyRef.current !== currentUrlKey) {
      prevUrlKeyRef.current = currentUrlKey;
      const nextQuery = resolveInitialQuery(syncUrl, activeSearch, initialQuery);
      const nextFilter = resolveInitialFilter(syncUrl, activeSearch, initialFilter);
      setQueryState(nextQuery);
      setFilterState(nextFilter);
      void submitSearch(nextQuery, nextFilter);
    }
  }, [activePathname, activeSearch, initialFilter, initialQuery, submitSearch, syncUrl]);

  // Pre-warm the base search corpus in the background and resolve initial URL query and URL focus once loaded
  useEffect(() => {
    const focusSlug =
      syncUrl ||
      locationPathname !== undefined ||
      locationSearch !== undefined
        ? extractUrlFocusSlug(activePathname, activeSearch)
        : null;

    if (initialCorpus) {
      if (
        syncUrl ||
        locationPathname !== undefined ||
        locationSearch !== undefined
      ) {
        syncUrlFocusToStore(
          store,
          focusSlug,
          initialCorpus,
          fallbackFocusIdRef,
          activeSearch,
        );
      }
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    const startQuery = resolveInitialQuery(syncUrl, activeSearch, initialQuery);
    const startFilter = resolveInitialFilter(
      syncUrl,
      activeSearch,
      initialFilter,
    );

    let cancelled = false;
    void Promise.all([
      loadSearchCorpusForFilter(startFilter),
      startFilter === 'all'
        ? Promise.resolve(undefined)
        : fetchSearchShard('core').catch(() => undefined),
    ])
      .then(async ([corpus, coreShard]) => {
        if (cancelled) {
          return;
        }

        const systemEntries = coreShard ?? getCachedCorpusForFilter('all');

        if (startQuery.trim().length > 0) {
          const computed = executeCatalogSearch(corpus, {
            query: startQuery,
            filter: startFilter,
            limitPerCategory,
            systemEntries,
          });
          updateResultsAndSelection(computed);
          setStatus('ready');
        }

        if (
          syncUrl ||
          locationPathname !== undefined ||
          locationSearch !== undefined
        ) {
          let focusCorpus = systemEntries
            ? mergeSearchShards([corpus, systemEntries])
            : corpus;

          if (focusSlug && !findFocusedEntryInCorpus(focusSlug, focusCorpus)) {
            const planetsShard = await fetchSearchShard('planets').catch(
              () => undefined,
            );
            if (cancelled) {
              return;
            }
            if (planetsShard) {
              focusCorpus = mergeSearchShards([focusCorpus, planetsShard]);
            }
          }

          if (focusSlug && !findFocusedEntryInCorpus(focusSlug, focusCorpus)) {
            const starsShard = await fetchSearchShard('stars').catch(
              () => undefined,
            );
            if (cancelled) {
              return;
            }
            if (starsShard) {
              focusCorpus = mergeSearchShards([focusCorpus, starsShard]);
            }
          }

          if (startQuery.trim().length === 0) {
            syncSelectedSystemsToStore(
              store,
              executeCatalogSearch([], {
                query: '',
                filter: startFilter,
                limitPerCategory,
              }),
              activeSearch,
              focusCorpus,
              layerDataRef.current.layerIndex,
              layerDataRef.current.loadedLayers,
            );
          }

          syncUrlFocusToStore(
            store,
            focusSlug,
            focusCorpus,
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
    initialCorpus,
    initialFilter,
    initialQuery,
    limitPerCategory,
    locationPathname,
    locationSearch,
    store,
    syncUrl,
    updateResultsAndSelection,
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
      const executeSync = searchQuery.length === 0 || isJsdomEnv;

      if (executeSync) {
        if (syncUrl) {
          syncSearchUrlParams(nextQuery, filter);
          if (typeof window !== 'undefined') {
            const nextSearch = window.location.search;
            prevUrlKeyRef.current = `${window.location.pathname}${nextSearch}`;
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
          if (typeof window !== 'undefined') {
            const nextSearch = window.location.search;
            prevUrlKeyRef.current = `${window.location.pathname}${nextSearch}`;
            setWindowLocation({
              pathname: window.location.pathname,
              search: nextSearch,
            });
          }
        }
        startTransition(() => {
          void submitSearch(searchQuery, filter);
        });
      }, SEARCH_DEBOUNCE_MS);
    },
    [filter, isJsdomEnv, submitSearch, syncUrl],
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
          prevUrlKeyRef.current = `${window.location.pathname}${nextSearch}`;
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
      if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
        setIsFocused(false);
      }
    },
    [],
  );

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

export interface SearchInputProps {
  readonly id?: string;
  readonly label?: string;
}

export const SearchInput = ({
  id = 'starmap-search-input',
  label = 'Search query',
}: SearchInputProps) => {
  const { query, setQuery } = useSearchContext();

  const handleQueryChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setQuery(event.target.value);
  };

  const handleClearQuery = (): void => {
    setQuery('');
  };

  return (
    <div className={styles.inputRow}>
      <label htmlFor={id} className={styles.srOnly}>
        {label}
      </label>
      <Input
        id={id}
        name="query"
        type="search"
        sizeVariant="sm"
        placeholder="Search stars, planets, layers..."
        value={query}
        onChange={handleQueryChange}
        className={styles.searchInput}
      />
      <Button
        type="button"
        size="sm"
        variant="subtle"
        data-testid="search-clear-button"
        onClick={handleClearQuery}
        className={styles.expandedControl}
      >
        Clear search
      </Button>
    </div>
  );
};

export interface SearchCategoryFilterProps {
  readonly id?: string;
  readonly label?: string;
}

export const SearchCategoryFilterSelect = ({
  id = 'starmap-search-filter',
  label = 'Filter',
}: SearchCategoryFilterProps) => {
  const { filter, setFilter } = useSearchContext();

  return (
    <div className={styles.filterField}>
      <label htmlFor={id} className={styles.srOnly}>
        {label}
      </label>
      <Select
        id={id}
        name="searchCategory"
        sizeVariant="sm"
        value={filter}
        options={[
          { value: 'all', label: 'All Categories' },
          ...SEARCH_CATEGORIES.map((category) => ({
            value: category.key,
            label: category.heading,
          })),
        ]}
        onChange={(nextValue) => {
          if (isSearchCategoryFilter(nextValue)) {
            setFilter(nextValue);
          }
        }}
      />
    </div>
  );
};

export interface SearchPanelProps {
  readonly heading?: string;
  readonly children?: ReactNode;
  readonly scope?: 'galaxy' | 'system' | 'planet' | 'search';
}

export const SearchPanel = ({
  heading = 'Search',
  children,
  scope,
}: SearchPanelProps) => {
  const { isFocused, setIsFocused } = useSearchContext();
  const layerIndex = useLayerIndex();
  const router = useRouter({ warn: false });

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
  };

  const handleExplore = (): void => {
    if (typeof window === 'undefined') {
      return;
    }
    if (setIsFocused) {
      setIsFocused(false);
    }
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    const currentLayer = new URLSearchParams(window.location.search).get('layer');
    const nextHref = pickRandomLayerOverviewHref(
      currentLayer,
      Math.random,
      layerIndex,
    );
    const parsedNext = parseLayerQueryParam(new URLSearchParams(nextHref.split('?')[1] ?? '').get('layer'));
    if (router?.state && parsedNext?.layerSlug) {
      void router.navigate({
        to: '/galaxy',
        search: (prev) => ({
          ...prev,
          select: `layer:${parsedNext.layerSlug}`,
          layer: parsedNext.layerSlug,
        }),
      });
    }
  };

  const isExpanded = scope === 'search' || Boolean(isFocused);

  return (
    <section
      aria-labelledby="search-panel-heading"
      data-testid="search-panel"
      data-scope={scope}
      data-search-focused={isExpanded ? 'true' : 'false'}
      className={styles.searchPanel}
    >
      <Heading
        as="h2"
        id="search-panel-heading"
        className={styles.srOnly}
      >
        {heading}
      </Heading>
      <form
        role="search"
        className={styles.searchForm}
        onSubmit={handleSubmit}
      >
        {children ?? (
          <>
            <SearchInput />
            <div
              className={styles.expandedDrawer}
              data-testid="search-expanded-drawer"
            >
              <SearchCategoryFilterSelect />
              <Button
                type="button"
                size="sm"
                variant="default"
                data-testid="search-explore-button"
                onClick={handleExplore}
              >
                Explore
              </Button>
            </div>
          </>
        )}
      </form>
    </section>
  );
};

export interface SearchResultsProps {
  readonly heading?: string;
  readonly searchViewPath?: string;
  readonly renderItem?: (result: SearchResultItem) => ReactNode;
}

export const SearchResults = ({
  heading = 'Search Results',
  searchViewPath,
  renderItem,
}: SearchResultsProps) => {
  const { query, filter, status, errorMessage, results, onSelectResult, dismissSearch } =
    useSearchContext();

  if (query.trim().length === 0) {
    return null;
  }

  const handleResultsClick = (event: React.MouseEvent<HTMLElement>): void => {
    const target = event.target as Element | null;
    const anchor = target?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (anchor) {
      dismissSearch?.();
    }
  };

  return (
    <section
      aria-labelledby="search-results-heading"
      data-testid="search-results-panel"
      data-status={status}
      className={styles.resultsPanel}
      onClick={handleResultsClick}
    >
      <Heading
        as="h2"
        id="search-results-heading"
        size="eyebrow"
        className={styles.srOnly}
      >
        {heading}
      </Heading>
      {searchViewPath ? (
        <p>
          <a
            href={buildSearchViewHref(query, filter, searchViewPath)}
            data-testid="search-view-link"
          >
            View all search results
          </a>
        </p>
      ) : null}
      {status === 'loading' ? <p>Searching...</p> : null}
      {status === 'error' && errorMessage ? (
        <p role="alert">{errorMessage}</p>
      ) : null}
      {SEARCH_CATEGORIES.map((category) => {
        const group = results.groups[category.key];
        if (group.items.length === 0) {
          return null;
        }
        return (
          <section
            key={category.key}
            aria-label={category.heading}
            data-category={category.key}
            data-testid={`search-results-group-${category.key}`}
          >
            <Heading as="h3" size="eyebrow">
              {category.heading}
            </Heading>
            {searchViewPath ? (
              <p>
                <a
                  href={buildSearchViewHref(query, category.key, searchViewPath)}
                  data-testid={`search-category-link-${category.key}`}
                >
                  {`View all ${category.heading}`}
                </a>
              </p>
            ) : null}
            <ul>
              {group.items.map((item) =>
                renderItem ? (
                  renderItem(item)
                ) : (
                  <SearchResultItemRow
                    key={item.id}
                    result={item}
                    onSelect={onSelectResult}
                  />
                ),
              )}
            </ul>
          </section>
        );
      })}
    </section>
  );
};
