import { describe, expect, it } from 'vitest';
import {
  buildResultTargetLink,
  resolveFocusedEntityFromCorpus,
  resolveSelectedEntitiesForScope,
  resolveSelectedSystemsFromSearchResults,
  toSearchResultItem,
} from './searchSelection';
import type { CompactSearchEntry } from '../../utils/compactDataTypes';
import { executeCatalogSearch } from './searchExecution';
import { SAMPLE_CORPUS } from '../../../tests/fixtures/searchFixtures';

describe('searchSelection', () => {
  it('builds target links and converts CompactSearchEntry to SearchResultItem', () => {
    const systemResult = buildResultTargetLink({
      id: 'tau-ceti',
      name: 'Tau Ceti',
      tagSlug: 'habitable-candidate',
    });
    expect(systemResult.targetView).toBe('galaxy');
    expect(systemResult.href).toBe('/galaxy?focus=tau-ceti&select=tag:habitable-candidate');

    const entry: CompactSearchEntry = {
      i: 'tau-ceti',
      k: 1,
      n: 'Tau Ceti',
      p: [-3.1, -0.4, -2.0],
      m: [3.5, 'G8V', 4, 1],
    };
    const item = toSearchResultItem(entry, 800, undefined, 'habitable-candidate');
    expect(item.id).toBe('tau-ceti');
    expect(item.category).toBe('stars');
    expect(item.targetView).toBe('galaxy');
    expect(item.href).toBe('/galaxy?focus=tau-ceti&select=tag:habitable-candidate');
    expect(item.hasHabitableCandidate).toBe(true);

    const moonEntry: CompactSearchEntry = {
      i: 'titan',
      k: 3,
      n: 'Titan',
      s: 'sol',
      o: 'saturn',
      h: 1,
    };
    const moonItem = toSearchResultItem(moonEntry, 900, 'Sol');
    expect(moonItem.parentBodyId).toBe('saturn');
  });

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
  });

  it('resolves focused entities from corpus or fallback', () => {
    expect(resolveFocusedEntityFromCorpus('   ', SAMPLE_CORPUS)).toBeNull();
    expect(resolveFocusedEntityFromCorpus('search', SAMPLE_CORPUS)).toBeNull();

    const focusedTau = resolveFocusedEntityFromCorpus('tau-ceti', SAMPLE_CORPUS);
    expect(focusedTau).toEqual({
      id: 'gaia-2452378776434477184',
      name: 'Tau Ceti',
      position: [-3.1, -0.4, -2.0],
      classification: 'stellar-system',
      spectralType: 'G8V',
    });

    const fallback = resolveFocusedEntityFromCorpus('unknown-system', []);
    expect(fallback).toEqual({
      id: 'unknown-system',
      name: 'Unknown System',
      position: [0, 0, 0],
      classification: 'stellar-system',
    });
  });

  it('resolves scope-aware entity IDs across galaxy, system, and planet scopes', () => {
    const scopeCorpus: readonly CompactSearchEntry[] = [
      ...SAMPLE_CORPUS,
      {
        i: 'titan',
        n: 'Titan',
        s: 'sol',
        o: 'saturn',
        k: 3,
        h: 1,
        a: 'titan',
      },
      {
        i: 'titania',
        n: 'Titania',
        s: 'sol',
        o: 'uranus',
        k: 3,
        h: 1,
        a: 'titania',
      },
      {
        i: 'canon-test',
        n: 'Titan Canon Layer',
        k: 7,
        w: 'canon-test',
        a: 'titan',
      },
    ];

    const titanResults = executeCatalogSearch(scopeCorpus, {
      query: 'titan',
      filter: 'all',
    });

    expect(resolveSelectedEntitiesForScope(titanResults, 'galaxy')).toEqual(['sol']);
    expect(resolveSelectedEntitiesForScope(titanResults, 'system')).toEqual([
      'saturn',
      'uranus',
    ]);
    expect(resolveSelectedEntitiesForScope(titanResults, 'planet')).toEqual([
      'titan',
      'titania',
    ]);

    const earthResults = executeCatalogSearch(scopeCorpus, {
      query: 'Earth',
      filter: 'all',
    });
    expect(resolveSelectedEntitiesForScope(earthResults, 'system')).toEqual(['earth']);
  });

  it('includes galactic-structure items with position and reticleType in resolveSelectedSystemsFromSearchResults', () => {
    const structureCorpus: readonly CompactSearchEntry[] = [
      {
        i: 'sagittarius-a-star',
        k: 5,
        n: 'Sagittarius A*',
        p: [0, 0, -8178],
        u: 'black-hole',
      },
    ];
    const results = executeCatalogSearch(structureCorpus, {
      query: 'Sagittarius',
      filter: 'all',
    });
    expect(resolveSelectedSystemsFromSearchResults(results)).toEqual([
      {
        id: 'sagittarius-a-star',
        name: 'Sagittarius A*',
        position: [0, 0, -8178],
        classification: 'black-hole',
      },
    ]);
  });

  it('does not duplicate systems when a child planet systemId slug matches an already-matched star name or ID', () => {
    const slugCorpus: readonly CompactSearchEntry[] = [
      {
        i: 'HYG-10847',
        k: 1,
        n: 'Epsilon Eridani',
        p: [-3.2, 0.1, -0.5],
        m: [3.73, 'K2V', 1],
      },
      {
        i: 'epsilon-eridani-b',
        k: 2,
        n: 'Epsilon Eridani b',
        s: 'epsilon-eridani',
        p: [-3.2, 0.1, -0.5],
      },
    ];
    const results = executeCatalogSearch(slugCorpus, {
      query: 'Epsilon Eridani',
      filter: 'all',
    });
    expect(resolveSelectedSystemsFromSearchResults(results)).toEqual([
      {
        id: 'HYG-10847',
        name: 'Epsilon Eridani',
        position: [-3.2, 0.1, -0.5],
        classification: 'stellar-system',
        spectralType: 'K2V',
      },
    ]);
  });

  it('includes fictional-entry items in groups.layers for system and planet scopes while excluding entityKind layer items', () => {
    const fictionalCorpus: readonly CompactSearchEntry[] = [
      {
        i: 'canon-alpha',
        k: 7,
        n: 'Canon Alpha Layer',
        w: 'canon-alpha',
        a: 'station',
      },
      {
        i: 'station-orbital',
        k: 7,
        n: 'Orbital Station Alpha',
        s: 'sol',
        o: 'earth',
        w: 'canon-alpha',
        a: 'station',
      },
      {
        i: 'outpost-deep',
        k: 7,
        n: 'Deep Outpost Station',
        s: 'sol',
        w: 'canon-alpha',
        a: 'station',
      },
    ];
    const results = executeCatalogSearch(fictionalCorpus, {
      query: 'station',
      filter: 'all',
    });

    expect(new Set(resolveSelectedEntitiesForScope(results, 'system'))).toEqual(
      new Set(['earth', 'outpost-deep']),
    );
    expect(new Set(resolveSelectedEntitiesForScope(results, 'planet'))).toEqual(
      new Set(['station-orbital', 'outpost-deep']),
    );
  });
});
