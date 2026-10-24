import type { CelestialClassification } from '../components/canvas/cartography/reticleGeometry';
import type { SpatialEntityDefinition } from '../components/canvas/entity/types';
import {
  buildMetricGuideHref,
  buildPlanetTypeGuideHref,
  buildStarTypeGuideHref,
  METRIC_ALIASES,
  METRIC_GUIDE_ENTRIES,
  METRIC_LABEL_TO_SLUG,
  METRICS_GUIDE_PATH,
  PLANET_COMPOSITION_TYPES,
  PLANET_TYPE_GUIDE_ENTRIES,
  PLANET_TYPES_GUIDE_PATH,
  resolveMetricSlugFromLabel,
  SEED_CURATED_COLLECTIONS,
  STAR_TYPE_GUIDE_ENTRIES,
  STAR_TYPES_GUIDE_PATH,
  type CuratedCollection,
  type CuratedCollectionWaypoint,
  type GuideCatalogEntry,
  type GuideExampleTarget,
  type MetricGuideEntry,
  type PlanetCompositionClass,
  type PlanetTypeGuideEntry,
  type StarTypeGuideEntry,
} from '../data/guideCatalog';
import type {
  DatasetLayerIndexEntry,
  DatasetLayerManifest,
} from '../types/astro';
import {
  SYSTEM_TAG_BITS,
  type CompactSearchEntry,
} from '../utils/compactDataCodec';
import {
  findCanonLayerById,
  toCanonicalLayerSlug,
  toUrlSlug,
} from '../utils/datasetLayerCodec';
import {
  buildEntityOrbitTargetHref,
  type EntityOrbitTargetInput,
  type OrbitTargetView,
} from './details/navigationAndCamera';
import {
  expandGouldOrConstellationSuffix,
  formatSlugFallbackTitle,
  normalizeCleanKey,
} from '../utils/nomenclature';
export { formatSlugFallbackTitle };

export {
  buildMetricGuideHref,
  buildPlanetTypeGuideHref,
  buildStarTypeGuideHref,
  METRIC_ALIASES,
  METRIC_GUIDE_ENTRIES,
  METRIC_LABEL_TO_SLUG,
  METRICS_GUIDE_PATH,
  PLANET_COMPOSITION_TYPES,
  PLANET_TYPE_GUIDE_ENTRIES,
  PLANET_TYPES_GUIDE_PATH,
  resolveMetricSlugFromLabel,
  SEED_CURATED_COLLECTIONS,
  STAR_TYPE_GUIDE_ENTRIES,
  STAR_TYPES_GUIDE_PATH,
  type CuratedCollection,
  type CuratedCollectionWaypoint,
  type GuideCatalogEntry,
  type GuideExampleTarget,
  type MetricGuideEntry,
  type PlanetCompositionClass,
  type PlanetTypeGuideEntry,
  type StarTypeGuideEntry,
  findCanonLayerById,
  toCanonicalLayerSlug,
  toUrlSlug,
  buildEntityOrbitTargetHref,
  type EntityOrbitTargetInput,
  type OrbitTargetView,
};

export type SearchCategoryKey =
  | 'stars'
  | 'planets'
  | 'structures'
  | 'minor-bodies'
  | 'layers';

export type SearchCategoryFilter = 'all' | SearchCategoryKey;

export interface SearchCategoryMeta {
  readonly key: SearchCategoryKey;
  readonly heading: string;
  readonly label: string;
  readonly shard: string;
}

export const SEARCH_CATEGORIES: readonly SearchCategoryMeta[] = [
  { key: 'stars', heading: 'Stars & Stellar Systems', label: 'Stars & Stellar Systems', shard: 'stars.json' },
  { key: 'planets', heading: 'Planets, Exoplanets & Moons', label: 'Planets, Exoplanets & Moons', shard: 'planets.json' },
  { key: 'structures', heading: 'Galactic Structures & Deep Sky', label: 'Galactic Structures & Deep Sky', shard: 'structures.json' },
  { key: 'minor-bodies', heading: 'Solar System Minor Bodies', label: 'Solar System Minor Bodies', shard: 'minor-bodies.json' },
  { key: 'layers', heading: 'Curated Layers & Canons', label: 'Curated Layers & Canons', shard: 'layers.json' },
];

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
  readonly tokens: readonly string[];
}

export interface ExecuteCatalogSearchOptions {
  readonly query: string;
  readonly filter?: SearchCategoryFilter;
  readonly limitPerCategory?: number;
  readonly systemEntries?: readonly CompactSearchEntry[];
}

const DEFAULT_LIMIT_PER_CATEGORY = 25;

/**
 * Pure predicate determining whether an entry represents a child body (planet, moon, fictional planet)
 * attached to a distinct host star system, rather than the host system itself.
 */
export const isChildOfHostSystem = (entryId: string, systemId?: string): boolean =>
  Boolean(systemId) && entryId !== systemId && !entryId.endsWith(`:${systemId}`);

/**
 * Pure predicate determining whether a search entry represents an artificial spacecraft / probe.
 * Reads precalculated `entry.u === 'construct'` or the `'spacecraft'` alias token.
 */
export const isArtificialSpacecraftEntry = (entry: CompactSearchEntry): boolean => {
  if (entry.u === 'construct') {
    return true;
  }
  return Boolean(entry.a && entry.a.split(' ').includes('spacecraft'));
};

/**
 * Dedicated hook for resolving the primary display title of a search result entry.
 * Centralizes title formatting so future localization or designation overrides have a single extension point.
 */
export const resolveResultDisplayTitle = (entry: CompactSearchEntry): string => {
  const trimmed = entry.n.trim();
  return trimmed.length > 0 ? trimmed : entry.i;
};

/**
 * Dedicated hook for resolving the parent star system display title of a search result entry.
 */
export const resolveResultSystemTitle = (
  entry: CompactSearchEntry,
  systemNameById: ReadonlyMap<string, string>,
): string | undefined => (entry.s ? systemNameById.get(entry.s) : undefined);

/**
 * Pure selector mapping a CompactSearchEntry's numeric kind code (`k`)
 * to one of the 5 canonical search result categories.
 */
export const resolveEntryCategory = (entry: CompactSearchEntry): SearchCategoryKey => {
  switch (entry.k) {
    case 2:
    case 3:
    case 4:
      return 'planets';
    case 5:
      return 'structures';
    case 6:
      return 'minor-bodies';
    case 7:
      return 'layers';
    default:
      return 'stars';
  }
};

/**
 * Pure selector mapping a CompactSearchEntry's numeric kind code (`k`)
 * to its fine-grained domain entity kind.
 */
