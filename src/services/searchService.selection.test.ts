import { describe, expect, it } from 'vitest';
import {
  executeCatalogSearch,
  findFocusedEntryInCorpus,
  formatSlugFallbackTitle,
  resolveFocusedEntityFromCorpus,
  resolveSelectedSystemsFromSearchResults,
} from './searchService';
import { SAMPLE_CORPUS } from '../../tests/fixtures/searchFixtures';

describe('searchService - Search Selection & Focused Entity Resolution', () => {
  it('resolves selected systems from search results', () => {
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

    const nebulaResults = executeCatalogSearch(SAMPLE_CORPUS, {
      query: 'Orion Nebula',
      filter: 'structures',
    });
    expect(resolveSelectedSystemsFromSearchResults(nebulaResults)).toEqual([]);

    const emptyResults = executeCatalogSearch(SAMPLE_CORPUS, { query: '' });
    expect(resolveSelectedSystemsFromSearchResults(emptyResults)).toEqual([]);
  });

  it('resolves focused entities from corpus or fallback', () => {
    expect(formatSlugFallbackTitle('tau-ceti')).toBe('Tau Ceti');
    expect(findFocusedEntryInCorpus('   ', SAMPLE_CORPUS)).toBeUndefined();
    expect(resolveFocusedEntityFromCorpus('   ', SAMPLE_CORPUS)).toBeNull();

    const focusedTau = resolveFocusedEntityFromCorpus('tau-ceti', SAMPLE_CORPUS);
    expect(focusedTau).toEqual({
      id: 'gaia-2452378776434477184',
      name: 'Tau Ceti',
      position: [-3.1, -0.4, -2.0],
      classification: 'stellar-system',
      spectralType: 'G8V',
    });

    const focusedPlanet = resolveFocusedEntityFromCorpus('tau-ceti-e', SAMPLE_CORPUS);
    expect(focusedPlanet).toEqual({
      id: 'tau-ceti-e',
      name: 'tau Ceti e',
      position: [-3.1, -0.4, -2.0],
      classification: 'terrestrial',
    });

    const focusedEarth = resolveFocusedEntityFromCorpus('earth', SAMPLE_CORPUS);
    expect(focusedEarth).toEqual({
      id: 'earth',
      name: 'Earth',
      position: [0, 0, 0],
      classification: 'terrestrial',
    });

    expect(resolveFocusedEntityFromCorpus('tau-ceti', [])).toEqual({
      id: 'tau-ceti',
      name: 'Tau Ceti',
      position: [0, 0, 0],
      classification: 'stellar-system',
    });
  });
});
