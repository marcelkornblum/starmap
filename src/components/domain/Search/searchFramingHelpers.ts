import type { AppRouterAdapter } from '../../../hooks/useSpaLocation';
import type {
  GroupedSearchResults,
  SearchResultItem,
} from '../../../services/search/searchTypes';
import type { SearchCategoryFilter } from '../../../types/search';
import { toUrlSlug } from '../../../utils/datasetLayerSlugs';
import { setPendingSpatialNavigationHref } from '../../../utils/spatialRoute';

const FRAMING_GROUP_KEYS = [
  'stars',
  'planets',
  'minor-bodies',
  'structures',
] as const;

const TARGET_MATCH_TOLERANCE_PC = 0.25;
const DISTANCE_MATCH_TOLERANCE_PC = 0.5;

export interface FramedBounds {
  readonly target: [number, number, number];
  readonly distance: number;
}

export function collectSpatialItems(results: GroupedSearchResults): SearchResultItem[] {
  const items: SearchResultItem[] = [];
  for (const groupKey of FRAMING_GROUP_KEYS) {
    items.push(...results.groups[groupKey].items);
  }
  return items;
}

export function isAlreadyAtTarget(
  currentPathname: string,
  currentSearch: string,
  targetHref: string,
): boolean {
  const normalizedSearch =
    currentSearch.length > 0 && !currentSearch.startsWith('?')
      ? `?${currentSearch}`
      : currentSearch;
  try {
    const currentUrl = new URL(
      `${currentPathname}${normalizedSearch}`,
      'http://localhost',
    );
    const targetUrl = new URL(targetHref, 'http://localhost');
    if (currentUrl.pathname !== targetUrl.pathname) {
      return false;
    }
    return currentUrl.searchParams.get('focus') === targetUrl.searchParams.get('focus');
  } catch {
    return false;
  }
}

/**
 * Appends active `q` and `searchCategory` query parameters onto a destination
 * href without clobbering existing query parameters or hash fragments.
 */
export function appendSearchParamsToHref(
  href: string,
  query: string,
  filter: SearchCategoryFilter,
): string {
  const trimmedQuery = query.trim();
  if (trimmedQuery.length === 0 && filter === 'all') {
    return href;
  }
  try {
    const url = new URL(href, 'http://localhost');
    if (trimmedQuery.length > 0) {
      url.searchParams.set('q', trimmedQuery);
    }
    if (filter !== 'all') {
      url.searchParams.set('searchCategory', filter);
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return href;
  }
}

export function isWithinFramedBounds(
  prev: FramedBounds | null,
  target: readonly [number, number, number],
  distance: number,
): boolean {
  if (!prev) {
    return false;
  }
  const targetDelta = Math.hypot(
    target[0] - prev.target[0],
    target[1] - prev.target[1],
    target[2] - prev.target[2],
  );
  return (
    targetDelta <= TARGET_MATCH_TOLERANCE_PC &&
    Math.abs(distance - prev.distance) <= DISTANCE_MATCH_TOLERANCE_PC
  );
}

export function buildPreSearchReturnHref(pathname: string, search: string): string {
  const normalizedSearch =
    search.length > 0 && !search.startsWith('?') ? `?${search}` : search;
  if (!normalizedSearch || normalizedSearch === '?') {
    return pathname;
  }
  const params = new URLSearchParams(normalizedSearch);
  params.delete('q');
  params.delete('searchCategory');
  if (params.get('select') === 'search') {
    params.delete('select');
  }
  const qs = params.toString();
  return qs.length > 0 ? `${pathname}?${qs}` : pathname;
}

export function parseEnterScaleHref(href: string): { pathname: string; focusSlug: string } {
  try {
    const parsed = new URL(href, 'http://localhost');
    const focusParam = parsed.searchParams.get('focus');
    return { pathname: parsed.pathname, focusSlug: focusParam ? toUrlSlug(focusParam) : '' };
  } catch {
    const [pathname = '', query = ''] = href.split('?');
    const focusParam = new URLSearchParams(query).get('focus');
    return { pathname, focusSlug: focusParam ? toUrlSlug(focusParam) : '' };
  }
}

export function navigateWithPendingClear(
  router: AppRouterAdapter | undefined,
  href: string,
): void {
  setPendingSpatialNavigationHref(href);
  let navResult: unknown;
  try {
    navResult = router?.navigate?.({ href });
  } catch (error) {
    setPendingSpatialNavigationHref(null);
    throw error;
  }
  void Promise.resolve(navResult)
    .finally(() => {
      setPendingSpatialNavigationHref(null);
    })
    .catch(() => {});
}
