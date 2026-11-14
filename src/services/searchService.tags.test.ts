import { describe, expect, it } from 'vitest';
import {
  buildResultTargetLink,
  toSearchResultItem,
  executeCatalogSearch,
  QUERY_CLEAN_KEY_TO_TAG_SLUG,
} from './searchService';
import {
  SYSTEM_TAG_BITS,
  type CompactSearchEntry,
} from '../utils/compactDataCodec';

describe('searchService - Tag Targeting & URL Integration', () => {
  it('buildResultTargetLink & toSearchResultItem support tagSlug parameter with select=tag:<slug> URL', () => {
    const systemResult = buildResultTargetLink({
      id: 'tau-ceti',
      name: 'Tau Ceti',
      tagSlug: 'habitable-candidate',
    });
    expect(systemResult.targetView).toBe('galaxy');
    expect(systemResult.href).toBe('/galaxy?focus=tau-ceti&select=tag:habitable-candidate');

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

    const canonPrecedenceResult = buildResultTargetLink({
      id: 'tau-ceti',
      name: 'Tau Ceti',
      layerId: 'canon-project-hail-mary',
      tagSlug: 'habitable-candidate',
    });
    expect(canonPrecedenceResult.href).toBe(
      '/galaxy?focus=tau-ceti&select=layer:project-hail-mary&layer=project-hail-mary:tau-ceti',
    );

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

    const habitableResults = executeCatalogSearch(corpusWithTags, {
      query: 'habitable',
    });
    expect(habitableResults.groups.stars.items.length).toBe(2);

    const harborItem = habitableResults.groups.stars.items.find((it) => it.id === 'habitable-harbor');
    expect(harborItem).toBeDefined();
    expect(harborItem?.score).toBeGreaterThan(650);
    expect(harborItem?.href).toBe('/galaxy?focus=habitable-harbor&select=tag:habitable-candidate');

    const tauCetiItem = habitableResults.groups.stars.items.find((it) => it.id === 'tau-ceti');
    expect(tauCetiItem).toBeDefined();
    expect(tauCetiItem?.score).toBe(650);
    expect(tauCetiItem?.href).toBe('/galaxy?focus=tau-ceti&select=tag:habitable-candidate');

    expect(habitableResults.groups.stars.items.some((it) => it.id === 'sirius')).toBe(false);

    const habitableCandidateResults = executeCatalogSearch(corpusWithTags, {
      query: 'habitable candidate',
    });
    const tauCetiCandidateItem = habitableCandidateResults.groups.stars.items.find((it) => it.id === 'tau-ceti');
    expect(tauCetiCandidateItem?.score).toBe(650);
    expect(tauCetiCandidateItem?.href).toBe('/galaxy?focus=tau-ceti&select=tag:habitable-candidate');

    const nakedEyeResults = executeCatalogSearch(corpusWithTags, {
      query: 'naked eye',
    });
    expect(nakedEyeResults.groups.stars.items.length).toBe(1);
    const siriusItem = nakedEyeResults.groups.stars.items[0];
    expect(siriusItem.id).toBe('sirius');
    expect(siriusItem.score).toBe(650);
    expect(siriusItem.href).toBe('/galaxy?focus=sirius&select=tag:naked-eye');

    const siriusDirectResults = executeCatalogSearch(corpusWithTags, {
      query: 'Sirius',
    });
    expect(siriusDirectResults.groups.stars.items[0].href).toBe('/galaxy?focus=sirius');
  });
});
