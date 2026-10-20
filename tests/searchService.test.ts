import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { SpatialEntityProvider } from '../src/components/canvas/entity/SpatialEntityContext';
import { createSpatialEntityStore } from '../src/components/canvas/entity/SpatialEntityStore';
import {
  BodiesPanel,
  Breadcrumbs,
  CanvasLayer,
  ControlBar,
  DetailsPanel,
  Minimap,
  OrbitalSchematicItem,
  OrbitalSchematicList,
  OrbitalSchematicPanel,
  PreviewPanel,
  SearchResultItem,
  formatPlanetCountSummary,
} from '../src/components/domain';
import { shouldDisplaySpectralBadge } from '../src/components/interface';
import { Search } from '../src/components/search';
import {
  clearDetailsRepositoryCache,
  decodeDetailRecord,
  fetchDetailRecord,
  fetchSummaryNode,
  getCachedDetailRecord,
  getCachedExoplanetFromSystem,
  getCachedSummaryNode,
} from '../src/data/detailsRepository';
import {
  clearSearchRepositoryCache,
  fetchSearchShard,
  getCachedCorpusForFilter,
  loadSearchCorpusForFilter,
  mergeSearchShards,
} from '../src/data/searchRepository';
import {
  buildCenterEntityHref,
  buildFocusedEntityDetails,
  buildFocusedPreviewSummary,
  buildIntrinsicSystemSummary,
  buildPlanetCompositionSummary,
  buildPlanetDetailsHref,
  buildPlanetElementFocusHref,
  buildPlanetaryBodiesSummary,
  buildPlanetaryOrbitalSchematic,
  buildPlanetMinimapOrientation,
  buildPlanetViewBreadcrumbs,
  buildSystemDetailsHref,
  buildSystemElementFocusHref,
  buildSystemBodiesSummary,
  buildSystemMinimapOrientation,
  buildSystemOrbitalSchematic,
  buildSystemViewBreadcrumbs,
  classifyExoplanetComposition,
  extractUrlSceneCameraState,
  isExoplanetHabitableCandidate,
  resolveCanonLayerKindPriority,
  resolveFocusedCanonAnnotations,
  sortCanonAnnotations,
  buildGalaxyMinimapOrientation,
  type FocusedPreviewSummary,
  type MinimapOrientationSummary,
  type OrbitalSchematicSummary,
  type PlanetaryBodiesSummary,
  type SceneCameraUrlState,
  type SystemBodiesSummary,
} from '../src/services/detailsService';
import {
  METRICS_GUIDE_PATH,
  PLANET_TYPES_GUIDE_PATH,
  SEARCH_CATEGORIES,
  STAR_TYPES_GUIDE_PATH,
  buildLayerGalaxyHref,
  buildCollectionGalaxyHref,
  buildMetricGuideHref,
  buildPlanetTypeGalaxyHref,
  buildPlanetTypeGuideHref,
  buildResultTargetLink,
  buildEntityOrbitTargetHref,
  extractUrlSelectSlugs,
  buildSearchViewHref,
  buildStarTypeGalaxyHref,
  buildStarTypeGuideHref,
  buildTagGalaxyHref,
  buildUpdatedSearchUrl,
  compareSearchResultItems,
  doesSystemEntryMatchTag,
  executeCatalogSearch,
  extractUrlLayerId,
  extractUrlFocusSlug,
  extractUrlPlanetSlug,
  extractUrlSystemSlug,
  extractUrlTagFocus,
  findCanonLayerById,
  findFocusedEntryInCorpus,
  formatSlugFallbackTitle,
  hasExplicitFocusParam,
  isArtificialSpacecraftEntry,
  isCatalogOrCanonTag,
  isChildOfHostSystem,
  isSearchCategoryFilter,
  normaliseSearchQuery,
  parseSearchUrlParams,
  parseUrlSelectTokens,
  resolveEntityKind,
  resolveEntryCategory,
  resolveFocusedEntityFromCorpus,
  resolveResultDisplayTitle,
  resolveResultSystemTitle,
  resolveReticleType,
  resolveSelectedSystemsFromLayer,
  resolveSelectedSystemsFromCollection,
  resolveSelectedSystemsFromPlanetType,
  resolveSelectedSystemsFromSearchResults,
  resolveSelectedSystemsFromStarType,
  resolveSelectedSystemsFromTag,
  resolveSelectedSystemsFromUrlSelect,
  scoreSearchEntry,
  toSearchResultItem,
  SEED_CURATED_COLLECTIONS,
  QUERY_CLEAN_KEY_TO_TAG_SLUG,
} from '../src/services/searchService';
import {
  SYSTEM_TAG_BITS,
  type CompactSearchEntry,
} from '../src/utils/compactDataCodec';
import { GalaxyView } from '../src/views/GalaxyView';
import {
  MetricDetailView,
  extractMetricIdFromPathname,
} from '../src/views/MetricDetailView';
import { MetricsListView } from '../src/views/MetricsListView';
import {
  PlanetTypeDetailView,
  extractPlanetTypeFromPathname,
} from '../src/views/PlanetTypeDetailView';
import { PlanetTypesListView } from '../src/views/PlanetTypesListView';
import { PlanetView } from '../src/views/PlanetView';
import { SearchView } from '../src/views/SearchView';
import {
  StarTypeDetailView,
  extractStarTypeFromPathname,
} from '../src/views/StarTypeDetailView';
import { StarTypesListView } from '../src/views/StarTypesListView';
import { SystemView } from '../src/views/SystemView';

const SAMPLE_CORPUS: readonly CompactSearchEntry[] = [
  {
    i: 'sol',
    n: 'Sol',
    m: [-26.74, 'G2V', 8, 1],
    h: 1,
    a: 'sol sun',
  },
  {
    i: 'gaia-2452378776434477184',
    n: 'Tau Ceti',
    p: [-3.1, -0.4, -2.0],
    m: [3.5, 'G8V', 4, 1],
    a: 'tauceti hd10700 hip8102 gl71',
  },
  {
    i: 'gaia-3195919528989223040',
    n: 'Keid',
    p: [-2.5, -3.6, -2.4],
    m: [4.43, 'K0.5V', 1],
    a: 'keid omicron2eridani 40eridani hd26965 hip19849',
  },
  {
    i: 'tau-ceti-e',
    k: 2,
    n: 'tau Ceti e',
    s: 'gaia-2452378776434477184',
    p: [-3.1, -0.4, -2.0],
    r: 3,
    z: 1,
    a: 'taucetie',
  },
  {
    i: 'earth',
    k: 2,
    n: 'Earth',
    s: 'sol',
    h: 1,
    r: 3,
    z: 1,
    a: 'earth',
  },
  {
    i: 'moon',
    k: 3,
    n: 'Moon',
    s: 'sol',
    o: 'earth',
    h: 1,
    r: 1,
    a: 'moon luna',
  },
  {
    i: 'pluto',
    k: 4,
    n: 'Pluto',
    s: 'sol',
    h: 1,
    r: 10,
    e: 'kuiper',
    a: 'pluto 134340pluto',
  },
  {
    i: 'ngc-1976',
    k: 5,
    n: 'Orion Nebula',
    p: [-340, -210, -130],
    a: 'orionnebula m42 ngc1976',
  },
  {
    i: 'mpc-433',
    k: 6,
    n: '433 Eros',
    s: 'sol',
    h: 1,
    r: 6,
    e: 'belt',
    a: '433eros eros',
  },
  {
    i: 'canon-project-hail-mary:gaia-2452378776434477184',
    k: 7,
    n: 'Tau Ceti (Astrophage Destination)',
    s: 'gaia-2452378776434477184',
    w: 'canon-project-hail-mary',
    c: 'Project Hail Mary',
    p: [-3.1, -0.4, -2.0],
    a: 'taucetiastrophagedestination projecthailmary hailmary astrophage petrova',
  },
  {
    i: 'canon-project-hail-mary:tau-ceti-e',
    k: 7,
    n: 'Adrian',
    s: 'gaia-2452378776434477184',
    w: 'canon-project-hail-mary',
    c: 'Project Hail Mary',
    p: [-3.1, -0.4, -2.0],
    a: 'adrian projecthailmary taumoebaworld taumoeba',
  },
  {
    i: 'canon-star-trek:vulcan',
    k: 7,
    n: 'Vulcan (NiVar)',
    s: 'gaia-3195919528989223040',
    w: 'canon-star-trek',
    c: 'Star Trek Canon',
    p: [-2.5, -3.6, -2.4],
    a: 'vulcannivar startrekcanon vulcan nivar tkhasi federation',
  },
  {
    i: 'ceres',
    k: 4,
    n: 'Ceres',
    s: 'sol',
    h: 1,
    r: 5,
    e: 'belt',
    a: 'ceres 1ceres',
  },
  {
    i: 'tau-ceti-g',
    k: 2,
    n: 'tau Ceti g',
    s: 'gaia-2452378776434477184',
    p: [-3.1, -0.4, -2.0],
    r: 1,
    a: 'taucetig',
  },
  {
    i: 'tau-ceti-h',
    k: 2,
    n: 'tau Ceti h',
    s: 'gaia-2452378776434477184',
    p: [-3.1, -0.4, -2.0],
    r: 2,
    a: 'taucetih',
  },
  {
    i: 'tau-ceti-f',
    k: 2,
    n: 'tau Ceti f',
    s: 'gaia-2452378776434477184',
    p: [-3.1, -0.4, -2.0],
    r: 4,
    z: 1,
    a: 'taucetif',
  },
  {
    i: 'voyager-1',
    k: 6,
    n: 'Voyager 1',
    s: 'sol',
    h: 1,
    r: 10,
    e: 'kuiper',
    u: 'construct',
    a: 'voyager1 voyager',
  },
];

describe('searchService (Pure Service Layer)', () => {
  it('exposes the 5 canonical search categories in display order', () => {
    expect(SEARCH_CATEGORIES.map((c) => c.key)).toEqual([
      'stars',
      'planets',
      'structures',
      'minor-bodies',
      'layers',
    ]);
    const layersMeta = SEARCH_CATEGORIES.find((c) => c.key === 'layers');
    expect(layersMeta?.label).toBe('Curated Layers & Canons');
    expect(layersMeta?.shard).toBe('layers.json');
  });

  it('maps CompactSearchEntry kind codes to the 5 search categories and entity kinds', () => {
    expect(resolveEntryCategory(SAMPLE_CORPUS[0])).toBe('stars');
    expect(resolveEntityKind(SAMPLE_CORPUS[0])).toBe('star-system');

    expect(resolveEntryCategory(SAMPLE_CORPUS[3])).toBe('planets');
    expect(resolveEntityKind(SAMPLE_CORPUS[3])).toBe('planet');

    expect(resolveEntryCategory(SAMPLE_CORPUS[5])).toBe('planets');
    expect(resolveEntityKind(SAMPLE_CORPUS[5])).toBe('moon');

    expect(resolveEntryCategory(SAMPLE_CORPUS[6])).toBe('planets');
    expect(resolveEntityKind(SAMPLE_CORPUS[6])).toBe('dwarf-planet');

    expect(resolveEntryCategory(SAMPLE_CORPUS[7])).toBe('structures');
    expect(resolveEntityKind(SAMPLE_CORPUS[7])).toBe('galactic-structure');

    expect(resolveEntryCategory(SAMPLE_CORPUS[8])).toBe('minor-bodies');
    expect(resolveEntityKind(SAMPLE_CORPUS[8])).toBe('minor-body');

    expect(resolveEntryCategory(SAMPLE_CORPUS[9])).toBe('layers');
    expect(resolveEntityKind(SAMPLE_CORPUS[9])).toBe('fictional-entry');

    // Parent layer manifest entry (k=7, without host systemId) maps to entityKind 'layer'
    const parentLayerEntry: CompactSearchEntry = {
      i: 'canon-project-hail-mary',
      k: 7,
      n: 'Project Hail Mary',
      w: 'canon-project-hail-mary',
    };
    expect(resolveEntryCategory(parentLayerEntry)).toBe('layers');
    expect(resolveEntityKind(parentLayerEntry)).toBe('layer');
  });

  it('normalises and expands astronomical Bayer/Flamsteed shorthand in queries', () => {
    const normTau = normaliseSearchQuery('Tau Cet');
    expect(normTau.expandedLower).toBe('tau ceti');
    expect(normTau.cleanKey).toBe('tauceti');

    const norm40Eri = normaliseSearchQuery('40 Eri');
    expect(norm40Eri.expandedLower).toBe('40 eridani');
    expect(norm40Eri.cleanKey).toBe('40eridani');
  });

  it('scores exact, alias, ID, prefix, substring, and multi-token matches deterministically', () => {
    const exactQuery = normaliseSearchQuery('Tau Ceti');
    expect(scoreSearchEntry(SAMPLE_CORPUS[1], exactQuery)).toBe(1000);
    expect(scoreSearchEntry(SAMPLE_CORPUS[3], exactQuery)).toBe(750);
    expect(scoreSearchEntry(SAMPLE_CORPUS[7], exactQuery)).toBe(0);

    const idQuery = normaliseSearchQuery('ngc-1976');
    expect(scoreSearchEntry(SAMPLE_CORPUS[7], idQuery)).toBeGreaterThanOrEqual(850);

    const multiTokenQuery = normaliseSearchQuery('Star Trek NiVar');
    expect(scoreSearchEntry(SAMPLE_CORPUS[11], multiTokenQuery)).toBe(450);
  });

  it('executes a catalog search across all categories and includes child entities of matched systems', () => {
    const results = executeCatalogSearch(SAMPLE_CORPUS, {
      query: '40 Eri',
      filter: 'all',
    });

    expect(results.totalMatches).toBeGreaterThanOrEqual(2);
    expect(results.groups.stars.items.map((i) => i.name)).toContain('Keid');
    expect(results.groups.layers.items.map((i) => i.name)).toContain('Vulcan (NiVar)');
  });

  it('matches fictional canon entries by work/franchise title', () => {
    const results = executeCatalogSearch(SAMPLE_CORPUS, {
      query: 'Project Hail Mary',
      filter: 'all',
    });

    expect(results.groups.layers.totalMatches).toBe(2);
    expect(results.groups.layers.items.map((i) => i.name)).toEqual(
      expect.arrayContaining(['Tau Ceti (Astrophage Destination)', 'Adrian']),
    );
  });

  it('restricts results to the selected category when a specific filter is applied', () => {
    const results = executeCatalogSearch(SAMPLE_CORPUS, {
      query: 'Tau Ceti',
      filter: 'planets',
    });

    expect(results.groups.stars.items).toHaveLength(0);
    expect(results.groups.layers.items).toHaveLength(0);
    expect(results.groups.planets.items.map((i) => i.name)).toEqual(
      expect.arrayContaining(['tau Ceti e', 'tau Ceti g', 'tau Ceti h', 'tau Ceti f']),
    );
  });

  it('returns empty groups when the query is blank', () => {
    const results = executeCatalogSearch(SAMPLE_CORPUS, {
      query: '   ',
      filter: 'all',
    });

    expect(results.totalMatches).toBe(0);
    for (const cat of SEARCH_CATEGORIES) {
      expect(results.groups[cat.key].items).toHaveLength(0);
    }
  });

  it('resolves Greek Bayer, numbered Bayer, and two-word constellation queries with top score (>= 900)', () => {
    const searchCorpus: CompactSearchEntry[] = [
      ...SAMPLE_CORPUS,
      {
        i: 'gaia-alpha-cen',
        n: 'Alpha Centauri',
        p: [-1.3, 0.0, 0.0],
        a: 'alphacentauri rigilkentaurus',
      },
      {
        i: 'gaia-sirius',
        n: 'Sirius',
        p: [-2.6, 0.0, 0.0],
        a: 'sirius alphacanismajoris',
      },
    ];

    const testQueries = [
      { q: 'τ Cet', expectedName: 'Tau Ceti', minScore: 900 },
      { q: 'τ Ceti', expectedName: 'Tau Ceti', minScore: 900 },
      { q: 'α Cen', expectedName: 'Alpha Centauri', minScore: 900 },
      { q: 'omi 2 Eridani', expectedName: 'Keid', minScore: 900 },
      { q: 'alp Canis Majoris', expectedName: 'Sirius', minScore: 900 },
    ];

    for (const { q, expectedName, minScore } of testQueries) {
      const results = executeCatalogSearch(searchCorpus, {
        query: q,
        filter: 'stars',
      });
      const topStar = results.groups.stars.items[0];
      expect(topStar, `Query "${q}" should produce a top star match`).toBeDefined();
      expect(topStar?.name).toBe(expectedName);
      expect(topStar?.score).toBeGreaterThanOrEqual(minScore);
    }
  });
});

describe('searchRepository (Data Repository Layer)', () => {
  it('merges shards and deduplicates by entry ID', () => {
    const merged = mergeSearchShards([
      [SAMPLE_CORPUS[0], SAMPLE_CORPUS[1]],
      [SAMPLE_CORPUS[1], SAMPLE_CORPUS[2]],
    ]);
    expect(merged).toHaveLength(3);
    expect(merged.map((e) => e.i)).toEqual([
      'sol',
      'gaia-2452378776434477184',
      'gaia-3195919528989223040',
    ]);
  });

  it('fetches and validates search shards via custom fetcher', async () => {
    clearSearchRepositoryCache();
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        i: 'search-layers',
        n: 'Layers',
        c: 2,
        t: '2026-10-17T00:00:00Z',
        d: [SAMPLE_CORPUS[9], SAMPLE_CORPUS[10]],
      }),
    });

    const entries = await loadSearchCorpusForFilter(
      'layers',
      mockFetch as unknown as typeof fetch,
    );
    expect(mockFetch).toHaveBeenCalledWith('/data/search/layers.json');
    expect(entries).toHaveLength(2);
  });

  it('loads core, structures, and minor-bodies shards in parallel when filter is all', async () => {
    clearSearchRepositoryCache();
    const mockFetch = vi.fn().mockImplementation(async (url: string) => ({
      ok: true,
      status: 200,
      json: async () => ({
        i: url,
        n: url,
        c: 1,
        t: '2026-10-17T00:00:00Z',
        d: url.includes('minor-bodies')
          ? [SAMPLE_CORPUS[8]]
          : url.includes('structures')
            ? [SAMPLE_CORPUS[7]]
            : [SAMPLE_CORPUS[0]],
      }),
    }));

    const entries = await loadSearchCorpusForFilter(
      'all',
      mockFetch as unknown as typeof fetch,
    );
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(entries.map((e) => e.i)).toEqual(['sol', 'ngc-1976', 'mpc-433']);
  });

  it('throws a descriptive error when shard fetch fails or returns invalid schema', async () => {
    const failingFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    });

    await expect(
      fetchSearchShard('layers', failingFetch as unknown as typeof fetch),
    ).rejects.toThrow(/Failed to load search shard "layers"/);

    const invalidSchemaFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ invalid: true }),
    });

    await expect(
      fetchSearchShard('layers', invalidSchemaFetch as unknown as typeof fetch),
    ).rejects.toThrow(/Invalid search index envelope/);
  });
});

