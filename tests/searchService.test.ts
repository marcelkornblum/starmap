// @vitest-environment jsdom
import { createElement, type ReactElement } from 'react';
import { render } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  SearchResultItem,
  formatPlanetCountSummary,
} from '../src/components/domain';
import { shouldDisplaySpectralBadge } from '../src/components/interface';
import { Search, prefetchSearchResultsDetails } from '../src/components/search';
import * as detailsRepo from '../src/data/detailsRepository';
import * as layerRepo from '../src/data/layerRepository';
import {
  clearSearchRepositoryCache,
  fetchSearchShard,
  getCachedCorpusForFilter,
  loadSearchCorpusForFilter,
  mergeSearchShards,
} from '../src/data/searchRepository';
import {
  SEARCH_CATEGORIES,
  buildEntityOrbitTargetHref,
  buildPlanetTypeGalaxyHref,
  buildResultTargetLink,
  buildSearchViewHref,
  buildStarTypeGalaxyHref,
  buildUpdatedSearchUrl,
  compareSearchResultItems,
  executeCatalogSearch,
  extractUrlFocusSlug,
  extractUrlSelectSlugs,
  findFocusedEntryInCorpus,
  formatSlugFallbackTitle,
  isArtificialSpacecraftEntry,
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
  resolveSelectedSystemsFromPlanetType,
  resolveSelectedSystemsFromSearchResults,
  resolveSelectedSystemsFromStarType,
  resolveSelectedSystemsFromUrlSelect,
  scoreSearchEntry,
  toSearchResultItem,
  type GroupedSearchResults,
  QUERY_CLEAN_KEY_TO_TAG_SLUG,
} from '../src/services/searchService';
import {
  SYSTEM_TAG_BITS,
  type CompactSearchEntry,
} from '../src/utils/compactDataCodec';
import { LAYER_MANIFESTS } from '../content/layers';
import {
  LAYER_INDEX_ENTRIES,
  resetLayerRuntime,
  seedAllLayerData,
} from './layerFixtures';

const renderToHtml = (element: ReactElement): string => render(element).container.innerHTML;

