import type { Dispatch, RefObject, SetStateAction } from 'react';
import type {
  DatasetLayerIndexEntry,
  DatasetLayerManifest,
} from '../../../types/astro';
import type {
  GroupedSearchResults,
  SearchCategoryFilter,
  SearchResultItem,
} from '../../../services/searchService';
import type { CompactSearchEntry } from '../../../utils/compactDataCodec';
import type { SpatialEntityStore } from '../../canvas/entity/SpatialEntityStore';
import type { SearchExecutionStatus } from './SearchContext';

export interface UseSearchExecutionOptions {
  readonly initialQuery: string;
  readonly initialFilter: SearchCategoryFilter;
  readonly initialCorpus?: readonly CompactSearchEntry[];
  readonly limitPerCategory?: number;
  readonly syncUrl: boolean;
  readonly isSync: boolean;
  readonly effectiveDebounceMs: number;
  readonly activeSearch: string;
  readonly store: SpatialEntityStore;
  readonly layerIndex: readonly DatasetLayerIndexEntry[];
  readonly loadedLayers: readonly DatasetLayerManifest[];
  readonly onSelectResult?: (item: SearchResultItem) => void;
  readonly searchRootRef: RefObject<HTMLDivElement | null>;
  readonly setIsFocused: (focused: boolean) => void;
}

export interface UseSearchExecutionReturn {
  readonly query: string;
  readonly setQueryState: Dispatch<SetStateAction<string>>;
  readonly filter: SearchCategoryFilter;
  readonly setFilterState: Dispatch<SetStateAction<SearchCategoryFilter>>;
  readonly status: SearchExecutionStatus;
  readonly setStatus: Dispatch<SetStateAction<SearchExecutionStatus>>;
  readonly errorMessage: string | null;
  readonly setErrorMessage: Dispatch<SetStateAction<string | null>>;
  readonly results: GroupedSearchResults;
  readonly setResults: Dispatch<SetStateAction<GroupedSearchResults>>;
  readonly updateResultsAndSelection: (
    nextResults: GroupedSearchResults,
    overrideSearch?: string,
    overrideCorpus?: readonly CompactSearchEntry[],
  ) => void;
  readonly submitSearch: (
    overrideQuery?: string,
    overrideFilter?: SearchCategoryFilter,
  ) => Promise<void>;
  readonly setQuery: (nextQuery: string) => void;
  readonly setFilter: (nextFilter: SearchCategoryFilter) => void;
  readonly dismissSearch: (item?: SearchResultItem) => void;
}