describe('Search Compound Component Boundary (<Search.Root>, <Search.Panel>, <Search.Results>, <SearchResultItem>)', () => {
  it('renders populated search results with domain SearchResultItem, clean galaxy URLs, reticle types, spectral/planet summaries, and zero pc numbers', () => {
    const html = renderToString(
      createElement(
        Search.Root,
        {
          initialCorpus: SAMPLE_CORPUS,
          initialQuery: 'Tau Ceti',
          initialFilter: 'all',
        },
        createElement(Search.Panel),
        createElement(Search.Results, {
          renderItem: (result) =>
            createElement(Search.ResultItem, {
              key: result.id,
              result,
            }),
        }),
      ),
    );

    expect(html).toContain('data-status="ready"');
    expect(html).toContain('data-testid="search-result-item"');
    expect(html).toContain('Tau Ceti');
    expect(html).toContain('tau Ceti e');
    expect(html).toContain('Tau Ceti (Astrophage Destination)');
    expect(html).toContain('Adrian');
    expect(html).toContain('stellar-system');
    expect(html).toContain('terrestrial');
    expect(html).toContain('data-testid="result-variation-stars"');
    expect(html).toContain('data-testid="result-spectral-badge"');
    expect(html).toContain('data-spectral-badge="G8V"');
    expect(html).toContain('href="/guide/star-types/G8V"');
    expect(html).toContain('data-testid="result-planet-summary"');
    expect(html).toContain('>4</span>');
    expect(html).toContain('planets</span>');
    expect(html).toContain('data-testid="result-variation-planets"');
    expect(html).toContain('data-testid="result-variation-layers"');
    expect(html).not.toContain(' pc');
    // System links to /galaxy/<systemname>, child items link to /system/<systemname>?focus=<itemname> (DEC-038)
    expect(html).toContain('href="/galaxy/tau-ceti"');
    expect(html).toContain('href="/system/tau-ceti?focus=tau-ceti-e"');
    expect(html).toContain(
      'href="/system/tau-ceti?focus=adrian&amp;select=layer:project-hail-mary&amp;layer=project-hail-mary:adrian"',
    );
  });

  it('routes Solar System child bodies to /system/sol?focus=<itemname>', () => {
    const html = renderToString(
      createElement(
        Search.Root,
        {
          initialCorpus: SAMPLE_CORPUS,
          initialQuery: 'Earth',
          initialFilter: 'all',
        },
        createElement(Search.Panel),
        createElement(Search.Results),
      ),
    );

    expect(html).toContain('href="/system/sol?focus=earth"');
    expect(html).toContain('terrestrial');
  });

  it('truncates results per category when limitPerCategory is set, renders filtered /search links under populated headings, and omits empty category sections', () => {
    const html = renderToString(
      createElement(
        Search.Root,
        {
          initialCorpus: SAMPLE_CORPUS,
          initialQuery: 'Sol',
          initialFilter: 'all',
          limitPerCategory: 2,
        },
        createElement(Search.Panel),
        createElement(Search.Results, {
          searchViewPath: '/search',
        }),
      ),
    );

    // SAMPLE_CORPUS has Solar System planets/moons/dwarf-planets (Ceres, Earth, Moon, Pluto); limitPerCategory=2 truncates to first 2 alphabetically (Ceres, Earth)
    expect(html).toContain('Ceres');
    expect(html).toContain('Earth');
    expect(html).not.toContain('Pluto');
    expect(html).toContain('href="/search?q=Sol"');
    expect(html).toContain('href="/search?q=Sol&amp;searchCategory=stars"');
    expect(html).toContain('href="/search?q=Sol&amp;searchCategory=planets"');
    // Empty categories for query "Sol" (structures, minor-bodies, layers) are omitted completely
    expect(html).not.toContain('data-testid="search-results-group-structures"');
    expect(html).not.toContain('data-testid="search-results-group-minor-bodies"');
    expect(html).not.toContain('data-testid="search-results-group-layers"');
    expect(html).not.toContain('No matching results.');
  });

  it('supports composing <Search.Input /> (always bundled with Clear search button) without <Search.CategoryFilter /> for hardcoded/locked-category contexts', () => {
    const html = renderToString(
      createElement(
        Search.Root,
        {
          initialCorpus: SAMPLE_CORPUS,
          initialQuery: 'Tau',
          initialFilter: 'stars',
          syncUrl: false,
        },
        createElement(Search.Panel, null, createElement(Search.Input)),
        createElement(Search.Results),
      ),
    );

    expect(html).toContain('id="starmap-search-input"');
    expect(html).toContain('data-testid="search-clear-button"');
    expect(html).not.toContain('id="starmap-search-filter"');
    expect(html).toContain('Tau Ceti');
    expect(html).not.toContain('tau Ceti e');
  });

  it('evaluates dedicated searchService hooks, reticle taxonomy, URL state helpers, and SearchResultItem formatters', async () => {
    // 1. isSearchCategoryFilter
    expect(isSearchCategoryFilter('all')).toBe(true);
    expect(isSearchCategoryFilter('stars')).toBe(true);
    expect(isSearchCategoryFilter('planets')).toBe(true);
    expect(isSearchCategoryFilter('invalid')).toBe(false);
    expect(isSearchCategoryFilter(null)).toBe(false);

    // 2. isChildOfHostSystem & isArtificialSpacecraftEntry
    expect(isChildOfHostSystem('earth', 'sol')).toBe(true);
    expect(isChildOfHostSystem('sol', 'sol')).toBe(false);
    expect(isChildOfHostSystem('phm:tau-ceti', 'tau-ceti')).toBe(false);
    expect(isChildOfHostSystem('earth', undefined)).toBe(false);

    expect(
      isArtificialSpacecraftEntry({
        i: 'voyager-1',
        k: 6,
        n: 'Voyager 1',
        u: 'construct',
      }),
    ).toBe(true);
    expect(
      isArtificialSpacecraftEntry({
        i: 'custom-probe',
        k: 6,
        n: 'Custom Probe',
        a: 'customprobe spacecraft',
      }),
    ).toBe(true);
    expect(isArtificialSpacecraftEntry({ i: '433-eros', k: 6, n: '433 Eros' })).toBe(false);

    // 3. resolveResultDisplayTitle & resolveResultSystemTitle
    expect(resolveResultDisplayTitle({ i: 'sol', n: '  Sol  ' })).toBe('Sol');
    expect(resolveResultDisplayTitle({ i: 'fallback-id', n: '   ' })).toBe('fallback-id');
    const sysMap = new Map<string, string>([['sol', 'Sol']]);
    expect(resolveResultSystemTitle({ i: 'earth', k: 2, n: 'Earth', s: 'sol' }, sysMap)).toBe('Sol');
    expect(resolveResultSystemTitle({ i: 'sol', n: 'Sol' }, sysMap)).toBeUndefined();

    // 4. resolveReticleType across all branches
    expect(resolveReticleType({ i: 's1', n: 'WD', m: [11, 'DA2', 0] })).toBe('white-dwarf');
    expect(resolveReticleType({ i: 's2', n: 'BD', m: [16, 'T8', 0] })).toBe('brown-dwarf');
    expect(resolveReticleType({ i: 's3', n: 'PSR', m: [20, 'PSR', 0] })).toBe('neutron-star');
    expect(resolveReticleType({ i: 'jupiter', k: 2, n: 'Jupiter', u: 'gas-giant' })).toBe('gas-giant');
    expect(resolveReticleType({ i: 'neptune', k: 2, n: 'Neptune', u: 'ice-giant' })).toBe('ice-giant');
    expect(resolveReticleType({ i: 'snr-crab', k: 5, n: 'Crab Remnant' })).toBe('hazard');
    expect(resolveReticleType({ i: 'voyager-1', k: 6, n: 'Voyager 1', u: 'construct' })).toBe('construct');
    expect(resolveReticleType({ i: '433-eros', k: 6, n: '433 Eros' })).toBe('terrestrial');
    expect(
      resolveReticleType({ i: 'phm:tau-ceti', k: 7, n: 'Tau Ceti', s: 'tau-ceti' }),
    ).toBe('stellar-system');

    // 5. buildResultTargetLink & buildSearchViewHref & URL state helpers (DEC-038 Orbit-Context)
    expect(
      buildResultTargetLink({
        id: 'tau-ceti-e',
        name: 'tau Ceti e',
        systemId: 'gaia-123',
      }),
    ).toEqual({
      targetView: 'system',
      href: '/system/gaia-123?focus=tau-ceti-e',
    });
    expect(buildSearchViewHref('   ', 'all')).toBe('/search');
    expect(parseSearchUrlParams('?q=Voyager&searchCategory=minor-bodies')).toEqual({
      query: 'Voyager',
      filter: 'minor-bodies',
    });
    expect(parseSearchUrlParams('?searchCategory=unknown', 'Sol', 'stars')).toEqual({
      query: 'Sol',
      filter: 'stars',
    });
    expect(
      buildUpdatedSearchUrl('/search', '?foo=bar', '#top', 'Tau Ceti', 'planets'),
    ).toBe('/search?foo=bar&q=Tau+Ceti&searchCategory=planets#top');
    expect(
      buildUpdatedSearchUrl('/search', '?q=Old&searchCategory=stars', '', '   ', 'all'),
    ).toBe('/search');

    // 6. compareSearchResultItems & scoreSearchEntry edge cases
    expect(scoreSearchEntry({ i: 'sol', n: 'Sol' }, normaliseSearchQuery('   '))).toBe(0);
    expect(
      scoreSearchEntry({ i: 'tau-ceti', n: 'Tau Ceti' }, normaliseSearchQuery('TauCeti')),
    ).toBe(950);
    const itemA = toSearchResultItem(
      { i: 'a', n: 'Alpha', p: [3, 4, 0] },
      800,
    );
    const itemB = toSearchResultItem(
      { i: 'b', n: 'Beta', p: [6, 8, 0] },
      800,
    );
    const itemB2 = toSearchResultItem(
      { i: 'b2', n: 'Gamma', p: [3, 4, 0] },
      800,
    );
    expect(compareSearchResultItems(itemA, itemB)).toBeLessThan(0);
    expect(compareSearchResultItems(itemA, itemB2)).toBeLessThan(0);

    // 7. executeCatalogSearch with systemEntries relational lookup
    const relResults = executeCatalogSearch(
      [
        {
          i: 'tau-ceti-e',
          k: 2,
          n: 'Planet E',
          s: 'sys-tau-ceti',
          a: 'planete',
        },
      ],
      {
        query: 'Tau Ceti',
        filter: 'planets',
        systemEntries: [
          {
            i: 'sys-tau-ceti',
            n: 'Tau Ceti',
            a: 'tauceti',
          },
        ],
      },
    );
    expect(relResults.groups.planets.items.map((i) => i.id)).toContain('tau-ceti-e');
    expect(relResults.groups.planets.items[0]?.systemName).toBe('Tau Ceti');

    // 8. SearchResultItem domain helpers & variation branches
    expect(shouldDisplaySpectralBadge(undefined)).toBe(false);
    expect(shouldDisplaySpectralBadge('Unknown')).toBe(false);
    expect(shouldDisplaySpectralBadge('G2V')).toBe(true);
    expect(formatPlanetCountSummary(undefined)).toBeNull();
    expect(formatPlanetCountSummary(0)).toBeNull();
    expect(formatPlanetCountSummary(1)).toBe('1 planet');
    expect(formatPlanetCountSummary(4)).toBe('4 planets');

    const starNoMeta = toSearchResultItem({ i: 's-bare', n: 'Bare Star', m: [-1, 'Unknown', 0] }, 900);
    const starOnePlanet = toSearchResultItem({ i: 's-one', n: 'One Planet Star', m: [4, 'K1V', 1] }, 900);
    const layerNoCanon = toSearchResultItem({ i: 'f-bare', k: 7, n: 'Mystery World' }, 900);

    expect(renderToString(createElement(SearchResultItem, { result: starNoMeta }))).not.toContain(
      'data-testid="result-variation-stars"',
    );
    expect(renderToString(createElement(SearchResultItem, { result: starOnePlanet }))).toContain(
      'data-testid="result-planet-summary"',
    );
    expect(renderToString(createElement(SearchResultItem, { result: starOnePlanet }))).toContain(
      '>1</span>',
    );
    expect(renderToString(createElement(SearchResultItem, { result: starOnePlanet }))).toContain(
      'planet</span>',
    );
    expect(renderToString(createElement(SearchResultItem, { result: layerNoCanon }))).toContain(
      '<span data-testid="result-variation-layers"></span>',
    );

    // 9. getCachedCorpusForFilter & shard cache eviction on failure
    clearSearchRepositoryCache();
    expect(getCachedCorpusForFilter('all')).toBeUndefined();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        i: 'test',
        n: 'Test',
        c: 1,
        t: '2026-10-16T00:00:00Z',
        d: [{ i: 'sol', n: 'Sol' }],
      }),
    })) as unknown as typeof fetch;
    try {
      await fetchSearchShard('core');
      await fetchSearchShard('structures');
      await fetchSearchShard('minor-bodies');
      expect(getCachedCorpusForFilter('all')).toHaveLength(1);
      // Subsequent loadSearchCorpusForFilter('all') hits the resolvedFilterCache fast-path
      expect(await loadSearchCorpusForFilter('all')).toHaveLength(1);

      await loadSearchCorpusForFilter('stars');
      expect(getCachedCorpusForFilter('stars')).toHaveLength(1);
      clearSearchRepositoryCache();
      await fetchSearchShard('planets');
      expect(getCachedCorpusForFilter('planets')).toHaveLength(1);

      clearSearchRepositoryCache();
      globalThis.fetch = vi.fn(async () => ({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })) as unknown as typeof fetch;
      await expect(fetchSearchShard('core')).rejects.toThrow('500');
    } finally {
      globalThis.fetch = originalFetch;
      clearSearchRepositoryCache();
    }
  });

  it('resolves selected systems from both direct system results and non-system results (planets, minor bodies, fiction)', () => {
    // Direct star system + child planets/fiction in Tau Ceti deduplicate to Tau Ceti
    const tauResults = executeCatalogSearch(SAMPLE_CORPUS, {
      query: 'Tau Ceti',
      filter: 'all',
    });
    const tauSelected = resolveSelectedSystemsFromSearchResults(tauResults);
    expect(tauSelected).toEqual([
      {
        id: 'gaia-2452378776434477184',
        name: 'Tau Ceti',
        position: [-3.1, -0.4, -2.0],
        classification: 'stellar-system',
        spectralType: 'G8V',
      },
    ]);

    // Non-system minor body ("433 Eros") resolves its parent system ("Sol")
    const erosResults = executeCatalogSearch(SAMPLE_CORPUS, {
      query: '433 Eros',
      filter: 'all',
    });
    const erosSelected = resolveSelectedSystemsFromSearchResults(erosResults);
    expect(erosSelected).toEqual([
      {
        id: 'sol',
        name: 'Sol',
        position: [0, 0, 0],
        classification: 'stellar-system',
      },
    ]);

    // Non-system fictional planet ("Vulcan") with filter='layers' resolves parent system ("Keid")
    const vulcanResults = executeCatalogSearch(SAMPLE_CORPUS, {
      query: 'Vulcan',
      filter: 'layers',
    });
    const vulcanSelected = resolveSelectedSystemsFromSearchResults(vulcanResults);
    expect(vulcanSelected).toEqual([
      {
        id: 'gaia-3195919528989223040',
        name: 'Keid',
        position: [-2.5, -3.6, -2.4],
        classification: 'stellar-system',
      },
    ]);

    // Non-system child body without systemName falls back to systemId and [0,0,0] when position is absent
    const orphanChildResults = executeCatalogSearch(
      [
        {
          i: 'orphan-planet',
          k: 2,
          n: 'Orphan Planet',
          s: 'custom-sys-1',
          a: 'orphanplanet',
        },
      ],
      { query: 'Orphan Planet' },
    );
    expect(resolveSelectedSystemsFromSearchResults(orphanChildResults)).toEqual([
      {
        id: 'custom-sys-1',
        name: 'custom-sys-1',
        position: [0, 0, 0],
        classification: 'stellar-system',
      },
    ]);

    // Galactic structure without systemId produces no selected star system
    const nebulaResults = executeCatalogSearch(SAMPLE_CORPUS, {
      query: 'Orion Nebula',
      filter: 'structures',
    });
    expect(resolveSelectedSystemsFromSearchResults(nebulaResults)).toEqual([]);

    // Empty search produces no selected systems
    const emptyResults = executeCatalogSearch(SAMPLE_CORPUS, { query: '' });
    expect(resolveSelectedSystemsFromSearchResults(emptyResults)).toEqual([]);
  });

  it('extracts URL focus slugs and resolves focused entities from corpus or fallback', () => {
    expect(extractUrlFocusSlug('/galaxy/tau-ceti', '')).toBe('tau-ceti');
    expect(extractUrlFocusSlug('/galaxy/tau-ceti', '?focus=tau-ceti-e')).toBe('tau-ceti-e');
    expect(extractUrlFocusSlug('/system/sol', '?focus=earth')).toBe('earth');
    expect(extractUrlFocusSlug('/galaxy/---', '?focus=---')).toBeNull();
    expect(extractUrlFocusSlug('/', '')).toBeNull();
    expect(extractUrlFocusSlug('/galaxy', '?q=Tau+Ceti')).toBeNull();
    expect(extractUrlFocusSlug('/search', '?q=Tau+Ceti')).toBeNull();

    expect(formatSlugFallbackTitle('tau-ceti')).toBe('Tau Ceti');
    expect(findFocusedEntryInCorpus('   ', SAMPLE_CORPUS)).toBeUndefined();
    expect(resolveFocusedEntityFromCorpus('   ', SAMPLE_CORPUS)).toBeNull();

    // Resolves star system when slug matches both star system and child/fictional entry
    const focusedTau = resolveFocusedEntityFromCorpus('tau-ceti', SAMPLE_CORPUS);
    expect(focusedTau).toEqual({
      id: 'gaia-2452378776434477184',
      name: 'Tau Ceti',
      position: [-3.1, -0.4, -2.0],
      classification: 'stellar-system',
      spectralType: 'G8V',
    });

    // Resolves child planet when ?focus=tau-ceti-e is in URL
    const focusedPlanet = resolveFocusedEntityFromCorpus('tau-ceti-e', SAMPLE_CORPUS);
    expect(focusedPlanet).toEqual({
      id: 'tau-ceti-e',
      name: 'tau Ceti e',
      position: [-3.1, -0.4, -2.0],
      classification: 'terrestrial',
    });

    // Resolves body without explicit position (e.g. Earth in Sol) to [0, 0, 0]
    const focusedEarth = resolveFocusedEntityFromCorpus('earth', SAMPLE_CORPUS);
    expect(focusedEarth).toEqual({
      id: 'earth',
      name: 'Earth',
      position: [0, 0, 0],
      classification: 'terrestrial',
    });

    // Falls back cleanly when corpus is not yet loaded
    expect(resolveFocusedEntityFromCorpus('tau-ceti', [])).toEqual({
      id: 'tau-ceti',
      name: 'Tau Ceti',
      position: [0, 0, 0],
      classification: 'stellar-system',
    });
  });

  it('synchronizes focused and selected store states in GalaxyView without debug systems panel', () => {
    const store = createSpatialEntityStore();

    // 1. Searching on '/' selects matching systems and parent systems of non-system results, with nothing focused
    const searchHtml = renderToString(
      createElement(
        SpatialEntityProvider,
        { store },
        createElement(GalaxyView, {
          initialCorpus: SAMPLE_CORPUS,
          locationPathname: '/',
          locationSearch: '?q=Adrian',
        }),
      ),
    );

    expect(searchHtml).toContain('data-testid="galaxy-view-root"');
    expect(searchHtml).not.toContain('data-testid="systems-panel"');
    // "Adrian" is a fictional entry in the Tau Ceti system -> Tau Ceti becomes selected
    expect(store.getState().getEntitiesByState('selected').map((e) => e.name)).toEqual([
      'Tau Ceti',
    ]);
    expect(store.getState().getEntitiesByState('focused')).toEqual([]);
    // When nothing is focused, Details panel does not show at all
    expect(searchHtml).not.toContain('data-testid="details-panel"');

    // 2. Clicking through to '/galaxy/tau-ceti?focus=tau-ceti-e' clears selected (since ?q= is not in URL), focuses 'tau Ceti e', and renders Details panel
    const focusChildHtml = renderToString(
      createElement(
        SpatialEntityProvider,
        { store },
        createElement(GalaxyView, {
          initialCorpus: SAMPLE_CORPUS,
          locationPathname: '/galaxy/tau-ceti',
          locationSearch: '?focus=tau-ceti-e',
        }),
      ),
    );

    expect(store.getState().getEntitiesByState('selected')).toEqual([]);
    expect(store.getState().getEntitiesByState('focused').map((e) => e.name)).toEqual([
      'tau Ceti e',
    ]);
    expect(focusChildHtml).not.toContain('data-testid="systems-panel"');
    expect(focusChildHtml).toContain('data-testid="details-panel"');
    expect(focusChildHtml).toContain('<h2 id="details-panel-heading">Details</h2>');
    expect(focusChildHtml).toContain('<h3 id="details-peek-heading">Peek</h3>');
    expect(focusChildHtml).toContain('<h3 id="details-partial-heading">Partial</h3>');
    expect(focusChildHtml).toContain('<h3 id="details-full-heading">Full</h3>');
    expect(focusChildHtml).toContain('data-testid="details-button-system-details"');
    expect(focusChildHtml).toContain('href="/planet/tau-ceti-e"');
    expect(focusChildHtml).toContain('data-testid="details-button-directions"');
    expect(focusChildHtml).toContain('Project Hail Mary');
    expect(focusChildHtml).toContain('Adrian');

    // 3. Clicking through to '/galaxy/tau-ceti' focuses 'Tau Ceti' and shows Details panel with Peek, Partial, and Full detents
    const focusSystemHtml = renderToString(
      createElement(
        SpatialEntityProvider,
        { store },
        createElement(GalaxyView, {
          initialCorpus: SAMPLE_CORPUS,
          locationPathname: '/galaxy/tau-ceti',
          locationSearch: '',
        }),
      ),
    );

    expect(store.getState().getEntitiesByState('selected')).toEqual([]);
    expect(store.getState().getEntitiesByState('focused').map((e) => e.name)).toEqual([
      'Tau Ceti',
    ]);
    expect(focusSystemHtml).not.toContain('data-testid="systems-panel"');
    expect(focusSystemHtml).toContain('data-testid="details-panel"');
    expect(focusSystemHtml).toContain('data-testid="details-spectral-badge"');
    expect(focusSystemHtml).toContain('data-spectral-badge="G8V"');
    expect(focusSystemHtml).toContain('href="/guide/star-types/G8V"');
    expect(focusSystemHtml).toContain('data-testid="details-reticle-type"');
    expect(focusSystemHtml).toContain('stellar-system');
    expect(focusSystemHtml).toContain('>4</span>');
    expect(focusSystemHtml).toContain('planets</span>');
    expect(focusSystemHtml).toContain('data-testid="details-button-system-details"');
    expect(focusSystemHtml).toContain('href="/system/tau-ceti"');
    expect(focusSystemHtml).toContain('Directions');
    expect(focusSystemHtml).toContain('Tau Ceti (Astrophage Destination)');
    expect(focusSystemHtml).toContain('data-testid="details-canon-accordion"');

    // Verify DEC-022 detents: Peek contains systemSummary, Partial contains Canon, and Full contains Astrometry
    const peekSplit = focusSystemHtml.split('data-testid="details-detent-partial"')[0] ?? '';
    const partialSplit =
      focusSystemHtml
        .split('data-testid="details-detent-partial"')[1]
        ?.split('data-testid="details-detent-full"')[0] ?? '';
    const fullSplit =
      focusSystemHtml.split('data-testid="details-detent-full"')[1] ?? '';
    expect(peekSplit).toContain('data-testid="details-system-summary"');
    expect(partialSplit).toContain('data-testid="details-canon-section"');
    expect(fullSplit).toContain('data-testid="details-astrometry-section"');

    // 4. Navigating to '/galaxy' (nothing in URL) clears both focused and selected states and hides Details panel
    const cleanHtml = renderToString(
      createElement(
        SpatialEntityProvider,
        { store },
        createElement(GalaxyView, {
          initialCorpus: SAMPLE_CORPUS,
          locationPathname: '/galaxy',
          locationSearch: '',
        }),
      ),
    );

    expect(store.getState().getEntitiesByState('focused')).toEqual([]);
    expect(store.getState().getEntitiesByState('selected')).toEqual([]);
    expect(cleanHtml).not.toContain('data-testid="systems-panel"');
    expect(cleanHtml).not.toContain('data-testid="details-panel"');
  });

  it('evaluates detailsService builders, detailsRepository bucket lookups, and DetailsPanel decomposition across all branches', async () => {
    // 1. DetailsPanel returns null when details is null
    expect(renderToString(createElement(DetailsPanel, { details: null }))).toBe('');
    expect(buildFocusedEntityDetails({ focusedEntity: null })).toBeNull();
    expect(buildSystemDetailsHref('tau-ceti')).toBe('/system/tau-ceti');
    expect(buildSystemDetailsHref('')).toBe('/system/sol');

    // 2. classifyExoplanetComposition & isExoplanetHabitableCandidate
    expect(classifyExoplanetComposition({ massMearth: 1.2, radiusRearth: 1.1 })).toBe('terrestrial');
    expect(classifyExoplanetComposition({ massMearth: 15, radiusRearth: 3.5 })).toBe('ice-giant');
    expect(classifyExoplanetComposition({ massMearth: 300, radiusRearth: 11 })).toBe('gas-giant');

    expect(isExoplanetHabitableCandidate({ esi: 0.82 })).toBe(true);
    expect(isExoplanetHabitableCandidate({ equilibriumTempK: 260 })).toBe(true);
    expect(isExoplanetHabitableCandidate({ equilibriumTempK: 800, esi: 0.2 })).toBe(false);

    // 3. buildPlanetCompositionSummary
    expect(buildPlanetCompositionSummary([], 0, false)).toBe('0 confirmed planets');
    expect(buildPlanetCompositionSummary([], 1, false, ['gas-giant'])).toBe('1 planet (gas-giant)');
    expect(buildPlanetCompositionSummary([], 2, true)).toBe(
      '2 planets (terrestrial · Habitable zone candidate)',
    );
    expect(
      buildPlanetCompositionSummary(
        [
          {
            id: 'p1',
            name: 'P1',
            composition: 'terrestrial',
            isHabitableCandidate: true,
          },
          {
            id: 'p2',
            name: 'P2',
            composition: 'ice-giant',
            isHabitableCandidate: false,
          },
          {
            id: 'p3',
            name: 'P3',
            composition: 'gas-giant',
            isHabitableCandidate: false,
          },
        ],
        3,
        true,
      ),
    ).toBe('3 planets (1 terrestrial · 1 ice-giant · 1 gas-giant · Habitable zone candidate)');

    // 4. buildIntrinsicSystemSummary
    expect(
      buildIntrinsicSystemSummary({
        name: 'Custom',
        systemName: 'Custom',
        isChildEntity: false,
        starCount: 2,
        planetCount: 0,
        hasHabitableCandidate: false,
        manifestOverview: '  Explicit overview prose.  ',
      }),
    ).toBe('Explicit overview prose.');
    expect(
      buildIntrinsicSystemSummary({
        name: 'Hyades',
        systemName: 'Hyades',
        isChildEntity: false,
        starCount: 1,
        planetCount: 0,
        hasHabitableCandidate: false,
        structureDescription: 'Open cluster in Taurus.',
      }),
    ).toBe('Open cluster in Taurus.');
    expect(
      buildIntrinsicSystemSummary({
        name: 'Binary Star',
        systemName: 'Binary Star',
        isChildEntity: false,
        spectralType: 'Unknown',
        starCount: 2,
        planetCount: 1,
        hasHabitableCandidate: false,
      }),
    ).toBe('Binary Star is a 2-star system hosting 1 confirmed planet.');

    // 5. resolveFocusedCanonAnnotations & sortCanonAnnotations (factual before fictional, plus custom ordering)
    expect(resolveCanonLayerKindPriority('scientific-overlay')).toBe(0);
    expect(resolveCanonLayerKindPriority('custom-user')).toBe(1);
    expect(resolveCanonLayerKindPriority('fictional-canon')).toBe(2);
    expect(
      resolveCanonLayerKindPriority(
        'unknown-kind' as unknown as 'scientific-overlay',
      ),
    ).toBe(3);

    const annotations = resolveFocusedCanonAnnotations(
      'canon-project-hail-mary:tau-ceti-e',
      'gaia-2452378776434477184',
    );
    // Factual 'scientific-overlay' layer appears first
    expect(annotations[0]?.kind).toBe('scientific-overlay');
    expect(annotations[0]?.layerTitle).toBe('Interstellar Missions & SETI Landmarks');
    // Within 'fictional-canon', the direct planet annotation ('Adrian') appears before system-level annotations
    expect(annotations[1]?.inUniverseName).toBe('Adrian');
    expect(annotations.some((a) => a.inUniverseName === 'Tau Ceti (Astrophage Destination)')).toBe(
      true,
    );

    // Custom user-curated layerIdOrder overrides default ordering
    const customOrdered = sortCanonAnnotations(annotations, {
      layerIdOrder: ['canon-halo', 'canon-project-hail-mary'],
    });
    expect(customOrdered[0]?.layerId).toBe('canon-halo');
    expect(customOrdered[1]?.layerId).toBe('canon-project-hail-mary');

    // 6. detailsRepository shard caching, decoding (sys, str, sol), and error handling
    clearDetailsRepositoryCache();
    expect(getCachedSummaryNode('')).toBeUndefined();
    expect(getCachedDetailRecord('')).toBeUndefined();
    expect(await fetchSummaryNode('')).toBeUndefined();
    expect(await fetchDetailRecord('')).toBeUndefined();
    expect(getCachedExoplanetFromSystem('gaia-2452378776434477184', 'tau-ceti-e')).toBeUndefined();

    const decodedStr = decodeDetailRecord(
      {
        t: 'str',
        n: 'Orion Nebula',
        k: 8,
        p: [-340, -210, -130],
        d: 'Diffuse emission nebula.',
      },
      'ngc-1976',
    );
    expect(decodedStr.kind).toBe('structure');

    const decodedSol = decodeDetailRecord(
      {
        t: 'sol',
        n: 'Earth',
        k: 2,
        r: 6371,
      },
      'earth',
    );
    expect(decodedSol.kind).toBe('solar-body');

    const mockFetch = vi.fn(async (url: string) => {
      if (url.includes('/data/summaries/')) {
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          json: async () => ({
            i: '1',
            c: 1,
            d: {
              'gaia-2452378776434477184': {
                n: 'Tau Ceti',
                p: [-3.1, -0.4, -2.0],
                m: 3.5,
                M: 5.69,
                s: 'G8V',
                u: 1,
                k: 2,
                e: 1,
                h: 1,
                g: 14,
              },
            },
          }),
        };
      }
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          i: '1',
          c: 1,
          d: {
            'gaia-2452378776434477184': {
              t: 'sys',
              n: 'Tau Ceti',
              p: [-3.1, -0.4, -2.0],
              S: [
                {
                  i: 'tau-ceti-A',
                  n: 'Tau Ceti A',
                  s: 'G8V',
                  m: 3.5,
                  M: 5.69,
                  u: 0.78,
                  r: 0.79,
                  l: 0.52,
                  T: 5344,
                },
              ],
              E: [
                {
                  i: 'tau-ceti-e',
                  n: 'Tau Ceti e',
                  l: 'e',
                  y: 2017,
                  d: 1,
                  e: 3.93,
                  r: 1.8,
                  T: 270,
                  o: [0.538, 0.18, 0, 0, 0, 0, 162.87],
                },
                {
                  i: 'tau-ceti-g',
                  n: 'Tau Ceti g',
                  l: 'g',
                  o: [0.133, 0.06, 0, 0, 0, 0, 20.0],
                },
              ],
            },
          },
        }),
      };
    }) as unknown as typeof fetch;

    const summary = await fetchSummaryNode('gaia-2452378776434477184', mockFetch);
    expect(summary?.name).toBe('Tau Ceti');
    // Second call hits cache
    expect(await fetchSummaryNode('gaia-2452378776434477184', mockFetch)).toBeDefined();

    const detail = await fetchDetailRecord('gaia-2452378776434477184', mockFetch);
    expect(detail?.kind).toBe('system');
    expect(await fetchDetailRecord('gaia-2452378776434477184', mockFetch)).toBeDefined();
    expect(getCachedExoplanetFromSystem('gaia-2452378776434477184', 'tau-ceti-e')?.name).toBe(
      'Tau Ceti e',
    );

    // Build full FocusedEntityDetails with manifest, summaryNode, and THREE.Vector3 position
    const fullDetails = buildFocusedEntityDetails({
      focusedEntity: {
        id: 'gaia-2452378776434477184',
        name: 'Tau Ceti',
        position: new THREE.Vector3(-3.1, -0.4, -2.0),
        classification: 'stellar-system',
      },
      summaryNode: summary,
      systemDetail: detail,
    });
    expect(fullDetails).not.toBeNull();
    expect(fullDetails?.planets.map((p) => p.id)).toEqual(['tau-ceti-g', 'tau-ceti-e']);

    const fullHtml = renderToString(createElement(DetailsPanel, { details: fullDetails }));
    expect(fullHtml).toContain('0.538');
    expect(fullHtml).toContain('href="/guide/metrics/semi-major-axis?focus=');
    expect(fullHtml).toContain('162.87');
    expect(fullHtml).toContain('href="/guide/metrics/orbital-period?focus=');
    expect(fullHtml).toContain('3.93');
    expect(fullHtml).toContain('href="/guide/metrics/planetary-mass?focus=');
    expect(fullHtml).toContain('270');
    expect(fullHtml).toContain('href="/guide/metrics/equilibrium-temperature?focus=');
    expect(fullHtml).toContain('href="/guide/metrics/stellar-magnitude?focus=');
    expect(fullHtml).toContain('href="/guide/metrics/galactic-coordinates?focus=');
    expect(fullHtml).toContain('data-testid="details-metric-unit-link"');
    expect(fullHtml).toContain('data-testid="details-astrometry-tags"');

    // Error handling in detailsRepository
    clearDetailsRepositoryCache();
    const failFetch = vi.fn(async () => ({
      ok: false,
      status: 500,
      statusText: 'Error',
    })) as unknown as typeof fetch;
    await expect(fetchSummaryNode('sol', failFetch)).rejects.toThrow('500');
    await expect(fetchDetailRecord('sol', failFetch)).rejects.toThrow('500');
    clearDetailsRepositoryCache();
  });

  it('links telemetry unit badges to /guide/metrics/$metricId and renders MetricsListView and MetricDetailView', () => {
    expect(METRICS_GUIDE_PATH).toBe('/guide/metrics');
    expect(buildMetricGuideHref('semi-major-axis')).toBe(
      '/guide/metrics/semi-major-axis',
    );
    expect(buildMetricGuideHref('  orbital-period  ')).toBe(
      '/guide/metrics/orbital-period',
    );
    expect(buildMetricGuideHref('')).toBe('/guide/metrics');
    expect(buildMetricGuideHref('Unknown')).toBe('/guide/metrics');

    expect(extractMetricIdFromPathname('/guide/metrics/semi-major-axis')).toBe(
      'semi-major-axis',
    );
    expect(extractMetricIdFromPathname('/galaxy')).toBe('');

    const listViewHtml = renderToString(createElement(MetricsListView));
    expect(listViewHtml).toContain('data-testid="metrics-list-view-root"');
    expect(listViewHtml).toContain('Telemetry Metrics');

    const detailViewHtml = renderToString(
      createElement(MetricDetailView, {
        locationPathname: '/guide/metrics/semi-major-axis',
      }),
    );
    expect(detailViewHtml).toContain('data-testid="metric-detail-view-root"');
    expect(detailViewHtml).toContain('data-metric-id="semi-major-axis"');
    expect(detailViewHtml).toContain('Metric: semi-major-axis');
    expect(detailViewHtml).toContain('href="/guide/metrics"');

    const explicitPropDetailHtml = renderToString(
      createElement(MetricDetailView, { metricId: 'planetary-mass' }),
    );
    expect(explicitPropDetailHtml).toContain('data-metric-id="planetary-mass"');
  });

  it('links all stellar classifications to /guide/star-types/$starType and renders StarTypesListView and StarTypeDetailView', () => {
    expect(STAR_TYPES_GUIDE_PATH).toBe('/guide/star-types');
    expect(buildStarTypeGuideHref('G8V')).toBe('/guide/star-types/G8V');
    expect(buildStarTypeGuideHref('  M5.5Ve  ')).toBe('/guide/star-types/M5.5Ve');
    expect(buildStarTypeGuideHref('')).toBe('/guide/star-types');
    expect(buildStarTypeGuideHref('Unknown')).toBe('/guide/star-types');

    // SearchResultItem spectral badge links to /guide/star-types/G8V
    const searchRes = executeCatalogSearch(SAMPLE_CORPUS, {
      query: 'Tau Ceti',
      filter: 'stars',
    });
    const tauItem = searchRes.groups.stars.items[0]!;
    const itemHtml = renderToString(
      createElement(SearchResultItem, { result: tauItem }),
    );
    expect(itemHtml).toContain('href="/guide/star-types/G8V"');
    expect(itemHtml).toContain('data-testid="result-spectral-badge"');

    // DetailsPanel links G8V in Peek badge, Partial summary, and Full Stars list
    const focusedDetails = buildFocusedEntityDetails({
      focusedEntity: {
        id: 'gaia-2452378776434477184',
        name: 'Tau Ceti',
        position: [-3.1, -0.4, -2.0],
        classification: 'stellar-system',
        spectralType: 'G8V',
      },
      corpus: SAMPLE_CORPUS,
    });
    const detailsHtml = renderToString(
      createElement(DetailsPanel, { details: focusedDetails }),
    );
    expect(detailsHtml).toContain('data-testid="details-spectral-badge"');
    expect(detailsHtml).toContain('data-testid="details-summary-spectral-link"');
    expect(detailsHtml).toContain('data-testid="details-star-spectral-link"');
    expect(detailsHtml.match(/href="\/guide\/star-types\/G8V"/g)?.length).toBeGreaterThanOrEqual(
      3,
    );

    // StarTypesListView and StarTypeDetailView render cleanly
    const listViewHtml = renderToString(createElement(StarTypesListView));
    expect(listViewHtml).toContain('data-testid="star-types-list-view-root"');
    expect(listViewHtml).toContain('Star Types');

    const detailViewHtml = renderToString(
      createElement(StarTypeDetailView, { starType: 'G8V' }),
    );
    expect(detailViewHtml).toContain('data-testid="star-type-detail-view-root"');
    expect(detailViewHtml).toContain('data-star-type="G8V"');
    expect(detailViewHtml).toContain('Star Type: G8V');
    expect(detailViewHtml).toContain('href="/guide/star-types"');
  });

  it('links each canon title in DetailsPanel to /galaxy?select=layer:<layerSlug>&layer=<layerSlug> and selects all annotated systems when GalaxyView loads', () => {
    expect(buildLayerGalaxyHref('canon-project-hail-mary')).toBe(
      '/galaxy?select=layer:project-hail-mary&layer=project-hail-mary',
    );
    expect(buildLayerGalaxyHref('   ')).toBe('/galaxy');
    expect(findCanonLayerById('canon-project-hail-mary')?.title).toBe(
      'Project Hail Mary',
    );
    expect(findCanonLayerById('project-hail-mary')?.title).toBe(
      'Project Hail Mary',
    );
    expect(findCanonLayerById('')).toBeUndefined();
    expect(findCanonLayerById('non-existent-layer')).toBeUndefined();

    expect(extractUrlLayerId('?select=layer:project-hail-mary')).toBe(
      'canon-project-hail-mary',
    );
    expect(extractUrlLayerId('?layer=canon-halo')).toBe('canon-halo');
    expect(extractUrlLayerId('?focus=tau-ceti-e')).toBeNull();
    expect(extractUrlLayerId('')).toBeNull();

    // extractUrlFocusSlug only reads ?focus= or route path segments, never ?select=
    expect(
      extractUrlFocusSlug('/galaxy', '?select=layer:project-hail-mary'),
    ).toBeNull();

    // DetailsPanel renders clickable canon links
    const focusedDetails = buildFocusedEntityDetails({
      focusedEntity: {
        id: 'gaia-2452378776434477184',
        name: 'Tau Ceti',
        position: [-3.1, -0.4, -2.0],
        classification: 'stellar-system',
      },
      corpus: SAMPLE_CORPUS,
    });
    const detailsHtml = renderToString(
      createElement(DetailsPanel, { details: focusedDetails }),
    );
    expect(detailsHtml).toContain('data-testid="details-canon-item-title"');
    expect(detailsHtml).toContain('data-testid="details-canon-link"');
    expect(
      detailsHtml.indexOf('data-testid="details-canon-item-title"'),
    ).toBeLessThan(detailsHtml.indexOf('data-testid="details-canon-link"'));
    expect(detailsHtml).toContain(
      'href="/galaxy?select=layer:project-hail-mary&amp;layer=project-hail-mary"',
    );
    expect(detailsHtml).toContain('href="/galaxy?select=layer:halo&amp;layer=halo"');

    // resolveSelectedSystemsFromLayer resolves all annotated systems
    const phmSystems = resolveSelectedSystemsFromLayer(
      'canon-project-hail-mary',
      SAMPLE_CORPUS,
    );
    expect(phmSystems.map((s) => s.name)).toEqual(['Tau Ceti', 'Keid']);
    expect(
      resolveSelectedSystemsFromLayer('non-existent-canon', SAMPLE_CORPUS),
    ).toEqual([]);

    // Fallback when corpus is empty and when Sol is included (e.g. canon-star-trek)
    const stSystemsEmptyCorpus = resolveSelectedSystemsFromLayer(
      'canon-star-trek',
      [],
    );
    expect(stSystemsEmptyCorpus.some((s) => s.id === 'sol' && s.name === 'Sol')).toBe(
      true,
    );

    // MainView loading /galaxy?select=layer:project-hail-mary selects all systems in that canon and focuses nothing
    const store = createSpatialEntityStore();
    const html = renderToString(
      createElement(
        SpatialEntityProvider,
        { store },
        createElement(GalaxyView, {
          initialCorpus: SAMPLE_CORPUS,
          locationPathname: '/galaxy',
          locationSearch: '?select=layer:project-hail-mary',
        }),
      ),
    );

    const selected = store.getState().getEntitiesByState('selected');
    expect(selected.map((s) => s.name)).toEqual(['Tau Ceti', 'Keid']);
    expect(store.getState().getEntitiesByState('focused')).toEqual([]);
    expect(html).not.toContain('data-testid="details-panel"');
    expect(html).not.toContain('data-testid="systems-panel"');
  });

  it('links planet type labels in DetailsPanel to /guide/planet-types/$planetType and renders PlanetTypesListView and PlanetTypeDetailView', () => {
    expect(PLANET_TYPES_GUIDE_PATH).toBe('/guide/planet-types');
    expect(buildPlanetTypeGuideHref('terrestrial')).toBe(
      '/guide/planet-types/terrestrial',
    );
    expect(buildPlanetTypeGuideHref('  ice-giant  ')).toBe(
      '/guide/planet-types/ice-giant',
    );
    expect(buildPlanetTypeGuideHref('gas-giant')).toBe(
      '/guide/planet-types/gas-giant',
    );
    expect(buildPlanetTypeGuideHref('')).toBe('/guide/planet-types');
    expect(buildPlanetTypeGuideHref('Unknown')).toBe('/guide/planet-types');

    expect(extractPlanetTypeFromPathname('/guide/planet-types/terrestrial')).toBe(
      'terrestrial',
    );
    expect(extractPlanetTypeFromPathname('/galaxy')).toBe('');
    expect(extractStarTypeFromPathname('/guide/star-types/G8V')).toBe('G8V');
    expect(extractStarTypeFromPathname('/galaxy')).toBe('');

    const focusedDetails = buildFocusedEntityDetails({
      focusedEntity: {
        id: 'gaia-2452378776434477184',
        name: 'Tau Ceti',
        position: [-3.1, -0.4, -2.0],
        classification: 'stellar-system',
      },
      corpus: SAMPLE_CORPUS,
    });
    const detailsHtml = renderToString(
      createElement(DetailsPanel, { details: focusedDetails }),
    );

    // Peek planet composition summary links terrestrial to /guide/planet-types/terrestrial
    expect(detailsHtml).toContain('data-testid="details-summary-planet-type-link"');
    // Full Planets list links terrestrial to /guide/planet-types/terrestrial
    expect(detailsHtml).toContain('data-testid="details-planet-type-link"');
    expect(
      detailsHtml.match(/href="\/guide\/planet-types\/terrestrial"/g)?.length,
    ).toBeGreaterThanOrEqual(2);

    // Star and planet names in DetailsPanel link to /system/<systemSlug>?focus=<elementSlug>
    expect(buildSystemElementFocusHref('Tau Ceti', 'tau Ceti e')).toBe(
      '/system/tau-ceti?focus=tau-ceti-e',
    );
    expect(buildSystemElementFocusHref('Tau Ceti', '')).toBe(
      '/system/tau-ceti',
    );
    expect(detailsHtml).toContain('data-testid="details-star-name-link"');
    expect(detailsHtml).toContain('href="/system/tau-ceti?focus=tau-ceti"');
    expect(detailsHtml).toContain('data-testid="details-planet-name-link"');
    expect(detailsHtml).toContain('href="/system/tau-ceti?focus=tau-ceti-e"');

    // PlanetTypesListView and PlanetTypeDetailView render cleanly
    const listViewHtml = renderToString(createElement(PlanetTypesListView));
    expect(listViewHtml).toContain('data-testid="planet-types-list-view-root"');
    expect(listViewHtml).toContain('Planet Types');

    const detailViewHtml = renderToString(
      createElement(PlanetTypeDetailView, {
        locationPathname: '/guide/planet-types/terrestrial',
      }),
    );
    expect(detailViewHtml).toContain('data-testid="planet-type-detail-view-root"');
    expect(detailViewHtml).toContain('data-planet-type="terrestrial"');
    expect(detailViewHtml).toContain('Planet Type: terrestrial');
    expect(detailViewHtml).toContain('href="/guide/planet-types"');
  });

  it('links Astrometry and Canon tags in DetailsPanel to /galaxy?select=tag:<tagSlug> and supports multi-entity ?select= lists alongside ?focus=', () => {
    expect(buildTagGalaxyHref('ExoplanetHost')).toBe(
      '/galaxy?select=tag:exoplanet-host',
    );
    expect(buildTagGalaxyHref('HabitableCandidate')).toBe(
      '/galaxy?select=tag:habitable-candidate',
    );
    expect(buildTagGalaxyHref('   ')).toBe('/galaxy');
    expect(isCatalogOrCanonTag('ExoplanetHost')).toBe(true);
    expect(isCatalogOrCanonTag('exoplanet-host')).toBe(true);
    expect(isCatalogOrCanonTag('SolarNeighborhood10pc')).toBe(true);
    expect(isCatalogOrCanonTag('solar-neighborhood-10pc')).toBe(true);
    expect(isCatalogOrCanonTag('seti')).toBe(true);
    expect(isCatalogOrCanonTag('')).toBe(false);
    expect(isCatalogOrCanonTag('tau-ceti-e')).toBe(false);

    expect(extractUrlTagFocus('?select=tag:exoplanet-host')).toBe('exoplanet-host');
    expect(extractUrlTagFocus('?select=tag:seti')).toBe('seti');
    expect(extractUrlTagFocus('?select=layer:project-hail-mary')).toBeNull();
    expect(extractUrlTagFocus('?focus=tau-ceti-e')).toBeNull();
    expect(extractUrlTagFocus('')).toBeNull();

    // extractUrlFocusSlug ignores ?select= so no fake entity is focused
    expect(extractUrlFocusSlug('/galaxy', '?select=tag:exoplanet-host')).toBeNull();

    // doesSystemEntryMatchTag evaluates all catalog system tags (both PascalCase and kebab-case)
    const solEntry = SAMPLE_CORPUS[0]!;
    const tauEntry = SAMPLE_CORPUS[1]!;
    const planetEntry = SAMPLE_CORPUS.find((e) => e.i === 'tau-ceti-e')!;
    expect(doesSystemEntryMatchTag(solEntry, 'HomeSystem')).toBe(true);
    expect(doesSystemEntryMatchTag(solEntry, 'home-system')).toBe(true);
    expect(doesSystemEntryMatchTag(solEntry, 'SolarNeighborhood10pc')).toBe(true);
    expect(doesSystemEntryMatchTag(solEntry, 'solar-neighborhood-10pc')).toBe(true);
    expect(doesSystemEntryMatchTag(solEntry, 'NakedEye')).toBe(true);
    expect(doesSystemEntryMatchTag(tauEntry, 'ExoplanetHost')).toBe(true);
    expect(doesSystemEntryMatchTag(tauEntry, 'HabitableCandidate')).toBe(true);
    expect(doesSystemEntryMatchTag(tauEntry, 'habitable-candidate')).toBe(true);
    expect(doesSystemEntryMatchTag(tauEntry, 'VariableStar')).toBe(false);
    expect(doesSystemEntryMatchTag(tauEntry, '')).toBe(false);
    expect(doesSystemEntryMatchTag(planetEntry, 'ExoplanetHost')).toBe(false);

    // DetailsPanel renders clickable tag links in both Partial Astrometry and Full Canon accordions
    const focusedDetails = buildFocusedEntityDetails({
      focusedEntity: {
        id: 'gaia-2452378776434477184',
        name: 'Tau Ceti',
        position: [-3.1, -0.4, -2.0],
        classification: 'stellar-system',
      },
      corpus: SAMPLE_CORPUS,
    });
    const detailsHtml = renderToString(
      createElement(DetailsPanel, { details: focusedDetails }),
    );
    expect(detailsHtml).toContain('data-testid="details-habitable-zone-link"');
    expect(detailsHtml).toContain('data-testid="details-summary-habitable-link"');
    expect(detailsHtml).toContain('data-testid="details-planet-habitable-link"');
    expect(detailsHtml).toContain('data-testid="details-astrometry-tag-link"');
    expect(detailsHtml).toContain('href="/galaxy?select=tag:solar-neighborhood-10pc"');
    expect(detailsHtml).toContain('href="/galaxy?select=tag:naked-eye"');
    expect(detailsHtml).toContain('href="/galaxy?select=tag:exoplanet-host"');
    expect(detailsHtml).toContain('href="/galaxy?select=tag:habitable-candidate"');
    expect(detailsHtml).toContain('data-testid="details-canon-tag-link"');

    // resolveSelectedSystemsFromTag resolves both catalog system tags and canon annotation tags
    expect(resolveSelectedSystemsFromTag('', SAMPLE_CORPUS)).toEqual([]);
    const exoplanetHosts = resolveSelectedSystemsFromTag(
      'exoplanet-host',
      SAMPLE_CORPUS,
    );
    expect(exoplanetHosts.some((s) => s.name === 'Sol')).toBe(true);
    expect(exoplanetHosts.some((s) => s.name === 'Tau Ceti')).toBe(true);

    const habitableHosts = resolveSelectedSystemsFromTag(
      'habitable-candidate',
      SAMPLE_CORPUS,
    );
    expect(habitableHosts.map((s) => s.name)).toEqual(['Sol', 'Tau Ceti']);

    const setiSystems = resolveSelectedSystemsFromTag('seti', SAMPLE_CORPUS);
    expect(setiSystems.some((s) => s.name === 'Tau Ceti')).toBe(true);

    // MainView loading /galaxy?select=tag:habitable-candidate selects all matching systems and focuses nothing
    const store = createSpatialEntityStore();
    const html = renderToString(
      createElement(
        SpatialEntityProvider,
        { store },
        createElement(GalaxyView, {
          initialCorpus: SAMPLE_CORPUS,
          locationPathname: '/galaxy',
          locationSearch: '?select=tag:habitable-candidate',
        }),
      ),
    );
    const selected = store.getState().getEntitiesByState('selected');
    expect(selected.map((s) => s.name)).toEqual(['Sol', 'Tau Ceti']);
    expect(store.getState().getEntitiesByState('focused')).toEqual([]);
    expect(html).not.toContain('data-testid="details-panel"');
    expect(html).not.toContain('data-testid="systems-panel"');

    // GalaxyView loading /galaxy?select=sol,keid&focus=tau-ceti selects Sol + Keid and focuses Tau Ceti
    const multiStore = createSpatialEntityStore();
    const multiHtml = renderToString(
      createElement(
        SpatialEntityProvider,
        { store: multiStore },
        createElement(GalaxyView, {
          initialCorpus: SAMPLE_CORPUS,
          locationPathname: '/galaxy',
          locationSearch: '?select=sol,keid&focus=tau-ceti',
        }),
      ),
    );
    expect(
      multiStore
        .getState()
        .getEntitiesByState('selected')
        .map((s) => s.name),
    ).toEqual(['Sol', 'Keid']);
    expect(
      multiStore
        .getState()
        .getEntitiesByState('focused')
        .map((s) => s.name),
    ).toEqual(['Tau Ceti']);
    expect(multiHtml).toContain('data-testid="details-panel"');
  });

  it('renders Breadcrumbs at the top of every view, populates entity-specific telemetry in DetailsPanel, and renders BodiesPanel in SystemView and PlanetView', () => {
    expect(extractUrlSystemSlug('/system/tau-ceti')).toBe('tau-ceti');
    expect(extractUrlSystemSlug('/galaxy/tau-ceti')).toBe('tau-ceti');
    expect(extractUrlSystemSlug('/search')).toBeNull();
    expect(hasExplicitFocusParam('?focus=tau-ceti-e')).toBe(true);
    expect(hasExplicitFocusParam('')).toBe(false);

    // Empty breadcrumbs returns null
    expect(renderToString(createElement(Breadcrumbs, { items: [] }))).toBe('');
    expect(
      renderToString(createElement(BodiesPanel, { elements: null })),
    ).toBe('');
    expect(buildSystemBodiesSummary({ details: null })).toBeNull();

    // Guide & Search views render breadcrumbs at top
    expect(renderToString(createElement(SearchView))).toContain(
      'data-testid="view-breadcrumbs"',
    );
    expect(renderToString(createElement(StarTypesListView))).toContain(
      'data-testid="view-breadcrumbs"',
    );
    expect(
      renderToString(
        createElement(StarTypeDetailView, {
          locationPathname: '/guide/star-types/G8V',
        }),
      ),
    ).toContain('data-testid="view-breadcrumbs"');
    expect(renderToString(createElement(PlanetTypesListView))).toContain(
      'data-testid="view-breadcrumbs"',
    );
    expect(
      renderToString(
        createElement(PlanetTypeDetailView, {
          locationPathname: '/guide/planet-types/terrestrial',
        }),
      ),
    ).toContain('data-testid="view-breadcrumbs"');
    expect(renderToString(createElement(MetricsListView))).toContain(
      'data-testid="view-breadcrumbs"',
    );
    expect(
      renderToString(
        createElement(MetricDetailView, {
          locationPathname: '/guide/metrics/semi-major-axis',
        }),
      ),
    ).toContain('data-testid="view-breadcrumbs"');

    // SystemView at /system/tau-ceti?focus=tau-ceti-e renders Breadcrumbs, BodiesPanel, and Details (planet telemetry)
    const sysStore = createSpatialEntityStore();
    const sysHtml = renderToString(
      createElement(
        SpatialEntityProvider,
        { store: sysStore },
        createElement(SystemView, {
          initialCorpus: SAMPLE_CORPUS,
          locationPathname: '/system/tau-ceti',
          locationSearch: '?focus=tau-ceti-e',
        }),
      ),
    );
    expect(sysHtml).toContain('data-testid="view-breadcrumbs"');
    expect(sysHtml).toContain('data-testid="bodies-panel"');
    expect(sysHtml).toContain('data-scope="system"');
    expect(sysHtml).toContain('data-system-id="gaia-2452378776434477184"');
    expect(sysHtml).toContain('data-testid="orbital-schematic-panel"');
    expect(sysHtml).toContain('data-testid="orbital-schematic-list"');
    expect(sysHtml).toContain('data-testid="orbital-schematic-item"');
    expect(sysHtml).not.toContain('data-testid="bodies-stars-section"');
    expect(sysHtml).not.toContain('data-testid="bodies-planets-section"');
    expect(sysHtml).not.toContain('data-testid="bodies-canon-section"');
    expect(sysHtml).toContain('data-testid="details-canon-section"');
    expect(sysHtml).toContain('data-focused="true"');
    expect(sysHtml).toContain('data-testid="details-panel"');
    expect(sysHtml).toContain('data-focused-kind="planet"');
    expect(sysHtml).toContain('data-testid="details-planet-telemetry-section"');
    expect(sysHtml).not.toContain('data-testid="details-planet-composition"');
    expect(sysHtml).not.toContain('data-testid="details-stars-section"');
    expect(sysHtml).not.toContain('data-testid="details-planets-section"');

    // SystemView at /system/sol?select=earth renders earth as selected in BodiesPanel and hides DetailsPanel
    const solSelectStore = createSpatialEntityStore();
    const solSelectHtml = renderToString(
      createElement(
        SpatialEntityProvider,
        { store: solSelectStore },
        createElement(SystemView, {
          initialCorpus: SAMPLE_CORPUS,
          locationPathname: '/system/sol',
          locationSearch: '?select=earth',
        }),
      ),
    );
    expect(solSelectHtml).toContain('data-testid="orbital-schematic-item"');
    expect(solSelectHtml).toContain('data-selected="true"');
    expect(solSelectHtml).not.toContain('data-testid="details-panel"');
    expect(solSelectHtml).toContain('data-testid="orbital-schematic-panel"');

    // SystemView at /system/sol?focus=earth renders Orbiting Bodies (Moon) in DetailsPanel Full and links Details button to /planet/earth
    const earthFocusStore = createSpatialEntityStore();
    const earthFocusHtml = renderToString(
      createElement(
        SpatialEntityProvider,
        { store: earthFocusStore },
        createElement(SystemView, {
          initialCorpus: SAMPLE_CORPUS,
          locationPathname: '/system/sol',
          locationSearch: '?focus=earth',
        }),
      ),
    );
    expect(earthFocusHtml).toContain(
      'data-testid="details-orbiting-bodies-section"',
    );
    expect(earthFocusHtml).toContain(
      'data-testid="details-orbiting-body-link"',
    );
    expect(earthFocusHtml).toContain('href="/planet/earth?focus=moon"');
    expect(earthFocusHtml).toContain('1 catalogued body in orbit.');
    expect(earthFocusHtml).toContain(
      'data-testid="details-button-system-details"',
    );
    expect(earthFocusHtml).toContain('href="/planet/earth"');

    // PlanetView at /planet/earth renders Breadcrumbs (Galaxy -> Sol -> Earth), BodiesPanel, and OrbitalSchematicPanel
    expect(extractUrlPlanetSlug('/planet/earth')).toBe('earth');
    expect(extractUrlPlanetSlug('/system/sol')).toBeNull();
    expect(buildPlanetDetailsHref('earth')).toBe('/planet/earth');
    expect(buildPlanetDetailsHref('')).toBe('/planet/earth');
    expect(buildPlanetElementFocusHref('jupiter', 'europa')).toBe(
      '/planet/jupiter?focus=europa',
    );
    expect(buildPlanetElementFocusHref('jupiter', '')).toBe('/planet/jupiter');
    expect(buildPlanetaryBodiesSummary({ details: null })).toBeNull();
    expect(buildPlanetViewBreadcrumbs(null, null, 'earth', false)).toEqual([
      { label: 'Galaxy', href: '/galaxy' },
      { label: 'System', href: '/system/system' },
      { label: 'Earth' },
    ]);

    const planetStore = createSpatialEntityStore();
    const planetHtml = renderToString(
      createElement(
        SpatialEntityProvider,
        { store: planetStore },
        createElement(PlanetView, {
          initialCorpus: SAMPLE_CORPUS,
          locationPathname: '/planet/earth',
          locationSearch: '?select=moon',
        }),
      ),
    );
    expect(planetHtml).toContain('data-testid="planet-view-root"');
    expect(planetHtml).toContain('data-testid="view-breadcrumbs"');
    expect(planetHtml).toContain('href="/galaxy"');
    expect(planetHtml).toContain('href="/system/sol"');
    expect(planetHtml).toContain('data-testid="bodies-panel"');
    expect(planetHtml).toContain('data-scope="planet"');
    expect(planetHtml).toContain('data-planet-id="earth"');
    expect(planetHtml).toContain('data-selected="true"');
    expect(planetHtml).not.toContain('data-testid="details-panel"');
    expect(planetHtml).toContain('data-testid="orbital-schematic-panel"');
    expect(planetHtml).toContain('data-testid="orbital-schematic-list"');
    expect(planetHtml).toContain('data-testid="orbital-schematic-item"');
    expect(planetHtml).toContain('href="/planet/earth?focus=moon"');
    expect(planetHtml).not.toContain('data-testid="bodies-planet-section"');
    expect(planetHtml).not.toContain('data-testid="bodies-moons-section"');

    // PlanetView at /planet/earth?focus=moon focuses Moon (minor-body) and renders Galaxy -> Sol -> Earth breadcrumbs (never Moon)
    const moonFocusStore = createSpatialEntityStore();
    const moonFocusHtml = renderToString(
      createElement(
        SpatialEntityProvider,
        { store: moonFocusStore },
        createElement(PlanetView, {
          initialCorpus: SAMPLE_CORPUS,
          locationPathname: '/planet/earth',
          locationSearch: '?focus=moon',
        }),
      ),
    );
    expect(moonFocusHtml).toContain('data-focused-kind="minor-body"');
    expect(moonFocusHtml).toContain('href="/planet/earth"');
    expect(moonFocusHtml).toContain(
      'Moon is a moon orbiting Earth.',
    );
    expect(moonFocusHtml).toContain('data-focused="true"');
    expect(moonFocusHtml).toContain('data-testid="details-panel"');

    // PlanetView at /planet/earth?focus=earth focuses Earth and renders DetailsPanel
    const earthHostFocusStore = createSpatialEntityStore();
    const earthHostFocusHtml = renderToString(
      createElement(
        SpatialEntityProvider,
        { store: earthHostFocusStore },
        createElement(PlanetView, {
          initialCorpus: SAMPLE_CORPUS,
          locationPathname: '/planet/earth',
          locationSearch: '?focus=earth',
        }),
      ),
    );
    expect(earthHostFocusHtml).toContain('data-testid="details-panel"');
    expect(earthHostFocusHtml).toContain('data-focused-kind="planet"');
    expect(earthHostFocusHtml).toContain('data-focused="true"');

    // PlanetView at /planet/tau-ceti-e renders exoplanet with canon layer and empty moons message
    const exoPlanetStore = createSpatialEntityStore();
    const exoPlanetHtml = renderToString(
      createElement(
        SpatialEntityProvider,
        { store: exoPlanetStore },
        createElement(PlanetView, {
          initialCorpus: SAMPLE_CORPUS,
          locationPathname: '/planet/tau-ceti-e',
          locationSearch: '',
        }),
      ),
    );
    expect(exoPlanetHtml).toContain(
      'data-testid="orbital-schematic-panel"',
    );
    expect(exoPlanetHtml).not.toContain(
      'data-testid="bodies-canon-section"',
    );

    // With explicit focus on tau-ceti-e, DetailsPanel renders details-canon-section with canon annotation
    const focusedExoStore = createSpatialEntityStore({ focusedId: 'tau-ceti-e' });
    focusedExoStore.getState().registerEntity({
      id: 'tau-ceti-e',
      name: 'Tau Ceti e',
      position: [0, 0, 0],
      classification: 'terrestrial',
    });
    const focusedExoHtml = renderToString(
      createElement(
        SpatialEntityProvider,
        { store: focusedExoStore },
        createElement(PlanetView, {
          initialCorpus: SAMPLE_CORPUS,
          locationPathname: '/planet/tau-ceti-e',
          locationSearch: '?focus=tau-ceti-e',
        }),
      ),
    );
    expect(focusedExoHtml).toContain('data-testid="details-canon-section"');
    expect(focusedExoHtml).toContain('Adrian');

    // SystemView at /system/sol renders Orbital Schematic and Minor Bodies & Spacecraft sections
    const solStore = createSpatialEntityStore();
    const solHtml = renderToString(
      createElement(
        SpatialEntityProvider,
        { store: solStore },
        createElement(SystemView, {
          initialCorpus: SAMPLE_CORPUS,
          locationPathname: '/system/sol',
          locationSearch: '',
        }),
      ),
    );
    expect(solHtml).toContain('data-testid="orbital-schematic-panel"');
    expect(solHtml).toContain(
      'data-testid="bodies-minor-bodies-section"',
    );

    // Entity-specific telemetry branches in buildFocusedEntityDetails + DetailsPanel:
    // 1. Star focus (?focus=tau-ceti)
    const starDetails = buildFocusedEntityDetails({
      focusedEntity: {
        id: 'gaia-2452378776434477184',
        name: 'Tau Ceti',
        position: [-3.1, -0.4, -2.0],
        classification: 'stellar-system',
      },
      corpus: SAMPLE_CORPUS,
      urlSystemSlug: 'tau-ceti',
      hasExplicitFocus: true,
      systemDetail: {
        kind: 'system',
        record: {
          id: 'gaia-2452378776434477184',
          name: 'Tau Ceti',
          x: -3.1,
          y: -0.4,
          z: -2.0,
          dist: 3.65,
          sectorId: 'S-1',
          stars: [
            {
              id: 'gaia-2452378776434477184-A',
              name: 'Tau Ceti',
              componentDesignation: 'A',
              spectralType: 'G8V',
              mag: 3.5,
              absmag: 5.69,
              massMsun: 0.78,
              radiusRsun: 0.79,
              luminosityLsun: 0.52,
              effectiveTempK: 5344,
            },
          ],
          planets: [],
        },
      },
    });
    expect(starDetails?.focusedKind).toBe('star');
    expect(starDetails?.starTelemetry).toBeDefined();
    const starHtml = renderToString(
      createElement(DetailsPanel, { details: starDetails }),
    );
    expect(starHtml).toContain('data-testid="details-star-telemetry-section"');
    expect(starHtml).toContain('data-testid="details-star-telemetry-mass"');
    expect(starHtml).toContain('data-testid="details-star-telemetry-radius"');
    expect(starHtml).toContain('data-testid="details-star-telemetry-luminosity"');
    expect(starHtml).toContain('data-testid="details-star-telemetry-temp"');
    expect(starHtml).toContain('href="/guide/metrics/stellar-mass?focus=');
    expect(starHtml).toContain('href="/guide/metrics/stellar-radius?focus=');
    expect(starHtml).toContain('href="/guide/metrics/stellar-luminosity?focus=');
    expect(starHtml).toContain('href="/guide/metrics/effective-temperature?focus=');

    // DEC-025: StarFocus is strictly scoped to the focused star in DetailsPanel
    expect(starHtml).not.toContain('data-testid="details-star-count"');
    expect(starHtml).not.toContain('data-testid="details-planet-composition"');
    expect(starHtml).not.toContain('data-testid="details-stars-section"');
    expect(starHtml).not.toContain('data-testid="details-planets-section"');
    // DEC-026: Details CTA is omitted for star focus
    expect(starDetails?.systemDetailsHref).toBeUndefined();
    expect(starHtml).not.toContain('data-testid="details-button-system-details"');

    // 2. Planet focus with full SystemManifest (testing semiMajorAxisAu, periodDays, eccentricity, inclinationDeg, massMearth, radiusRearth, equilibriumTempK, discoveryYear, discoveryMethod)
    const manifestPlanetDetails = buildFocusedEntityDetails({
      focusedEntity: {
        id: 'tau-ceti-b',
        name: 'tau-ceti-b',
        position: [0, 0, 0],
        classification: 'stellar-system',
      },
      corpus: SAMPLE_CORPUS,
      urlSystemSlug: 'tau-ceti',
      hasExplicitFocus: true,
      systemDetail: {
        kind: 'system',
        record: {
          id: 'gaia-2452378776434477184',
          name: 'Tau Ceti',
          x: -3.1,
          y: -0.4,
          z: -2.0,
          dist: 3.65,
          sectorId: 'S-1',
          stars: [
            {
              id: 'gaia-2452378776434477184-A',
              name: 'Tau Ceti',
              componentDesignation: 'A',
              spectralType: 'G8V',
              mag: 3.5,
              absmag: 5.69,
              massMsun: 0.78,
              radiusRsun: 0.79,
              luminosityLsun: 0.52,
              effectiveTempK: 5344,
            },
          ],
          planets: [
            {
              id: 'tau-ceti-b',
              name: 'Tau Ceti b',
              letter: 'b',
              massMearth: 2.0,
              radiusRearth: 1.2,
              equilibriumTempK: 475,
              discoveryYear: 2012,
              discoveryMethod: 'Radial Velocity',
              orbit: {
                semiMajorAxis: 0.105,
                periodDays: 13.9,
                eccentricity: 0.16,
                inclination: 0,
                ascendingNode: 0,
                argumentOfPeriapsis: 0,
                meanAnomaly: 0,
              },
            },
          ],
        },
      },
    });
    expect(manifestPlanetDetails?.focusedKind).toBe('planet');
    expect(manifestPlanetDetails?.name).toBe('Tau Ceti b');
    expect(manifestPlanetDetails?.systemSummary).toBe(
      'Tau Ceti b is a terrestrial planet orbiting Tau Ceti.',
    );
    const manifestPlanetHtml = renderToString(
      createElement(DetailsPanel, { details: manifestPlanetDetails }),
    );
    expect(manifestPlanetHtml).toContain(
      'data-testid="details-planet-telemetry-section"',
    );
    expect(manifestPlanetHtml).toContain(
      'data-testid="details-planet-telemetry-inclination"',
    );
    expect(manifestPlanetHtml).toContain(
      'data-testid="details-planet-telemetry-radius"',
    );
    expect(manifestPlanetHtml).toContain(
      'href="/guide/metrics/orbital-inclination?focus=',
    );
    expect(manifestPlanetHtml).toContain(
      'href="/guide/metrics/planetary-radius?focus=',
    );
    expect(manifestPlanetHtml).toContain(
      'data-testid="details-planet-telemetry-discovery"',
    );
    expect(manifestPlanetHtml).not.toContain(
      'data-testid="details-planet-composition"',
    );
    expect(manifestPlanetHtml).not.toContain(
      'data-testid="details-stars-section"',
    );
    expect(manifestPlanetHtml).not.toContain(
      'data-testid="details-planets-section"',
    );

    // 3. Minor-body focus (Moon k=3, Dwarf Planet k=4, Asteroid/Minor Body k=6, Spacecraft k=6)
    for (const bodyId of ['moon', 'pluto', 'mpc-433', 'voyager-1']) {
      const bodyDetails = buildFocusedEntityDetails({
        focusedEntity: {
          id: bodyId,
          name: bodyId,
          position: [0, 0, 0],
          classification: 'terrestrial',
        },
        corpus: [
          ...SAMPLE_CORPUS,
          { i: 'voyager-1', n: 'Voyager 1', k: 6, s: 'sol', h: 1 },
        ],
      });
      expect(bodyDetails?.focusedKind).toBe('minor-body');
      const bodyHtml = renderToString(
        createElement(DetailsPanel, { details: bodyDetails }),
      );
      expect(bodyHtml).toContain(
        'data-testid="details-minor-body-telemetry-section"',
      );
    }

    // 4. Structure focus (k=7)
    const structDetails = buildFocusedEntityDetails({
      focusedEntity: {
        id: 'hyades',
        name: 'Hyades',
        position: [15, -40, -18],
        classification: 'stellar-cluster',
      },
      corpus: SAMPLE_CORPUS,
      entityDetail: {
        kind: 'structure',
        record: {
          id: 'hyades',
          name: 'Hyades',
          type: 'OpenCluster',
          x: 15,
          y: -40,
          z: -18,
          dist: 47,
          designations: ['Melotte 25'],
          radiusPc: 3.0,
          description: 'Nearest open cluster.',
        },
      },
    });
    expect(structDetails?.focusedKind).toBe('structure');
    const structHtml = renderToString(
      createElement(DetailsPanel, { details: structDetails }),
    );
    expect(structHtml).toContain(
      'data-testid="details-structure-telemetry-section"',
    );
    expect(structHtml).toContain(
      'data-testid="details-structure-telemetry-radius"',
    );
    expect(structHtml).not.toContain('data-testid="details-star-count"');
    expect(structHtml).not.toContain('data-testid="details-planet-composition"');

    // 5. Precalculated planetCompositionCounts (b) and tag bitmask (g) on search corpus entries
    const precalcSolDetails = buildFocusedEntityDetails({
      focusedEntity: {
        id: 'sol',
        name: 'Sol',
        position: [0, 0, 0],
        classification: 'stellar-system',
      },
      corpus: [
        {
          i: 'sol',
          n: 'Sol',
          m: [-26.74, 'G2V', 8, 1],
          b: [4, 2, 2],
          g: 1 | 2 | 4 | 16,
          h: 1,
        },
      ],
    });
    expect(precalcSolDetails?.planetCompositionBreakdown).toEqual([
      { composition: 'terrestrial', count: 4 },
      { composition: 'ice-giant', count: 2 },
      { composition: 'gas-giant', count: 2 },
    ]);
    expect(precalcSolDetails?.planetCompositionSummary).toBe(
      '8 planets (4 terrestrial · 2 ice-giant · 2 gas-giant · Habitable zone candidate)',
    );
    expect(precalcSolDetails?.tags).toEqual([
      'HomeSystem',
      'SolarNeighborhood10pc',
      'NakedEye',
      'HabitableCandidate',
    ]);

    // buildSystemViewBreadcrumbs covers both system root and sub-element focus (never includes focused entity)
    expect(buildSystemViewBreadcrumbs(starDetails, 'tau-ceti', true)).toEqual([
      { label: 'Galaxy', href: '/galaxy' },
      { label: 'Tau Ceti' },
    ]);
    expect(buildSystemViewBreadcrumbs(null, 'tau-ceti', false)).toEqual([
      { label: 'Galaxy', href: '/galaxy' },
      { label: 'Tau Ceti' },
    ]);
    expect(buildPlanetViewBreadcrumbs(null, null, 'earth', false)).toEqual([
      { label: 'Galaxy', href: '/galaxy' },
      { label: 'System', href: '/system/system' },
      { label: 'Earth' },
    ]);
  });
});

