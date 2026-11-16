import { describe, expect, it, vi } from 'vitest';
import {
  SEARCH_DEBOUNCE_MS,
  SEARCH_MIN_QUERY_LENGTH,
  prefetchSearchResultsDetails,
  searchCatalog,
} from './searchHelpers';
import type { GroupedSearchResults } from '../../../services/search/searchTypes';
import type { DatasetLayerManifest } from '../../../types/datasetLayers';
import type { CompactSearchEntry } from '../../../utils/compactDataTypes';
import * as detailsRepo from '../../../data/detailsRepository';
import * as layerRepo from '../../../data/layerRepository';

const TEST_CORPUS: readonly CompactSearchEntry[] = [
  {
    i: 'sol',
    n: 'Sol',
    m: [-26.74, 'G2V', 8, 1],
    h: 1,
    a: 'sol sun',
  },
  {
    i: 'earth',
    n: 'Earth',
    s: 'sol',
    k: 2,
    u: 'terrestrial',
    h: 1,
    a: 'earth terra',
  },
  {
    i: 'tau-ceti',
    n: 'Tau Ceti',
    m: [3.49, 'G8V', 4, 1],
    h: 1,
    a: 'tau ceti',
  },
];

describe('searchHelpers', () => {
  it('defines canonical constants for debounce and min query length', () => {
    expect(SEARCH_MIN_QUERY_LENGTH).toBe(3);
    expect(SEARCH_DEBOUNCE_MS).toBe(150);
  });

  describe('searchCatalog', () => {
    it('treats queries shorter than 3 characters as empty', () => {
      const shortResult = searchCatalog(TEST_CORPUS, {
        query: 'so',
        filter: 'all',
      });
      expect(shortResult.totalMatches).toBe(0);

      const whitespaceResult = searchCatalog(TEST_CORPUS, {
        query: '  so  ',
        filter: 'all',
      });
      expect(whitespaceResult.totalMatches).toBe(0);
    });

    it('searches the catalogue when query has 3 or more characters', () => {
      const result = searchCatalog(TEST_CORPUS, {
        query: 'sol',
        filter: 'all',
      });
      expect(result.totalMatches).toBeGreaterThanOrEqual(1);
      expect(result.groups.stars.items.some((item) => item.id === 'sol')).toBe(true);
    });
  });

  describe('prefetchSearchResultsDetails', () => {
    it('does NOT trigger prefetch for queries under 3 characters', async () => {
      const summarySpy = vi
        .spyOn(detailsRepo, 'fetchSummaryNode')
        .mockResolvedValue(undefined);
      const detailSpy = vi
        .spyOn(detailsRepo, 'fetchDetailRecord')
        .mockResolvedValue(undefined);

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

      summarySpy.mockRestore();
      detailSpy.mockRestore();
    });

    it('lazily prefetches detail/summary/layer shards for 3+ characters without as any mock', async () => {
      const summarySpy = vi
        .spyOn(detailsRepo, 'fetchSummaryNode')
        .mockResolvedValue(undefined);
      const detailSpy = vi
        .spyOn(detailsRepo, 'fetchDetailRecord')
        .mockResolvedValue(undefined);

      const mockManifest: DatasetLayerManifest = {
        layerId: 'overlay-recent-discoveries',
        title: 'Recent Discoveries',
        description: 'Recent Discoveries description',
        kind: 'scientific-overlay',
        version: 1,
        entries: {},
      };
      const manifestSpy = vi
        .spyOn(layerRepo, 'fetchLayerManifest')
        .mockResolvedValue(mockManifest);
      const annotationsSpy = vi
        .spyOn(layerRepo, 'fetchEntityAnnotations')
        .mockResolvedValue([]);

      try {
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
  });
});
