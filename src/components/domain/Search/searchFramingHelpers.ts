import type {
  GroupedSearchResults,
  SearchResultItem,
} from '../../../services/search/searchTypes';
import type { SearchCategoryFilter } from '../../../types/search';

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