describe('Orbital Schematic Domain and Component Boundary (DEC-014)', () => {
  it('builds system orbital schematic with precalculated orbital rank r and region overlaps', () => {
    // Sol system summary with Earth, Ceres, Pluto, Voyager 1
    const solDetails = buildFocusedEntityDetails({
      focusedEntity: null,
      urlSystemSlug: 'sol',
      corpus: SAMPLE_CORPUS,
      summaryNode: {
        id: 'sol',
        name: 'Sol',
        spect: 'G2V',
        dist: 0,
        starCount: 1,
        planetCount: 8,
        mag: -26.74,
        absmag: 4.83,
        x: 0,
        y: 0,
        z: 0,
        hasHabitableCandidate: true,
        sectorId: 'SEC-0-0-0',
      },
    });

    const solBodies = buildSystemBodiesSummary({
      details: solDetails,
      corpus: SAMPLE_CORPUS,
    });

    const schematic = buildSystemOrbitalSchematic(solBodies, SAMPLE_CORPUS);
    expect(schematic).not.toBeNull();
    expect(schematic?.scope).toBe('system');
    expect(schematic?.systemId).toBe('sol');
    expect(schematic?.items.length).toBeGreaterThan(0);

    // Primary star at rank 0
    const starItem = schematic?.items.find((i) => i.kind === 'star');
    expect(starItem).toMatchObject({
      id: 'sol-A',
      kind: 'star',
      orbitRank: 0,
      summaryLabel: 'Component A · G2V',
    });

    // Earth at rank 3 with habitable zone region and nested moon children
    const earthItem = schematic?.items.find((i) => i.id === 'earth');
    expect(earthItem).toMatchObject({
      id: 'earth',
      kind: 'planet',
      orbitRank: 3,
      inHabitableZone: true,
      region: 'habitable-zone',
    });
    expect(earthItem?.children).toHaveLength(1);
    expect(earthItem?.children?.[0]).toMatchObject({
      id: 'moon',
      name: 'Moon',
      kind: 'moon',
      orbitRank: 1,
    });

    // Ceres at rank 5 in asteroid belt
    const ceresItem = schematic?.items.find((i) => i.id === 'ceres');
    expect(ceresItem).toMatchObject({
      id: 'ceres',
      kind: 'dwarf-planet',
      orbitRank: 5,
      region: 'asteroid-belt',
    });

    // Pluto at rank 10 in kuiper belt
    const plutoItem = schematic?.items.find((i) => i.id === 'pluto');
    expect(plutoItem).toMatchObject({
      id: 'pluto',
      kind: 'dwarf-planet',
      orbitRank: 10,
      region: 'kuiper-belt',
    });

    // Verify ordering: star (0) < earth (3) < ceres (5) < pluto (10)
    const itemIds = schematic?.items.map((i) => i.id);
    expect(itemIds?.indexOf('sol-A')).toBeLessThan(itemIds?.indexOf('earth')!);
    expect(itemIds?.indexOf('earth')).toBeLessThan(itemIds?.indexOf('ceres')!);
    expect(itemIds?.indexOf('ceres')).toBeLessThan(itemIds?.indexOf('pluto')!);
  });

  it('builds planetary orbital schematic with host at rank 0 and orbiting bodies sorted by r', () => {
    const earthDetails = buildFocusedEntityDetails({
      focusedEntity: null,
      urlPlanetSlug: 'earth',
      corpus: SAMPLE_CORPUS,
      summaryNode: {
        id: 'sol',
        name: 'Sol',
        spect: 'G2V',
        dist: 0,
        starCount: 1,
        planetCount: 8,
        mag: -26.74,
        absmag: 4.83,
        x: 0,
        y: 0,
        z: 0,
        hasHabitableCandidate: true,
        sectorId: 'SEC-0-0-0',
      },
    });

    const planetaryBodies = buildPlanetaryBodiesSummary({
      details: earthDetails,
      urlPlanetSlug: 'earth',
      corpus: SAMPLE_CORPUS,
    });

    const schematic = buildPlanetaryOrbitalSchematic(planetaryBodies, SAMPLE_CORPUS);
    expect(schematic).not.toBeNull();
    expect(schematic?.scope).toBe('planet');
    expect(schematic?.planetId).toBe('earth');

    // Host Earth at rank 0, in habitable zone
    expect(schematic?.items[0]).toMatchObject({
      id: 'earth',
      kind: 'planet',
      orbitRank: 0,
      inHabitableZone: true,
      region: 'habitable-zone',
    });

    // Moon at rank 1
    const moonItem = schematic?.items.find((i) => i.id === 'moon');
    expect(moonItem).toMatchObject({
      id: 'moon',
      kind: 'moon',
      orbitRank: 1,
    });
  });

  it('renders <OrbitalSchematicPanel />, <OrbitalSchematicList />, and <OrbitalSchematicItem /> with semantic attributes and badges', () => {
    // Null summary returns empty string
    expect(renderToString(createElement(OrbitalSchematicPanel, { elements: null }))).toBe('');

    // System summary rendering
    const dummySystemSummary: OrbitalSchematicSummary = {
      scope: 'system',
      systemId: 'sol',
      systemName: 'Sol',
      items: [
        {
          id: 'sol',
          name: 'Sol',
          href: '/system/sol?focus=sol',
          kind: 'star',
          orbitRank: 0,
          summaryLabel: 'Component A · G2V',
          inHabitableZone: false,
          isFocused: false,
          isSelected: false,
        },
        {
          id: 'earth',
          name: 'Earth',
          href: '/planet/earth',
          kind: 'planet',
          orbitRank: 3,
          summaryLabel: 'terrestrial',
          inHabitableZone: true,
          region: 'habitable-zone',
          isFocused: true,
          isSelected: true,
          children: [
            {
              id: 'moon',
              name: 'Moon',
              href: '/planet/earth?focus=moon',
              kind: 'moon',
              orbitRank: 1,
              summaryLabel: 'Moon',
              inHabitableZone: true,
              region: 'habitable-zone',
              isFocused: false,
              isSelected: false,
            },
          ],
        },
        {
          id: 'ceres',
          name: 'Ceres',
          href: '/system/sol?focus=ceres',
          kind: 'dwarf-planet',
          orbitRank: 5,
          summaryLabel: 'Dwarf Planet',
          inHabitableZone: false,
          region: 'asteroid-belt',
          isFocused: false,
          isSelected: false,
        },
        {
          id: 'pluto',
          name: 'Pluto',
          href: '/system/sol?focus=pluto',
          kind: 'dwarf-planet',
          orbitRank: 10,
          summaryLabel: 'Dwarf Planet',
          inHabitableZone: false,
          region: 'kuiper-belt',
          isFocused: false,
          isSelected: false,
        },
      ],
    };

    const html = renderToString(createElement(OrbitalSchematicPanel, { elements: dummySystemSummary }));
    expect(html).toContain('data-testid="orbital-schematic-panel"');
    expect(html).toContain('data-scope="system"');
    expect(html).toContain('data-system-id="sol"');
    expect(html).toContain('Orbital Schematic');
    expect(html).toContain('data-testid="orbital-schematic-list"');
    expect(html).toContain('data-testid="orbital-schematic-item"');
    expect(html).toContain('data-entity-id="earth"');
    expect(html).toContain('data-kind="planet"');
    expect(html).toContain('data-orbit-rank="3"');
    expect(html).toContain('data-region="habitable-zone"');
    expect(html).toContain('data-in-habitable-zone="true"');
    expect(html).toContain('data-focused="true"');
    expect(html).toContain('data-selected="true"');
    expect(html).toContain('Habitable zone');
    expect(html).toContain('Asteroid belt');
    expect(html).toContain('Kuiper belt');

    // Guide badge links (DEC-024)
    expect(html).toContain('data-testid="orbital-schematic-spectral-link"');
    expect(html).toContain('data-testid="orbital-schematic-planet-type-link"');
    expect(html).toContain('data-testid="orbital-schematic-habitable-link"');
    expect(html).toContain('href="/guide/planet-types/terrestrial"');
    expect(html).toContain('href="/galaxy?select=tag:habitable-candidate"');

    // Nested moon rendering (DEC-024)
    expect(html).toContain('data-entity-id="moon"');
    expect(html).toContain('data-kind="moon"');

    // List composition
    const listHtml = renderToString(
      createElement(OrbitalSchematicList, { items: dummySystemSummary.items }),
    );
    expect(listHtml).toContain('data-testid="orbital-schematic-list"');

    // Individual item composition
    const singleItemHtml = renderToString(
      createElement(OrbitalSchematicItem, { item: dummySystemSummary.items[2] }),
    );
    expect(singleItemHtml).toContain('data-entity-id="ceres"');
    expect(singleItemHtml).toContain('data-region="asteroid-belt"');
    expect(singleItemHtml).toContain('Asteroid belt');
  });
});