export const resolveEntityKind = (entry: CompactSearchEntry): SearchEntityKind => {
  switch (entry.k) {
    case 2:
      return 'planet';
    case 3:
      return 'moon';
    case 4:
      return 'dwarf-planet';
    case 5:
      return 'galactic-structure';
    case 6:
      return 'minor-body';
    case 7:
      return !entry.s || entry.i === entry.w ? 'layer' : 'fictional-entry';
    default:
      return 'star-system';
  }
};

/**
 * Pure selector mapping a CompactSearchEntry to its canonical reticle taxonomy type (`CelestialClassification`).
 * Reads precalculated `entry.u` when present and falls back to category defaults.
 */
export const resolveReticleType = (
  entry: CompactSearchEntry,
): CelestialClassification => {
  if (entry.u) {
    if (entry.u === 'super-earth') {
      return 'super-earth';
    }
    if (entry.u === 'sub-neptune') {
      return 'ice-giant';
    }
    return entry.u;
  }

  const category = resolveEntryCategory(entry);

  if (category === 'stars') {
    const spect = (entry.m?.[1] ?? '').trim().toUpperCase();
    if (spect.startsWith('D')) {
      return 'white-dwarf';
    }
    if (spect.startsWith('L') || spect.startsWith('T') || spect.startsWith('Y')) {
      return 'brown-dwarf';
    }
    if (spect.startsWith('PSR')) {
      return 'neutron-star';
    }
    return 'stellar-system';
  }

  if (category === 'planets') {
    return 'terrestrial';
  }

  if (category === 'structures') {
    const idLower = entry.i.toLowerCase();
    const nameLower = entry.n.toLowerCase();
    if (
      idLower.startsWith('psr-') ||
      idLower.startsWith('snr-') ||
      nameLower.includes('pulsar') ||
      nameLower.includes('remnant')
    ) {
      return 'hazard';
    }
    return 'stellar-cluster';
  }

  if (category === 'minor-bodies') {
    if (isArtificialSpacecraftEntry(entry)) {
      return 'construct';
    }
    return 'terrestrial';
  }

  // category === 'layers'
  if (entry.k === 7 && (!entry.s || entry.i === entry.w)) {
    return 'stellar-system';
  }
  if (isChildOfHostSystem(entry.i, entry.s)) {
    return 'terrestrial';
  }
  return 'stellar-system';
};

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

/**
 * Pure unit function that determines whether a search result navigates to the Galaxy View,
 * System View, or Planetary View based on centralized Orbit-Context targeting (DEC-038).
 */
