import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from 'react';
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
import { extractUrlRouteStops } from '../../services/journeyService';
import { pickRandomLayerOverviewHref } from '../../services/layerCardService';
import { useSpatialEntityStoreApi } from '../canvas/entity/SpatialEntityContext';
import type { SpatialEntityStore } from '../canvas/entity/SpatialEntityStore';
import { SearchResultItem as SearchResultItemRow } from '../domain';
import {
  SearchContext,
  useSearchContext,
  type SearchContextValue,
  type SearchExecutionStatus,
} from './SearchContext';

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
  activeSearch = '',
  corpus: readonly CompactSearchEntry[] = [],
): void => {
  const windowSearch =
    typeof window !== 'undefined' ? window.location.search : '';
  const searchToUse =
    windowSearch && !activeSearch.includes('layer=') && windowSearch.includes('layer=')
      ? `${activeSearch}${activeSearch.includes('?') ? '&' : '?'}${windowSearch.replace(/^\?/, '')}`
      : activeSearch || windowSearch;

  const urlSelected =
    results.query.trim().length === 0
      ? resolveSelectedSystemsFromUrlSelect(searchToUse, corpus)
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
    syncSelectedSystemsToStore(store, computed, activeSearch, focusCorpus);

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

  const updateResultsAndSelection = useCallback(
    (
      nextResults: GroupedSearchResults,
      overrideSearch?: string,
      overrideCorpus?: readonly CompactSearchEntry[],
    ): void => {
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
      );
    },
    [activeSearch, initialCorpus, store],
  );

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
      const state = store.getState();
      state.setSelectedIds([]);
      state.setFocused(null);
    };
  }, [store]);

  const setQuery = useCallback(
    (nextQuery: string): void => {
      setQueryState(nextQuery);
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
      void submitSearch(nextQuery, filter);
    },
    [filter, submitSearch, syncUrl],
  );

  const setFilter = useCallback(
    (nextFilter: SearchCategoryFilter): void => {
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

  const contextValue: SearchContextValue = {
    query,
    filter,
    status,
    errorMessage,
    results,
    setQuery,
    setFilter,
    submitSearch,
    onSelectResult,
  };

  return (
    <SearchContext.Provider value={contextValue}>
      {children}
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
    <>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name="query"
        type="search"
        value={query}
        onChange={handleQueryChange}
      />
      <button
        type="button"
        data-testid="search-clear-button"
        onClick={handleClearQuery}
      >
        Clear search
      </button>
    </>
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

  const handleFilterChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    const nextValue = event.target.value;
    if (isSearchCategoryFilter(nextValue)) {
      setFilter(nextValue);
    }
  };

  return (
    <>
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        name="searchCategory"
        value={filter}
        onChange={handleFilterChange}
      >
        <option value="all">All Categories</option>
        {SEARCH_CATEGORIES.map((category) => (
          <option key={category.key} value={category.key}>
            {category.heading}
          </option>
        ))}
      </select>
    </>
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
  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
  };

  const handleExplore = (): void => {
    if (typeof window === 'undefined') {
      return;
    }
    const currentLayer = new URLSearchParams(window.location.search).get('layer');
    const nextHref = pickRandomLayerOverviewHref(currentLayer);
    window.history.pushState({}, '', nextHref);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <section
      aria-labelledby="search-panel-heading"
      data-testid="search-panel"
      data-scope={scope}
    >
      <h2 id="search-panel-heading">{heading}</h2>
      <form role="search" onSubmit={handleSubmit}>
        {children ?? (
          <>
            <SearchInput />
            <SearchCategoryFilterSelect />
            <button
              type="button"
              data-testid="search-explore-button"
              onClick={handleExplore}
            >
              Explore
            </button>
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
  const { query, filter, status, errorMessage, results, onSelectResult } =
    useSearchContext();

  if (query.trim().length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="search-results-heading"
      data-testid="search-results-panel"
      data-status={status}
    >
      <h2 id="search-results-heading">{heading}</h2>
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
            <h3>{category.heading}</h3>
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
