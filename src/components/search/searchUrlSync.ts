import {
  parseSearchUrlParams,
  type SearchCategoryFilter,
} from '../../services/searchService';
import { appRouter, type StarmapSearchParams } from '../../hooks/useSpaLocation';

export const resolveInitialQuery = (
  syncUrl: boolean,
  searchString: string,
  fallbackQuery: string,
): string => {
  if (!syncUrl || fallbackQuery.length > 0) {
    return fallbackQuery;
  }
  return parseSearchUrlParams(searchString, fallbackQuery).query;
};

export const resolveInitialFilter = (
  syncUrl: boolean,
  searchString: string,
  fallbackFilter: SearchCategoryFilter,
): SearchCategoryFilter => {
  if (!syncUrl || fallbackFilter !== 'all') {
    return fallbackFilter;
  }
  return parseSearchUrlParams(searchString, '', fallbackFilter).filter;
};

export const syncSearchUrlParams = (
  nextQuery: string,
  nextFilter: SearchCategoryFilter,
): void => {
  if (appRouter?.navigate && appRouter?.state) {
    const qTrimmed = nextQuery.trim();
    void appRouter.navigate({
      to: '.',
      search: (prev: StarmapSearchParams = {}) => {
        const next: StarmapSearchParams = { ...prev };
        if (qTrimmed.length > 0) {
          next.q = qTrimmed;
          next.select = 'search';
        } else {
          delete next.q;
          if (next.select === 'search') {
            delete next.select;
          }
        }
        if (nextFilter !== 'all') {
          next.searchCategory = nextFilter;
        } else {
          delete next.searchCategory;
        }
        return next;
      },
      replace: true,
      resetScroll: false,
    });
  }
};