import { SAMPLE_CORPUS } from './searchFixtures';
export { SAMPLE_CORPUS };

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

  it('returns unique item ids within each category even when the corpus repeats an entry', () => {
    const duplicatedCorpus: CompactSearchEntry[] = [...SAMPLE_CORPUS, ...SAMPLE_CORPUS];
    const results = executeCatalogSearch(duplicatedCorpus, {
      query: 'Tau Ceti',
      filter: 'all',
    });

    for (const cat of SEARCH_CATEGORIES) {
      const ids = results.groups[cat.key].items.map((i) => i.id);
      expect(new Set(ids).size).toBe(ids.length);
    }

    const baseline = executeCatalogSearch(SAMPLE_CORPUS, { query: 'Tau Ceti', filter: 'all' });
    expect(results.totalMatches).toBe(baseline.totalMatches);
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
  beforeAll(seedAllLayerData);
  afterAll(resetLayerRuntime);

  it('renders populated search results with domain SearchResultItem, clean galaxy URLs, reticle types, spectral/planet summaries, and zero pc numbers', () => {
    const html = renderToHtml(
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
    // System links to /galaxy?focus=<systemname>, child items link to /system/<systemname>?focus=<itemname> (DEC-038)
    expect(html).toContain('href="/galaxy?focus=tau-ceti"');
    expect(html).toContain('href="/system/tau-ceti?focus=tau-ceti-e"');
    expect(html).toContain(
      'href="/system/tau-ceti?focus=adrian&amp;select=layer:project-hail-mary&amp;layer=project-hail-mary:adrian"',
    );
  });

  it('routes Solar System child bodies to /system/sol?focus=<itemname>', () => {
    const html = renderToHtml(
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
    const html = renderToHtml(
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
    const html = renderToHtml(
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

  it('does NOT trigger prefetch for < 3 character queries, and lazily prefetches detail/summary/layer shards for 3+ characters', async () => {
    const summarySpy = vi.spyOn(detailsRepo, 'fetchSummaryNode').mockImplementation(() => Promise.resolve(undefined));
    const detailSpy = vi.spyOn(detailsRepo, 'fetchDetailRecord').mockImplementation(() => Promise.resolve(undefined));
    const manifestSpy = vi.spyOn(layerRepo, 'fetchLayerManifest').mockImplementation(() => Promise.resolve({} as any));
    const annotationsSpy = vi.spyOn(layerRepo, 'fetchEntityAnnotations').mockImplementation(() => Promise.resolve([]));

    try {
      const shortQueryResults: GroupedSearchResults = {
        query: 'so',
        filter: 'all',
        totalMatches: 1,
        groups: {
          stars: {
            category: 'stars',
            heading: 'Stars',
            totalMatches: 1,
            items: [
              {
                id: 'sol',
                name: 'Sol',
                category: 'stars',
                entityKind: 'star-system',
                reticleType: 'stellar-system',
                targetView: 'galaxy',
                href: '/galaxy?focus=sol',
                score: 100,
              },
            ],
          },
          planets: { category: 'planets', heading: 'Planets', totalMatches: 0, items: [] },
          structures: { category: 'structures', heading: 'Structures', totalMatches: 0, items: [] },
          'minor-bodies': { category: 'minor-bodies', heading: 'Minor Bodies', totalMatches: 0, items: [] },
          layers: { category: 'layers', heading: 'Layers', totalMatches: 0, items: [] },
        },
      };

      prefetchSearchResultsDetails(shortQueryResults);

      expect(summarySpy).not.toHaveBeenCalled();
      expect(detailSpy).not.toHaveBeenCalled();
      expect(manifestSpy).not.toHaveBeenCalled();
      expect(annotationsSpy).not.toHaveBeenCalled();

      const threeCharResults: GroupedSearchResults = {
        query: 'sol',
        filter: 'all',
        totalMatches: 3,
        groups: {
          stars: {
            category: 'stars',
            heading: 'Stars',
            totalMatches: 1,
            items: [
              {
                id: 'sol',
                name: 'Sol',
                category: 'stars',
                entityKind: 'star-system',
                reticleType: 'stellar-system',
                targetView: 'galaxy',
                href: '/galaxy?focus=sol',
                score: 100,
              },
            ],
          },
          planets: {
            category: 'planets',
            heading: 'Planets',
            totalMatches: 1,
            items: [
              {
                id: 'earth',
                name: 'Earth',
                systemId: 'sol',
                category: 'planets',
                entityKind: 'planet',
                reticleType: 'terrestrial',
                targetView: 'system',
                href: '/system/sol?focus=earth',
                score: 90,
              },
            ],
          },
          structures: { category: 'structures', heading: 'Structures', totalMatches: 0, items: [] },
          'minor-bodies': { category: 'minor-bodies', heading: 'Minor Bodies', totalMatches: 0, items: [] },
          layers: {
            category: 'layers',
            heading: 'Layers',
            totalMatches: 1,
            items: [
              {
                id: 'overlay-recent-discoveries:proxima-centauri-b',
                name: 'Proxima Centauri b',
                category: 'layers',
                entityKind: 'layer',
                reticleType: 'terrestrial',
                targetView: 'system',
                href: '/system/proxima-centauri?focus=proxima-centauri-b',
                systemId: 'proxima-centauri',
                score: 80,
              },
            ],
          },
        },
      };

      prefetchSearchResultsDetails(threeCharResults);

      expect(summarySpy).toHaveBeenCalledWith('sol');
      expect(detailSpy).toHaveBeenCalledWith('sol');
      expect(detailSpy).toHaveBeenCalledWith('earth');
      expect(annotationsSpy).toHaveBeenCalledWith(expect.arrayContaining(['sol']));
      expect(annotationsSpy).toHaveBeenCalledWith(expect.arrayContaining(['earth', 'sol']));
      expect(manifestSpy).toHaveBeenCalledWith('overlay-recent-discoveries');
      expect(summarySpy).toHaveBeenCalledWith('proxima-centauri');
      expect(detailSpy).toHaveBeenCalledWith('proxima-centauri');
      expect(detailSpy).toHaveBeenCalledWith('proxima-centauri-b');
    } finally {
      summarySpy.mockRestore();
      detailSpy.mockRestore();
      manifestSpy.mockRestore();
      annotationsSpy.mockRestore();
    }
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

    expect(renderToHtml(createElement(SearchResultItem, { result: starNoMeta }))).not.toContain(
      'data-testid="result-variation-stars"',
    );
    expect(renderToHtml(createElement(SearchResultItem, { result: starOnePlanet }))).toContain(
      'data-testid="result-planet-summary"',
    );
    expect(renderToHtml(createElement(SearchResultItem, { result: starOnePlanet }))).toContain(
      '>1</span>',
    );
    expect(renderToHtml(createElement(SearchResultItem, { result: starOnePlanet }))).toContain(
      'planet</span>',
    );
    expect(renderToHtml(createElement(SearchResultItem, { result: layerNoCanon }))).toContain(
      '<span data-testid="result-variation-layers"></span>',
    );

    // Reticle is positioned to the left of the item title link
    const htmlStarOnePlanet = renderToHtml(createElement(SearchResultItem, { result: starOnePlanet }));
    const reticleIdx = htmlStarOnePlanet.indexOf('data-testid="result-reticle-type"');
    const titleIdx = htmlStarOnePlanet.indexOf('>One Planet Star</a>');
    expect(reticleIdx).toBeGreaterThan(-1);
    expect(titleIdx).toBeGreaterThan(-1);
    expect(reticleIdx).toBeLessThan(titleIdx);

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
      href: '/galaxy?focus=tau-ceti&select=layer:project-hail-mary&layer=project-hail-mary:tau-ceti',
    });

    const fictionSystemItem = toSearchResultItem(fictionSystemEntry, 850, 'Tau Ceti');
    expect(fictionSystemItem.href).toBe('/galaxy?focus=tau-ceti&select=layer:project-hail-mary&layer=project-hail-mary:tau-ceti');

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
      href: '/galaxy?focus=sol',
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
    expect(parseUrlSelectTokens('?select=tag:habitable-candidate', LAYER_INDEX_ENTRIES)).toEqual([
      { kind: 'tag', tag: 'habitable-candidate' },
    ]);
    expect(parseUrlSelectTokens('?select=layer:project-hail-mary', LAYER_INDEX_ENTRIES)).toEqual([
      { kind: 'layer', layerId: 'canon-project-hail-mary' },
    ]);
    expect(parseUrlSelectTokens('?select=layer:recent-discoveries', LAYER_INDEX_ENTRIES)).toEqual([
      { kind: 'layer', layerId: 'overlay-recent-discoveries' },
    ]);
    expect(parseUrlSelectTokens('?select=star-type:g', LAYER_INDEX_ENTRIES)).toEqual([
      { kind: 'star-type', starType: 'g' },
    ]);
    expect(parseUrlSelectTokens('?select=star-type:g2v', LAYER_INDEX_ENTRIES)).toEqual([
      { kind: 'star-type', starType: 'g2v' },
    ]);
    expect(parseUrlSelectTokens('?select=star-type:white-dwarf', LAYER_INDEX_ENTRIES)).toEqual([
      { kind: 'star-type', starType: 'white-dwarf' },
    ]);
    expect(parseUrlSelectTokens('?select=planet-type:super-earth', LAYER_INDEX_ENTRIES)).toEqual([
      { kind: 'planet-type', planetType: 'super-earth' },
    ]);
    expect(parseUrlSelectTokens('?select=planet-type:gas-giant', LAYER_INDEX_ENTRIES)).toEqual([
      { kind: 'planet-type', planetType: 'gas-giant' },
    ]);
    expect(parseUrlSelectTokens('?select=collection:extreme-worlds', LAYER_INDEX_ENTRIES)).toEqual([
      { kind: 'layer', layerId: 'overlay-extreme-worlds' },
    ]);
    expect(parseUrlSelectTokens('?select=collection:recent-discoveries', LAYER_INDEX_ENTRIES)).toEqual([
      { kind: 'layer', layerId: 'overlay-recent-discoveries' },
    ]);
    expect(parseUrlSelectTokens('?select=sol', LAYER_INDEX_ENTRIES)).toEqual([
      { kind: 'entity', slug: 'sol' },
    ]);

    // 2. Comma-separated combination
    const multi = parseUrlSelectTokens(
      '?select=star-type:g,layer:project-hail-mary,sol',
      LAYER_INDEX_ENTRIES,
    );
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

    // Curated layers resolution via unified layer manifests:
    const extremeWorlds = resolveSelectedSystemsFromLayer('overlay-extreme-worlds', testCorpus, LAYER_MANIFESTS);
    expect(extremeWorlds.length).toBeGreaterThan(0);
    expect(extremeWorlds.some((s) => s.id === 'sol' || s.name === 'Sol')).toBe(true);

    const newlyDiscovered = resolveSelectedSystemsFromLayer('overlay-recent-discoveries', testCorpus, LAYER_MANIFESTS);
    expect(newlyDiscovered.length).toBeGreaterThan(0);

    // resolveSelectedSystemsFromUrlSelect with combined grammar
    const combined = resolveSelectedSystemsFromUrlSelect(
      '?select=star-type:g2v,collection:extreme-worlds',
      testCorpus,
      LAYER_INDEX_ENTRIES,
      LAYER_MANIFESTS,
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
  });

  it('buildResultTargetLink & toSearchResultItem support tagSlug parameter with select=tag:<slug> URL', () => {
    // 1. Standard star system with tagSlug
    const systemResult = buildResultTargetLink({
      id: 'tau-ceti',
      name: 'Tau Ceti',
      tagSlug: 'habitable-candidate',
    });
    expect(systemResult.targetView).toBe('galaxy');
    expect(systemResult.href).toBe('/galaxy?focus=tau-ceti&select=tag:habitable-candidate');

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
      '/galaxy?focus=tau-ceti&select=layer:project-hail-mary&layer=project-hail-mary:tau-ceti',
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
    expect(item.href).toBe('/galaxy?focus=tau-ceti&select=tag:habitable-candidate');
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
    expect(harborItem?.href).toBe('/galaxy?focus=habitable-harbor&select=tag:habitable-candidate');

    // Tau Ceti has directScore === 0, so it gets scored at 650 with tagSlug attached
    const tauCetiItem = habitableResults.groups.stars.items.find((it) => it.id === 'tau-ceti');
    expect(tauCetiItem).toBeDefined();
    expect(tauCetiItem?.score).toBe(650);
    expect(tauCetiItem?.href).toBe('/galaxy?focus=tau-ceti&select=tag:habitable-candidate');

    // Sirius should NOT be in the habitable candidate stars group
    expect(habitableResults.groups.stars.items.some((it) => it.id === 'sirius')).toBe(false);

    // 1b. Searching "habitable candidate" matches Tau Ceti at score 650 with select=tag:habitable-candidate
    const habitableCandidateResults = executeCatalogSearch(corpusWithTags, {
      query: 'habitable candidate',
    });
    const tauCetiCandidateItem = habitableCandidateResults.groups.stars.items.find((it) => it.id === 'tau-ceti');
    expect(tauCetiCandidateItem?.score).toBe(650);
    expect(tauCetiCandidateItem?.href).toBe('/galaxy?focus=tau-ceti&select=tag:habitable-candidate');

    // 2. Searching "naked eye" surfaces Sirius via entry.g bitmask at score 650
    const nakedEyeResults = executeCatalogSearch(corpusWithTags, {
      query: 'naked eye',
    });
    expect(nakedEyeResults.groups.stars.items.length).toBe(1);
    const siriusItem = nakedEyeResults.groups.stars.items[0];
    expect(siriusItem.id).toBe('sirius');
    expect(siriusItem.score).toBe(650);
    expect(siriusItem.href).toBe('/galaxy?focus=sirius&select=tag:naked-eye');

    // 3. Normal query not in QUERY_CLEAN_KEY_TO_TAG_SLUG produces clean URLs without select=tag:...
    const siriusDirectResults = executeCatalogSearch(corpusWithTags, {
      query: 'Sirius',
    });
    expect(siriusDirectResults.groups.stars.items[0].href).toBe('/galaxy?focus=sirius');
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
        href: '/galaxy?focus=tau-ceti',
      });

      const structRes = buildEntityOrbitTargetHref({
        id: 'm13-hercules',
        name: 'Great Hercules Cluster',
        entityKind: 'galactic-structure',
      });
      expect(structRes).toEqual({
        targetView: 'galaxy',
        href: '/galaxy?focus=great-hercules-cluster',
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
        LAYER_INDEX_ENTRIES,
      );
      expect(parsed.tags).toEqual(['habitable-candidate']);
      expect(parsed.layerSlugs).toEqual(['overlay-recent-discoveries']);
      expect(parsed.starTypes).toEqual(['g']);
      expect(parsed.entitySlugs).toEqual(['sol']);
    });
  });
});



