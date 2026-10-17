import type { CelestialClassification } from '../components/canvas/cartography/reticleGeometry';
import type { SpatialEntityDefinition } from '../components/canvas/entity/types';
import type { DatasetLayerManifest } from '../types/astro';
import type { CompactSearchEntry } from '../utils/compactDataCodec';
import { SEED_FICTIONAL_CANON_LAYERS } from '../utils/datasetLayerCodec';
import { expandGouldOrConstellationSuffix, normalizeCleanKey } from '../utils/nomenclature';

export type SearchCategoryKey =
  | 'stars'
  | 'planets'
  | 'structures'
  | 'minor-bodies'
  | 'fiction';

export type SearchCategoryFilter = 'all' | SearchCategoryKey;

export interface SearchCategoryMeta {
  readonly key: SearchCategoryKey;
  readonly heading: string;
}

export const SEARCH_CATEGORIES: readonly SearchCategoryMeta[] = [
  { key: 'stars', heading: 'Stars & Stellar Systems' },
  { key: 'planets', heading: 'Planets, Exoplanets & Moons' },
  { key: 'structures', heading: 'Galactic Structures & Deep Sky' },
  { key: 'minor-bodies', heading: 'Solar System Minor Bodies' },
  { key: 'fiction', heading: 'Fictional Canons & Works' },
];

const VALID_CATEGORY_KEYS = new Set<string>(SEARCH_CATEGORIES.map((c) => c.key));

/**
 * Pure type guard validating whether an unknown value is a valid `SearchCategoryFilter`.
 */
export const isSearchCategoryFilter = (value: unknown): value is SearchCategoryFilter =>
  typeof value === 'string' && (value === 'all' || VALID_CATEGORY_KEYS.has(value));

export type SearchEntityKind =
  | 'star-system'
  | 'planet'
  | 'moon'
  | 'dwarf-planet'
  | 'galactic-structure'
  | 'minor-body'
  | 'fictional-entry';

export type SearchTargetView = 'galaxy' | 'system';

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

const ARTIFICIAL_SPACECRAFT_IDS = new Set<string>([
  'voyager-1',
  'voyager-2',
  'pioneer-10',
  'pioneer-11',
  'new-horizons',
  'jwst',
]);

/**
 * Pure predicate determining whether an entry represents a child body (planet, moon, fictional planet)
 * attached to a distinct host star system, rather than the host system itself.
 */
export const isChildOfHostSystem = (entryId: string, systemId?: string): boolean =>
  Boolean(systemId) && entryId !== systemId && !entryId.endsWith(`:${systemId}`);

/**
 * Pure predicate determining whether a search entry represents an artificial spacecraft / probe.
 */
export const isArtificialSpacecraftEntry = (entry: CompactSearchEntry): boolean => {
  const idLower = entry.i.toLowerCase();
  if (ARTIFICIAL_SPACECRAFT_IDS.has(idLower)) {
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
      return 'fiction';
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
      return 'fictional-entry';
    default:
      return 'star-system';
  }
};

/**
 * Pure selector mapping a CompactSearchEntry to its canonical reticle taxonomy type (`CelestialClassification`).
 */
export const resolveReticleType = (
  entry: CompactSearchEntry,
): CelestialClassification => {
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
    const idLower = entry.i.toLowerCase();
    if (idLower === 'jupiter' || idLower === 'saturn') {
      return 'gas-giant';
    }
    if (idLower === 'uranus' || idLower === 'neptune') {
      return 'ice-giant';
    }
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
      return 'artificial';
    }
    return 'terrestrial';
  }

  // category === 'fiction'
  if (isChildOfHostSystem(entry.i, entry.s)) {
    return 'terrestrial';
  }
  return 'stellar-system';
};

export interface ResultLinkInput {
  readonly id: string;
  readonly name: string;
  readonly systemId?: string;
  readonly systemName?: string;
  readonly isSolarSystem?: boolean;
}