describe('Focus Preview Domain and Component Boundary (DEC-016)', () => {
  it('buildFocusedPreviewSummary produces correct previewMode, primary telemetry, and orbit elements across all modes', () => {
    // 1. null details returns null
    expect(buildFocusedPreviewSummary(null)).toBeNull();

    // 2. System mode ('system-orbits')
    const systemDetails = buildFocusedEntityDetails({
      focusedEntity: {
        id: 'sol',
        name: 'Sol',
        position: [0, 0, 0],
        classification: 'stellar-system',
      },
      corpus: SAMPLE_CORPUS,
      urlSystemSlug: 'sol',
      hasExplicitFocus: true,
      summaryNode: {
        id: 'sol',
        name: 'Sol',
        spect: 'G2V',
        dist: 0,
        starCount: 1,
        planetCount: 8,
        mag: -26.74,
        absmag: 4.83,
        x: 0,
        y: 0,
        z: 0,
        hasHabitableCandidate: true,
        sectorId: 'SEC-0-0-0',
      },
    });

    const systemPreview = buildFocusedPreviewSummary(systemDetails);
    expect(systemPreview).not.toBeNull();
    expect(systemPreview?.previewMode).toBe('system-orbits');
    expect(systemPreview?.targetId).toBe('sol');
    expect(systemPreview?.systemId).toBe('sol');
    expect(systemPreview?.orbitElements.length).toBeGreaterThan(0);
    const earthElement = systemPreview?.orbitElements.find((e) => e.id === 'earth');
    expect(earthElement).toMatchObject({
      id: 'earth',
      kind: 'planet',
      inHabitableZone: true,
    });

    // 3. Planet mode ('planetary-system')
    const planetDetails = buildFocusedEntityDetails({
      focusedEntity: {
        id: 'earth',
        name: 'Earth',
        position: [0, 0, 0],
        classification: 'terrestrial',
      },
      corpus: SAMPLE_CORPUS,
      urlSystemSlug: 'sol',
      urlPlanetSlug: 'earth',
      hasExplicitFocus: true,
      entityDetail: {
        kind: 'solar-body',
        record: {
          id: 'earth',
          name: 'Earth',
          classification: 'Planet',
          meanRadiusKm: 6371,
          orbit: {
            semiMajorAxis: 1.0,
            eccentricity: 0.0167,
            inclination: 0.00005,
            periodDays: 365.25,
            ascendingNode: 0,
            argumentOfPeriapsis: 102.9,
            meanAnomaly: 100.46,
          },
        },
      },
    });

    const planetPreview = buildFocusedPreviewSummary(planetDetails);
    expect(planetPreview).not.toBeNull();
    expect(planetPreview?.previewMode).toBe('planetary-system');
    expect(planetPreview?.targetId).toBe('earth');
    expect(planetPreview?.primarySemiMajorAxisAu).toBe(1.0);
    expect(planetPreview?.primaryEccentricity).toBe(0.0167);
    expect(planetPreview?.primaryInclinationDeg).toBe(0.00005);
    // Orbit elements should contain moons
    const moonElement = planetPreview?.orbitElements.find((e) => e.id === 'moon');
    expect(moonElement).toMatchObject({
      id: 'moon',
      kind: 'moon',
      orbitRank: 1,
      inHabitableZone: false,
    });

    // 4. Object orbit mode ('object-orbit') for minor body
    const minorBodyDetails = buildFocusedEntityDetails({
      focusedEntity: {
        id: 'ceres',
        name: 'Ceres',
        position: [0, 0, 0],
      },
      corpus: SAMPLE_CORPUS,
      urlSystemSlug: 'sol',
      hasExplicitFocus: true,
    });

    const ceresDetailRecord = {
      kind: 'solar-body' as const,
      record: {
        id: 'ceres',
        name: 'Ceres',
        classification: 'DwarfPlanet' as const,
        meanRadiusKm: 469.7,
        orbit: {
          semiMajorAxis: 2.77,
          eccentricity: 0.076,
          inclination: 10.59,
          periodDays: 1682,
          ascendingNode: 80.3,
          argumentOfPeriapsis: 73.1,
          meanAnomaly: 77.4,
        },
      },
    };

    const minorBodyPreview = buildFocusedPreviewSummary(minorBodyDetails, ceresDetailRecord);
    expect(minorBodyPreview).not.toBeNull();
    expect(minorBodyPreview?.previewMode).toBe('object-orbit');
    expect(minorBodyPreview?.targetId).toBe('ceres');
    expect(minorBodyPreview?.primarySemiMajorAxisAu).toBe(2.77);
    expect(minorBodyPreview?.primaryEccentricity).toBe(0.076);
    expect(minorBodyPreview?.primaryInclinationDeg).toBe(10.59);
    expect(minorBodyPreview?.orbitElements).toEqual([]);
  });

  it('renders <PreviewPanel /> with semantic attributes, telemetry, and orbit elements, and hides when preview is null', () => {
    // 1. null preview returns empty markup
    expect(renderToString(createElement(PreviewPanel, { preview: null }))).toBe('');

    // 2. Populated preview rendering
    const dummyPreview: FocusedPreviewSummary = {
      targetId: 'earth',
      targetName: 'Earth',
      systemId: 'sol',
      systemName: 'Sol',
      focusedKind: 'planet',
      previewMode: 'planetary-system',
      primarySemiMajorAxisAu: 1.0,
      primaryEccentricity: 0.0167,
      primaryInclinationDeg: 0.0005,
      orbitElements: [
        {
          id: 'moon',
          name: 'Moon',
          kind: 'moon',
          orbitRank: 1,
          semiMajorAxisAu: 0.00257,
          inHabitableZone: false,
        },
      ],
    };

    const html = renderToString(createElement(PreviewPanel, { preview: dummyPreview }));
    expect(html).toContain('data-testid="preview-panel"');
    expect(html).toContain('data-target-id="earth"');
    expect(html).toContain('data-focused-kind="planet"');
    expect(html).toContain('data-preview-mode="planetary-system"');
    expect(html).toContain('Focus Preview');
    expect(html).toContain('data-testid="preview-canvas-slot"');
    expect(html).toContain('data-testid="preview-target-title"');
    expect(html).toContain('data-testid="preview-target-name"');
    expect(html).toContain('Earth');
    expect(html).toContain('planetary-system');
    expect(html).toContain('data-testid="preview-primary-orbit-telemetry"');
    expect(html).toContain('Semi-Major Axis (a)');
    expect(html).toContain('AU');
    expect(html).toContain('0.0167');
    expect(html).toContain('Inclination (i)');
    expect(html).toContain('°');
    expect(html).toContain('href="/guide/metrics/semi-major-axis?focus=');
    expect(html).toContain('href="/guide/metrics/orbital-inclination?focus=');
    expect(html).toContain('data-testid="preview-orbits-list"');
    expect(html).toContain('data-testid="preview-orbit-item"');
    expect(html).toContain('data-entity-id="moon"');
    expect(html).toContain('data-kind="moon"');
    expect(html).toContain('data-orbit-rank="1"');
    expect(html).toContain('Moon');
  });

  it('integrates <PreviewPanel /> across GalaxyView, SystemView, and PlanetView with focus state', () => {
    // When visiting SystemView or PlanetView without ?focus=, PreviewPanel is hidden
    const unfocusedStore = createSpatialEntityStore();
    const systemUnfocusedHtml = renderToString(
      createElement(
        SpatialEntityProvider,
        { store: unfocusedStore },
        createElement(SystemView, {
          initialCorpus: SAMPLE_CORPUS,
          locationPathname: '/system/sol',
          locationSearch: '',
        }),
      ),
    );
    expect(systemUnfocusedHtml).not.toContain('data-testid="preview-panel"');

    const planetUnfocusedHtml = renderToString(
      createElement(
        SpatialEntityProvider,
        { store: unfocusedStore },
        createElement(PlanetView, {
          initialCorpus: SAMPLE_CORPUS,
          locationPathname: '/planet/earth',
          locationSearch: '',
        }),
      ),
    );
    expect(planetUnfocusedHtml).not.toContain('data-testid="preview-panel"');

    // When ?focus= is present, PreviewPanel is rendered
    const focusedStore = createSpatialEntityStore({
      focusedId: 'earth',
    });
    focusedStore.getState().registerEntity({
      id: 'earth',
      name: 'Earth',
      position: new THREE.Vector3(0, 0, 0),
      classification: 'terrestrial',
    });

    const systemFocusedHtml = renderToString(
      createElement(
        SpatialEntityProvider,
        { store: focusedStore },
        createElement(SystemView, {
          initialCorpus: SAMPLE_CORPUS,
          locationPathname: '/system/sol',
          locationSearch: '?focus=earth',
        }),
      ),
    );
    expect(systemFocusedHtml).toContain('data-testid="preview-panel"');
    expect(systemFocusedHtml).toContain('data-preview-mode="planetary-system"');

    const planetFocusedHtml = renderToString(
      createElement(
        SpatialEntityProvider,
        { store: focusedStore },
        createElement(PlanetView, {
          initialCorpus: SAMPLE_CORPUS,
          locationPathname: '/planet/earth',
          locationSearch: '?focus=earth',
        }),
      ),
    );
    expect(planetFocusedHtml).toContain('data-testid="preview-panel"');
  });
});

