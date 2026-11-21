import { parseSearchUrlParams } from '../../../services/search/searchUrls';
import type { SearchCategoryFilter } from '../../../types/search';
import type { AppRouterAdapter, StarmapSearchParams } from '../../../hooks/useSpaLocation';

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
  router?: AppRouterAdapter | null,
): void => {
  if (router && typeof router.navigate === 'function' && router.state !== undefined) {
    const qTrimmed = nextQuery.trim();
    void router.navigate({
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
