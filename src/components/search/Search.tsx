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
  isSearchCategoryFilter,
  parseSearchUrlParams,
  type GroupedSearchResults,
  type SearchCategoryFilter,
  type SearchResultItem,
} from '../../services/searchService';
import type { CompactSearchEntry } from '../../utils/compactDataCodec';
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
  readonly onSelectResult?: (item: SearchResultItem) => void;
}

const readInitialQueryFromUrl = (fallbackQuery: string): string => {
  if (fallbackQuery.length > 0 || typeof window === 'undefined') {
    return fallbackQuery;
  }
  return parseSearchUrlParams(window.location.search, fallbackQuery).query;
};

const readInitialFilterFromUrl = (
  fallbackFilter: SearchCategoryFilter,
): SearchCategoryFilter => {
  if (fallbackFilter !== 'all' || typeof window === 'undefined') {
    return fallbackFilter;
  }
  return parseSearchUrlParams(window.location.search, '', fallbackFilter).filter;
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

export const SearchRoot = ({
  children,
  initialQuery = '',
  initialFilter = 'all',
  initialCorpus,
  limitPerCategory,
  syncUrl = true,
  onSelectResult,
}: SearchRootProps) => {
  const [query, setQueryState] = useState<string>(() =>
    syncUrl ? readInitialQueryFromUrl(initialQuery) : initialQuery,
  );
  const [filter, setFilterState] = useState<SearchCategoryFilter>(() =>
    syncUrl ? readInitialFilterFromUrl(initialFilter) : initialFilter,
  );
  const [status, setStatus] = useState<SearchExecutionStatus>(() =>
    initialCorpus && initialQuery.trim().length > 0 ? 'ready' : 'idle',
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [results, setResults] = useState<GroupedSearchResults>(() =>
    initialCorpus && initialQuery.trim().length > 0
      ? executeCatalogSearch(initialCorpus, {
          query: initialQuery,
          filter: initialFilter,
          limitPerCategory,
        })
      : executeCatalogSearch([], {
          query: initialQuery,
          filter: initialFilter,
          limitPerCategory,
        }),
  );

  const requestSeqRef = useRef<number>(0);

  const submitSearch = useCallback(
    async (
      overrideQuery?: string,
      overrideFilter?: SearchCategoryFilter,
    ): Promise<void> => {
      const activeQuery = overrideQuery ?? query;
      const activeFilter = overrideFilter ?? filter;
      const currentSeq = ++requestSeqRef.current;

      if (!activeQuery.trim()) {
        setResults(
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
        setResults(computed);
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
            setResults(expandedComputed);
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

        setResults(computed);
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
    [filter, initialCorpus, limitPerCategory, query],
  );

  // Pre-warm the base search corpus in the background and resolve initial URL query once loaded
  useEffect(() => {
    if (initialCorpus || typeof window === 'undefined') {
      return;
    }
    const startQuery = syncUrl
      ? readInitialQueryFromUrl(initialQuery)
      : initialQuery;
    const startFilter = syncUrl
      ? readInitialFilterFromUrl(initialFilter)
      : initialFilter;

    let cancelled = false;
    void Promise.all([
      loadSearchCorpusForFilter(startFilter),
      startFilter === 'all'
        ? Promise.resolve(undefined)
        : fetchSearchShard('core').catch(() => undefined),
    ])
      .then(([corpus, coreShard]) => {
        if (cancelled || startQuery.trim().length === 0) {
          return;
        }
        setResults(
          executeCatalogSearch(corpus, {
            query: startQuery,
            filter: startFilter,
            limitPerCategory,
            systemEntries: coreShard ?? getCachedCorpusForFilter('all'),
          }),
        );
        setStatus('ready');
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [initialCorpus, initialFilter, initialQuery, limitPerCategory, syncUrl]);

  const setQuery = useCallback(
    (nextQuery: string): void => {
      setQueryState(nextQuery);
      if (syncUrl) {
        syncSearchUrlParams(nextQuery, filter);
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
}

export const SearchPanel = ({
  heading = 'Search',
  children,
}: SearchPanelProps) => {
  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
  };

  return (
    <section aria-labelledby="search-panel-heading" data-testid="search-panel">
      <h2 id="search-panel-heading">{heading}</h2>
      <form role="search" onSubmit={handleSubmit}>
        {children ?? (
          <>
            <SearchInput />
            <SearchCategoryFilterSelect />
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