describe('Minimap Global Spatial Orientation Panel (DEC-017)', () => {
  it('buildGalaxyMinimapOrientation produces correct origin anchor, coordinates, and markers', () => {
    // 1. Unfocused state
    const unfocusedOrientation = buildGalaxyMinimapOrientation(undefined, [], null);
    expect(unfocusedOrientation.scope).toBe('galaxy');
    expect(unfocusedOrientation.anchorId).toBe('sol');
    expect(unfocusedOrientation.anchorName).toBe('Sol');
    expect(unfocusedOrientation.distanceFromOriginPc).toBe(0);
    expect(unfocusedOrientation.focusedMarker).toBeNull();
    expect(unfocusedOrientation.markers).toHaveLength(1);
    expect(unfocusedOrientation.markers[0].role).toBe('origin');
    expect(unfocusedOrientation.markers[0].id).toBe('sol');

    // 2. Focused and selected state
    const focusedOrientation = buildGalaxyMinimapOrientation(
      {
        id: 'alpha-centauri',
        name: 'Alpha Centauri',
        position: [-0.47, 1.32, -0.33],
        classification: 'stellar-system',
      },
      [
        {
          id: 'sirius',
          name: 'Sirius',
          position: [-1.6, -1.9, -1.1],
          classification: 'stellar-system',
        },
      ],
      null,
    );
    expect(focusedOrientation.focusedMarker?.id).toBe('alpha-centauri');
    expect(focusedOrientation.focusedMarker?.role).toBe('focused');
    expect(focusedOrientation.focusedMarker?.distanceFromOriginPc).toBe(1.44);
    expect(focusedOrientation.selectedMarkers).toHaveLength(1);
    expect(focusedOrientation.selectedMarkers[0].id).toBe('sirius');
    expect(focusedOrientation.selectedMarkers[0].role).toBe('selected');
    expect(focusedOrientation.markers).toHaveLength(3); // origin + focused + selected
  });

  it('buildSystemMinimapOrientation produces correct anchor, orbital metrics, and markers', () => {
    const dummySystemBodies = {
      scope: 'system' as const,
      systemId: 'sol',
      systemName: 'Sol',
      systemHref: '/system/sol',
      stars: [
        {
          id: 'sol',
          name: 'Sol',
          componentDesignation: 'A',
          spectralType: 'G2V',
          mag: -26.74,
          absmag: 4.83,
        },
      ],
      planets: [
        {
          id: 'earth',
          name: 'Earth',
          composition: 'terrestrial' as const,
          semiMajorAxisAu: 1.0,
          isHabitableCandidate: true,
        },
        {
          id: 'jupiter',
          name: 'Jupiter',
          composition: 'gas-giant' as const,
          semiMajorAxisAu: 5.2,
          isHabitableCandidate: false,
        },
      ],
      moonsAndDwarfPlanets: [
        { id: 'ceres', name: 'Ceres', href: '/system/sol?focus=ceres', categoryLabel: 'Dwarf Planet' },
      ],
      minorBodiesAndSpacecraft: [
        { id: 'voyager-1', name: 'Voyager 1', href: '/system/sol?focus=voyager-1', categoryLabel: 'Spacecraft' },
      ],
      canonAnnotations: [],
    };

    const dummySchematic: OrbitalSchematicSummary = {
      scope: 'system',
      systemId: 'sol',
      systemName: 'Sol',
      habitableZoneAu: [0.95, 1.37],
      items: [],
    };

    const orientation = buildSystemMinimapOrientation(
      dummySystemBodies,
      dummySchematic,
      null,
      {
        id: 'earth',
        name: 'Earth',
        position: [1, 0, 0],
        classification: 'terrestrial',
      },
      [],
    );

    expect(orientation.scope).toBe('system');
    expect(orientation.anchorId).toBe('sol');
    expect(orientation.outerOrbitalRadiusAu).toBe(5.2);
    expect(orientation.habitableZoneAu).toEqual([0.95, 1.37]);
    expect(orientation.orbitingBodyCount).toBe(4); // 2 planets + 1 moon/dwarf + 1 minor/craft
    expect(orientation.focusedMarker?.id).toBe('earth');
    expect(orientation.focusedMarker?.semiMajorAxisAu).toBe(1.0);
    expect(orientation.markers).toHaveLength(2); // anchor (Sol) + focused (Earth)
  });

  it('buildPlanetMinimapOrientation produces correct anchor, parent semi-major axis, and orbiting counts', () => {
    const dummyPlanetaryBodies = {
      scope: 'planet' as const,
      planetId: 'earth',
      planetName: 'Earth',
      planetHref: '/planet/earth',
      systemId: 'sol',
      systemName: 'Sol',
      systemHref: '/system/sol',
      planetDetail: {
        id: 'earth',
        name: 'Earth',
        composition: 'terrestrial' as const,
        semiMajorAxisAu: 1.0,
        isHabitableCandidate: true,
      },
      moons: [
        { id: 'moon', name: 'Moon', href: '/planet/earth?focus=moon', categoryLabel: 'Moon' },
      ],
      minorBodiesAndSpacecraft: [
        { id: 'iss', name: 'ISS', href: '/planet/earth?focus=iss', categoryLabel: 'Spacecraft' },
      ],
      canonAnnotations: [],
    };

    const orientation = buildPlanetMinimapOrientation(
      dummyPlanetaryBodies,
      {
        id: 'moon',
        name: 'Moon',
        position: [0.00257, 0, 0],
        classification: 'hazard',
      },
      [],
    );

    expect(orientation.scope).toBe('planet');
    expect(orientation.anchorId).toBe('earth');
    expect(orientation.parentSemiMajorAxisAu).toBe(1.0);
    expect(orientation.orbitingBodyCount).toBe(2);
    expect(orientation.focusedMarker?.id).toBe('moon');
    expect(orientation.markers).toHaveLength(2); // anchor (Earth) + focused (Moon)
  });

  it('<Minimap /> component renders semantic HTML, badges, telemetry, and marker lists', () => {
    // 1. null orientation renders null
    const nullHtml = renderToString(createElement(Minimap, { orientation: null }));
    expect(nullHtml).toBe('');

    // 2. Full orientation rendering
    const dummyOrientation: MinimapOrientationSummary = {
      scope: 'planet',
      anchorId: 'earth',
      anchorName: 'Earth',
      systemId: 'sol',
      systemName: 'Sol',
      parentSemiMajorAxisAu: 1.0,
      orbitingBodyCount: 2,
      focusedMarker: {
        id: 'moon',
        name: 'Moon',
        kind: 'moon',
        role: 'focused',
        href: '/planet/earth?focus=moon',
      },
      selectedMarkers: [],
      markers: [
        {
          id: 'earth',
          name: 'Earth',
          kind: 'planet',
          role: 'anchor',
          href: '/planet/earth?focus=earth',
          semiMajorAxisAu: 1.0,
        },
        {
          id: 'moon',
          name: 'Moon',
          kind: 'moon',
          role: 'focused',
          href: '/planet/earth?focus=moon',
        },
      ],
    };

    const html = renderToString(createElement(Minimap, { orientation: dummyOrientation }));
    expect(html).toContain('data-testid="minimap-panel"');
    expect(html).toContain('data-scope="planet"');
    expect(html).toContain('data-anchor-id="earth"');
    expect(html).toContain('data-system-id="sol"');
    expect(html).toContain('data-testid="minimap-viewport-slot"');
    expect(html).toContain('data-testid="minimap-anchor-name"');
    expect(html).toContain('Earth');
    expect(html).toContain('Sol');
    expect(html).toContain('data-testid="minimap-telemetry"');
    expect(html).toContain('Semi-Major Axis (a)');
    expect(html).toContain('AU');
    expect(html).toContain('data-testid="minimap-orbiting-count"');
    expect(html).toContain('>2</span>');
    expect(html).toContain('orbiting bodies</span>');
    expect(html).toContain('data-testid="minimap-markers-list"');
    expect(html).toContain('data-marker-id="earth"');
    expect(html).toContain('data-marker-role="anchor"');
    expect(html).toContain('anchor');
    expect(html).toContain('data-marker-id="moon"');
    expect(html).toContain('data-marker-role="focused"');
    expect(html).toContain('focused');
  });

  it('renders <Minimap /> unconditionally across GalaxyView, SystemView, and PlanetView even without ?focus=', () => {
    const store = createSpatialEntityStore();

    // 1. GalaxyView without ?focus=
    const galaxyHtml = renderToString(
      createElement(
        SpatialEntityProvider,
        { store },
        createElement(GalaxyView, {
          initialCorpus: SAMPLE_CORPUS,
          locationPathname: '/galaxy',
          locationSearch: '',
        }),
      ),
    );
    expect(galaxyHtml).toContain('data-testid="minimap-panel"');
    expect(galaxyHtml).toContain('data-scope="galaxy"');
    expect(galaxyHtml).not.toContain('data-testid="details-panel"');

    // 2. SystemView without ?focus=
    const systemHtml = renderToString(
      createElement(
        SpatialEntityProvider,
        { store },
        createElement(SystemView, {
          initialCorpus: SAMPLE_CORPUS,
          locationPathname: '/system/sol',
          locationSearch: '',
        }),
      ),
    );
    expect(systemHtml).toContain('data-testid="minimap-panel"');
    expect(systemHtml).toContain('data-scope="system"');
    expect(systemHtml).not.toContain('data-testid="details-panel"');

    // 3. PlanetView without ?focus=
    const planetHtml = renderToString(
      createElement(
        SpatialEntityProvider,
        { store },
        createElement(PlanetView, {
          initialCorpus: SAMPLE_CORPUS,
          locationPathname: '/planet/earth',
          locationSearch: '',
        }),
      ),
    );
    expect(planetHtml).toContain('data-testid="minimap-panel"');
    expect(planetHtml).toContain('data-scope="planet"');
    expect(planetHtml).not.toContain('data-testid="details-panel"');
  });
});

