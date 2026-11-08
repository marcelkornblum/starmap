import { describe, expect, it } from 'vitest';
import {
  QUADRANTS,
  buildJourneyChordRenderData,
  computeApertureRadius,
  computeDistance3D,
  computePerimeterFade,
  deriveEntityTier,
  isFootprintVisible,
  isInsideAperture,
  isOrbitForceRendered,
  isStalkVisible,
} from './spatialMath';
import type { JourneyChordLeg } from '../types/spatial';

describe('spatialMath', () => {
  describe('computeApertureRadius', () => {
    it('returns baseRadius when screenConstant is false', () => {
      expect(computeApertureRadius(100, 10, 35, false)).toBe(10);
    });

    it('scales linearly with camera distance when screenConstant is true', () => {
      expect(computeApertureRadius(70, 10, 35, true)).toBe(20);
    });

    it('falls back to 3.49 * baseRadius when referenceDistance <= 0', () => {
      const radius = computeApertureRadius(34.9, 10, 0, true);
      expect(radius).toBeCloseTo(10, 2);
    });

    it('respects minRadius clamp', () => {
      expect(computeApertureRadius(5, 10, 35, true, 20)).toBeCloseTo(5.714, 2);
    });
  });

  describe('isInsideAperture', () => {
    it('returns true when point is within radius', () => {
      expect(isInsideAperture([1, 1, 1], [0, 0, 0], 2)).toBe(true);
    });

    it('returns false when point is outside radius', () => {
      expect(isInsideAperture([2, 2, 2], [0, 0, 0], 2)).toBe(false);
    });
  });

  describe('computePerimeterFade', () => {
    it('returns 0 when distance exceeds radius', () => {
      expect(computePerimeterFade(15, 10)).toBe(0);
    });

    it('returns 1 inside featherThreshold', () => {
      expect(computePerimeterFade(7, 10, 0.8)).toBe(1);
    });

    it('smoothly interpolates between featherThreshold and radius', () => {
      const fade = computePerimeterFade(9, 10, 0.8);
      expect(fade).toBeGreaterThan(0);
      expect(fade).toBeLessThan(1);
    });
  });

  describe('deriveEntityTier', () => {
    it('prioritises focused tier over selected and active', () => {
      const tier = deriveEntityTier('star-1', {
        focusedId: 'star-1',
        selectedId: 'star-1',
        apertureIds: new Set(['star-1']),
      });
      expect(tier).toBe('focused');
    });

    it('identifies focused tier from focusedIds set or array', () => {
      expect(
        deriveEntityTier('star-2', {
          focusedIds: new Set(['star-2']),
          apertureIds: [],
        }),
      ).toBe('focused');

      expect(
        deriveEntityTier('star-3', {
          focusedIds: ['star-3'],
          apertureIds: [],
        }),
      ).toBe('focused');
    });

    it('derives selected tier from selectedId, hoveredId, or selectedIds', () => {
      expect(
        deriveEntityTier('star-1', {
          selectedId: 'star-1',
          apertureIds: [],
        }),
      ).toBe('selected');

      expect(
        deriveEntityTier('star-1', {
          hoveredId: 'star-1',
          apertureIds: [],
        }),
      ).toBe('selected');

      expect(
        deriveEntityTier('star-1', {
          selectedIds: new Set(['star-1']),
          apertureIds: [],
        }),
      ).toBe('selected');
    });

    it('derives active tier when inside apertureIds', () => {
      expect(
        deriveEntityTier('star-1', {
          apertureIds: new Set(['star-1']),
        }),
      ).toBe('active');
    });

    it('falls back to passive tier', () => {
      expect(
        deriveEntityTier('star-1', {
          apertureIds: new Set(),
        }),
      ).toBe('passive');
    });
  });

  describe('tier visibility predicates', () => {
    it('isStalkVisible only returns true for selected or focused', () => {
      expect(isStalkVisible('focused')).toBe(true);
      expect(isStalkVisible('selected')).toBe(true);
      expect(isStalkVisible('active')).toBe(false);
      expect(isStalkVisible('passive')).toBe(false);
    });

    it('isFootprintVisible matches isStalkVisible', () => {
      expect(isFootprintVisible('focused')).toBe(true);
      expect(isFootprintVisible('selected')).toBe(true);
      expect(isFootprintVisible('active')).toBe(false);
      expect(isFootprintVisible('passive')).toBe(false);
    });

    it('isOrbitForceRendered returns true for selected or focused', () => {
      expect(isOrbitForceRendered('focused')).toBe(true);
      expect(isOrbitForceRendered('selected')).toBe(true);
      expect(isOrbitForceRendered('active')).toBe(false);
      expect(isOrbitForceRendered('passive')).toBe(false);
    });
  });

  describe('buildJourneyChordRenderData', () => {
    it('returns empty result for empty legs', () => {
      const result = buildJourneyChordRenderData([]);
      expect(result.legs).toEqual([]);
      expect(result.waypoints).toEqual([]);
      expect(result.totalEuclideanLength).toBe(0);
    });

    it('builds geometry legs, waypoints, and total length for multi-leg routes', () => {
      const legs: JourneyChordLeg[] = [
        {
          id: 'leg-1',
          stepIndex: 0,
          fromId: 'sol',
          fromName: 'Sol',
          toId: 'alpha-centauri',
          toName: 'Alpha Centauri',
          fromPosition: [0, 0, 0],
          toPosition: [1.34, 0, 0],
          distanceLabel: '1.34 pc',
        },
        {
          id: 'leg-2',
          stepIndex: 1,
          fromId: 'alpha-centauri',
          fromName: 'Alpha Centauri',
          toId: 'barnards-star',
          toName: "Barnard's Star",
          fromPosition: [1.34, 0, 0],
          toPosition: [1.34, 1.8, 0],
          distanceLabel: '1.80 pc',
        },
      ];

      const result = buildJourneyChordRenderData(legs);
      expect(result.legs).toHaveLength(2);
      expect(result.waypoints).toHaveLength(3);
      expect(result.waypoints[0].role).toBe('origin');
      expect(result.waypoints[1].role).toBe('waypoint');
      expect(result.waypoints[2].role).toBe('destination');
      expect(result.totalEuclideanLength).toBeCloseTo(3.14, 2);
    });
  });

  describe('QUADRANTS', () => {
    it('defines 4 canonical quadrant signs', () => {
      expect(QUADRANTS).toEqual([
        { qx: 1, qy: 1 },
        { qx: -1, qy: 1 },
        { qx: -1, qy: -1 },
        { qx: 1, qy: -1 },
      ]);
    });
  });

  describe('computeDistance3D', () => {
    it('computes 3D Euclidean distance from origin or custom anchor', () => {
      expect(computeDistance3D([3, 4, 12])).toBe(13);
      expect(computeDistance3D([4, 6, 15], [1, 2, 3])).toBe(13);
    });
  });
});
