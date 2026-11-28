import type { SearchCategoryFilter } from '../../types/search';
import { toCanonicalLayerSlug } from '../../utils/datasetLayerSlugs';
import { toTagSlug } from './searchTagDefinitions';
import { isSearchCategoryFilter } from './searchTypes';

/**
 * Pure unit function building the URL to the Galaxy View with a tag shortcut in `?select=`
 * (`/galaxy?select=tag:<tagSlug>`, e.g. `/galaxy?select=tag:habitable-candidate`).
 */
export const buildTagGalaxyHref = (tag: string): string => {
  const slug = toTagSlug(tag);
  return slug ? `/galaxy?select=tag:${slug}` : '/galaxy';
};

/**
 * Pure unit function building the URL to the Galaxy View with a layer shortcut in `?select=` and `?layer=`
 * (`/galaxy?select=layer:<shortSlug>&layer=<shortSlug>`, e.g. `/galaxy?select=layer:project-hail-mary&layer=project-hail-mary`).
 */
export const buildLayerGalaxyHref = (layerId: string): string => {
  const shortSlug = toCanonicalLayerSlug(layerId);
  return shortSlug
    ? `/galaxy?select=layer:${encodeURIComponent(shortSlug)}&layer=${encodeURIComponent(shortSlug)}`
    : '/galaxy';
};

/**
 * Pure unit function that builds a URL to the dedicated `/search` view,
 * optionally scoped to a query string (`?q=`) and/or category filter (`?searchCategory=`).
 */
export const buildSearchViewHref = (
  query: string,
  filter?: SearchCategoryFilter,
  basePath = '/search',
): string => {
  const params = new URLSearchParams();
  const trimmed = query.trim();
  if (trimmed.length > 0) {
    params.set('q', trimmed);
  }
  if (filter && filter !== 'all') {
    params.set('searchCategory', filter);
  }
  const qs = params.toString();
  return qs.length > 0 ? `${basePath}?${qs}` : basePath;
};

/**
 * Pure parser extracting `query` (`?q=`) and `filter` (`?searchCategory=`) from a URL search string.
 */
export const parseSearchUrlParams = (
  searchString: string,
  fallbackQuery = '',
  fallbackFilter: SearchCategoryFilter = 'all',
): { readonly query: string; readonly filter: SearchCategoryFilter } => {
  const params = new URLSearchParams(searchString);
  const qParam = params.get('q');
  const categoryParam = params.get('searchCategory');

  return {
    query: qParam !== null ? qParam : fallbackQuery,
    filter: isSearchCategoryFilter(categoryParam) ? categoryParam : fallbackFilter,
  };
};

/**
 * Pure builder producing a relative URL (`pathname + ?search + #hash`) with updated `?q=` and `?searchCategory=` parameters.
 */
export const buildUpdatedSearchUrl = (
  pathname: string,
  currentSearch: string,
  hash: string,
  nextQuery: string,
  nextFilter: SearchCategoryFilter,
): string => {
  const params = new URLSearchParams(currentSearch);
  const trimmed = nextQuery.trim();
  if (trimmed.length > 0) {
    params.set('q', trimmed);
  } else {
    params.delete('q');
  }
  if (nextFilter !== 'all') {
    params.set('searchCategory', nextFilter);
  } else {
    params.delete('searchCategory');
  }
  const qs = params.toString();
  return `${pathname}${qs.length > 0 ? `?${qs}` : ''}${hash}`;
};
