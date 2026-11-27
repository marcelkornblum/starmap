import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type ReactNode,
} from 'react';
import {
  useLayerIndex,
  useLoadedLayerManifests,
} from '../../../../hooks/useLayerData';
import { useOptionalRouter, useSpaLocation } from '../../../../hooks/useSpaLocation';
import { isSpatialRoutePathname } from '../../../../utils/spatialRoute';
import type { SearchCategoryFilter } from '../../../../types/search';
import type { SearchResultItem } from '../../../../services/search/searchTypes';
import type { CompactSearchEntry } from '../../../../utils/compactDataTypes';
import { useSpatialEntityStoreApi } from '../../../canvas/entity/SpatialEntityContext';
import { escalateSearchBackgroundWarmup } from '../../../../data/searchBackgroundWarmup';
import { useCameraStore } from '../../../../stores/useCameraStore';
import {
  SearchContext,
  type SearchContextValue,
} from '../SearchContext';
import { SEARCH_DEBOUNCE_MS } from '../searchHelpers';
import {
  resolveInitialFilter,
  resolveInitialQuery,
  type SelfWrittenSearchParams,
} from '../searchUrlSync';
import { useSearchExecution } from '../useSearchExecution';
import { useSearchFraming } from '../useSearchFraming';
import { useSearchUrlSyncEffect } from '../useSearchUrlSyncEffect';
import styles from './SearchRoot.module.css';

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
  const searchRootRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const lastSelfWrittenSearchRef = useRef<SelfWrittenSearchParams | null>(null);
  const [isFocused, setIsFocused] = useState<boolean>(() =>
    useCameraStore.getState().pendingViewTransitionFocus,
  );

  useEffect(() => {
    if (!useCameraStore.getState().consumeSearchFocusForViewTransition()) {
      return;
    }
    const input = searchInputRef.current;
    if (input) {
      input.focus({ preventScroll: true });
      const endPos = input.value.length;
      try {
        input.setSelectionRange(endPos, endPos);
      } catch {
        return;
      }
    }
  }, []);

  const router = useOptionalRouter();
  const spaLocation = useSpaLocation(locationPathname, locationSearch, '/');
  const activePathname = spaLocation.pathname;
  const activeSearch = spaLocation.search;

  const layerIndex = useLayerIndex();
  const loadedLayers = useLoadedLayerManifests(activeSearch);

  const effectiveDebounceMs = debounceMs ?? SEARCH_DEBOUNCE_MS;
  const isSync = Boolean(syncMode) || effectiveDebounceMs === 0;

  const resolvedInitialQuery = resolveInitialQuery(syncUrl, activeSearch, initialQuery);
  const resolvedInitialFilter = resolveInitialFilter(syncUrl, activeSearch, initialFilter);

  const cancelFramingRef = useRef<() => void>(() => undefined);
  const discardPreSearchPoseRef = useRef<() => void>(() => undefined);

  const handleSelectResult = useCallback(
    (item: SearchResultItem): void => {
      cancelFramingRef.current();
      discardPreSearchPoseRef.current();
      onSelectResult?.(item);
    },
    [onSelectResult],
  );

  const {
    query,
    setQueryState,
    filter,
    setFilterState,
    status,
    setStatus,
    errorMessage,
    results,
    updateResultsAndSelection,
    submitSearch,
    setQuery,
    setFilter,
    dismissSearch,
  } = useSearchExecution({
    initialQuery: resolvedInitialQuery,
    initialFilter: resolvedInitialFilter,
    initialCorpus,
    limitPerCategory,
    syncUrl,
    isSync,
    effectiveDebounceMs,
    activePathname,
    activeSearch,
    store,
    layerIndex,
    loadedLayers,
    onSelectResult: onSelectResult ? handleSelectResult : undefined,
    searchRootRef,
    setIsFocused,
    lastSelfWrittenSearchRef,
  });

  const { markUserSearchActivity, cancelSearchFraming, discardPreSearchPose } =
    useSearchFraming({
      enabled: syncUrl && isSpatialRoutePathname(activePathname),
      activePathname,
      activeSearch,
      query,
      filter,
      status,
      results,
      initialCorpus,
      router,
    });

  useEffect(() => {
    cancelFramingRef.current = cancelSearchFraming;
    discardPreSearchPoseRef.current = discardPreSearchPose;
  }, [cancelSearchFraming, discardPreSearchPose]);

  const handleSetQuery = useCallback(
    (nextQuery: string): void => {
      cancelSearchFraming();
      if (nextQuery.trim().length > 0) {
        markUserSearchActivity();
      }
      setQuery(nextQuery);
    },
    [cancelSearchFraming, markUserSearchActivity, setQuery],
  );

  const handleSetFilter = useCallback(
    (nextFilter: SearchCategoryFilter): void => {
      cancelSearchFraming();
      if (query.trim().length > 0) {
        markUserSearchActivity();
      }
      setFilter(nextFilter);
    },
    [cancelSearchFraming, markUserSearchActivity, query, setFilter],
  );

  const handleDismissSearch = useCallback(
    (item?: SearchResultItem): void => {
      cancelSearchFraming();
      if (item) {
        discardPreSearchPose();
      }
      dismissSearch(item);
    },
    [cancelSearchFraming, discardPreSearchPose, dismissSearch],
  );

  useSearchUrlSyncEffect({
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
    query,
    filter,
    setQueryState,
    setFilterState,
    setStatus,
    submitSearch,
    updateResultsAndSelection,
    lastSelfWrittenSearchRef,
  });

  const handleFocusCapture = useCallback((): void => {
    setIsFocused(true);
    if (!initialCorpus) {
      escalateSearchBackgroundWarmup();
    }
  }, [initialCorpus]);

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

  const contextValue = useMemo<SearchContextValue>(
    () => ({
      query,
      filter,
      status,
      errorMessage,
      results,
      isFocused,
      setIsFocused,
      searchInputRef,
      dismissSearch: handleDismissSearch,
      setQuery: handleSetQuery,
      setFilter: handleSetFilter,
      submitSearch,
      onSelectResult: onSelectResult ? handleSelectResult : undefined,
    }),
    [
      query,
      filter,
      status,
      errorMessage,
      results,
      isFocused,
      handleDismissSearch,
      handleSetQuery,
      handleSetFilter,
      submitSearch,
      onSelectResult,
      handleSelectResult,
    ],
  );

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