export const toUrlSlug = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * Pure unit function that determines whether a search result navigates to the Galaxy View
 * (`/galaxy/<systemname>` or `/galaxy/<systemname>?focus=<itemname>` for child items) or the
 * System View (`/system/sol?focus=<itemname>` for bodies inside our Solar System `sol`, per `FS-003`),
 * capturing strictly state and intent in the URL.
 */
export const buildResultTargetLink = (
  input: ResultLinkInput,
): { readonly targetView: SearchTargetView; readonly href: string } => {
  const isChildOfSystem = isChildOfHostSystem(input.id, input.systemId);

  if (input.isSolarSystem === true && input.systemId === 'sol' && isChildOfSystem) {
    const focusSlug = toUrlSlug(input.name || input.id);
    const params = new URLSearchParams({ focus: focusSlug });
    return {
      targetView: 'system',
      href: `/system/sol?${params.toString()}`,
    };
  }

  const systemSlug = toUrlSlug(
    input.systemName ?? (isChildOfSystem ? input.systemId : undefined) ?? input.name ?? input.id,
  );
  const encodedSystemSlug = encodeURIComponent(systemSlug);

  if (isChildOfSystem) {
    const focusSlug = toUrlSlug(input.name || input.id);
    const params = new URLSearchParams({ focus: focusSlug });
    return {
      targetView: 'galaxy',
      href: `/galaxy/${encodedSystemSlug}?${params.toString()}`,
    };
  }

  return {
    targetView: 'galaxy',
    href: `/galaxy/${encodedSystemSlug}`,
  };
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
    systemId: entry.s,
    systemName,
    isSolarSystem,
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
    groups,
  };
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
  const filter: SearchCategoryFilter = options.filter ?? 'all';
  const limitPerCategory = options.limitPerCategory ?? DEFAULT_LIMIT_PER_CATEGORY;
  const normalised = normaliseSearchQuery(options.query);

  if (!normalised.cleanKey) {
    return createEmptyGroupedResults(normalised.rawTrimmed, filter);
  }

  const systemNameById = new Map<string, string>([['sol', 'Sol']]);
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
    fiction: [],
  };

  const deferredSystemChildren: CompactSearchEntry[] = [];

  for (const entry of entries) {
    const category = resolveEntryCategory(entry);
    const directScore = scoreSearchEntry(entry, normalised);

    if (directScore > 0) {
      if (category === 'stars' && directScore >= 700) {
        stronglyMatchedSystemIds.add(entry.i);
      }
      if (filter === 'all' || filter === category) {
        const hostName = resolveResultSystemTitle(entry, systemNameById);
        matchedByCategory[category].push(
          toSearchResultItem(entry, directScore, hostName),
        );
      }
    } else if (
      entry.s &&
      (category === 'planets' || category === 'fiction') &&
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
        const hostName = resolveResultSystemTitle(child, systemNameById);
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
    filter,
    totalMatches,
    groups,
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
        const resolvedSystemName =
          item.systemName ??
          (item.systemId === 'sol' ? 'Sol' : item.systemId);
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

/**
 * Base path for the stellar classification guide views (`/guide/star-types` and `/guide/star-types/$starType`).
 */
export const STAR_TYPES_GUIDE_PATH = '/guide/star-types';

/**
 * Pure unit function building the URL to the stellar classification detail guide view
 * (`/guide/star-types/<starType>`, e.g. `/guide/star-types/G8V`).
 */
export const buildStarTypeGuideHref = (spectralType: string): string => {
  const trimmed = spectralType.trim();
  if (!trimmed || trimmed === 'Unknown') {
    return STAR_TYPES_GUIDE_PATH;
  }
  return `${STAR_TYPES_GUIDE_PATH}/${encodeURIComponent(trimmed)}`;
};

export const PLANET_TYPES_GUIDE_PATH = '/guide/planet-types' as const;

export const PLANET_COMPOSITION_TYPES = [
  'terrestrial',
  'ice-giant',
  'gas-giant',
] as const;

/**
 * Pure unit function building the URL to the Planet Type Guide view for a given
 * planetary composition class (`/guide/planet-types/<planetType>`, e.g. `/guide/planet-types/terrestrial`).
 * Falls back to the Planet Types list view (`/guide/planet-types`) when the class is empty or `'Unknown'`.
 */
export const buildPlanetTypeGuideHref = (planetType?: string): string => {
  if (!planetType) {
    return PLANET_TYPES_GUIDE_PATH;
  }
  const trimmed = planetType.trim();
  if (!trimmed || trimmed === 'Unknown') {
    return PLANET_TYPES_GUIDE_PATH;
  }
  return `${PLANET_TYPES_GUIDE_PATH}/${encodeURIComponent(trimmed)}`;
};

export const METRICS_GUIDE_PATH = '/guide/metrics' as const;

/**
 * Pure unit function building the URL to the Telemetry Metrics Guide view for a given
 * physical/orbital metric (`/guide/metrics/<metricId>`, e.g. `/guide/metrics/semi-major-axis`).
 * Falls back to the Metrics list view (`/guide/metrics`) when the metricId is empty or `'Unknown'`.
 */
export const buildMetricGuideHref = (metricId?: string): string => {
  if (!metricId) {
    return METRICS_GUIDE_PATH;
  }
  const trimmed = metricId.trim();
  if (!trimmed || trimmed === 'Unknown') {
    return METRICS_GUIDE_PATH;
  }
  return `${METRICS_GUIDE_PATH}/${encodeURIComponent(trimmed)}`;
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

/**
 * Pure unit function building the URL to the Galaxy View with a tag focus query parameter
 * (`/galaxy?focus=<tag>`, e.g. `/galaxy?focus=ExoplanetHost`).
 */
export const buildTagGalaxyHref = (tag: string): string => {
  const trimmed = tag.trim();
  const params = new URLSearchParams({ focus: trimmed });
  return `/galaxy?${params.toString()}`;
};

/**
 * Pure unit function checking whether a candidate string matches a known catalog system tag
 * or a canon layer annotation tag.
 */
export const isCatalogOrCanonTag = (
  candidateTag: string,
  activeLayers: readonly DatasetLayerManifest[] = SEED_FICTIONAL_CANON_LAYERS,
): boolean => {
  const trimmed = candidateTag.trim();
  if (!trimmed) {
    return false;
  }
  const lower = trimmed.toLowerCase();
  if (KNOWN_SYSTEM_TAGS.some((tag) => tag.toLowerCase() === lower)) {
    return true;
  }
  for (const layer of activeLayers) {
    for (const entry of Object.values(layer.entries)) {
      if (entry.tags?.some((tag) => tag.toLowerCase() === lower)) {
        return true;
      }
    }
  }
  return false;
};

/**
 * Pure parser extracting an active catalog or canon tag from a URL search string (`?focus=<tag>`).
 */
export const extractUrlTagFocus = (
  searchString: string,
  activeLayers: readonly DatasetLayerManifest[] = SEED_FICTIONAL_CANON_LAYERS,
): string | null => {
  const params = new URLSearchParams(searchString);
  const focusParam = params.get('focus');
  if (
    focusParam &&
    !findCanonLayerById(focusParam, activeLayers) &&
    isCatalogOrCanonTag(focusParam, activeLayers)
  ) {
    return focusParam.trim();
  }
  return null;
};

/**
 * Pure unit function building the URL to the Galaxy View with a canon layer query parameter
 * (`/galaxy?focus=<layerId>`, e.g. `/galaxy?focus=canon-project-hail-mary`).
 */
export const buildCanonLayerGalaxyHref = (layerId: string): string => {
  const trimmed = layerId.trim();
  const params = new URLSearchParams({ focus: trimmed });
  return `/galaxy?${params.toString()}`;
};

/**
 * Pure lookup finding a dataset layer manifest (`FS-001` / `FS-002`) by its `layerId` or slug.
 */
export const findCanonLayerById = (
  candidateId: string,
  activeLayers: readonly DatasetLayerManifest[] = SEED_FICTIONAL_CANON_LAYERS,
): DatasetLayerManifest | undefined => {
  const trimmed = candidateId.trim();
  if (!trimmed) {
    return undefined;
  }
  const targetLower = trimmed.toLowerCase();
  const targetSlug = toUrlSlug(trimmed);
  return activeLayers.find(
    (layer) =>
      layer.layerId.toLowerCase() === targetLower ||
      toUrlSlug(layer.layerId) === targetSlug,
  );
};

/**
 * Pure parser extracting an active canon layer ID from a URL search string.
 * Supports both `?focus=<layerId>` (when `<layerId>` matches a known canon layer)
 * and `?canon=<layerId>`.
 */
export const extractUrlCanonLayerId = (
  searchString: string,
  activeLayers: readonly DatasetLayerManifest[] = SEED_FICTIONAL_CANON_LAYERS,
): string | null => {
  const params = new URLSearchParams(searchString);
  const canonParam = params.get('canon');
  if (canonParam) {
    const matched = findCanonLayerById(canonParam, activeLayers);
    if (matched) {
      return matched.layerId;
    }
  }
  const focusParam = params.get('focus');
  if (focusParam) {
    const matched = findCanonLayerById(focusParam, activeLayers);
    if (matched) {
      return matched.layerId;
    }
  }
  return null;
};

/**
 * Pure parser extracting the focused target slug from a URL `pathname` and `searchString`.
 * Priority:
 * 1. Explicit `?focus=<slug>` query parameter (e.g. `/galaxy/tau-ceti?focus=tau-ceti-e`),
 *    excluding canon layer IDs (`?focus=canon-project-hail-mary`) and catalog/canon tags
 *    (`?focus=ExoplanetHost`) which select matching systems instead.
 * 2. Route path segment `/galaxy/$systemId` or `/system/$systemId` (e.g. `/galaxy/tau-ceti`)
 * 3. `null` when no entity focus parameter or system route segment is present in the URL.
 */
export const extractUrlFocusSlug = (
  pathname: string,
  searchString: string,
  activeLayers: readonly DatasetLayerManifest[] = SEED_FICTIONAL_CANON_LAYERS,
): string | null => {
  const params = new URLSearchParams(searchString);
  const focusParam = params.get('focus');
  if (
    focusParam &&
    !findCanonLayerById(focusParam, activeLayers) &&
    !isCatalogOrCanonTag(focusParam, activeLayers)
  ) {
    const slug = toUrlSlug(focusParam);
    if (slug.length > 0) {
      return slug;
    }
  }

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
 * Pure formatter turning a URL slug (e.g. `'tau-ceti'`) into a human-readable fallback title (`'Tau Ceti'`).
 */
export const formatSlugFallbackTitle = (slug: string): string =>
  slug
    .trim()
    .split(/[-_\s]+/)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

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

  return nonStarMatch;
};

/**
 * Pure predicate determining whether a star-system `CompactSearchEntry` satisfies
 * a catalog system tag (`SolarNeighborhood10pc`, `NakedEye`, `ExoplanetHost`, etc.).
 */
export const doesSystemEntryMatchTag = (
  entry: CompactSearchEntry,
  tag: string,
): boolean => {
  if (resolveEntryCategory(entry) !== 'stars') {
    return false;
  }
  const tagLower = tag.trim().toLowerCase();
  if (!tagLower) {
    return false;
  }

  if (tagLower === 'homesystem') {
    return entry.h === 1 || entry.i.toLowerCase() === 'sol';
  }
  if (
    tagLower === 'solarneighborhood10pc' ||
    tagLower === 'reconsgroundtruth'
  ) {
    if (entry.h === 1 || entry.i.toLowerCase() === 'sol') {
      return true;
    }
    if (!entry.p) {
      return false;
    }
    const [x, y, z] = entry.p;
    return Math.sqrt(x * x + y * y + z * z) <= 10;
  }
  if (tagLower === 'nakedeye') {
    return (
      entry.h === 1 ||
      (entry.m?.[0] !== undefined && entry.m[0] <= 6.5)
    );
  }
  if (tagLower === 'exoplanethost') {
    return (entry.m?.[2] ?? 0) > 0;
  }
  if (tagLower === 'habitablecandidate' || tagLower === 'habitablehost') {
    return entry.m?.[3] === 1;
  }
  if (tagLower === 'variablestar') {
    return Boolean(entry.a && /\bvar\b/i.test(entry.a));
  }
  return false;
};

/**
 * Pure unit function resolving all deduplicated host star systems that match a
 * catalog system tag (`ExoplanetHost`, `SolarNeighborhood10pc`, `NakedEye`, etc.)
 * or a canon layer annotation tag, returning `SpatialEntityDefinition` records
 * to be marked `selected` in `SpatialEntityStore`.
 */
export const resolveSelectedSystemsFromTag = (
  tag: string,
  corpus: readonly CompactSearchEntry[],
  activeLayers: readonly DatasetLayerManifest[] = SEED_FICTIONAL_CANON_LAYERS,
): readonly SpatialEntityDefinition[] => {
  const trimmed = tag.trim();
  if (!trimmed) {
    return [];
  }
  const tagLower = trimmed.toLowerCase();
  const systemsById = new Map<string, SpatialEntityDefinition>();

  for (const entry of corpus) {
    if (doesSystemEntryMatchTag(entry, trimmed)) {
      systemsById.set(entry.i, {
        id: entry.i,
        name: resolveResultDisplayTitle(entry),
        position: entry.p ? [entry.p[0], entry.p[1], entry.p[2]] : [0, 0, 0],
        classification: resolveReticleType(entry),
        ...(entry.m?.[1] ? { spectralType: entry.m[1] } : {}),
      });
    }
  }

  for (const layer of activeLayers) {
    for (const entry of Object.values(layer.entries)) {
      if (!entry.tags?.some((t) => t.toLowerCase() === tagLower)) {
        continue;
      }
      const systemId = entry.systemId || entry.targetId;
      if (!systemId || systemsById.has(systemId)) {
        continue;
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
      } else if (systemId === 'sol') {
        systemsById.set('sol', {
          id: 'sol',
          name: 'Sol',
          position: [0, 0, 0],
          classification: 'stellar-system',
          spectralType: 'G2V',
        });
      } else {
        const fallbackName =
          entry.targetType === 'system' && entry.inUniverseName
            ? entry.inUniverseName
            : formatSlugFallbackTitle(systemId);
        systemsById.set(systemId, {
          id: systemId,
          name: fallbackName,
          position: [0, 0, 0],
          classification: 'stellar-system',
        });
      }
    }
  }

  return Array.from(systemsById.values());
};

/**
 * Pure unit function resolving all deduplicated host star systems that have annotations
 * in a specified canon layer (`layerId`), returning `SpatialEntityDefinition` records
 * to be marked `selected` in `SpatialEntityStore`.
 */
export const resolveSelectedSystemsFromCanonLayer = (
  layerId: string,
  corpus: readonly CompactSearchEntry[],
  activeLayers: readonly DatasetLayerManifest[] = SEED_FICTIONAL_CANON_LAYERS,
): readonly SpatialEntityDefinition[] => {
  const layer = findCanonLayerById(layerId, activeLayers);
  if (!layer) {
    return [];
  }

  const systemsById = new Map<string, SpatialEntityDefinition>();

  for (const entry of Object.values(layer.entries)) {
    const systemId = entry.systemId || entry.targetId;
    if (!systemId || systemsById.has(systemId)) {
      continue;
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
    } else if (systemId === 'sol') {
      systemsById.set('sol', {
        id: 'sol',
        name: 'Sol',
        position: [0, 0, 0],
        classification: 'stellar-system',
        spectralType: 'G2V',
      });
    } else {
      const fallbackName =
        entry.targetType === 'system' && entry.inUniverseName
          ? entry.inUniverseName
          : formatSlugFallbackTitle(systemId);
      systemsById.set(systemId, {
        id: systemId,
        name: fallbackName,
        position: [0, 0, 0],
        classification: 'stellar-system',
      });
    }
  }

  return Array.from(systemsById.values());
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
    return {
      id: matched.i,
      name: resolveResultDisplayTitle(matched),
      position: matched.p
        ? [matched.p[0], matched.p[1], matched.p[2]]
        : [0, 0, 0],
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



