import { describe, it, expect } from 'vitest';
import type { SystemSummaryNode } from '../../../types/astro';
import type { SpatialEntityDefinition } from '../entity';
import {
  GALAXY_SCENE_MAX_STREAMED_ENTITIES,
  summaryToEntityDefinition,
  buildStreamedEntitiesIndex,
  mergeGalaxyEntities,
} from './galaxyEntityMerge';

const makeSummary = (
  id: string,
  name: string,
  x: number,
  y: number,
  z: number,
  overrides: Partial<SystemSummaryNode> = {},
): SystemSummaryNode => ({
  id,
  name,
  x,
  y,
  z,
  dist: Math.hypot(x, y, z),
  mag: 1.5,
  absmag: 4.2,
  spect: 'G2V',
  starCount: 1,
  planetCount: 0,
  hasHabitableCandidate: false,
  sectorId: 'sector_+000_+000_+000',
  ...overrides,
});

describe('galaxyEntityMerge', () => {
  it('exports GALAXY_SCENE_MAX_STREAMED_ENTITIES = 1200', () => {
    expect(GALAXY_SCENE_MAX_STREAMED_ENTITIES).toBe(1200);
  });

  describe('summaryToEntityDefinition', () => {
    it('maps summary fields, defaults classification to star, maps planetCensus, and memoises via WeakMap', () => {
      const summary = makeSummary('trappist-1', 'TRAPPIST-1', 12, 1, -2, {
        spect: 'M8V',
        starCount: 1,
        planetCensus: ['terrestrial', 'super-earth'],
      });

      const first = summaryToEntityDefinition(summary);
      const second = summaryToEntityDefinition(summary);

      expect(first).toBe(second);
      expect(first).toEqual({
        id: 'trappist-1',
        name: 'TRAPPIST-1',
        position: [12, 1, -2],
        classification: 'star',
        spectralType: 'M8V',
        multiplicity: 1,
        planets: [
          { id: 'trappist-1-planet-0', name: 'Planet 1', classification: 'terrestrial' },
          { id: 'trappist-1-planet-1', name: 'Planet 2', classification: 'super-earth' },
        ],
      });
    });

    it('preserves explicit non-star classification and omits empty planets', () => {
      const summary = makeSummary('sirius-b', 'Sirius B', 1, 2, 3, {
        classification: 'white-dwarf',
        planetCensus: [],
      });
      const def = summaryToEntityDefinition(summary);
      expect(def.classification).toBe('white-dwarf');
      expect(def.planets).toBeUndefined();
    });
  });

  describe('buildStreamedEntitiesIndex', () => {
    it('hydrates sorted entities within activeCutoff and preserves reference stability across identical rebuilds', () => {
      const summaries = [
        makeSummary('hip-999', 'Vega', 7, 1, 2),
        makeSummary('hip-100', 'Alpha Centauri', -1, 0, -1),
      ];
      const prevRef: { current: SpatialEntityDefinition[] } = { current: [] };

      const firstIndex = buildStreamedEntitiesIndex(summaries, true, 1200, 96, prevRef);
      expect(firstIndex.streamedEntities.map((e) => e.id)).toEqual(['hip-100', 'hip-999']);
      expect(firstIndex.streamedEntityBySlug.get('vega')?.id).toBe('hip-999');
      expect(firstIndex.summaryById.get('hip-100')?.name).toBe('Alpha Centauri');

      const secondIndex = buildStreamedEntitiesIndex(summaries, true, 1200, 96, prevRef);
      expect(secondIndex.streamedEntities).toBe(firstIndex.streamedEntities);
    });

    it('withholds reticle entities when not hydrated or above activeCutoff while still indexing summaries', () => {
      const summaries = [
        makeSummary('s1', 'One', 1, 0, 0),
        makeSummary('s2', 'Two', 2, 0, 0),
        makeSummary('s3', 'Three', 3, 0, 0),
      ];
      const prevRef: { current: SpatialEntityDefinition[] } = { current: [] };

      const overCutoff = buildStreamedEntitiesIndex(summaries, true, 1200, 2, prevRef);
      expect(overCutoff.streamedEntities).toEqual([]);
      expect(overCutoff.summaryById.size).toBe(3);

      const unhydrated = buildStreamedEntitiesIndex(summaries, false, 1200, 96, prevRef);
      expect(unhydrated.streamedEntities).toEqual([]);
      expect(unhydrated.summaryBySlug.get('one')?.id).toBe('s1');
    });
  });

  describe('mergeGalaxyEntities', () => {
    it('returns exact streamedEntities reference on fast-path when all additionalEntities match by id or slug', () => {
      const summaries = [makeSummary('hip-8102', 'Tau Ceti', 3, 1, -1)];
      const prevRef: { current: SpatialEntityDefinition[] } = { current: [] };
      const index = buildStreamedEntitiesIndex(summaries, true, 1200, 96, prevRef);

      const additional: SpatialEntityDefinition[] = [
        { id: 'tau-ceti', name: 'Tau Ceti', position: [3, 1, -1], classification: 'star' },
      ];
      const merged = mergeGalaxyEntities(additional, index, summaries, [0, 0, 0], 1200);
      expect(merged).toBe(index.streamedEntities);
    });

    it('enriches matching additionalEntities from streamed summaries and culls >24 bulk overlays beyond ceilingRadiusSq', () => {
      const summaries = [
        makeSummary('star-0', 'Star Zero', 2, 0, 0, {
          classification: 'brown-dwarf',
          spect: 'L5',
          starCount: 2,
          planetCensus: ['gas-giant'],
        }),
        makeSummary('star-1', 'Star One', 10, 0, 0),
      ];
      const prevRef: { current: SpatialEntityDefinition[] } = { current: [] };
      // activeCutoff = 1 -> streamedEntities is empty, summaryById populated; maxActiveEntities = 2 -> hasReachedCeiling = true (radius = 10)
      const index = buildStreamedEntitiesIndex(summaries, true, 2, 1, prevRef);

      const bulkOverlay: SpatialEntityDefinition[] = Array.from({ length: 25 }, (_, i) =>
        i === 0
          ? { id: 'alias-star-0', name: 'Star Zero', position: [99, 99, 99] }
          : {
              id: `bulk-${i}`,
              name: `Bulk ${i}`,
              position: i === 24 ? [50, 0, 0] : [3, 0, 0],
              classification: 'star',
            },
      );

      const merged = mergeGalaxyEntities(bulkOverlay, index, summaries, [0, 0, 0], 2);
      const byId = new Map(merged.map((e) => [e.id, e]));

      expect(byId.get('alias-star-0')?.position).toEqual([2, 0, 0]);
      expect(byId.get('alias-star-0')?.classification).toBe('brown-dwarf');
      expect(byId.get('alias-star-0')?.planets).toHaveLength(1);
      expect(byId.has('bulk-1')).toBe(true);
      expect(byId.has('bulk-24')).toBe(false);
    });
  });
});