describe('Breadth-First Enhancements (DEC-018, DEC-019, DEC-020)', () => {
  it('DEC-018: verifies Canon Layers section is removed from BodiesPanel', () => {
    const store = createSpatialEntityStore();
    const systemHtml = renderToString(
      createElement(
        SpatialEntityProvider,
        { store },
        createElement(SystemView, {
          initialCorpus: SAMPLE_CORPUS,
          locationPathname: '/system/sol',
          locationSearch: '',
        }),
      ),
    );
    expect(systemHtml).not.toContain('data-testid="bodies-canon-section"');
  });

  it('DEC-019: <ControlBar /> renders time controller, mode group, and shortcuts', () => {
    const html = renderToString(createElement(ControlBar, { scope: 'galaxy' }));
    expect(html).toContain('data-testid="control-bar"');
    expect(html).toContain('data-scope="galaxy"');
    expect(html).toContain('data-testid="control-bar-time-controller"');
    expect(html).toContain('data-testid="control-bar-play-pause"');
    expect(html).toContain('data-testid="control-bar-time-scrubber"');
    expect(html).toContain('data-testid="control-bar-datetime-picker"');
    expect(html).toContain('data-testid="control-bar-mode-group"');
    expect(html).toContain('data-testid="control-bar-projection-3d"');
    expect(html).toContain('data-testid="control-bar-projection-top-down"');
    expect(html).toContain('data-testid="control-bar-toggle-orbits"');
    expect(html).toContain('data-testid="control-bar-toggle-grid"');
    expect(html).toContain('data-testid="control-bar-toggle-labels"');
    expect(html).toContain('data-testid="control-bar-shortcuts-list"');
    expect(html).toContain('Search');
    expect(html).toContain('Play/Pause');
    expect(html).toContain('Reset View');
    expect(html).toContain('Clear Focus');
  });

  it('DEC-020: mounts <CanvasLayer />, <ControlBar />, and scoped <Search.Panel /> across views', () => {
    const directCanvasHtml = renderToString(createElement(CanvasLayer, { scope: 'galaxy' }));
    expect(directCanvasHtml).toContain('data-testid="canvas-layer"');
    expect(directCanvasHtml).toContain('data-scope="galaxy"');

    const store = createSpatialEntityStore();

    // GalaxyView
    const galaxyHtml = renderToString(
      createElement(
        SpatialEntityProvider,
        { store },
        createElement(GalaxyView, {
          initialCorpus: SAMPLE_CORPUS,
          locationPathname: '/galaxy',
          locationSearch: '',
        }),
      ),
    );
    expect(galaxyHtml).toContain('data-testid="canvas-layer"');
    expect(galaxyHtml).toContain('data-scope="galaxy"');
    expect(galaxyHtml).toContain('data-testid="control-bar"');
    expect(galaxyHtml).toContain('data-testid="search-panel"');
    expect(galaxyHtml).toContain('data-scope="galaxy"');

    // SystemView
    const systemHtml = renderToString(
      createElement(
        SpatialEntityProvider,
        { store },
        createElement(SystemView, {
          initialCorpus: SAMPLE_CORPUS,
          locationPathname: '/system/sol',
          locationSearch: '',
        }),
      ),
    );
    expect(systemHtml).toContain('data-testid="canvas-layer"');
    expect(systemHtml).toContain('data-scope="system"');
    expect(systemHtml).toContain('data-target-id="sol"');
    expect(systemHtml).toContain('data-testid="control-bar"');
    expect(systemHtml).toContain('data-testid="search-panel"');
    expect(systemHtml).toContain('data-scope="system"');

    // PlanetView
    const planetHtml = renderToString(
      createElement(
        SpatialEntityProvider,
        { store },
        createElement(PlanetView, {
          initialCorpus: SAMPLE_CORPUS,
          locationPathname: '/planet/earth',
          locationSearch: '',
        }),
      ),
    );
    expect(planetHtml).toContain('data-testid="canvas-layer"');
    expect(planetHtml).toContain('data-scope="planet"');
    expect(planetHtml).toContain('data-target-id="earth"');
    expect(planetHtml).toContain('data-testid="control-bar"');
    expect(planetHtml).toContain('data-testid="search-panel"');
    expect(planetHtml).toContain('data-scope="planet"');

    // SearchView
    const searchHtml = renderToString(createElement(SearchView));
    expect(searchHtml).toContain('data-testid="search-panel"');
    expect(searchHtml).toContain('data-scope="search"');
  });
});

describe('3D View Reference Point, Camera URL State & Detent Swap (DEC-021, DEC-022)', () => {
  it('DEC-021: extractUrlSceneCameraState extracts center and relative spherical / cartesian camera parameters', () => {
    // Empty search string
    expect(extractUrlSceneCameraState('')).toEqual({});
    expect(extractUrlSceneCameraState('?')).toEqual({});

    // Full camera parameters
    const parsed = extractUrlSceneCameraState(
      '?center=tau-ceti&x=10.5&y=-20.2&z=30&az=45.5&el=-15.2&dist=250.75&zoom=3',
    );
    expect(parsed).toEqual({
      center: 'tau-ceti',
      x: 10.5,
      y: -20.2,
      z: 30,
      az: 45.5,
      el: -15.2,
      dist: 250.75,
      zoom: 3,
    });

    // Zero angles and partial cartesian
    const zeroState = extractUrlSceneCameraState('?az=0&el=0&dist=0&x=0');
    expect(zeroState.az).toBe(0);
    expect(zeroState.el).toBe(0);
    expect(zeroState.dist).toBe(0);
    expect(zeroState.x).toBe(0);
    expect(zeroState.y).toBeUndefined();

    // Invalid / non-numeric params
    const invalidState = extractUrlSceneCameraState('?az=invalid&dist=NaN&center=');
    expect(invalidState.az).toBeUndefined();
    expect(invalidState.dist).toBeUndefined();
    expect(invalidState.center).toBeUndefined();
  });

  it('DEC-021: buildCenterEntityHref constructs valid center URL for galaxy, system, and planet scopes', () => {
    expect(buildCenterEntityHref('galaxy', undefined, undefined)).toBeUndefined();
    expect(buildCenterEntityHref('galaxy', undefined, 'tau-ceti')).toBe(
      '/galaxy?center=tau-ceti&focus=tau-ceti',
    );
    expect(buildCenterEntityHref('system', 'sol', 'earth')).toBe(
      '/system/sol?center=earth&focus=earth',
    );
    expect(buildCenterEntityHref('planet', 'earth', 'moon')).toBe(
      '/planet/earth?center=moon&focus=moon',
    );
    // Fallback if scopeTargetId is omitted in system/planet scopes
    expect(buildCenterEntityHref('system', undefined, 'tau-ceti')).toBe(
      '/galaxy?center=tau-ceti&focus=tau-ceti',
    );
  });

  it('DEC-021: buildFocusedEntityDetails populates centerHref', () => {
    const details = buildFocusedEntityDetails({
      focusedEntity: {
        id: 'tau-ceti',
        name: 'Tau Ceti',
        position: [-0.94, 2.37, -2.93],
        classification: 'stellar-system',
      },
      corpus: SAMPLE_CORPUS,
    });
    expect(details?.centerHref).toBe('/galaxy?center=tau-ceti&focus=tau-ceti');

    const systemPlanetDetails = buildFocusedEntityDetails({
      focusedEntity: {
        id: 'earth',
        name: 'Earth',
        position: [0, 0, 0],
        classification: 'terrestrial',
      },
      corpus: SAMPLE_CORPUS,
      urlSystemSlug: 'sol',
    });
    expect(systemPlanetDetails?.centerHref).toBe('/system/sol?center=earth&focus=earth');
  });

  it('DEC-021: buildGalaxyMinimapOrientation, buildSystemMinimapOrientation, and buildPlanetMinimapOrientation reflect cameraState and centerEntity', () => {
    const cameraState: SceneCameraUrlState = {
      center: 'tau-ceti',
      az: 120,
      el: 45,
      dist: 300,
    };
    const centerEntity = {
      id: 'tau-ceti',
      name: 'Tau Ceti',
      position: new THREE.Vector3(-0.94, 2.37, -2.93),
      classification: 'stellar-system' as const,
    };

    // Galaxy
    const galaxyOrientation = buildGalaxyMinimapOrientation(
      undefined,
      [],
      null,
      cameraState,
      centerEntity,
    );
    expect(galaxyOrientation.anchorId).toBe('tau-ceti');
    expect(galaxyOrientation.anchorName).toBe('Tau Ceti');
    expect(galaxyOrientation.coordinatesPc).toEqual([-0.94, 2.37, -2.93]);
    expect(galaxyOrientation.cameraAzimuthDeg).toBe(120);
    expect(galaxyOrientation.cameraElevationDeg).toBe(45);
    expect(galaxyOrientation.cameraDistance).toBe(300);

    // System
    const dummySystemBodies: SystemBodiesSummary = {
      scope: 'system',
      systemId: 'sol',
      systemName: 'Sol',
      systemHref: '/system/sol',
      stars: [],
      planets: [
        {
          id: 'earth',
          name: 'Earth',
          href: '/system/sol?focus=earth',
          composition: 'terrestrial',
          isHabitableCandidate: true,
          semiMajorAxisAu: 1.0,
        },
      ],
      moonsAndDwarfPlanets: [],
      minorBodiesAndSpacecraft: [],
      canonAnnotations: [],
    };
    const systemOrientation = buildSystemMinimapOrientation(
      dummySystemBodies,
      null,
      null,
      undefined,
      [],
      { center: 'earth', az: 120, el: 45, dist: 300 },
    );
    expect(systemOrientation.anchorId).toBe('earth');
    expect(systemOrientation.anchorName).toBe('Earth');
    expect(systemOrientation.cameraAzimuthDeg).toBe(120);
    expect(systemOrientation.cameraElevationDeg).toBe(45);
    expect(systemOrientation.cameraDistance).toBe(300);

    // Planet
    const dummyPlanetaryBodies: PlanetaryBodiesSummary = {
      scope: 'planet',
      planetId: 'earth',
      planetName: 'Earth',
      planetHref: '/planet/earth',
      systemId: 'sol',
      systemName: 'Sol',
      systemHref: '/system/sol',
      moons: [
        {
          id: 'moon',
          name: 'Moon',
          href: '/planet/earth?focus=moon',
          categoryLabel: 'Moon',
        },
      ],
      minorBodiesAndSpacecraft: [],
      canonAnnotations: [],
    };
    const planetOrientation = buildPlanetMinimapOrientation(
      dummyPlanetaryBodies,
      null,
      [],
      { center: 'moon', az: 120, el: 45, dist: 300 },
    );
    expect(planetOrientation.anchorId).toBe('moon');
    expect(planetOrientation.anchorName).toBe('Moon');
    expect(planetOrientation.cameraAzimuthDeg).toBe(120);
    expect(planetOrientation.cameraElevationDeg).toBe(45);
    expect(planetOrientation.cameraDistance).toBe(300);
  });

  it('DEC-021: <CanvasLayer /> renders data attributes for center and camera parameters', () => {
    const html = renderToString(
      createElement(CanvasLayer, {
        scope: 'galaxy',
        centerId: 'tau-ceti',
        centerCoordinates: [-0.94, 2.37, -2.93],
        cameraAzimuthDeg: 45,
        cameraElevationDeg: -15,
        cameraDistance: 150,
      }),
    );
    expect(html).toContain('data-testid="canvas-layer"');
    expect(html).toContain('data-center-id="tau-ceti"');
    expect(html).toContain('data-center-coords="-0.94,2.37,-2.93"');
    expect(html).toContain('data-camera-az="45"');
    expect(html).toContain('data-camera-el="-15"');
    expect(html).toContain('data-camera-dist="150"');
  });

  it('DEC-021: GalaxyView, SystemView, and PlanetView pass URL camera state to CanvasLayer and Minimap', () => {
    const store = createSpatialEntityStore();
    const searchString = '?center=tau-ceti&az=45&el=15&dist=100';

    const galaxyHtml = renderToString(
      createElement(
        SpatialEntityProvider,
        { store },
        createElement(GalaxyView, {
          initialCorpus: SAMPLE_CORPUS,
          locationPathname: '/galaxy',
          locationSearch: searchString,
        }),
      ),
    );
    expect(galaxyHtml).toContain('data-center-id="tau-ceti"');
    expect(galaxyHtml).toContain('data-camera-az="45"');
    expect(galaxyHtml).toContain('data-camera-el="15"');
    expect(galaxyHtml).toContain('data-camera-dist="100"');
  });

  it('DEC-022 & DEC-021: DetailsPanel renders Centre CTA and swaps Partial / Full detent contents', () => {
    const details = buildFocusedEntityDetails({
      focusedEntity: {
        id: 'earth',
        name: 'Earth',
        position: [0, 0, 0],
        classification: 'terrestrial',
      },
      corpus: SAMPLE_CORPUS,
      urlSystemSlug: 'sol',
      entityDetail: {
        kind: 'system',
        record: {
          id: 'sol',
          name: 'Sol',
          x: 0,
          y: 0,
          z: 0,
          dist: 0,
          sectorId: 'S-0',
          stars: [
            {
              id: 'sol',
              name: 'Sol',
              componentDesignation: 'A',
              spectralType: 'G2V',
              mag: -26.74,
              absmag: 4.83,
              massMsun: 1,
              radiusRsun: 1,
              luminosityLsun: 1,
              effectiveTempK: 5778,
            },
          ],
          planets: [
            {
              id: 'earth',
              name: 'Earth',
              letter: 'b',
              massMearth: 1.0,
              radiusRearth: 1.0,
              equilibriumTempK: 255,
              discoveryYear: 1900,
              orbit: {
                semiMajorAxis: 1.0,
                periodDays: 365.25,
                eccentricity: 0.0167,
                inclination: 0,
                ascendingNode: 0,
                argumentOfPeriapsis: 0,
                meanAnomaly: 0,
              },
            },
          ],
        },
      },
    });

    expect(details?.centerHref).toBe('/system/sol?center=earth&focus=earth');

    const html = renderToString(createElement(DetailsPanel, { details }));

    // 1. Centre button is rendered with centerHref
    expect(html).toContain('data-testid="details-button-center"');
    expect(html).toContain('href="/system/sol?center=earth&amp;focus=earth"');
    expect(html).toContain('Centre');

    // 2. Detents are present
    expect(html).toContain('data-testid="details-detent-partial"');
    expect(html).toContain('data-testid="details-detent-full"');

    const partialIdx = html.indexOf('data-testid="details-detent-partial"');
    const fullIdx = html.indexOf('data-testid="details-detent-full"');
    expect(partialIdx).toBeLessThan(fullIdx);

    // 3. DEC-022 layout:
    // In Partial detent (before fullIdx):
    // - CTAs (details-actions, details-button-center) are at the top
    // - Canon annotations (details-canon-section) follow immediately
    // - Orbiting bodies / Stars / Planets follow below
    const actionsIdx = html.indexOf('data-testid="details-cta-group"') !== -1
      ? html.indexOf('data-testid="details-cta-group"')
      : html.indexOf('data-testid="details-actions"');
    const canonIdx = html.indexOf('data-testid="details-canon-section"');
    const centerBtnIdx = html.indexOf('data-testid="details-button-center"');
    expect(actionsIdx).toBeGreaterThan(partialIdx);
    expect(centerBtnIdx).toBeGreaterThan(actionsIdx);
    expect(canonIdx).toBeGreaterThan(actionsIdx);
    expect(canonIdx).toBeLessThan(fullIdx);

    // In Full detent (after fullIdx):
    // - Intrinsic Telemetry (details-planet-telemetry-section)
    // - Astrometry (details-astrometry-section)
    const telemetryIdx = html.indexOf('data-testid="details-planet-telemetry-section"');
    const astrometryIdx = html.indexOf('data-testid="details-astrometry-section"');

    expect(telemetryIdx).toBeGreaterThan(fullIdx);
    expect(astrometryIdx).toBeGreaterThan(fullIdx);
  });
});

