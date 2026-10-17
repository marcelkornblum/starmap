import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { SpatialEntityProvider } from '../src/components/canvas/entity/SpatialEntityContext';
import { createSpatialEntityStore } from '../src/components/canvas/entity/SpatialEntityStore';
import {
  Breadcrumbs,
  DetailsPanel,
  SearchResultItem,
  SystemElementsPanel,
  formatPlanetCountSummary,
  shouldDisplaySpectralBadge,
} from '../src/components/domain';
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
  buildFocusedEntityDetails,
  buildIntrinsicSystemSummary,
  buildPlanetCompositionSummary,
  buildSystemDetailsHref,
  buildSystemElementFocusHref,
  buildSystemElementsSummary,
  buildSystemViewBreadcrumbs,
  classifyExoplanetComposition,
  isExoplanetHabitableCandidate,
  resolveCanonLayerKindPriority,
  resolveFocusedCanonAnnotations,
  sortCanonAnnotations,
} from '../src/services/detailsService';
import {
  METRICS_GUIDE_PATH,
  PLANET_TYPES_GUIDE_PATH,
  SEARCH_CATEGORIES,
  STAR_TYPES_GUIDE_PATH,
  buildCanonLayerGalaxyHref,
  buildMetricGuideHref,
  buildPlanetTypeGuideHref,
  buildResultTargetLink,
  buildSearchViewHref,
  buildStarTypeGuideHref,
  buildTagGalaxyHref,
  buildUpdatedSearchUrl,
  compareSearchResultItems,
  doesSystemEntryMatchTag,
  executeCatalogSearch,
  extractUrlCanonLayerId,
  extractUrlFocusSlug,
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
  resolveEntityKind,
  resolveEntryCategory,
  resolveFocusedEntityFromCorpus,
  resolveResultDisplayTitle,
  resolveResultSystemTitle,
  resolveReticleType,
  resolveSelectedSystemsFromCanonLayer,
  resolveSelectedSystemsFromSearchResults,
  resolveSelectedSystemsFromTag,
  scoreSearchEntry,
  toSearchResultItem,
} from '../src/services/searchService';
import type { CompactSearchEntry } from '../src/utils/compactDataCodec';
import { MainView } from '../src/views/MainView';
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
    a: 'taucetie',
  },
  {
    i: 'earth',
    k: 2,
    n: 'Earth',
    s: 'sol',
    h: 1,
    a: 'earth',
  },
  {
    i: 'moon',
    k: 3,
    n: 'Moon',
    s: 'sol',
    h: 1,
    a: 'moon luna',
  },
  {
    i: 'pluto',
    k: 4,
    n: 'Pluto',
    s: 'sol',
    h: 1,
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
];

