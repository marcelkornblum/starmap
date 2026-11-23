import type { CelestialClassification } from '../../types/spatial';
import {
  SEARCH_CATEGORIES,
  type SearchCategoryFilter,
  type SearchCategoryKey,
} from '../../types/search';
import type { CompactSearchEntry } from '../../utils/compactDataTypes';

const VALID_CATEGORY_KEYS = new Set<string>(SEARCH_CATEGORIES.map((c) => c.key));

/**
 * Pure type guard validating whether an unknown value is a valid `SearchCategoryFilter`.
 */
export const isSearchCategoryFilter = (value: unknown): value is SearchCategoryFilter =>
  typeof value === 'string' && (value === 'all' || VALID_CATEGORY_KEYS.has(value));

/**
 * Normalises category filter values.
 */
export const normalizeSearchCategoryFilter = (filter: SearchCategoryFilter): SearchCategoryFilter => filter;

export type SearchEntityKind =
  | 'star-system'
  | 'planet'
  | 'moon'
  | 'dwarf-planet'
  | 'galactic-structure'
  | 'minor-body'
  | 'fictional-entry'
  | 'layer';

export type SearchTargetView = 'galaxy' | 'system' | 'planet';

export interface SearchResultItem {
  readonly id: string;
  readonly name: string;
  readonly category: SearchCategoryKey;
  readonly entityKind: SearchEntityKind;
  readonly reticleType: CelestialClassification;
  readonly targetView: SearchTargetView;
  readonly href: string;
  readonly systemId?: string;
  readonly systemName?: string;
  readonly parentBodyId?: string;
  readonly position?: readonly [number, number, number];
  readonly distancePc?: number;
  readonly magnitude?: number;
  readonly spectralType?: string;
  readonly planetCount?: number;
  readonly hasHabitableCandidate?: boolean;
  readonly isSolarSystem?: boolean;
  readonly canonLayerId?: string;
  readonly canonTitle?: string;
  readonly tagSlug?: string;
  readonly score: number;
}

export interface CategorySearchResultGroup {
  readonly category: SearchCategoryKey;
  readonly heading: string;
  readonly totalMatches: number;
  readonly items: readonly SearchResultItem[];
}

export interface GroupedSearchResults {
  readonly query: string;
  readonly filter: SearchCategoryFilter;
  readonly totalMatches: number;
  readonly groups: Record<SearchCategoryKey, CategorySearchResultGroup>;
}

export interface NormalizedSearchQuery {
  readonly rawTrimmed: string;
  readonly rawLower: string;
  readonly expandedLower: string;
  readonly rawCleanKey: string;
  readonly cleanKey: string;
  readonly canonicalGlieseKey: string;
  readonly tokens: readonly string[];
}

export interface ExecuteCatalogSearchOptions {
  readonly query: string;
  readonly filter?: SearchCategoryFilter;
  readonly limitPerCategory?: number;
  readonly systemEntries?: readonly CompactSearchEntry[];
}

export interface ResultLinkInput {
  readonly id: string;
  readonly name: string;
  readonly entityKind?: SearchEntityKind | string;
  readonly parentBodyId?: string;
  readonly systemId?: string;
  readonly systemName?: string;
  readonly isSolarSystem?: boolean;
  readonly layerId?: string;
  readonly tagSlug?: string;
}

export type UrlSelectToken =
  | { readonly kind: 'tag'; readonly tag: string }
  | { readonly kind: 'layer'; readonly layerId: string }
  | { readonly kind: 'star-type'; readonly starType: string }
  | { readonly kind: 'planet-type'; readonly planetType: string }
  | { readonly kind: 'entity'; readonly slug: string };
