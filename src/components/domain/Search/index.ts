import { SearchRoot, type SearchRootProps } from './SearchRoot';
import { SearchPanel, type SearchPanelProps } from './SearchPanel';
import { SearchInput, type SearchInputProps } from './SearchInput';
import {
  SearchCategoryFilterSelect,
  type SearchCategoryFilterProps,
} from './SearchCategoryFilterSelect';
import { SearchResults, type SearchResultsProps } from './SearchResults';
import { SearchResultItem, type SearchResultItemProps } from '../SearchResultItem';
import {
  useSearchContext,
  type SearchContextValue,
  type SearchExecutionStatus,
} from './SearchContext';
import {
  SEARCH_DEBOUNCE_MS,
  SEARCH_MIN_QUERY_LENGTH,
  prefetchSearchResultsDetails,
} from './searchHelpers';
import {
  syncSelectedSystemsToStore,
  syncUrlFocusToStore,
} from './searchStoreSync';

export const Search = {
  Root: SearchRoot,
  Panel: SearchPanel,
  Input: SearchInput,
  CategoryFilter: SearchCategoryFilterSelect,
  Results: SearchResults,
  ResultItem: SearchResultItem,
} as const;

export {
  SearchCategoryFilterSelect,
  SearchInput,
  SearchPanel,
  SearchResultItem,
  SearchResults,
  SearchRoot,
  SEARCH_DEBOUNCE_MS,
  SEARCH_MIN_QUERY_LENGTH,
  prefetchSearchResultsDetails,
  syncSelectedSystemsToStore,
  syncUrlFocusToStore,
  useSearchContext,
  type SearchCategoryFilterProps,
  type SearchContextValue,
  type SearchExecutionStatus,
  type SearchInputProps,
  type SearchPanelProps,
  type SearchResultItemProps,
  type SearchResultsProps,
  type SearchRootProps,
};

export default Search;