describe('searchService (Pure Service Layer)', () => {
  it('exposes the 5 canonical search categories in display order', () => {
    expect(SEARCH_CATEGORIES.map((c) => c.key)).toEqual([
      'stars',
      'planets',
      'structures',
      'minor-bodies',
      'fiction',
    ]);
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

    expect(resolveEntryCategory(SAMPLE_CORPUS[9])).toBe('fiction');
    expect(resolveEntityKind(SAMPLE_CORPUS[9])).toBe('fictional-entry');
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
    expect(results.groups.fiction.items.map((i) => i.name)).toContain('Vulcan (NiVar)');
  });

  it('matches fictional canon entries by work/franchise title', () => {
    const results = executeCatalogSearch(SAMPLE_CORPUS, {
      query: 'Project Hail Mary',
      filter: 'all',
    });

    expect(results.groups.fiction.totalMatches).toBe(2);
    expect(results.groups.fiction.items.map((i) => i.name)).toEqual(
      expect.arrayContaining(['Tau Ceti (Astrophage Destination)', 'Adrian']),
    );
  });

  it('restricts results to the selected category when a specific filter is applied', () => {
    const results = executeCatalogSearch(SAMPLE_CORPUS, {
      query: 'Tau Ceti',
      filter: 'planets',
    });

    expect(results.groups.stars.items).toHaveLength(0);
    expect(results.groups.fiction.items).toHaveLength(0);
    expect(results.groups.planets.items.map((i) => i.name)).toEqual(['tau Ceti e']);
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
        i: 'search-fiction',
        n: 'Fiction',
        c: 2,
        t: '2026-10-17T00:00:00Z',
        d: [SAMPLE_CORPUS[9], SAMPLE_CORPUS[10]],
      }),
    });

    const entries = await loadSearchCorpusForFilter(
      'fiction',
      mockFetch as unknown as typeof fetch,
    );
    expect(mockFetch).toHaveBeenCalledWith('/data/search/fiction.json');
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
      fetchSearchShard('fiction', failingFetch as unknown as typeof fetch),
    ).rejects.toThrow(/Failed to load search shard "fiction"/);

    const invalidSchemaFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ invalid: true }),
    });

    await expect(
      fetchSearchShard('fiction', invalidSchemaFetch as unknown as typeof fetch),
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
    expect(html).toContain('[stellar-system]');
    expect(html).toContain('[terrestrial]');
    expect(html).toContain('data-testid="result-variation-stars"');
    expect(html).toContain(
      '<a href="/guide/star-types/G8V" data-testid="result-spectral-badge">G8V</a>',
    );
    expect(html).toContain('<span data-testid="result-planet-summary">4 planets</span>');
    expect(html).toContain('data-testid="result-variation-planets"');
    expect(html).toContain('data-testid="result-variation-fiction"');
    expect(html).not.toContain(' pc');
    // System links to /galaxy/<systemname>, child items link to /galaxy/<systemname>?focus=<itemname>
    expect(html).toContain('href="/galaxy/tau-ceti"');
    expect(html).toContain('href="/galaxy/tau-ceti?focus=tau-ceti-e"');
    expect(html).toContain('href="/galaxy/tau-ceti?focus=adrian"');
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
    expect(html).toContain('[terrestrial]');
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

    // SAMPLE_CORPUS has 3 Solar System planets/moons/dwarf-planets (Earth, Moon, Ceres); limitPerCategory=2 truncates to 2
    expect(html).toContain('Earth');
    expect(html).toContain('Moon');
    expect(html).not.toContain('Ceres');
    expect(html).toContain('href="/search?q=Sol"');
    expect(html).toContain('href="/search?q=Sol&amp;searchCategory=stars"');
    expect(html).toContain('href="/search?q=Sol&amp;searchCategory=planets"');
    // Empty categories for query "Sol" (structures, minor-bodies, fiction) are omitted completely
    expect(html).not.toContain('data-testid="search-results-group-structures"');
    expect(html).not.toContain('data-testid="search-results-group-minor-bodies"');
    expect(html).not.toContain('data-testid="search-results-group-fiction"');
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

    expect(isArtificialSpacecraftEntry({ i: 'voyager-1', k: 6, n: 'Voyager 1' })).toBe(true);
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
    expect(resolveReticleType({ i: 'jupiter', k: 2, n: 'Jupiter' })).toBe('gas-giant');
    expect(resolveReticleType({ i: 'neptune', k: 2, n: 'Neptune' })).toBe('ice-giant');
    expect(resolveReticleType({ i: 'snr-crab', k: 5, n: 'Crab Remnant' })).toBe('hazard');
    expect(resolveReticleType({ i: 'voyager-1', k: 6, n: 'Voyager 1' })).toBe('artificial');
    expect(resolveReticleType({ i: '433-eros', k: 6, n: '433 Eros' })).toBe('terrestrial');
    expect(
      resolveReticleType({ i: 'phm:tau-ceti', k: 7, n: 'Tau Ceti', s: 'tau-ceti' }),
    ).toBe('stellar-system');

    // 5. buildResultTargetLink & buildSearchViewHref & URL state helpers
    expect(
      buildResultTargetLink({
        id: 'tau-ceti-e',
        name: 'tau Ceti e',
        systemId: 'gaia-123',
      }),
    ).toEqual({
      targetView: 'galaxy',
      href: '/galaxy/gaia-123?focus=tau-ceti-e',
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
    const fictionNoCanon = toSearchResultItem({ i: 'f-bare', k: 7, n: 'Mystery World' }, 900);

    expect(renderToString(createElement(SearchResultItem, { result: starNoMeta }))).not.toContain(
      'data-testid="result-variation-stars"',
    );
    expect(renderToString(createElement(SearchResultItem, { result: starOnePlanet }))).toContain(
      '1 planet',
    );
    expect(renderToString(createElement(SearchResultItem, { result: fictionNoCanon }))).toContain(
      '<span data-testid="result-variation-fiction"></span>',
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

    // Non-system fictional planet ("Vulcan") with filter='fiction' resolves parent system ("Keid")
    const vulcanResults = executeCatalogSearch(SAMPLE_CORPUS, {
      query: 'Vulcan',
      filter: 'fiction',
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

  it('renders Systems panel in MainView with Focused and Selected lists synchronized to search results and URL', () => {
    const store = createSpatialEntityStore();

    // 1. Searching on '/' selects matching systems and parent systems of non-system results, with nothing focused
    const searchHtml = renderToString(
      createElement(
        SpatialEntityProvider,
        { store },
        createElement(MainView, {
          initialCorpus: SAMPLE_CORPUS,
          locationPathname: '/',
          locationSearch: '?q=Adrian',
        }),
      ),
    );

    expect(searchHtml).toContain('<h2 id="systems-panel-heading">Systems</h2>');
    expect(searchHtml).toContain('<h3 id="systems-focused-heading">Focused</h3>');
    expect(searchHtml).toContain('<h3 id="systems-selected-heading">Selected</h3>');
    // "Adrian" is a fictional entry in the Tau Ceti system -> Tau Ceti becomes selected
    expect(store.getState().getEntitiesByState('selected').map((e) => e.name)).toEqual([
      'Tau Ceti',
    ]);
    expect(store.getState().getEntitiesByState('focused')).toEqual([]);
    expect(searchHtml).toContain(
      '<li data-testid="systems-selected-item" data-entity-id="gaia-2452378776434477184">Tau Ceti</li>',
    );
    expect(searchHtml).toContain('<ul data-testid="systems-focused-list"></ul>');
    // When nothing is focused, Details panel does not show at all
    expect(searchHtml).not.toContain('data-testid="details-panel"');

    // 2. Clicking through to '/galaxy/tau-ceti?focus=tau-ceti-e' clears selected (since ?q= is not in URL), focuses 'tau Ceti e', and renders Details panel
    const focusChildHtml = renderToString(
      createElement(
        SpatialEntityProvider,
        { store },
        createElement(MainView, {
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
    expect(focusChildHtml).toContain(
      '<li data-testid="systems-focused-item" data-entity-id="tau-ceti-e">tau Ceti e</li>',
    );
    expect(focusChildHtml).toContain('<ul data-testid="systems-selected-list"></ul>');
    expect(focusChildHtml).toContain('data-testid="details-panel"');
    expect(focusChildHtml).toContain('<h2 id="details-panel-heading">Details</h2>');
    expect(focusChildHtml).toContain('<h3 id="details-peek-heading">Peek</h3>');
    expect(focusChildHtml).toContain('<h3 id="details-partial-heading">Partial</h3>');
    expect(focusChildHtml).toContain('<h3 id="details-full-heading">Full</h3>');
    expect(focusChildHtml).toContain('data-testid="details-button-system-details"');
    expect(focusChildHtml).toContain('href="/system/tau-ceti"');
    expect(focusChildHtml).toContain('data-testid="details-button-directions"');
    expect(focusChildHtml).toContain('Project Hail Mary');
    expect(focusChildHtml).toContain('Adrian');

    // 3. Clicking through to '/galaxy/tau-ceti' focuses 'Tau Ceti' and shows Details panel with Peek, Partial, and Full detents
    const focusSystemHtml = renderToString(
      createElement(
        SpatialEntityProvider,
        { store },
        createElement(MainView, {
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
    expect(focusSystemHtml).toContain(
      '<li data-testid="systems-focused-item" data-entity-id="gaia-2452378776434477184">Tau Ceti</li>',
    );
    expect(focusSystemHtml).toContain('data-testid="details-panel"');
    expect(focusSystemHtml).toContain(
      '<a href="/guide/star-types/G8V" data-testid="details-spectral-badge">G8V</a>',
    );
    expect(focusSystemHtml).toContain('<span data-testid="details-reticle-type">[stellar-system]</span>');
    expect(focusSystemHtml).toContain('4 planets');
    expect(focusSystemHtml).toContain(
      '<a href="/system/tau-ceti" data-testid="details-button-system-details">Details</a>',
    );
    expect(focusSystemHtml).toContain('Directions');
    expect(focusSystemHtml).toContain('Tau Ceti (Astrophage Destination)');
    expect(focusSystemHtml).toContain('data-testid="details-canon-accordion"');

    // Verify Peek contains systemSummary, and Partial contains Astrometry
    const peekSplit = focusSystemHtml.split('data-testid="details-detent-partial"')[0] ?? '';
    const partialSplit =
      focusSystemHtml
        .split('data-testid="details-detent-partial"')[1]
        ?.split('data-testid="details-detent-full"')[0] ?? '';
    expect(peekSplit).toContain('data-testid="details-system-summary"');
    expect(partialSplit).toContain('data-testid="details-astrometry-section"');

    // 4. Navigating to '/galaxy' (nothing in URL) clears both focused and selected states and hides Details panel
    const cleanHtml = renderToString(
      createElement(
        SpatialEntityProvider,
        { store },
        createElement(MainView, {
          initialCorpus: SAMPLE_CORPUS,
          locationPathname: '/galaxy',
          locationSearch: '',
        }),
      ),
    );

    expect(store.getState().getEntitiesByState('focused')).toEqual([]);
    expect(store.getState().getEntitiesByState('selected')).toEqual([]);
    expect(cleanHtml).toContain('<ul data-testid="systems-focused-list"></ul>');
    expect(cleanHtml).toContain('<ul data-testid="systems-selected-list"></ul>');
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
    expect(fullHtml).toContain('a = ');
    expect(fullHtml).toContain('0.538');
    expect(fullHtml).toContain('href="/guide/metrics/semi-major-axis"');
    expect(fullHtml).toContain('P = ');
    expect(fullHtml).toContain('162.87');
    expect(fullHtml).toContain('href="/guide/metrics/orbital-period"');
    expect(fullHtml).toContain('3.93');
    expect(fullHtml).toContain('href="/guide/metrics/planetary-mass"');
    expect(fullHtml).toContain('270');
    expect(fullHtml).toContain('href="/guide/metrics/equilibrium-temperature"');
    expect(fullHtml).toContain('href="/guide/metrics/stellar-magnitude"');
    expect(fullHtml).toContain('href="/guide/metrics/galactic-coordinates"');
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

  it('links each canon title in DetailsPanel to /galaxy?focus=<layerId> and selects all annotated systems when MainView loads', () => {
    expect(buildCanonLayerGalaxyHref('canon-project-hail-mary')).toBe(
      '/galaxy?focus=canon-project-hail-mary',
    );
    expect(findCanonLayerById('canon-project-hail-mary')?.title).toBe(
      'Project Hail Mary',
    );
    expect(findCanonLayerById('')).toBeUndefined();
    expect(findCanonLayerById('non-existent-layer')).toBeUndefined();

    expect(extractUrlCanonLayerId('?focus=canon-project-hail-mary')).toBe(
      'canon-project-hail-mary',
    );
    expect(extractUrlCanonLayerId('?canon=canon-halo')).toBe('canon-halo');
    expect(extractUrlCanonLayerId('?focus=tau-ceti-e')).toBeNull();
    expect(extractUrlCanonLayerId('')).toBeNull();

    // extractUrlFocusSlug ignores canon layer IDs in ?focus= so no fake entity is focused
    expect(
      extractUrlFocusSlug('/galaxy', '?focus=canon-project-hail-mary'),
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
      'href="/galaxy?focus=canon-project-hail-mary"',
    );
    expect(detailsHtml).toContain('href="/galaxy?focus=canon-halo"');

    // resolveSelectedSystemsFromCanonLayer resolves all annotated systems
    const phmSystems = resolveSelectedSystemsFromCanonLayer(
      'canon-project-hail-mary',
      SAMPLE_CORPUS,
    );
    expect(phmSystems.map((s) => s.name)).toEqual(['Tau Ceti', 'Keid']);
    expect(
      resolveSelectedSystemsFromCanonLayer('non-existent-canon', SAMPLE_CORPUS),
    ).toEqual([]);

    // Fallback when corpus is empty and when Sol is included (e.g. canon-star-trek)
    const stSystemsEmptyCorpus = resolveSelectedSystemsFromCanonLayer(
      'canon-star-trek',
      [],
    );
    expect(stSystemsEmptyCorpus.some((s) => s.id === 'sol' && s.name === 'Sol')).toBe(
      true,
    );

    // MainView loading /galaxy?focus=canon-project-hail-mary selects all systems in that canon and focuses nothing
    const store = createSpatialEntityStore();
    const html = renderToString(
      createElement(
        SpatialEntityProvider,
        { store },
        createElement(MainView, {
          initialCorpus: SAMPLE_CORPUS,
          locationPathname: '/galaxy',
          locationSearch: '?focus=canon-project-hail-mary',
        }),
      ),
    );

    const selected = store.getState().getEntitiesByState('selected');
    expect(selected.map((s) => s.name)).toEqual(['Tau Ceti', 'Keid']);
    expect(store.getState().getEntitiesByState('focused')).toEqual([]);
    expect(html).not.toContain('data-testid="details-panel"');
    expect(html).toContain(
      '<li data-testid="systems-selected-item" data-entity-id="gaia-2452378776434477184">Tau Ceti</li>',
    );
    expect(html).toContain(
      '<li data-testid="systems-selected-item" data-entity-id="gaia-3195919528989223040">Keid</li>',
    );
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

  it('links Astrometry and Canon tags in DetailsPanel to /galaxy?focus=<tag> and selects all matching systems when MainView loads', () => {
    expect(buildTagGalaxyHref('ExoplanetHost')).toBe(
      '/galaxy?focus=ExoplanetHost',
    );
    expect(isCatalogOrCanonTag('ExoplanetHost')).toBe(true);
    expect(isCatalogOrCanonTag('SolarNeighborhood10pc')).toBe(true);
    expect(isCatalogOrCanonTag('seti')).toBe(true);
    expect(isCatalogOrCanonTag('')).toBe(false);
    expect(isCatalogOrCanonTag('tau-ceti-e')).toBe(false);

    expect(extractUrlTagFocus('?focus=ExoplanetHost')).toBe('ExoplanetHost');
    expect(extractUrlTagFocus('?focus=seti')).toBe('seti');
    expect(extractUrlTagFocus('?focus=canon-project-hail-mary')).toBeNull();
    expect(extractUrlTagFocus('?focus=tau-ceti-e')).toBeNull();
    expect(extractUrlTagFocus('')).toBeNull();

    // extractUrlFocusSlug ignores catalog/canon tags in ?focus= so no fake entity is focused
    expect(extractUrlFocusSlug('/galaxy', '?focus=ExoplanetHost')).toBeNull();

    // doesSystemEntryMatchTag evaluates all catalog system tags
    const solEntry = SAMPLE_CORPUS[0]!;
    const tauEntry = SAMPLE_CORPUS[1]!;
    const planetEntry = SAMPLE_CORPUS.find((e) => e.i === 'tau-ceti-e')!;
    expect(doesSystemEntryMatchTag(solEntry, 'HomeSystem')).toBe(true);
    expect(doesSystemEntryMatchTag(solEntry, 'SolarNeighborhood10pc')).toBe(true);
    expect(doesSystemEntryMatchTag(solEntry, 'NakedEye')).toBe(true);
    expect(doesSystemEntryMatchTag(tauEntry, 'ExoplanetHost')).toBe(true);
    expect(doesSystemEntryMatchTag(tauEntry, 'HabitableCandidate')).toBe(true);
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
    expect(detailsHtml).toContain('href="/galaxy?focus=SolarNeighborhood10pc"');
    expect(detailsHtml).toContain('href="/galaxy?focus=NakedEye"');
    expect(detailsHtml).toContain('href="/galaxy?focus=ExoplanetHost"');
    expect(detailsHtml).toContain('href="/galaxy?focus=HabitableCandidate"');
    expect(detailsHtml).toContain('data-testid="details-canon-tag-link"');

    // resolveSelectedSystemsFromTag resolves both catalog system tags and canon annotation tags
    expect(resolveSelectedSystemsFromTag('', SAMPLE_CORPUS)).toEqual([]);
    const exoplanetHosts = resolveSelectedSystemsFromTag(
      'ExoplanetHost',
      SAMPLE_CORPUS,
    );
    expect(exoplanetHosts.some((s) => s.name === 'Sol')).toBe(true);
    expect(exoplanetHosts.some((s) => s.name === 'Tau Ceti')).toBe(true);

    const habitableHosts = resolveSelectedSystemsFromTag(
      'HabitableCandidate',
      SAMPLE_CORPUS,
    );
    expect(habitableHosts.map((s) => s.name)).toEqual(['Sol', 'Tau Ceti']);

    const setiSystems = resolveSelectedSystemsFromTag('seti', SAMPLE_CORPUS);
    expect(setiSystems.some((s) => s.name === 'Tau Ceti')).toBe(true);

    // MainView loading /galaxy?focus=HabitableCandidate selects all matching systems and focuses nothing
    const store = createSpatialEntityStore();
    const html = renderToString(
      createElement(
        SpatialEntityProvider,
        { store },
        createElement(MainView, {
          initialCorpus: SAMPLE_CORPUS,
          locationPathname: '/galaxy',
          locationSearch: '?focus=HabitableCandidate',
        }),
      ),
    );
    const selected = store.getState().getEntitiesByState('selected');
    expect(selected.map((s) => s.name)).toEqual(['Sol', 'Tau Ceti']);
    expect(store.getState().getEntitiesByState('focused')).toEqual([]);
    expect(html).not.toContain('data-testid="details-panel"');
    expect(html).toContain(
      '<li data-testid="systems-selected-item" data-entity-id="gaia-2452378776434477184">Tau Ceti</li>',
    );
  });

  it('renders Breadcrumbs at the top of every view, populates entity-specific telemetry in DetailsPanel, and renders Bodies and System Elements panels in SystemView', () => {
    expect(extractUrlSystemSlug('/system/tau-ceti')).toBe('tau-ceti');
    expect(extractUrlSystemSlug('/galaxy/tau-ceti')).toBe('tau-ceti');
    expect(extractUrlSystemSlug('/search')).toBeNull();
    expect(hasExplicitFocusParam('?focus=tau-ceti-e')).toBe(true);
    expect(hasExplicitFocusParam('')).toBe(false);

    // Empty breadcrumbs returns null
    expect(renderToString(createElement(Breadcrumbs, { items: [] }))).toBe('');
    expect(
      renderToString(createElement(SystemElementsPanel, { elements: null })),
    ).toBe('');
    expect(buildSystemElementsSummary({ details: null })).toBeNull();

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

    // SystemView at /system/tau-ceti?focus=tau-ceti-e renders Breadcrumbs, Bodies, Details (planet telemetry), and System Elements
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
    expect(sysHtml).toContain('data-testid="bodies-focused-item"');
    expect(sysHtml).toContain('data-testid="details-panel"');
    expect(sysHtml).toContain('data-focused-kind="planet"');
    expect(sysHtml).toContain('data-testid="details-planet-telemetry-section"');
    expect(sysHtml).toContain('data-testid="system-elements-panel"');
    expect(sysHtml).toContain('data-testid="system-elements-stars-section"');
    expect(sysHtml).toContain('data-testid="system-elements-planets-section"');
    expect(sysHtml).toContain('data-testid="system-elements-canon-section"');

    // SystemView at /system/sol renders Moons & Dwarf Planets and Minor Bodies & Spacecraft sections
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
    expect(solHtml).toContain('data-testid="system-elements-moons-section"');
    expect(solHtml).toContain(
      'data-testid="system-elements-minor-bodies-section"',
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
    });
    expect(starDetails?.focusedKind).toBe('star');
    expect(starDetails?.starTelemetry).toBeDefined();
    const starHtml = renderToString(
      createElement(DetailsPanel, { details: starDetails }),
    );
    expect(starHtml).toContain('data-testid="details-star-telemetry-section"');

    // 2. Planet focus with full SystemManifest (testing semiMajorAxisAu, periodDays, eccentricity, massMearth, equilibriumTempK, discoveryYear, discoveryMethod)
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
    const manifestPlanetHtml = renderToString(
      createElement(DetailsPanel, { details: manifestPlanetDetails }),
    );
    expect(manifestPlanetHtml).toContain(
      'data-testid="details-planet-telemetry-section"',
    );
    expect(manifestPlanetHtml).toContain(
      'data-testid="details-planet-telemetry-discovery"',
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
        classification: 'cluster',
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

    // buildSystemViewBreadcrumbs covers both system root and sub-element focus
    expect(buildSystemViewBreadcrumbs(starDetails, 'tau-ceti', true)).toEqual([
      { label: 'Galaxy', href: '/galaxy' },
      { label: 'Tau Ceti', href: '/system/tau-ceti' },
      { label: 'Tau Ceti' },
    ]);
    expect(buildSystemViewBreadcrumbs(null, 'tau-ceti', false)).toEqual([
      { label: 'Galaxy', href: '/galaxy' },
      { label: 'tau-ceti' },
    ]);
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