export const buildResultTargetLink = (
  input: ResultLinkInput,
): { readonly targetView: SearchTargetView; readonly href: string } => {
  return buildEntityOrbitTargetHref(input);
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

/**
 * Pure unit function that expands astronomical Bayer/Flamsteed abbreviations
 * and produces normalized lowercase and alphanumeric lookup tokens.
 */
export const normaliseSearchQuery = (rawQuery: string): NormalizedSearchQuery => {
  const rawTrimmed = rawQuery.trim();
  if (!rawTrimmed) {
    return {
      rawTrimmed: '',
      rawLower: '',
      expandedLower: '',
      rawCleanKey: '',
      cleanKey: '',
      tokens: [],
    };
  }

  const expanded = expandGouldOrConstellationSuffix(rawTrimmed);
  const rawLower = rawTrimmed.toLowerCase();
  const expandedLower = expanded.toLowerCase();
  const rawCleanKey = normalizeCleanKey(rawTrimmed);
  const cleanKey = normalizeCleanKey(expanded);

  const tokens = expandedLower
    .split(/\s+/)
    .map((t) => normalizeCleanKey(t))
    .filter((t) => t.length > 0);

  return {
    rawTrimmed,
    rawLower,
    expandedLower,
    rawCleanKey,
    cleanKey,
    tokens,
  };
};

/**
 * Pure unit function scoring a single CompactSearchEntry against a NormalizedSearchQuery.
 * Returns 0 if the entry does not match.
 */
export const scoreSearchEntry = (
  entry: CompactSearchEntry,
  query: NormalizedSearchQuery,
): number => {
  if (!query.cleanKey) {
    return 0;
  }

  const nameLower = entry.n.toLowerCase();
  const nameClean = normalizeCleanKey(entry.n);
  const aliasKeys = entry.a ? entry.a.split(' ') : [];
  const canonLower = entry.c ? entry.c.toLowerCase() : '';
  const canonClean = entry.c ? normalizeCleanKey(entry.c) : '';

  // 1. Exact display name match
  if (nameLower === query.expandedLower || nameLower === query.rawLower) {
    return 1000;
  }

  // 2. Exact clean key match on display name
  if (nameClean === query.cleanKey || nameClean === query.rawCleanKey) {
    return 950;
  }

  // 2b. Exact match on a parenthetical, comma-delimited, or slash-delimited display name segment
  if (/[(),/]/.test(entry.n)) {
    const segments = entry.n
      .split(/[(),/]+/)
      .map((s) => normalizeCleanKey(s))
      .filter((s) => s.length > 0);
    if (
      segments.some(
        (seg) => seg === query.cleanKey || seg === query.rawCleanKey,
      )
    ) {
      return 925;
    }
  }

  // 3. Exact match on one of the space-delimited clean alias keys
  if (
    aliasKeys.some(
      (alias) => alias === query.cleanKey || alias === query.rawCleanKey,
    )
  ) {
    return 900;
  }

  // 4. Exact match on fictional canon / work title
  if (
    canonClean.length > 0 &&
    (canonClean === query.cleanKey || canonLower === query.rawLower)
  ) {
    return 860;
  }

  // 5. Exact match on entity ID
  if (entry.i.toLowerCase() === query.rawLower) {
    return 850;
  }

  // 6. Display name prefix match
  if (
    nameLower.startsWith(query.expandedLower) ||
    nameLower.startsWith(query.rawLower) ||
    nameClean.startsWith(query.cleanKey)
  ) {
    return 750;
  }

  // 7. Alias key prefix match
  if (
    aliasKeys.some(
      (alias) =>
        alias.startsWith(query.cleanKey) || alias.startsWith(query.rawCleanKey),
    )
  ) {
    return 700;
  }

  // 8. Substring match on display name, canon title, or alias keys
  if (
    nameClean.includes(query.cleanKey) ||
    nameClean.includes(query.rawCleanKey) ||
    (canonClean.length > 0 && canonClean.includes(query.cleanKey)) ||
    aliasKeys.some(
      (alias) =>
        alias.includes(query.cleanKey) || alias.includes(query.rawCleanKey),
    )
  ) {
    return 550;
  }

  // 9. Multi-token conjunction match across combined searchable text
  if (query.tokens.length > 1) {
    const combined = `${nameClean} ${entry.a ?? ''} ${canonClean}`;
    if (query.tokens.every((token) => combined.includes(token))) {
      return 450;
    }
  }

  return 0;
};

/**
 * Pure conversion from a CompactSearchEntry + match score into a domain SearchResultItem.
 */
export const toSearchResultItem = (
  entry: CompactSearchEntry,
  score: number,
  systemName?: string,
  tagSlug?: string,
): SearchResultItem => {
  const displayName = resolveResultDisplayTitle(entry);
  const category = resolveEntryCategory(entry);
  const entityKind = resolveEntityKind(entry);
  const reticleType = resolveReticleType(entry);

  let distancePc: number | undefined;
  let position: readonly [number, number, number] | undefined;
  if (entry.p) {
    const [x, y, z] = entry.p;
    position = [x, y, z];
    distancePc = Math.round(Math.sqrt(x * x + y * y + z * z) * 100) / 100;
  } else if (entry.h === 1) {
    position = [0, 0, 0];
    distancePc = 0;
  }

  const magnitude = entry.m ? entry.m[0] : undefined;
  const spectralType = entry.m ? entry.m[1] : undefined;
  const planetCount = entry.m ? entry.m[2] : undefined;
  const hasHabitableCandidate = entry.m ? entry.m[3] === 1 : undefined;
  const isSolarSystem = entry.h === 1 ? true : undefined;

  const { targetView, href } = buildResultTargetLink({
    id: entry.i,
    name: displayName,
    entityKind,
    parentBodyId: entry.o,
    systemId: entry.s,
    systemName,
    isSolarSystem,
    layerId: entry.w,
    tagSlug,
  });

  return {
    id: entry.i,
    name: displayName,
    category,
    entityKind,
    reticleType,
    targetView,
    href,
    ...(entry.s ? { systemId: entry.s } : {}),
    ...(systemName ? { systemName } : {}),
    ...(position ? { position } : {}),
    ...(distancePc !== undefined ? { distancePc } : {}),
    ...(magnitude !== undefined ? { magnitude } : {}),
    ...(spectralType !== undefined ? { spectralType } : {}),
    ...(planetCount !== undefined ? { planetCount } : {}),
    ...(hasHabitableCandidate !== undefined ? { hasHabitableCandidate } : {}),
    ...(isSolarSystem ? { isSolarSystem } : {}),
    ...(entry.w ? { canonLayerId: entry.w } : {}),
    ...(entry.c ? { canonTitle: entry.c } : {}),
    ...(tagSlug ? { tagSlug } : {}),
    score,
  };
};

/**
 * Pure comparator for deterministic search result ranking:
 * 1. Descending match score
 * 2. Ascending distance from Sol (`distancePc`)
 * 3. Alphabetical display name
 */
export const compareSearchResultItems = (
  a: SearchResultItem,
  b: SearchResultItem,
): number => {
  if (b.score !== a.score) {
    return b.score - a.score;
  }
  const distA = a.distancePc ?? Number.POSITIVE_INFINITY;
  const distB = b.distancePc ?? Number.POSITIVE_INFINITY;
  if (distA !== distB) {
    return distA - distB;
  }
  return a.name.localeCompare(b.name);
};

const createEmptyGroupedResults = (
  query: string,
  filter: SearchCategoryFilter,
): GroupedSearchResults => {
  const groups = {} as Record<SearchCategoryKey, CategorySearchResultGroup>;
  for (const meta of SEARCH_CATEGORIES) {
    groups[meta.key] = {
      category: meta.key,
      heading: meta.heading,
      totalMatches: 0,
      items: [],
    };
  }
  return {
    query,
    filter,
    totalMatches: 0,
    groups: groups as GroupedSearchResults['groups'],
  };
};

export const QUERY_CLEAN_KEY_TO_TAG_SLUG: Readonly<Record<string, string>> = {
  habitable: 'habitable-candidate',
  habitablecandidate: 'habitable-candidate',
  habitablehost: 'habitable-candidate',
  habitablezone: 'habitable-candidate',
  nakedeye: 'naked-eye',
  solarneighborhood: 'solar-neighborhood-10pc',
  solarneighborhood10pc: 'solar-neighborhood-10pc',
  exoplanethost: 'exoplanet-host',
  variablestar: 'variable-star',
  reconsgroundtruth: 'recons-ground-truth',
  homesystem: 'home-system',
};

/**
 * Pure service unit function that executes a search against an in-memory array of
 * `CompactSearchEntry` records, resolves relational child entities attached to strongly
 * matched star systems (`entry.s`), ranks results deterministically, and groups them
 * into the 5 result categories.
 */
export const executeCatalogSearch = (
  entries: readonly CompactSearchEntry[],
  options: ExecuteCatalogSearchOptions,
): GroupedSearchResults => {
  const rawFilter: SearchCategoryFilter = options.filter ?? 'all';
  const filter: SearchCategoryFilter = normalizeSearchCategoryFilter(rawFilter);
  const limitPerCategory = options.limitPerCategory ?? DEFAULT_LIMIT_PER_CATEGORY;
  const normalised = normaliseSearchQuery(options.query);

  if (!normalised.cleanKey) {
    return createEmptyGroupedResults(normalised.rawTrimmed, rawFilter);
  }

  const matchedTagSlug =
    QUERY_CLEAN_KEY_TO_TAG_SLUG[normalised.cleanKey] ??
    QUERY_CLEAN_KEY_TO_TAG_SLUG[normalised.rawCleanKey];

  const systemNameById = new Map<string, string>();
  const stronglyMatchedSystemIds = new Set<string>();

  if (options.systemEntries) {
    for (const sys of options.systemEntries) {
      if (resolveEntryCategory(sys) === 'stars') {
        systemNameById.set(sys.i, resolveResultDisplayTitle(sys));
        if (scoreSearchEntry(sys, normalised) >= 700) {
          stronglyMatchedSystemIds.add(sys.i);
        }
      }
    }
  }
  for (const entry of entries) {
    if (resolveEntryCategory(entry) === 'stars') {
      systemNameById.set(entry.i, resolveResultDisplayTitle(entry));
    }
  }

  const matchedByCategory: Record<SearchCategoryKey, SearchResultItem[]> = {
    stars: [],
    planets: [],
    structures: [],
    'minor-bodies': [],
    layers: [],
  };

  const deferredSystemChildren: CompactSearchEntry[] = [];

  for (const entry of entries) {
    const category = resolveEntryCategory(entry);
    const directScore = scoreSearchEntry(entry, normalised);

    const matchesTag =
      matchedTagSlug !== undefined &&
      category === 'stars' &&
      doesSystemEntryMatchTag(entry, matchedTagSlug);

    const effectiveScore = directScore > 0 ? directScore : (matchesTag ? 650 : 0);
    const itemTagSlug = matchesTag ? matchedTagSlug : undefined;

    if (effectiveScore > 0) {
      if (category === 'stars' && effectiveScore >= 700) {
        stronglyMatchedSystemIds.add(entry.i);
      }
      if (filter === 'all' || filter === category) {
        const hostName =
          resolveResultSystemTitle(entry, systemNameById) ??
          (entry.h === 1 && entry.s ? formatSlugFallbackTitle(entry.s) : undefined);
        matchedByCategory[category].push(
          toSearchResultItem(entry, effectiveScore, hostName, itemTagSlug),
        );
      }
    } else if (
      entry.s &&
      (category === 'planets' || category === 'layers') &&
      (filter === 'all' || filter === category)
    ) {
      deferredSystemChildren.push(entry);
    }
  }

  // Relational system pass: surface child planets or fictional entries hosted in a strongly matched star system
  if (stronglyMatchedSystemIds.size > 0) {
    for (const child of deferredSystemChildren) {
      if (child.s && stronglyMatchedSystemIds.has(child.s)) {
        const category = resolveEntryCategory(child);
        const hostName =
          resolveResultSystemTitle(child, systemNameById) ??
          (child.h === 1 && child.s ? formatSlugFallbackTitle(child.s) : undefined);
        matchedByCategory[category].push(
          toSearchResultItem(child, 600, hostName),
        );
      }
    }
  }

  const groups = {} as Record<SearchCategoryKey, CategorySearchResultGroup>;
  let totalMatches = 0;

  for (const meta of SEARCH_CATEGORIES) {
    const list = matchedByCategory[meta.key];
    list.sort(compareSearchResultItems);
    totalMatches += list.length;
    groups[meta.key] = {
      category: meta.key,
      heading: meta.heading,
      totalMatches: list.length,
      items: list.slice(0, limitPerCategory),
    };
  }

  return {
    query: normalised.rawTrimmed,
    filter: rawFilter,
    totalMatches,
    groups: groups as GroupedSearchResults['groups'],
  };
};

/**
 * Pure unit function resolving all deduplicated star system entities that should be
 * marked `selected` in `SpatialEntityStore` from a set of grouped search results.
 * Includes direct star-system results as well as the parent star systems (`systemId`)
 * of non-system-level results (planets, moons, dwarf planets, minor bodies, fictional entries).
 */
export const resolveSelectedSystemsFromSearchResults = (
  results: GroupedSearchResults,
): readonly SpatialEntityDefinition[] => {
  const systemsById = new Map<string, SpatialEntityDefinition>();

  for (const meta of SEARCH_CATEGORIES) {
    const group = results.groups[meta.key];
    for (const item of group.items) {
      if (item.category === 'stars') {
        systemsById.set(item.id, {
          id: item.id,
          name: item.name,
          position: item.position
            ? [item.position[0], item.position[1], item.position[2]]
            : [0, 0, 0],
          classification: item.reticleType,
          ...(item.spectralType ? { spectralType: item.spectralType } : {}),
        });
      } else if (item.systemId && !systemsById.has(item.systemId)) {
        const resolvedSystemName = item.systemName ?? item.systemId;
        systemsById.set(item.systemId, {
          id: item.systemId,
          name: resolvedSystemName,
          position: item.position
            ? [item.position[0], item.position[1], item.position[2]]
            : [0, 0, 0],
          classification: 'stellar-system',
        });
      }
    }
  }

  return Array.from(systemsById.values());
};

export const KNOWN_SYSTEM_TAGS = [
  'HomeSystem',
  'SolarNeighborhood10pc',
  'NakedEye',
  'ExoplanetHost',
  'HabitableCandidate',
  'VariableStar',
  'RECONSGroundTruth',
  'HabitableHost',
] as const;

const TAG_BIT_BY_LOWER: Readonly<Record<string, number>> = {
  homesystem: SYSTEM_TAG_BITS.HomeSystem,
  solarneighborhood10pc: SYSTEM_TAG_BITS.SolarNeighborhood10pc,
  nakedeye: SYSTEM_TAG_BITS.NakedEye,
  exoplanethost: SYSTEM_TAG_BITS.ExoplanetHost,
  habitablecandidate: SYSTEM_TAG_BITS.HabitableCandidate,
  habitablehost: SYSTEM_TAG_BITS.HabitableCandidate,
  variablestar: SYSTEM_TAG_BITS.VariableStar,
  reconsgroundtruth: SYSTEM_TAG_BITS.RECONSGroundTruth,
};

const normaliseTagKey = (tag: string): string =>
  tag
    .trim()
    .replace(/^tag:/i, '')
    .replace(/[-_\s]+/g, '')
    .toLowerCase();

/**
 * Pure slugifier converting PascalCase or kebab-case catalog/canon tags into
 * clean kebab-case slugs (`'HabitableCandidate'` -> `'habitable-candidate'`).
 */
export const toTagSlug = (tag: string): string =>
  toUrlSlug(
    tag
      .trim()
      .replace(/^tag:/i, '')
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
      .replace(/([a-zA-Z])([0-9])/g, '$1-$2'),
  );

/**
 * Pure unit function building the URL to the Galaxy View with a tag shortcut in `?select=`
 * (`/galaxy?select=tag:<tagSlug>`, e.g. `/galaxy?select=tag:habitable-candidate`).
 */
export const buildTagGalaxyHref = (tag: string): string => {
  const slug = toTagSlug(tag);
  return slug ? `/galaxy?select=tag:${slug}` : '/galaxy';
};

/**
 * Pure unit function checking whether a candidate string matches a known catalog system tag
 * (pipeline bitmask tags; supports both PascalCase and kebab-case slugs).
 */
export const isCatalogTag = (candidateTag: string): boolean => {
  const key = normaliseTagKey(candidateTag);
  if (!key) {
    return false;
  }
  return key in TAG_BIT_BY_LOWER;
};

/**
 * Pure unit function building the URL to the Galaxy View with a layer shortcut in `?select=` and `?layer=`
 * (`/galaxy?select=layer:<shortSlug>&layer=<shortSlug>`, e.g. `/galaxy?select=layer:project-hail-mary&layer=project-hail-mary`).
 */
export const buildLayerGalaxyHref = (layerId: string): string => {
  const shortSlug = toUrlSlug(layerId.trim().replace(/^(?:canon|layer)[:-]/i, ''));
  return shortSlug ? `/galaxy?select=layer:${shortSlug}&layer=${shortSlug}` : '/galaxy';
};

/**
 * Pure unit function building the URL to the Galaxy View with a star-type shortcut in `?select=`
 * (`/galaxy?select=star-type:<starTypeSlug>`, e.g. `/galaxy?select=star-type:g`).
 */
export const buildStarTypeGalaxyHref = (starType: string): string => {
  const slug = toUrlSlug(starType.trim().replace(/^star-type:/i, ''));
  return slug ? `/galaxy?select=star-type:${slug}` : '/galaxy';
};

/**
 * Pure unit function building the URL to the Galaxy View with a planet-type shortcut in `?select=`
 * (`/galaxy?select=planet-type:<planetTypeSlug>`, e.g. `/galaxy?select=planet-type:super-earth`).
 */
export const buildPlanetTypeGalaxyHref = (planetType: string): string => {
  const slug = toUrlSlug(planetType.trim().replace(/^planet-type:/i, ''));
  return slug ? `/galaxy?select=planet-type:${slug}` : '/galaxy';
};

/**
 * Pure unit function building the URL to the Galaxy View with a collection shortcut in `?select=`
 * (`/galaxy?select=collection:<collectionSlug>`, e.g. `/galaxy?select=collection:extreme-worlds`).
 */
export const buildCollectionGalaxyHref = (collectionId: string): string => {
  const slug = toUrlSlug(collectionId.trim().replace(/^collection:/i, ''));
  return slug ? `/galaxy?select=collection:${slug}` : '/galaxy';
};

export type UrlSelectToken =
  | { readonly kind: 'tag'; readonly tag: string }
  | { readonly kind: 'layer'; readonly layerId: string }
  | { readonly kind: 'star-type'; readonly starType: string }
  | { readonly kind: 'planet-type'; readonly planetType: string }
  | { readonly kind: 'collection'; readonly collectionId: string }
  | { readonly kind: 'entity'; readonly slug: string };

/**
 * Pure parser extracting structured selection tokens (`tag:<slug>`, `layer:<slug>`,
 * `star-type:<slug>`, `planet-type:<slug>`, `collection:<slug>`, or `<entityId>`)
 * from a URL search string's `?select=` parameter (plus legacy `?layer=` support).
 */
export const parseUrlSelectTokens = (
  searchString: string,
  layerIndex: readonly DatasetLayerIndexEntry[],
): readonly UrlSelectToken[] => {
  const params = new URLSearchParams(searchString);
  const rawValues = [
    ...params.getAll('select'),
    ...params.getAll('layer').map((l) => `layer:${l}`),
  ];
  const tokens: UrlSelectToken[] = [];

  for (const rawValue of rawValues) {
    for (const part of rawValue.split(',')) {
      const token = part.trim();
      if (!token) {
        continue;
      }
      const tagMatch = /^tag:(.+)$/i.exec(token);
      if (tagMatch?.[1]) {
        const candidateTag = tagMatch[1].trim();
        if (isCatalogTag(candidateTag)) {
          tokens.push({ kind: 'tag', tag: candidateTag });
        }
        continue;
      }

      const layerMatch = /^layer:(.+)$/i.exec(token);
      if (layerMatch?.[1]) {
        const rawSlug = layerMatch[1].trim().split(':')[0];
        const matchedLayer = findCanonLayerById(rawSlug, layerIndex);
        if (matchedLayer) {
          tokens.push({ kind: 'layer', layerId: matchedLayer.layerId });
        }
        continue;
      }

      const starTypeMatch = /^star-type:(.+)$/i.exec(token);
      if (starTypeMatch?.[1]) {
        const candidateStarType = toUrlSlug(starTypeMatch[1]);
        if (candidateStarType.length > 0) {
          tokens.push({ kind: 'star-type', starType: candidateStarType });
        }
        continue;
      }

      const planetTypeMatch = /^planet-type:(.+)$/i.exec(token);
      if (planetTypeMatch?.[1]) {
        const candidatePlanetType = toUrlSlug(planetTypeMatch[1]);
        if (candidatePlanetType.length > 0) {
          tokens.push({ kind: 'planet-type', planetType: candidatePlanetType });
        }
        continue;
      }

      const collectionMatch = /^collection:(.+)$/i.exec(token);
      if (collectionMatch?.[1]) {
        const candidateCollection = toUrlSlug(collectionMatch[1]);
        if (candidateCollection.length > 0) {
          tokens.push({ kind: 'collection', collectionId: candidateCollection });
        }
        continue;
      }

      const entitySlug = toUrlSlug(token);
      if (entitySlug.length > 0) {
        tokens.push({ kind: 'entity', slug: entitySlug });
      }
    }
  }

  return tokens;
};

/**
 * Pure parser extracting the first active catalog or canon tag from `?select=tag:<tag>`.
 */
export const extractUrlTagFocus = (searchString: string): string | null => {
  const tagToken = parseUrlSelectTokens(searchString, []).find(
    (t): t is Extract<UrlSelectToken, { readonly kind: 'tag' }> => t.kind === 'tag',
  );
  return tagToken ? tagToken.tag : null;
};

/**
 * Pure parser extracting the first active layer ID from `?select=layer:<slug>` or `?layer=<layerId>`.
 */
export const extractUrlLayerId = (
  searchString: string,
  layerIndex: readonly DatasetLayerIndexEntry[],
): string | null => {
  const layerToken = parseUrlSelectTokens(searchString, layerIndex).find(
    (t): t is Extract<UrlSelectToken, { readonly kind: 'layer' }> => t.kind === 'layer',
  );
  return layerToken ? layerToken.layerId : null;
};

/**
 * Pure helper extracting structured selection slugs across tags, layers, types, and entities.
 */
export const extractUrlSelectSlugs = (
  searchString: string,
  layerIndex: readonly DatasetLayerIndexEntry[],
): {
  readonly tags: readonly string[];
  readonly layerSlugs: readonly string[];
  readonly starTypes: readonly string[];
  readonly planetTypes: readonly string[];
  readonly collections: readonly string[];
  readonly entitySlugs: readonly string[];
} => {
  const tokens = parseUrlSelectTokens(searchString, layerIndex);
  const tags: string[] = [];
  const layerSlugs: string[] = [];
  const starTypes: string[] = [];
  const planetTypes: string[] = [];
  const collections: string[] = [];
  const entitySlugs: string[] = [];

  for (const t of tokens) {
    if (t.kind === 'tag') tags.push(t.tag);
    else if (t.kind === 'layer') layerSlugs.push(t.layerId);
    else if (t.kind === 'star-type') starTypes.push(t.starType);
    else if (t.kind === 'planet-type') planetTypes.push(t.planetType);
    else if (t.kind === 'collection') collections.push(t.collectionId);
    else if (t.kind === 'entity') entitySlugs.push(t.slug);
  }

  return {
    tags,
    layerSlugs,
    starTypes,
    planetTypes,
    collections,
    entitySlugs,
  };
};

/**
 * Pure parser extracting the single focused target slug from a URL `pathname` and `searchString`.
 * Priority:
 * 1. Explicit `?focus=<slug>` query parameter (e.g. `/galaxy/tau-ceti?focus=tau-ceti-e` or `/galaxy?select=layer:project-hail-mary&focus=tau-ceti`).
 * 2. Route path segment `/galaxy/$systemId` or `/system/$systemId` (e.g. `/galaxy/tau-ceti`).
 * 3. `null` when no entity focus parameter or system route segment is present in the URL.
 */
export const extractUrlFocusSlug = (
  pathname: string,
  searchString: string,
): string | null => {
  const params = new URLSearchParams(searchString);
  const focusParam = params.get('focus');
  if (focusParam) {
    const slug = toUrlSlug(focusParam);
    if (slug.length > 0) {
      return slug;
    }
  }

  const routeMatch = /^\/galaxy\/([^/?#]+)/i.exec(
    pathname.trim(),
  );
  if (routeMatch?.[1]) {
    const slug = toUrlSlug(decodeURIComponent(routeMatch[1]));
    if (slug.length > 0) {
      return slug;
    }
  }

  return null;
};

/**
 * Pure parser extracting the host system slug from a `/galaxy/$systemId` or `/system/$systemId` route path.
 */
export const extractUrlSystemSlug = (pathname: string): string | null => {
  const routeMatch = /^\/(?:galaxy|system)\/([^/?#]+)/i.exec(pathname.trim());
  if (routeMatch?.[1]) {
    const slug = toUrlSlug(decodeURIComponent(routeMatch[1]));
    if (slug.length > 0) {
      return slug;
    }
  }
  return null;
};

/**
 * Pure parser extracting the host planet slug from a `/planet/$planetId` route path.
 */
export const extractUrlPlanetSlug = (pathname: string): string | null => {
  const routeMatch = /^\/planet\/([^/?#]+)/i.exec(pathname.trim());
  if (routeMatch?.[1]) {
    const slug = toUrlSlug(decodeURIComponent(routeMatch[1]));
    if (slug.length > 0) {
      return slug;
    }
  }
  return null;
};

/**
 * Pure predicate checking whether a URL search string contains an explicit single-entity `?focus=<slug>` parameter.
 */
export const hasExplicitFocusParam = (searchString: string): boolean => {
  const params = new URLSearchParams(searchString);
  const focusParam = params.get('focus');
  if (!focusParam) {
    return false;
  }
  return toUrlSlug(focusParam).length > 0;
};

/**
 * Pure lookup finding the matching `CompactSearchEntry` in a corpus for a focused URL slug or ID.
 * Prefers direct star-system entries when multiple entries share the same slug.
 */
export const findFocusedEntryInCorpus = (
  focusSlug: string,
  corpus: readonly CompactSearchEntry[],
): CompactSearchEntry | undefined => {
  const targetSlug = toUrlSlug(focusSlug);
  const targetLower = focusSlug.trim().toLowerCase();
  if (!targetSlug) {
    return undefined;
  }

  let nonStarMatch: CompactSearchEntry | undefined;

  for (const entry of corpus) {
    const idLower = entry.i.toLowerCase();
    const nameSlug = toUrlSlug(resolveResultDisplayTitle(entry));
    const idSlug = toUrlSlug(entry.i);

    if (
      idLower === targetLower ||
      nameSlug === targetSlug ||
      idSlug === targetSlug
    ) {
      if (resolveEntryCategory(entry) === 'stars') {
        return entry;
      }
      if (!nonStarMatch) {
        nonStarMatch = entry;
      }
    }
  }

  if (nonStarMatch) {
    return nonStarMatch;
  }

  // Second pass: match parenthetical display-title segments (e.g. 'Ran (Epsilon Eridani)' -> 'epsilon-eridani',
  // 'e Eridani (82 G. Eridani)' -> '82-g-eridani')
  let segmentNonStarMatch: CompactSearchEntry | undefined;
  for (const entry of corpus) {
    const displayTitle = resolveResultDisplayTitle(entry);
    if (!displayTitle.includes('(')) {
      continue;
    }
    const segments = displayTitle
      .split(/[()]/)
      .map((s) => toUrlSlug(s))
      .filter((s) => s.length > 0);
    if (segments.includes(targetSlug)) {
      if (resolveEntryCategory(entry) === 'stars') {
        return entry;
      }
      if (!segmentNonStarMatch) {
        segmentNonStarMatch = entry;
      }
    }
  }

  return segmentNonStarMatch;
};

/**
 * Pure predicate determining whether a star-system `CompactSearchEntry` satisfies
 * a catalog system tag (`SolarNeighborhood10pc`, `NakedEye`, `ExoplanetHost`, etc.).
 * Reads the precalculated `entry.g` tag bitmask when available and falls back to
 * entry telemetry for synthetic unit test fixtures.
 */
export const doesSystemEntryMatchTag = (
  entry: CompactSearchEntry,
  tag: string,
): boolean => {
  if (resolveEntryCategory(entry) !== 'stars') {
    return false;
  }
  const tagKey = normaliseTagKey(tag);
  if (!tagKey) {
    return false;
  }

  const tagBit = TAG_BIT_BY_LOWER[tagKey];
  if (entry.g !== undefined && tagBit !== undefined) {
    return (entry.g & tagBit) !== 0;
  }

  if (tagKey === 'homesystem') {
    return entry.h === 1;
  }
  if (
    tagKey === 'solarneighborhood10pc' ||
    tagKey === 'reconsgroundtruth'
  ) {
    if (entry.h === 1) {
      return true;
    }
    if (!entry.p) {
      return false;
    }
    const [x, y, z] = entry.p;
    return Math.sqrt(x * x + y * y + z * z) <= 10;
  }
  if (tagKey === 'nakedeye') {
    return (
      entry.h === 1 ||
      (entry.m?.[0] !== undefined && entry.m[0] <= 6.5)
    );
  }
  if (tagKey === 'exoplanethost') {
    return (entry.m?.[2] ?? 0) > 0;
  }
  if (tagKey === 'habitablecandidate' || tagKey === 'habitablehost') {
    return entry.m?.[3] === 1;
  }
  if (tagKey === 'variablestar') {
    return Boolean(entry.a && /\bvar\b/i.test(entry.a));
  }
  return false;
};

const registerLayerEntrySystem = (
  systemsById: Map<string, SpatialEntityDefinition>,
  entry: {
    readonly systemId?: string;
    readonly targetId: string;
    readonly targetType: string;
    readonly inUniverseName?: string;
  },
  corpus: readonly CompactSearchEntry[],
): void => {
  const systemId = entry.systemId || entry.targetId;
  if (!systemId || systemsById.has(systemId)) {
    return;
  }

  const matched = findFocusedEntryInCorpus(systemId, corpus);
  if (matched) {
    systemsById.set(matched.i, {
      id: matched.i,
      name: resolveResultDisplayTitle(matched),
      position: matched.p
        ? [matched.p[0], matched.p[1], matched.p[2]]
        : [0, 0, 0],
      classification: resolveReticleType(matched),
      ...(matched.m?.[1] ? { spectralType: matched.m[1] } : {}),
    });
  } else {
    systemsById.set(systemId, {
      id: systemId,
      name: formatSlugFallbackTitle(systemId),
      position: [0, 0, 0],
      classification: 'stellar-system',
    });
  }
};

/**
 * Pure unit function resolving all deduplicated host star systems that match a
 * catalog system tag (`ExoplanetHost`, `SolarNeighborhood10pc`, `NakedEye`, etc.),
 * returning `SpatialEntityDefinition` records to be marked `selected` in `SpatialEntityStore`.
 */
export const resolveSelectedSystemsFromTag = (
  tag: string,
  corpus: readonly CompactSearchEntry[],
): readonly SpatialEntityDefinition[] => {
  const tagKey = normaliseTagKey(tag);
  if (!tagKey) {
    return [];
  }
  const systemsById = new Map<string, SpatialEntityDefinition>();

  for (const entry of corpus) {
    if (doesSystemEntryMatchTag(entry, tagKey)) {
      systemsById.set(entry.i, {
        id: entry.i,
        name: resolveResultDisplayTitle(entry),
        position: entry.p ? [entry.p[0], entry.p[1], entry.p[2]] : [0, 0, 0],
        classification: resolveReticleType(entry),
        ...(entry.m?.[1] ? { spectralType: entry.m[1] } : {}),
      });
    }
  }

  return Array.from(systemsById.values());
};

/**
 * Pure unit function resolving all deduplicated host star systems that have annotations
 * in a specified layer (`layerId`), returning `SpatialEntityDefinition` records
 * to be marked `selected` in `SpatialEntityStore`.
 */
export const resolveSelectedSystemsFromLayer = (
  layerId: string,
  corpus: readonly CompactSearchEntry[],
  activeLayers: readonly DatasetLayerManifest[],
): readonly SpatialEntityDefinition[] => {
  const layer = findCanonLayerById(layerId, activeLayers);
  if (!layer) {
    return [];
  }

  const systemsById = new Map<string, SpatialEntityDefinition>();

  for (const entry of Object.values(layer.entries)) {
    registerLayerEntrySystem(systemsById, entry, corpus);
  }

  return Array.from(systemsById.values());
};

/**
 * Pure unit function resolving all deduplicated star systems that match a specified star type
 * (e.g. 'G', 'G2V', 'white-dwarf', 'brown-dwarf', 'neutron-star') from `?select=star-type:<starType>`.
 */
export const resolveSelectedSystemsFromStarType = (
  starType: string,
  corpus: readonly CompactSearchEntry[],
): readonly SpatialEntityDefinition[] => {
  const normStarType = toUrlSlug(starType.trim().replace(/^star-type:/i, ''));
  if (!normStarType) {
    return [];
  }

  const cleanStarType = normStarType.replace(/[^a-z0-9]/g, '');
  const isReticleClass =
    normStarType === 'white-dwarf' ||
    normStarType === 'brown-dwarf' ||
    normStarType === 'neutron-star';

  const systemsById = new Map<string, SpatialEntityDefinition>();

  for (const entry of corpus) {
    if (resolveEntryCategory(entry) !== 'stars') {
      continue;
    }

    let matches = false;
    if (isReticleClass) {
      matches = resolveReticleType(entry) === normStarType;
    } else {
      const entrySpectClean = (entry.m?.[1] ?? '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      matches = entrySpectClean.length > 0 && entrySpectClean.startsWith(cleanStarType);
    }

    if (matches) {
      systemsById.set(entry.i, {
        id: entry.i,
        name: resolveResultDisplayTitle(entry),
        position: entry.p ? [entry.p[0], entry.p[1], entry.p[2]] : [0, 0, 0],
        classification: resolveReticleType(entry),
        ...(entry.m?.[1] ? { spectralType: entry.m[1] } : {}),
      });
    }
  }

  return Array.from(systemsById.values());
};

/**
 * Pure unit function resolving all deduplicated host star systems of matching planet entries
 * (e.g. 'terrestrial', 'super-earth', 'sub-neptune', 'gas-giant') from `?select=planet-type:<planetType>`.
 * Falls back to star `entry.b` composition counts tuple [terrestrialAndSuperEarth, subNeptune, gasGiant]
 * when no child planet entries are in the corpus.
 */
export const resolveSelectedSystemsFromPlanetType = (
  planetType: string,
  corpus: readonly CompactSearchEntry[],
): readonly SpatialEntityDefinition[] => {
  const normPlanetType = toUrlSlug(planetType.trim().replace(/^planet-type:/i, ''));
  if (!normPlanetType) {
    return [];
  }

  const systemsById = new Map<string, SpatialEntityDefinition>();
  const matchingHostSystemIds = new Set<string>();

  // Check child planet entries (entry.k === 2)
  const childPlanetEntries = corpus.filter((e) => e.k === 2);
  for (const planet of childPlanetEntries) {
    const rawType = planet.u ? toUrlSlug(planet.u) : resolveReticleType(planet);
    const matches =
      rawType === normPlanetType ||
      (normPlanetType === 'super-earth' && rawType === 'super-earth') ||
      (normPlanetType === 'terrestrial' && rawType === 'terrestrial') ||
      (normPlanetType === 'sub-neptune' && (rawType === 'sub-neptune' || rawType === 'ice-giant')) ||
      (normPlanetType === 'ice-giant' && (rawType === 'ice-giant' || rawType === 'sub-neptune')) ||
      (normPlanetType === 'gas-giant' && rawType === 'gas-giant');

    if (matches && planet.s) {
      matchingHostSystemIds.add(planet.s);
    }
  }

  // Fallback to star entry.b composition counts tuple [terrestrial, superEarth, iceGiant, gasGiant]
  // or legacy [terrestrialAndSuperEarth, subNeptune, gasGiant] when no child planet entries are in the corpus (or when no child planets matched)
  if (childPlanetEntries.length === 0 || matchingHostSystemIds.size === 0) {
    for (const entry of corpus) {
      if (resolveEntryCategory(entry) === 'stars' && entry.b) {
        let count = 0;
        if (entry.b.length === 4) {
          if (normPlanetType === 'terrestrial') count = entry.b[0] ?? 0;
          else if (normPlanetType === 'super-earth') count = entry.b[1] ?? 0;
          else if (normPlanetType === 'sub-neptune' || normPlanetType === 'ice-giant') count = entry.b[2] ?? 0;
          else if (normPlanetType === 'gas-giant') count = entry.b[3] ?? 0;
        } else {
          // Legacy 3-tuple
          if (normPlanetType === 'terrestrial' || normPlanetType === 'super-earth') count = entry.b[0] ?? 0;
          else if (normPlanetType === 'sub-neptune' || normPlanetType === 'ice-giant') count = entry.b[1] ?? 0;
          else if (normPlanetType === 'gas-giant') count = entry.b[2] ?? 0;
        }
        if (count > 0) {
          matchingHostSystemIds.add(entry.i);
        }
      }
    }
  }

  for (const hostId of matchingHostSystemIds) {
    const matched = findFocusedEntryInCorpus(hostId, corpus);
    if (matched) {
      systemsById.set(matched.i, {
        id: matched.i,
        name: resolveResultDisplayTitle(matched),
        position: matched.p ? [matched.p[0], matched.p[1], matched.p[2]] : [0, 0, 0],
        classification: resolveReticleType(matched),
        ...(matched.m?.[1] ? { spectralType: matched.m[1] } : {}),
      });
    } else {
      systemsById.set(hostId, {
        id: hostId,
        name: formatSlugFallbackTitle(hostId),
        position: [0, 0, 0],
        classification: 'stellar-system',
      });
    }
  }

  return Array.from(systemsById.values());
};

/**
 * Pure unit function resolving all deduplicated systems belonging to a curated collection
 * (e.g. 'extreme-worlds', 'newly-discovered') from `?select=collection:<collectionId>`.
 */
export const resolveSelectedSystemsFromCollection = (
  collectionId: string,
  corpus: readonly CompactSearchEntry[],
  collections: readonly CuratedCollection[] = SEED_CURATED_COLLECTIONS,
): readonly SpatialEntityDefinition[] => {
  const targetSlug = toUrlSlug(collectionId.trim().replace(/^collection:/i, ''));
  if (!targetSlug) {
    return [];
  }

  const collection = collections.find(
    (c) => toUrlSlug(c.id) === targetSlug || c.id === collectionId,
  );
  if (!collection) {
    return [];
  }

  const systemsById = new Map<string, SpatialEntityDefinition>();
  const systemIds = new Set<string>(collection.systemIds);
  if (collection.waypoints) {
    for (const wp of collection.waypoints) {
      systemIds.add(wp.systemId ?? wp.targetId);
    }
  }

  for (const sysId of systemIds) {
    const matched = findFocusedEntryInCorpus(sysId, corpus);
    if (matched) {
      systemsById.set(matched.i, {
        id: matched.i,
        name: resolveResultDisplayTitle(matched),
        position: matched.p ? [matched.p[0], matched.p[1], matched.p[2]] : [0, 0, 0],
        classification: resolveReticleType(matched),
        ...(matched.m?.[1] ? { spectralType: matched.m[1] } : {}),
      });
    } else {
      systemsById.set(sysId, {
        id: sysId,
        name: formatSlugFallbackTitle(sysId),
        position: [0, 0, 0],
        classification: 'stellar-system',
      });
    }
  }

  return Array.from(systemsById.values());
};

/**
 * Pure unit function resolving all deduplicated entities selected via `?select=`
 * (supporting comma-separated `tag:<slug>`, `layer:<slug>`, `star-type:<slug>`,
 * `planet-type:<slug>`, `collection:<slug>`, and explicit `<entityId>` tokens).
 */
export const resolveSelectedSystemsFromUrlSelect = (
  searchString: string,
  corpus: readonly CompactSearchEntry[],
  layerIndex: readonly DatasetLayerIndexEntry[],
  loadedLayers: readonly DatasetLayerManifest[],
  collections: readonly CuratedCollection[] = SEED_CURATED_COLLECTIONS,
): readonly SpatialEntityDefinition[] => {
  const tokens = parseUrlSelectTokens(searchString, layerIndex);
  if (tokens.length === 0) {
    return [];
  }

  const entitiesById = new Map<string, SpatialEntityDefinition>();

  for (const token of tokens) {
    if (token.kind === 'tag') {
      for (const sys of resolveSelectedSystemsFromTag(token.tag, corpus)) {
        entitiesById.set(sys.id, sys);
      }
    } else if (token.kind === 'layer') {
      for (const sys of resolveSelectedSystemsFromLayer(
        token.layerId,
        corpus,
        loadedLayers,
      )) {
        entitiesById.set(sys.id, sys);
      }
    } else if (token.kind === 'star-type') {
      for (const sys of resolveSelectedSystemsFromStarType(
        token.starType,
        corpus,
      )) {
        entitiesById.set(sys.id, sys);
      }
    } else if (token.kind === 'planet-type') {
      for (const sys of resolveSelectedSystemsFromPlanetType(
        token.planetType,
        corpus,
      )) {
        entitiesById.set(sys.id, sys);
      }
    } else if (token.kind === 'collection') {
      for (const sys of resolveSelectedSystemsFromCollection(
        token.collectionId,
        corpus,
        collections,
      )) {
        entitiesById.set(sys.id, sys);
      }
    } else {
      const entity = resolveFocusedEntityFromCorpus(token.slug, corpus);
      if (entity) {
        entitiesById.set(entity.id, entity);
      }
    }
  }

  return Array.from(entitiesById.values());
};

/**
 * Pure unit function resolving the `SpatialEntityDefinition` to mark `focused` in
 * `SpatialEntityStore` from a URL focus slug and search corpus.
 */
export const resolveFocusedEntityFromCorpus = (
  focusSlug: string,
  corpus: readonly CompactSearchEntry[],
): SpatialEntityDefinition | null => {
  const targetSlug = toUrlSlug(focusSlug);
  if (!targetSlug) {
    return null;
  }

  const matched = findFocusedEntryInCorpus(focusSlug, corpus);
  if (matched) {
    const rawCoords = matched as { x?: number; y?: number; z?: number };
    const position: [number, number, number] = matched.p
      ? [matched.p[0], matched.p[1], matched.p[2]]
      : typeof rawCoords.x === 'number' && typeof rawCoords.y === 'number' && typeof rawCoords.z === 'number'
        ? [rawCoords.x, rawCoords.y, rawCoords.z]
        : [0, 0, 0];
    return {
      id: matched.i,
      name: resolveResultDisplayTitle(matched),
      position,
      classification: resolveReticleType(matched),
      ...(matched.m?.[1] ? { spectralType: matched.m[1] } : {}),
    };
  }

  return {
    id: targetSlug,
    name: formatSlugFallbackTitle(targetSlug),
    position: [0, 0, 0],
    classification: 'stellar-system',
  };
};

export {
  type SceneCameraUrlState,
  extractUrlSceneCameraState,
  buildCenterEntityHref,
} from './detailsService';