describe('Archetype 1 Search Trigger Coverage (GAP-01 through GAP-08 Verification)', () => {
  it('resolves every single evidence-based search trigger across all 5 categories in core.json', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const coreEnvelope = JSON.parse(
      fs.readFileSync(path.resolve('public/data/search/core.json'), 'utf-8'),
    );
    const coreCorpus: readonly CompactSearchEntry[] = coreEnvelope.d;

    const triggers = [
      // Category 1: Hard Sci-Fi Novels, Films, TV & Games
      'Project Hail Mary',
      'Tau Ceti',
      'Adrian',
      '40 Eridani',
      'Erid',
      'Keid',
      'Star Trek',
      'Vulcan',
      'NiVar',
      'Axanar',
      'Wolf 359',
      'Andoria',
      'Tellar',
      '61 Cygni',
      'Risa',
      'Three-Body Problem',
      'Trisolaris',
      'Alpha Centauri',
      'Avatar',
      'Pandora',
      'Polyphemus',
      'Halo',
      'Reach',
      'Harvest',
      'Dune',
      'Arrakis',
      'Caladan',
      'Giedi Prime',
      'The Expanse',
      'Bobiverse',
      'Rana',
      'Revelation Space',
      'Resurgam',
      'Yellowstone',
      "Sky's Edge",
      'Alien',
      'LV-426',
      'Zeta Reticuli',
      'Contact',
      'Vega',
      'Forbidden Planet',
      'Altair',
      '2001',
      'Aurora',
      'The Dispossessed',
      'Hyperion',
      'Foundation',
      // Category 2: Breaking Exoplanet News, JWST Targets & IAU NameExoWorlds
      'Proxima Centauri',
      'Proxima Centauri b',
      "Barnard's Star",
      "Barnard's Star b",
      'Lalande 21185',
      'Gl 411',
      'Epsilon Eridani',
      'Epsilon Eridani b',
      'Ran',
      'AEgir',
      'Lacaille 9352',
      'GJ 887 b',
      'Ross 128',
      'Ross 128 b',
      'Epsilon Indi',
      'Eps Ind Ab',
      'GJ 1061',
      "Luyten's Star",
      'GJ 273',
      "Teegarden's Star",
      "Teegarden's Star b",
      'HD 20794',
      'HD 20794 d',
      '82 G. Eridani',
      'TRAPPIST-1',
      'TRAPPIST-1 e',
      'LHS 475',
      'LHS 475 b',
      '55 Cancri',
      '55 Cancri e',
      'Copernicus',
      'Janssen',
      'GJ 1214',
      'GJ 1214 b',
      'LHS 1140',
      'LHS 1140 b',
      '51 Pegasi',
      '51 Pegasi b',
      'Helvetios',
      'Dimidium',
      'Beta Pictoris',
      'Beta Pictoris b',
      'HD 189733 b',
      'TOI-700',
      'TOI-700 d',
      'K2-18',
      'K2-18 b',
      'HR 8799',
      'HD 209458 b',
      'Osiris',
      'Kepler-186 f',
      'Kepler-452 b',
      'WASP-39 b',
      'WASP-96 b',
      'PSR B1257+12',
      // Category 3: Interstellar Missions, Spacecraft & SETI Benchmarks
      'Voyager',
      'Voyager 1',
      'Gliese 445',
      'Gl 445',
      'Voyager 2',
      'Ross 248',
      'GJ 905',
      'Pioneer 10',
      'Pioneer 11',
      'New Horizons',
      'JWST',
      'Breakthrough Starshot',
      'Project Daedalus',
      'Project Longshot',
      'Project Ozma',
      'Arecibo',
      'M13',
      'Hercules Cluster',
      'Wow! Signal',
      "Tabby's Star",
      // Category 4: Solar Neighbourhood (10 pc), Naked-Eye Superlatives & Deep-Sky
      'Rigil Kentaurus',
      'Alpha Centauri A',
      'Toliman',
      'Alpha-2 Centauri',
      'Luhman 16',
      'WISE 0855',
      'Gl 406',
      'Sirius',
      'UV Ceti',
      'Luyten 726-8',
      'Gl 65',
      'Ross 154',
      'Gl 729',
      'EZ Aquarii',
      'Struve 2398',
      'Groombridge 34',
      'DX Cancri',
      'YZ Ceti',
      'Procyon',
      "Kapteyn's Star",
      'Lacaille 8760',
      "Van Maanen's Star",
      'Canopus',
      'Arcturus',
      'Capella',
      'Aldebaran',
      'Spica',
      'Fomalhaut',
      'Regulus',
      'Achernar',
      'Betelgeuse',
      'Rigel',
      'Antares',
      'Deneb',
      'Polaris',
      'Pleiades',
      'M45',
      'Seven Sisters',
      'Hyades',
      'Praesepe',
      'Beehive Cluster',
      'M44',
      'Orion Nebula',
      'M42',
      'Crab Nebula',
      'M1',
      'Ring Nebula',
      'M57',
      'Dumbbell Nebula',
      'M27',
      'Eagle Nebula',
      'M16',
      'Lagoon Nebula',
      'M8',
      'Carina Nebula',
      'NGC 3372',
      'Veil Nebula',
      'Helix Nebula',
      'Omega Centauri',
      'Vela Supernova Remnant',
      'Vela Pulsar',
      'Geminga',
      'Local Interstellar Cloud',
      // Category 5: Local Solar System Benchmarks
      'Sol',
      'Sun',
      'Mercury',
      'Venus',
      'Earth',
      'Mars',
      'Jupiter',
      'Saturn',
      'Uranus',
      'Neptune',
      'Moon',
      'Luna',
      'Pluto',
      'Ceres',
      'Haumea',
      'Makemake',
      'Eris',
      'Sedna',
      'Quaoar',
      'Orcus',
      'Gonggong',
      'Io',
      'Europa',
      'Ganymede',
      'Callisto',
      'Phobos',
      'Deimos',
      'Titan',
      'Enceladus',
      'Triton',
      'Charon',
      'Mimas',
      'Tethys',
      'Dione',
      'Rhea',
      'Iapetus',
      'Phoebe',
      'Miranda',
      'Ariel',
      'Umbriel',
      'Titania',
      'Oberon',
      '4 Vesta',
      '2 Pallas',
      '10 Hygiea',
      '16 Psyche',
      '624 Hektor',
      '433 Eros',
      '99942 Apophis',
      '101955 Bennu',
      '162173 Ryugu',
      '25143 Itokawa',
      '65803 Didymos',
      '2060 Chiron',
      '486958 Arrokoth',
      '1P/Halley',
      '2P/Encke',
      '67P/Churyumov-Gerasimenko',
      'Oumuamua',
      '2I/Borisov',
      '3I/ATLAS',
    ];

    const missing: string[] = [];
    for (const term of triggers) {
      const res = executeCatalogSearch(coreCorpus, { query: term, filter: 'all' });
      if (res.totalMatches === 0) {
        missing.push(term);
      }
    }

    expect(missing).toEqual([]);
  }, 30000);
});

describe('Nested Moons, Scoped Star Focus & Contextual Details Drill-Down CTA (DEC-024, DEC-025, DEC-026)', () => {
  it('DEC-024: attaches nested moon children to host planets in buildSystemOrbitalSchematic and excludes minor bodies', () => {
    const solDetails = buildFocusedEntityDetails({
      focusedEntity: null,
      urlSystemSlug: 'sol',
      corpus: SAMPLE_CORPUS,
      summaryNode: {
        id: 'sol',
        name: 'Sol',
        spect: 'G2V',
        dist: 0,
        starCount: 1,
        planetCount: 8,
        mag: -26.74,
        absmag: 4.83,
        x: 0,
        y: 0,
        z: 0,
        hasHabitableCandidate: true,
        sectorId: 'SEC-0-0-0',
      },
    });

    const solBodies = buildSystemBodiesSummary({
      details: solDetails,
      corpus: SAMPLE_CORPUS,
    });

    const schematic = buildSystemOrbitalSchematic(solBodies, SAMPLE_CORPUS);
    expect(schematic).not.toBeNull();
    const earthItem = schematic?.items.find((i) => i.id === 'earth');
    expect(earthItem?.children).toBeDefined();
    expect(earthItem?.children).toHaveLength(1);
    expect(earthItem?.children?.[0]).toMatchObject({
      id: 'moon',
      name: 'Moon',
      kind: 'moon',
      orbitRank: 1,
    });

    // Spacecraft or minor bodies orbiting host are excluded from candidate items
    const voyagerItem = schematic?.items.find((i) => i.id === 'voyager-1');
    expect(voyagerItem).toBeUndefined();
  });

  it('DEC-025: scopes StarFocus in DetailsPanel strictly to the star without repeating system-wide lists', () => {
    const starDetails = buildFocusedEntityDetails({
      focusedEntity: {
        id: 'alpha-centauri-a',
        name: 'Alpha Centauri A',
        position: [-0.47, 1.32, -0.33],
        classification: 'star',
      },
      corpus: SAMPLE_CORPUS,
      urlSystemSlug: 'alpha-centauri',
      summaryNode: {
        id: 'alpha-centauri',
        name: 'Alpha Centauri',
        spect: 'G2V',
        dist: 1.34,
        starCount: 3,
        planetCount: 2,
        mag: -0.01,
        absmag: 4.38,
        x: -0.47,
        y: 1.32,
        z: -0.33,
        hasHabitableCandidate: true,
        sectorId: 'SEC-0-1-0',
      },
    });

    expect(starDetails?.focusedKind).toBe('star');
    const html = renderToString(createElement(DetailsPanel, { details: starDetails }));

    // Shows star header, reticle type, spectral badge
    expect(html).toContain('Alpha Centauri A');
    expect(html).toContain('star');
    expect(html).toContain('data-testid="details-spectral-badge"');

    // Does NOT show system star count in peek header
    expect(html).not.toContain('data-testid="details-star-count"');

    // Does NOT show planet composition in peek
    expect(html).not.toContain('data-testid="details-planet-composition"');

    // Does NOT repeat system-wide star and planet lists in Partial
    expect(html).not.toContain('data-testid="details-stars-section"');
    expect(html).not.toContain('data-testid="details-planets-section"');

    // Shows details-system-summary and details-cta-group / details-actions
    expect(html).toContain('data-testid="details-system-summary"');
    expect(
      html.includes('data-testid="details-cta-group"') ||
        html.includes('data-testid="details-actions"'),
    ).toBe(true);
  });

  it('DEC-026: computes contextual systemDetailsHref and conditionally renders Details CTA in DetailsPanel', () => {
    // 1. System in Galaxy view -> has systemDetailsHref
    const sysGalaxyDetails = buildFocusedEntityDetails({
      focusedEntity: {
        id: 'sol',
        name: 'Sol',
        position: [0, 0, 0],
        classification: 'stellar-system',
      },
      corpus: SAMPLE_CORPUS,
    });
    expect(sysGalaxyDetails?.focusedKind).toBe('system');
    expect(sysGalaxyDetails?.systemDetailsHref).toBe('/system/sol');
    const sysGalaxyHtml = renderToString(createElement(DetailsPanel, { details: sysGalaxyDetails }));
    expect(sysGalaxyHtml).toContain('data-testid="details-button-system-details"');
    expect(sysGalaxyHtml).toContain('href="/system/sol"');

    // 2. System in System view -> systemDetailsHref is undefined, CTA omitted
    const sysSystemDetails = buildFocusedEntityDetails({
      focusedEntity: {
        id: 'sol',
        name: 'Sol',
        position: [0, 0, 0],
        classification: 'stellar-system',
      },
      urlSystemSlug: 'sol',
      corpus: SAMPLE_CORPUS,
    });
    expect(sysSystemDetails?.systemDetailsHref).toBeUndefined();
    const sysSystemHtml = renderToString(createElement(DetailsPanel, { details: sysSystemDetails }));
    expect(sysSystemHtml).not.toContain('data-testid="details-button-system-details"');

    // 3. Planet in Galaxy view -> has planetDetailsHref
    const planetGalaxyDetails = buildFocusedEntityDetails({
      focusedEntity: {
        id: 'earth',
        name: 'Earth',
        position: [0, 0, 0],
        classification: 'terrestrial',
      },
      corpus: SAMPLE_CORPUS,
    });
    expect(planetGalaxyDetails?.focusedKind).toBe('planet');
    expect(planetGalaxyDetails?.systemDetailsHref).toBe('/planet/earth');
    const planetGalaxyHtml = renderToString(createElement(DetailsPanel, { details: planetGalaxyDetails }));
    expect(planetGalaxyHtml).toContain('data-testid="details-button-system-details"');
    expect(planetGalaxyHtml).toContain('href="/planet/earth"');

    // 4. Planet in System view -> has planetDetailsHref
    const planetSystemDetails = buildFocusedEntityDetails({
      focusedEntity: {
        id: 'earth',
        name: 'Earth',
        position: [0, 0, 0],
        classification: 'terrestrial',
      },
      urlSystemSlug: 'sol',
      corpus: SAMPLE_CORPUS,
    });
    expect(planetSystemDetails?.systemDetailsHref).toBe('/planet/earth');
    const planetSystemHtml = renderToString(createElement(DetailsPanel, { details: planetSystemDetails }));
    expect(planetSystemHtml).toContain('data-testid="details-button-system-details"');
    expect(planetSystemHtml).toContain('href="/planet/earth"');

    // 5. Planet in Planet view -> systemDetailsHref is undefined, CTA omitted
    const planetPlanetDetails = buildFocusedEntityDetails({
      focusedEntity: {
        id: 'earth',
        name: 'Earth',
        position: [0, 0, 0],
        classification: 'terrestrial',
      },
      urlPlanetSlug: 'earth',
      corpus: SAMPLE_CORPUS,
    });
    expect(planetPlanetDetails?.systemDetailsHref).toBeUndefined();
    const planetPlanetHtml = renderToString(createElement(DetailsPanel, { details: planetPlanetDetails }));
    expect(planetPlanetHtml).not.toContain('data-testid="details-button-system-details"');

    // 6. Star, minor-body, structure -> systemDetailsHref is undefined
    const starDetails = buildFocusedEntityDetails({
      focusedEntity: {
        id: 'alpha-centauri-a',
        name: 'Alpha Centauri A',
        position: [-0.47, 1.32, -0.33],
        classification: 'star',
      },
      urlSystemSlug: 'alpha-centauri',
      summaryNode: {
        id: 'alpha-centauri',
        name: 'Alpha Centauri',
        spect: 'G2V',
        dist: 1.34,
        starCount: 3,
        planetCount: 2,
        mag: -0.01,
        absmag: 4.38,
        x: -0.47,
        y: 1.32,
        z: -0.33,
        hasHabitableCandidate: true,
        sectorId: 'SEC-0-1-0',
      },
      corpus: SAMPLE_CORPUS,
    });
    expect(starDetails?.focusedKind).toBe('star');
    expect(starDetails?.systemDetailsHref).toBeUndefined();

    const minorBodyDetails = buildFocusedEntityDetails({
      focusedEntity: {
        id: 'moon',
        name: 'Moon',
        position: [0, 0, 0],
        classification: 'terrestrial',
      },
      corpus: SAMPLE_CORPUS,
    });
    expect(minorBodyDetails?.systemDetailsHref).toBeUndefined();

    const structureDetails = buildFocusedEntityDetails({
      focusedEntity: {
        id: 'ngc-1976',
        name: 'Orion Nebula',
        position: [0, 0, 0],
        classification: 'stellar-cluster',
      },
      corpus: SAMPLE_CORPUS,
    });
    expect(structureDetails?.systemDetailsHref).toBeUndefined();
  });
});

