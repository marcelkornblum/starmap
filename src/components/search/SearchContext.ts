import { createContext, useContext } from 'react';
import {
  executeCatalogSearch,
  type GroupedSearchResults,
  type SearchCategoryFilter,
  type SearchResultItem,
} from '../../services/searchService';

export type SearchExecutionStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface SearchContextValue {
  readonly query: string;
  readonly filter: SearchCategoryFilter;
  readonly status: SearchExecutionStatus;
  readonly errorMessage: string | null;
  readonly results: GroupedSearchResults;
  readonly isFocused?: boolean;
  readonly setQuery: (nextQuery: string) => void;
  readonly setFilter: (nextFilter: SearchCategoryFilter) => void;
  readonly submitSearch: (
    overrideQuery?: string,
    overrideFilter?: SearchCategoryFilter,
  ) => Promise<void>;
  readonly onSelectResult?: (item: SearchResultItem) => void;
}

const DEFAULT_EMPTY_RESULTS = executeCatalogSearch([], {
  query: '',
  filter: 'all',
});

const FALLBACK_CONTEXT_VALUE: SearchContextValue = {
  query: '',
  filter: 'all',
  status: 'idle',
  errorMessage: null,
  results: DEFAULT_EMPTY_RESULTS,
  setQuery: () => undefined,
  setFilter: () => undefined,
  submitSearch: async () => undefined,
};

export const SearchContext = createContext<SearchContextValue>(
  FALLBACK_CONTEXT_VALUE,
);

export const useSearchContext = (): SearchContextValue =>
  useContext(SearchContext);
