import { describe, expect, it } from 'vitest';
import {
  SEARCH_CATEGORIES,
  buildResultTargetLink,
  buildSearchViewHref,
  buildUpdatedSearchUrl,
  compareSearchResultItems,
  executeCatalogSearch,
  isArtificialSpacecraftEntry,
  isChildOfHostSystem,
  isSearchCategoryFilter,
  normaliseSearchQuery,
  parseSearchUrlParams,
  resolveEntityKind,
  resolveEntryCategory,
  resolveResultDisplayTitle,
  resolveResultSystemTitle,
  resolveReticleType,
  scoreSearchEntry,
  toSearchResultItem,
} from './searchService';
import type { CompactSearchEntry } from '../utils/compactDataCodec';
import { SAMPLE_CORPUS } from '../../tests/fixtures/searchFixtures';

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
    expect(results.totalMatches).toBeGreaterThanOrEqual(1);
  });

  it('evaluates dedicated searchService taxonomy and URL state helpers', () => {
    expect(isSearchCategoryFilter('all')).toBe(true);
    expect(isSearchCategoryFilter('stars')).toBe(true);
    expect(isSearchCategoryFilter('planets')).toBe(true);
    expect(isSearchCategoryFilter('invalid')).toBe(false);
    expect(isSearchCategoryFilter(null)).toBe(false);

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

    expect(resolveResultDisplayTitle({ i: 'sol', n: '  Sol  ' })).toBe('Sol');
    expect(resolveResultDisplayTitle({ i: 'fallback-id', n: '   ' })).toBe('fallback-id');
    const sysMap = new Map<string, string>([['sol', 'Sol']]);
    expect(resolveResultSystemTitle({ i: 'earth', k: 2, n: 'Earth', s: 'sol' }, sysMap)).toBe('Sol');
    expect(resolveResultSystemTitle({ i: 'sol', n: 'Sol' }, sysMap)).toBeUndefined();

    expect(resolveReticleType({ i: 's1', n: 'WD', u: 'white-dwarf', m: [11, 'DA2', 0] })).toBe('white-dwarf');
    expect(resolveReticleType({ i: 's2', n: 'BD', u: 'brown-dwarf', m: [16, 'T8', 0] })).toBe('brown-dwarf');
    expect(resolveReticleType({ i: 's3', n: 'PSR', u: 'neutron-star', m: [20, 'PSR', 0] })).toBe('neutron-star');
    expect(resolveReticleType({ i: 'jupiter', k: 2, n: 'Jupiter', u: 'gas-giant' })).toBe('gas-giant');
    expect(resolveReticleType({ i: 'neptune', k: 2, n: 'Neptune', u: 'ice-giant' })).toBe('ice-giant');
    expect(resolveReticleType({ i: 'snr-crab', k: 5, n: 'Crab Remnant', u: 'hazard' })).toBe('hazard');
    expect(resolveReticleType({ i: 'voyager-1', k: 6, n: 'Voyager 1', u: 'construct' })).toBe('construct');
    expect(resolveReticleType({ i: '433-eros', k: 6, n: '433 Eros' })).toBe('terrestrial');
    expect(
      resolveReticleType({ i: 'phm:tau-ceti', k: 7, n: 'Tau Ceti', s: 'tau-ceti' }),
    ).toBe('stellar-system');

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
  });

  it('executes catalog search with systemEntries relational lookup', () => {
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
  });
});
