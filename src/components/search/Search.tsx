import { SearchRoot, type SearchRootProps } from './SearchRoot';
import { SearchPanel, type SearchPanelProps } from './SearchPanel';
import { SearchInput, type SearchInputProps } from './SearchInput';
import {
  SearchCategoryFilterSelect,
  type SearchCategoryFilterProps,
} from './SearchCategoryFilterSelect';
import { SearchResults, type SearchResultsProps } from './SearchResults';
import {
  SEARCH_DEBOUNCE_MS,
  SEARCH_MIN_QUERY_LENGTH,
  prefetchSearchResultsDetails,
} from './searchHelpers';
import { SearchResultItem } from '../domain';

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
  SearchResults,
  SearchRoot,
  SEARCH_DEBOUNCE_MS,
  SEARCH_MIN_QUERY_LENGTH,
  prefetchSearchResultsDetails,
  type SearchCategoryFilterProps,
  type SearchInputProps,
  type SearchPanelProps,
  type SearchResultsProps,
  type SearchRootProps,
};

export default Search;
