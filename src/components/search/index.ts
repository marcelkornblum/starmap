import {
  SearchCategoryFilterSelect,
  SearchInput,
  SearchPanel,
  SearchResults,
  SearchRoot,
  type SearchCategoryFilterProps,
  type SearchInputProps,
  type SearchPanelProps,
  type SearchResultsProps,
  type SearchRootProps,
} from './Search';
import {
  useSearchContext,
  type SearchContextValue,
  type SearchExecutionStatus,
} from './SearchContext';
import {
  SearchResultItem,
  type SearchResultItemProps,
} from '../domain';

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