describe('Option C ?select= URL Grammar & Layer Target Links', () => {
  it('produces select=layer:<shortSlug>&layer=<shortSlug> for layer search result items while keeping non-layer links unchanged', () => {
    // 1. Fictional system-level canon entry
    const fictionSystemEntry: CompactSearchEntry = {
      i: 'canon-project-hail-mary:gaia-2452378776434477184',
      k: 7,
      n: 'Tau Ceti (Astrophage Destination)',
      s: 'gaia-2452378776434477184',
      w: 'canon-project-hail-mary',
      c: 'Project Hail Mary',
    };
    const fictionSystemTarget = buildResultTargetLink({
      id: fictionSystemEntry.i,
      name: fictionSystemEntry.n,
      systemId: fictionSystemEntry.s,
      systemName: 'Tau Ceti',
      layerId: fictionSystemEntry.w,
    });
    expect(fictionSystemTarget).toEqual({
      targetView: 'galaxy',
      href: '/galaxy/tau-ceti?select=layer:project-hail-mary&layer=project-hail-mary:tau-ceti',
    });

    const fictionSystemItem = toSearchResultItem(fictionSystemEntry, 850, 'Tau Ceti');
    expect(fictionSystemItem.href).toBe('/galaxy/tau-ceti?select=layer:project-hail-mary&layer=project-hail-mary:tau-ceti');

    // 2. Fictional child body canon entry
    const fictionChildEntry: CompactSearchEntry = {
      i: 'canon-project-hail-mary:erid',
      k: 7,
      n: 'Erid',
      s: '40-eridani',
      w: 'canon-project-hail-mary',
      c: 'Project Hail Mary',
    };
    const fictionChildTarget = buildResultTargetLink({
      id: fictionChildEntry.i,
      name: fictionChildEntry.n,
      systemId: fictionChildEntry.s,
      systemName: '40 Eridani',
      layerId: fictionChildEntry.w,
    });
    expect(fictionChildTarget).toEqual({
      targetView: 'system',
      href: '/system/40-eridani?focus=erid&select=layer:project-hail-mary&layer=project-hail-mary:erid',
    });

    const fictionChildItem = toSearchResultItem(fictionChildEntry, 850, '40 Eridani');
    expect(fictionChildItem.href).toBe('/system/40-eridani?focus=erid&select=layer:project-hail-mary&layer=project-hail-mary:erid');

    // 3. Non-canon star entry
    const starEntry: CompactSearchEntry = {
      i: 'sol',
      k: 1,
      n: 'Sol',
      h: 1,
    };
    const starTarget = buildResultTargetLink({
      id: starEntry.i,
      name: starEntry.n,
      isSolarSystem: true,
    });
    expect(starTarget).toEqual({
      targetView: 'galaxy',
      href: '/galaxy/sol',
    });

    // 4. Non-canon solar system planet entry (routes to /system/sol?focus=earth)
    const earthTarget = buildResultTargetLink({
      id: 'earth',
      name: 'Earth',
      systemId: 'sol',
      isSolarSystem: true,
    });
    expect(earthTarget).toEqual({
      targetView: 'system',
      href: '/system/sol?focus=earth',
    });

    // 5. Non-canon exoplanet entry (routes to /system/tau-ceti?focus=tau-ceti-e per DEC-038)
    const exoTarget = buildResultTargetLink({
      id: 'tau-ceti-e',
      name: 'Tau Ceti e',
      systemId: 'tau-ceti',
      systemName: 'Tau Ceti',
    });
    expect(exoTarget).toEqual({
      targetView: 'system',
      href: '/system/tau-ceti?focus=tau-ceti-e',
    });

    // 6. Parent layer manifest entry (routes to /galaxy?select=layer:<slug>&layer=<slug>)
    const parentLayerTarget = buildResultTargetLink({
      id: 'canon-project-hail-mary',
      name: 'Project Hail Mary',
      layerId: 'canon-project-hail-mary',
      entityKind: 'layer',
    });
    expect(parentLayerTarget).toEqual({
      targetView: 'galaxy',
      href: '/galaxy?select=layer:project-hail-mary&layer=project-hail-mary',
    });
  });

  it('parses Option C tokens: tag:<slug>, layer:<slug>, star-type:<slug>, planet-type:<slug>, collection:<slug>, and entity slugs', () => {
    // 1. Individual tokens
    expect(parseUrlSelectTokens('?select=tag:habitable-candidate')).toEqual([
      { kind: 'tag', tag: 'habitable-candidate' },
    ]);
    expect(parseUrlSelectTokens('?select=layer:project-hail-mary')).toEqual([
      { kind: 'layer', layerId: 'canon-project-hail-mary' },
    ]);
    expect(parseUrlSelectTokens('?select=layer:recent-discoveries')).toEqual([
      { kind: 'layer', layerId: 'overlay-recent-discoveries' },
    ]);
    expect(parseUrlSelectTokens('?select=star-type:g')).toEqual([
      { kind: 'star-type', starType: 'g' },
    ]);
    expect(parseUrlSelectTokens('?select=star-type:g2v')).toEqual([
      { kind: 'star-type', starType: 'g2v' },
    ]);
    expect(parseUrlSelectTokens('?select=star-type:white-dwarf')).toEqual([
      { kind: 'star-type', starType: 'white-dwarf' },
    ]);
    expect(parseUrlSelectTokens('?select=planet-type:super-earth')).toEqual([
      { kind: 'planet-type', planetType: 'super-earth' },
    ]);
    expect(parseUrlSelectTokens('?select=planet-type:gas-giant')).toEqual([
      { kind: 'planet-type', planetType: 'gas-giant' },
    ]);
    expect(parseUrlSelectTokens('?select=collection:extreme-worlds')).toEqual([
      { kind: 'collection', collectionId: 'extreme-worlds' },
    ]);
    expect(parseUrlSelectTokens('?select=collection:newly-discovered')).toEqual([
      { kind: 'collection', collectionId: 'newly-discovered' },
    ]);
    expect(parseUrlSelectTokens('?select=sol')).toEqual([
      { kind: 'entity', slug: 'sol' },
    ]);

    // 2. Comma-separated combination
    const multi = parseUrlSelectTokens('?select=star-type:g,layer:project-hail-mary,sol');
    expect(multi).toEqual([
      { kind: 'star-type', starType: 'g' },
      { kind: 'layer', layerId: 'canon-project-hail-mary' },
      { kind: 'entity', slug: 'sol' },
    ]);
  });

  it('resolves selected systems from star types, planet types, collections, and combined ?select= query', () => {
    const testCorpus: readonly CompactSearchEntry[] = [
      {
        i: 'sol',
        n: 'Sol',
        k: 1,
        m: [-26.74, 'G2V', 8, 1],
        b: [4, 2, 2], // [terrestrial, subNeptune, gasGiant]
        p: [0, 0, 0],
        h: 1,
      },
      {
        i: 'tau-ceti',
        n: 'Tau Ceti',
        k: 1,
        m: [3.5, 'G8V', 4, 1],
        b: [2, 1, 0],
        p: [-3.1, -0.4, -2.0],
      },
      {
        i: 'keid',
        n: 'Keid',
        k: 1,
        m: [4.43, 'K0.5V', 1],
        p: [-2.5, -3.6, -2.4],
      },
      {
        i: 'sirius-b',
        n: 'Sirius B',
        k: 1,
        m: [8.44, 'DA2', 0],
        p: [-0.5, 2.5, -0.6],
      },
      {
        i: 'luhman-16',
        n: 'Luhman 16',
        k: 1,
        m: [14.0, 'L7.5', 0],
        p: [-1.0, 1.5, -0.8],
      },
      {
        i: 'tau-ceti-e',
        n: 'Tau Ceti e',
        k: 2,
        s: 'tau-ceti',
        u: 'super-earth',
      },
      {
        i: 'earth',
        n: 'Earth',
        k: 2,
        s: 'sol',
        u: 'terrestrial',
      },
      {
        i: 'jupiter',
        n: 'Jupiter',
        k: 2,
        s: 'sol',
        u: 'gas-giant',
      },
    ];

    // Star-type resolution:
    // ?select=star-type:g -> Sol (G2V) and Tau Ceti (G8V)
    const gStars = resolveSelectedSystemsFromStarType('g', testCorpus);
    expect(gStars.map((s) => s.name)).toEqual(['Sol', 'Tau Ceti']);

    // ?select=star-type:g2v -> Sol (G2V) only
    const g2vStars = resolveSelectedSystemsFromStarType('g2v', testCorpus);
    expect(g2vStars.map((s) => s.name)).toEqual(['Sol']);

    // Compact / substellar reticle classes
    const whiteDwarfs = resolveSelectedSystemsFromStarType('white-dwarf', testCorpus);
    expect(whiteDwarfs.map((s) => s.name)).toEqual(['Sirius B']);

    const brownDwarfs = resolveSelectedSystemsFromStarType('brown-dwarf', testCorpus);
    expect(brownDwarfs.map((s) => s.name)).toEqual(['Luhman 16']);

    // Planet-type resolution (from child planet entries entry.k === 2 with entry.u):
    const superEarthSystems = resolveSelectedSystemsFromPlanetType('super-earth', testCorpus);
    expect(superEarthSystems.map((s) => s.name)).toEqual(['Tau Ceti']);

    const gasGiantSystems = resolveSelectedSystemsFromPlanetType('gas-giant', testCorpus);
    expect(gasGiantSystems.map((s) => s.name)).toEqual(['Sol']);

    // Planet-type fallback when no child planet entries exist in corpus (reading entry.b):
    const starOnlyCorpus = testCorpus.filter((e) => e.k !== 2);
    const fallbackTerrestrial = resolveSelectedSystemsFromPlanetType('terrestrial', starOnlyCorpus);
    expect(fallbackTerrestrial.map((s) => s.name)).toEqual(['Sol', 'Tau Ceti']);

    const fallbackGasGiant = resolveSelectedSystemsFromPlanetType('gas-giant', starOnlyCorpus);
    expect(fallbackGasGiant.map((s) => s.name)).toEqual(['Sol']);

    // Curated collection resolution:
    expect(SEED_CURATED_COLLECTIONS.length).toBeGreaterThanOrEqual(2);
    expect(SEED_CURATED_COLLECTIONS.some((c) => c.id === 'extreme-worlds')).toBe(true);
    expect(SEED_CURATED_COLLECTIONS.some((c) => c.id === 'newly-discovered')).toBe(true);

    const extremeWorlds = resolveSelectedSystemsFromCollection('extreme-worlds', testCorpus);
    expect(extremeWorlds.length).toBeGreaterThan(0);
    expect(extremeWorlds.some((s) => s.id === 'tau-ceti' || s.id === 'sol' || s.name === 'Tau Ceti' || s.name === 'Sol')).toBe(true);

    const newlyDiscovered = resolveSelectedSystemsFromCollection('newly-discovered', testCorpus);
    expect(newlyDiscovered.length).toBeGreaterThan(0);

    // resolveSelectedSystemsFromUrlSelect with combined grammar
    const combined = resolveSelectedSystemsFromUrlSelect(
      '?select=star-type:g2v,collection:extreme-worlds',
      testCorpus,
    );
    expect(combined.some((s) => s.id === 'sol')).toBe(true);
  });

  it('builds canonical galaxy view URLs using helper functions', () => {
    expect(buildStarTypeGalaxyHref('G')).toBe('/galaxy?select=star-type:g');
    expect(buildStarTypeGalaxyHref('g2v')).toBe('/galaxy?select=star-type:g2v');
    expect(buildStarTypeGalaxyHref('')).toBe('/galaxy');

    expect(buildPlanetTypeGalaxyHref('super-earth')).toBe('/galaxy?select=planet-type:super-earth');
    expect(buildPlanetTypeGalaxyHref('Super-Earth')).toBe('/galaxy?select=planet-type:super-earth');
    expect(buildPlanetTypeGalaxyHref('')).toBe('/galaxy');

    expect(buildCollectionGalaxyHref('extreme-worlds')).toBe('/galaxy?select=collection:extreme-worlds');
    expect(buildCollectionGalaxyHref('Newly Discovered')).toBe('/galaxy?select=collection:newly-discovered');
    expect(buildCollectionGalaxyHref('')).toBe('/galaxy');
  });

  it('buildResultTargetLink & toSearchResultItem support tagSlug parameter with select=tag:<slug> URL', () => {
    // 1. Standard star system with tagSlug
    const systemResult = buildResultTargetLink({
      id: 'tau-ceti',
      name: 'Tau Ceti',
      tagSlug: 'habitable-candidate',
    });
    expect(systemResult.targetView).toBe('galaxy');
    expect(systemResult.href).toBe('/galaxy/tau-ceti?select=tag:habitable-candidate');

    // 2. Solar system child body with tagSlug
    const solChildResult = buildResultTargetLink({
      id: 'earth',
      name: 'Earth',
      systemId: 'sol',
      systemName: 'Sol',
      isSolarSystem: true,
      tagSlug: 'habitable-candidate',
    });
    expect(solChildResult.targetView).toBe('system');
    expect(solChildResult.href).toBe('/system/sol?focus=earth&select=tag:habitable-candidate');

    // 3. layerId takes precedence over tagSlug when both are present
    const canonPrecedenceResult = buildResultTargetLink({
      id: 'tau-ceti',
      name: 'Tau Ceti',
      layerId: 'canon-project-hail-mary',
      tagSlug: 'habitable-candidate',
    });
    expect(canonPrecedenceResult.href).toBe(
      '/galaxy/tau-ceti?select=layer:project-hail-mary&layer=project-hail-mary:tau-ceti',
    );

    // 4. toSearchResultItem passes tagSlug through to href
    const entry: CompactSearchEntry = {
      i: 'tau-ceti',
      k: 1,
      n: 'Tau Ceti',
      m: [3.5, 'G8.5V', 4, 1],
      g: SYSTEM_TAG_BITS.HabitableCandidate,
    };
    const item = toSearchResultItem(entry, 650, undefined, 'habitable-candidate');
    expect(item.href).toBe('/galaxy/tau-ceti?select=tag:habitable-candidate');
  });

  it('surfaces matching star systems via entry.g bitmask on tag queries with select=tag:<slug> href', () => {
    // Verify static mapping keys
    expect(QUERY_CLEAN_KEY_TO_TAG_SLUG['habitable']).toBe('habitable-candidate');
    expect(QUERY_CLEAN_KEY_TO_TAG_SLUG['habitablecandidate']).toBe('habitable-candidate');
    expect(QUERY_CLEAN_KEY_TO_TAG_SLUG['habitablehost']).toBe('habitable-candidate');
    expect(QUERY_CLEAN_KEY_TO_TAG_SLUG['habitablezone']).toBe('habitable-candidate');
    expect(QUERY_CLEAN_KEY_TO_TAG_SLUG['nakedeye']).toBe('naked-eye');
    expect(QUERY_CLEAN_KEY_TO_TAG_SLUG['solarneighborhood']).toBe('solar-neighborhood-10pc');
    expect(QUERY_CLEAN_KEY_TO_TAG_SLUG['solarneighborhood10pc']).toBe('solar-neighborhood-10pc');
    expect(QUERY_CLEAN_KEY_TO_TAG_SLUG['exoplanethost']).toBe('exoplanet-host');
    expect(QUERY_CLEAN_KEY_TO_TAG_SLUG['variablestar']).toBe('variable-star');
    expect(QUERY_CLEAN_KEY_TO_TAG_SLUG['reconsgroundtruth']).toBe('recons-ground-truth');
    expect(QUERY_CLEAN_KEY_TO_TAG_SLUG['homesystem']).toBe('home-system');

    const corpusWithTags: CompactSearchEntry[] = [
      {
        i: 'tau-ceti',
        k: 1,
        n: 'Tau Ceti',
        p: [-3.6, 0.6, -0.7],
        m: [3.5, 'G8.5V', 4, 1],
        g: SYSTEM_TAG_BITS.HabitableCandidate,
      },
      {
        i: 'sirius',
        k: 1,
        n: 'Sirius',
        p: [-1.6, 2.1, -0.4],
        m: [-1.46, 'A1V', 0],
        g: SYSTEM_TAG_BITS.NakedEye,
      },
      {
        i: 'barnard',
        k: 1,
        n: "Barnard's Star",
        p: [-0.1, 1.8, 0.4],
        m: [9.54, 'M4V', 1],
        g: SYSTEM_TAG_BITS.SolarNeighborhood10pc,
      },
      {
        i: 'habitable-harbor',
        k: 1,
        n: 'Habitable Harbor',
        p: [1.0, 2.0, 3.0],
        m: [4.0, 'K2V', 2, 1],
        g: SYSTEM_TAG_BITS.HabitableCandidate,
      },
      {
        i: 'earth',
        k: 2,
        n: 'Earth',
        s: 'sol',
        h: 1,
      },
    ];

    // 1. Searching "habitable" matches Tau Ceti via entry.g (score 650) and Habitable Harbor via direct match (score 750) + tagSlug
    const habitableResults = executeCatalogSearch(corpusWithTags, {
      query: 'habitable',
    });
    expect(habitableResults.groups.stars.items.length).toBe(2);

    // Habitable Harbor has directScore > 0, so its score is > 650, but it gets tagSlug attached
    const harborItem = habitableResults.groups.stars.items.find((it) => it.id === 'habitable-harbor');
    expect(harborItem).toBeDefined();
    expect(harborItem?.score).toBeGreaterThan(650);
    expect(harborItem?.href).toBe('/galaxy/habitable-harbor?select=tag:habitable-candidate');

    // Tau Ceti has directScore === 0, so it gets scored at 650 with tagSlug attached
    const tauCetiItem = habitableResults.groups.stars.items.find((it) => it.id === 'tau-ceti');
    expect(tauCetiItem).toBeDefined();
    expect(tauCetiItem?.score).toBe(650);
    expect(tauCetiItem?.href).toBe('/galaxy/tau-ceti?select=tag:habitable-candidate');

    // Sirius should NOT be in the habitable candidate stars group
    expect(habitableResults.groups.stars.items.some((it) => it.id === 'sirius')).toBe(false);

    // 1b. Searching "habitable candidate" matches Tau Ceti at score 650 with select=tag:habitable-candidate
    const habitableCandidateResults = executeCatalogSearch(corpusWithTags, {
      query: 'habitable candidate',
    });
    const tauCetiCandidateItem = habitableCandidateResults.groups.stars.items.find((it) => it.id === 'tau-ceti');
    expect(tauCetiCandidateItem?.score).toBe(650);
    expect(tauCetiCandidateItem?.href).toBe('/galaxy/tau-ceti?select=tag:habitable-candidate');

    // 2. Searching "naked eye" surfaces Sirius via entry.g bitmask at score 650
    const nakedEyeResults = executeCatalogSearch(corpusWithTags, {
      query: 'naked eye',
    });
    expect(nakedEyeResults.groups.stars.items.length).toBe(1);
    const siriusItem = nakedEyeResults.groups.stars.items[0];
    expect(siriusItem.id).toBe('sirius');
    expect(siriusItem.score).toBe(650);
    expect(siriusItem.href).toBe('/galaxy/sirius?select=tag:naked-eye');

    // 3. Normal query not in QUERY_CLEAN_KEY_TO_TAG_SLUG produces clean URLs without select=tag:...
    const siriusDirectResults = executeCatalogSearch(corpusWithTags, {
      query: 'Sirius',
    });
    expect(siriusDirectResults.groups.stars.items[0].href).toBe('/galaxy/sirius');
  });

  describe('Centralised Orbit-Context View Targeting (DEC-038)', () => {
    it('routes layer manifests to galaxy overview card URL', () => {
      const res = buildEntityOrbitTargetHref({
        id: 'overlay-recent-discoveries',
        name: 'Newly Discovered Worlds',
        entityKind: 'layer',
      });
      expect(res).toEqual({
        targetView: 'galaxy',
        href: '/galaxy?select=layer:recent-discoveries&layer=recent-discoveries',
      });
    });

    it('routes systems and galactic structures to galaxy view', () => {
      const sysRes = buildEntityOrbitTargetHref({
        id: 'gaia-2452378776434477184',
        name: 'Tau Ceti',
        entityKind: 'star-system',
      });
      expect(sysRes).toEqual({
        targetView: 'galaxy',
        href: '/galaxy/tau-ceti',
      });

      const structRes = buildEntityOrbitTargetHref({
        id: 'm13-hercules',
        name: 'Great Hercules Cluster',
        entityKind: 'galactic-structure',
      });
      expect(structRes).toEqual({
        targetView: 'galaxy',
        href: '/galaxy/great-hercules-cluster',
      });
    });

    it('routes stars, planets, dwarf-planets, belts, and minor bodies to system view with ?focus=<itemSlug>', () => {
      const planetRes = buildEntityOrbitTargetHref({
        id: 'lhs-1140-b',
        name: 'LHS 1140 b',
        entityKind: 'planet',
        systemId: 'lhs-1140',
        systemName: 'LHS 1140',
      });
      expect(planetRes).toEqual({
        targetView: 'system',
        href: '/system/lhs-1140?focus=lhs-1140-b',
      });

      const beltRes = buildEntityOrbitTargetHref({
        id: 'main-asteroid-belt',
        name: 'Main Asteroid Belt',
        entityKind: 'belt',
        systemId: 'sol',
        systemName: 'Sol',
        isSolarSystem: true,
      });
      expect(beltRes).toEqual({
        targetView: 'system',
        href: '/system/sol?focus=main-asteroid-belt',
      });
    });

    it('routes planetary moons to planetary view with /planet/<parentPlanetSlug>?focus=<moonSlug>', () => {
      const moonRes = buildEntityOrbitTargetHref({
        id: 'europa',
        name: 'Europa',
        entityKind: 'moon',
        systemId: 'sol',
        parentBodyId: 'jupiter',
      });
      expect(moonRes).toEqual({
        targetView: 'planet',
        href: '/planet/jupiter?focus=europa',
      });

      const phoebeRes = buildEntityOrbitTargetHref({
        id: 'phoebe',
        name: 'Phoebe',
        entityKind: 'minor-body',
        systemId: 'sol',
        parentBodyId: 'saturn',
      });
      expect(phoebeRes).toEqual({
        targetView: 'planet',
        href: '/planet/saturn?focus=phoebe',
      });
    });

    it('attaches compound &layer=<layerSlug>:<itemSlug> when layerId is present', () => {
      const itemRes = buildEntityOrbitTargetHref({
        id: 'trappist-1-e',
        name: 'TRAPPIST-1 e',
        entityKind: 'planet',
        systemId: 'trappist-1',
        systemName: 'TRAPPIST-1',
        layerId: 'overlay-jwst-targets',
      });
      expect(itemRes).toEqual({
        targetView: 'system',
        href: '/system/trappist-1?focus=trappist-1-e&select=layer:jwst-targets&layer=jwst-targets:trappist-1-e',
      });

      const moonInLayer = buildEntityOrbitTargetHref({
        id: 'europa',
        name: 'Europa',
        entityKind: 'moon',
        systemId: 'sol',
        parentBodyId: 'jupiter',
        layerId: 'overlay-extreme-worlds',
      });
      expect(moonInLayer).toEqual({
        targetView: 'planet',
        href: '/planet/jupiter?focus=europa&select=layer:extreme-worlds&layer=extreme-worlds:europa',
      });
    });

    it('extracts structured select slugs via extractUrlSelectSlugs helper', () => {
      const parsed = extractUrlSelectSlugs(
        '?select=tag:habitable-candidate,layer:recent-discoveries,star-type:g,sol',
      );
      expect(parsed.tags).toEqual(['habitable-candidate']);
      expect(parsed.layerSlugs).toEqual(['overlay-recent-discoveries']);
      expect(parsed.starTypes).toEqual(['g']);
      expect(parsed.entitySlugs).toEqual(['sol']);
    });
  });
});



