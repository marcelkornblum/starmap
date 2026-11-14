import {
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
} from '../../../../hooks/useLayerData';
import { useSpaLocation } from '../../../../hooks/useSpaLocation';
import type {
  SearchCategoryFilter,
  SearchResultItem,
} from '../../../../services/searchService';
import type { CompactSearchEntry } from '../../../../utils/compactDataCodec';
import { useSpatialEntityStoreApi } from '../../../canvas/entity/SpatialEntityContext';
import {
  SearchContext,
  type SearchContextValue,
} from '../SearchContext';
import { SEARCH_DEBOUNCE_MS } from '../searchHelpers';
import {
  resolveInitialFilter,
  resolveInitialQuery,
} from '../searchUrlSync';
import { useSearchExecution } from '../useSearchExecution';
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
  const [isFocused, setIsFocused] = useState<boolean>(false);

  const spaLocation = useSpaLocation(locationPathname, locationSearch, '/');
  const activePathname = spaLocation.pathname;
  const activeSearch = spaLocation.search;

  const layerIndex = useLayerIndex();
  const loadedLayers = useLoadedLayerManifests(activeSearch);

  const effectiveDebounceMs = debounceMs ?? SEARCH_DEBOUNCE_MS;
  const isSync = Boolean(syncMode) || effectiveDebounceMs === 0;

  const resolvedInitialQuery = resolveInitialQuery(syncUrl, activeSearch, initialQuery);
  const resolvedInitialFilter = resolveInitialFilter(syncUrl, activeSearch, initialFilter);

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
    activeSearch,
    store,
    layerIndex,
    loadedLayers,
    onSelectResult,
    searchRootRef,
    setIsFocused,
  });

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
    filter,
    setQueryState,
    setFilterState,
    setStatus,
    submitSearch,
    updateResultsAndSelection,
  });

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
