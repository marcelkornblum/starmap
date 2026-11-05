import {
  buildUpdatedSearchUrl,
  parseSearchUrlParams,
  type SearchCategoryFilter,
} from '../../services/searchService';
import { router as appRouter, type StarmapSearchParams } from '../../router';

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
  if (typeof window === 'undefined') {
    return;
  }
  const nextHref = buildUpdatedSearchUrl(
    window.location.pathname,
    window.location.search,
    window.location.hash,
    nextQuery,
    nextFilter,
  );
  if (appRouter?.navigate && appRouter?.state) {
    const qTrimmed = nextQuery.trim();
    void appRouter.navigate({
      to: '.',
      search: (prev: StarmapSearchParams = {}) => {
        const next: StarmapSearchParams = { ...prev };
        if (qTrimmed.length > 0) {
          next.q = qTrimmed;
        } else {
          delete next.q;
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
  } else {
    window.history.replaceState(window.history.state, '', nextHref);
    window.dispatchEvent(new Event('starmap:locationchange'));
  }
};
