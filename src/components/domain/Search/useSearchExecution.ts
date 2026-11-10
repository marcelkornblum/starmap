import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { getCachedCorpusForFilter } from '../../../data/searchRepository';
import type {
  GroupedSearchResults,
  SearchCategoryFilter,
  SearchResultItem,
} from '../../../services/searchService';
import type { CompactSearchEntry } from '../../../utils/compactDataCodec';
import type { SearchExecutionStatus } from './SearchContext';
import {
  SEARCH_MIN_QUERY_LENGTH,
  prefetchSearchResultsDetails,
  searchCatalog,
} from './searchHelpers';
import { syncSearchUrlParams } from './searchUrlSync';
import { syncSelectedSystemsToStore } from './searchStoreSync';
import {
  expandStarsShardIfEmpty,
  fetchAndComputeAsyncSearch,
} from './asyncSearchExecutor';
import type {
  UseSearchExecutionOptions,
  UseSearchExecutionReturn,
} from './searchExecutionTypes';

export const useSearchExecution = ({
  initialQuery,
  initialFilter,
  initialCorpus,
  limitPerCategory,
  syncUrl,
  isSync,
  effectiveDebounceMs,
  activeSearch,
  store,
  layerIndex,
  loadedLayers,
  onSelectResult,
  searchRootRef,
  setIsFocused,
}: UseSearchExecutionOptions): UseSearchExecutionReturn => {
  const [query, setQueryState] = useState<string>(initialQuery);
  const [filter, setFilterState] = useState<SearchCategoryFilter>(initialFilter);

  const initialAvailableCorpus =
    initialCorpus ?? getCachedCorpusForFilter(filter);
  const initialSystemEntries = getCachedCorpusForFilter('all');

  const [status, setStatus] = useState<SearchExecutionStatus>(() =>
    initialAvailableCorpus && query.trim().length > 0 ? 'ready' : 'idle',
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [results, setResults] = useState<GroupedSearchResults>(() =>
    searchCatalog(initialAvailableCorpus && query.trim().length > 0 ? initialAvailableCorpus : [], {
      query,
      filter,
      limitPerCategory,
      systemEntries: initialSystemEntries,
    }),
  );

  const requestSeqRef = useRef<number>(0);
  const deferredSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const layerDataRef = useRef({ layerIndex, loadedLayers });
  useEffect(() => {
    layerDataRef.current = { layerIndex, loadedLayers };
  });

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
      setResults(nextResults);

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

  const submitSearch = useCallback(
    async (
      overrideQuery?: string,
      overrideFilter?: SearchCategoryFilter,
    ): Promise<void> => {
      const requestedQuery = overrideQuery ?? query;
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

      const syncCorpus = initialCorpus ?? getCachedCorpusForFilter(activeFilter);
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
          void expandStarsShardIfEmpty(
            syncCorpus,
            activeQuery,
            activeFilter,
            limitPerCategory,
            cachedAllCorpus,
            () => requestSeqRef.current === currentSeq,
          ).then((expanded) => {
            if (expanded) updateResultsAndSelection(expanded);
          });
        }
        return;
      }

      setStatus('loading');
      setErrorMessage(null);

      try {
        const computed = await fetchAndComputeAsyncSearch(
          activeQuery,
          activeFilter,
          limitPerCategory,
          () => requestSeqRef.current === currentSeq,
        );
        if (computed) {
          updateResultsAndSelection(computed);
          setStatus('ready');
        }
      } catch (err: unknown) {
        if (requestSeqRef.current !== currentSeq) return;
        const message =
          err instanceof Error ? err.message : 'Unable to execute catalog search.';
        setErrorMessage(message);
        setStatus('error');
      }
    },
    [filter, initialCorpus, limitPerCategory, query, updateResultsAndSelection],
  );

  const setQuery = useCallback(
    (nextQuery: string): void => {
      setQueryState(nextQuery);
      if (nextQuery.trim().length > 0) {
        setIsFocused(true);
      }

      if (deferredSearchTimerRef.current !== null) {
        clearTimeout(deferredSearchTimerRef.current);
        deferredSearchTimerRef.current = null;
      }

      const searchQuery =
        nextQuery.trim().length >= SEARCH_MIN_QUERY_LENGTH ? nextQuery : '';
      const executeSync = searchQuery.length === 0 || isSync;

      if (executeSync) {
        if (syncUrl) syncSearchUrlParams(nextQuery, filter);
        void submitSearch(searchQuery, filter);
        return;
      }

      deferredSearchTimerRef.current = setTimeout(() => {
        deferredSearchTimerRef.current = null;
        if (syncUrl) syncSearchUrlParams(nextQuery, filter);
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
      if (syncUrl) syncSearchUrlParams(query, nextFilter);
      void submitSearch(query, nextFilter);
    },
    [query, submitSearch, syncUrl],
  );

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
      if (syncUrl && !item) syncSearchUrlParams('', filter);
      void submitSearch('', filter);
      if (item && onSelectResult) onSelectResult(item);
    },
    [filter, onSelectResult, searchRootRef, setIsFocused, submitSearch, syncUrl],
  );

  return {
    query, setQueryState,
    filter, setFilterState,
    status, setStatus,
    errorMessage, setErrorMessage,
    results, setResults,
    updateResultsAndSelection,
    submitSearch,
    setQuery, setFilter, dismissSearch,
  };
};
