import { describe, it, expect } from 'vitest';
import { SOL_REFERENCE_TARGET } from '../../config/referenceTargets';
import {
  DEFAULT_SINGLE_RESULT_DISTANCE_PC,
  MIN_SEARCH_FRAMING_DISTANCE_PC,
} from '../../utils/searchFraming';
import {
  resolveSearchFramingAction,
  type SearchFramingItem,
} from './searchFramingPolicy';

describe('searchFramingPolicy', () => {
  describe('resolveSearchFramingAction', () => {
    it('returns none when matches are empty or only non-spatial items exist', () => {
      expect(resolveSearchFramingAction([])).toEqual({ kind: 'none' });

      const nonSpatial: readonly SearchFramingItem[] = [
        {
          id: 'layer:test-layer',
          category: 'layers',
          entityKind: 'layer',
          href: '/galaxy?layer=test-layer',
        },
        {
          id: 'unpositioned-planet',
          category: 'planets',
          entityKind: 'planet',
          href: '/system/unknown?focus=unpositioned-planet',
        },
      ];
      expect(resolveSearchFramingAction(nonSpatial)).toEqual({ kind: 'none' });
    });

    it('frames a single non-Solar-System star in galaxy view', () => {
      const starMatch: SearchFramingItem = {
        id: 'star-a',
        category: 'stars',
        entityKind: 'star-system',
        href: '/galaxy?focus=star-a',
        position: [3, -2, 1],
      };
      expect(resolveSearchFramingAction([starMatch])).toEqual({
        kind: 'frame-galaxy',
        target: [3, -2, 1],
        distance: DEFAULT_SINGLE_RESULT_DISTANCE_PC,
        matchCount: 1,
      });
    });

    it('returns enter-scale for a single Solar System planet or moon match', () => {
      const solPlanet: SearchFramingItem = {
        id: 'sol-planet-1',
        category: 'planets',
        entityKind: 'planet',
        href: `${SOL_REFERENCE_TARGET.href}?focus=sol-planet-1`,
        isSolarSystem: true,
        systemId: SOL_REFERENCE_TARGET.id,
        position: [0, 0, 0],
      };
      expect(resolveSearchFramingAction([solPlanet])).toEqual({
        kind: 'enter-scale',
        targetScope: 'system',
        targetId: 'sol-planet-1',
        href: `${SOL_REFERENCE_TARGET.href}?focus=sol-planet-1`,
      });

      const solMoon: SearchFramingItem = {
        id: 'sol-moon-1',
        category: 'planets',
        entityKind: 'moon',
        href: '/planet/sol-planet-1?focus=sol-moon-1',
        isSolarSystem: true,
        systemId: SOL_REFERENCE_TARGET.id,
        parentBodyId: 'sol-planet-1',
      };
      expect(resolveSearchFramingAction([solMoon])).toEqual({
        kind: 'enter-scale',
        targetScope: 'planet',
        targetId: 'sol-moon-1',
        href: '/planet/sol-planet-1?focus=sol-moon-1',
      });
    });

    it('keeps a single Solar System star-system match in galaxy framing', () => {
      const solStar: SearchFramingItem = {
        id: SOL_REFERENCE_TARGET.id,
        category: 'stars',
        entityKind: 'star-system',
        href: `/galaxy?focus=${SOL_REFERENCE_TARGET.id}`,
        isSolarSystem: true,
        position: [...SOL_REFERENCE_TARGET.coordinatesPc],
      };
      expect(resolveSearchFramingAction([solStar])).toEqual({
        kind: 'frame-galaxy',
        target: [0, 0, 0],
        distance: DEFAULT_SINGLE_RESULT_DISTANCE_PC,
        matchCount: 1,
      });
    });

    it('maps Solar System items missing position to [0,0,0] and includes them in multi-result framing', () => {
      const matches: readonly SearchFramingItem[] = [
        {
          id: 'sol-planet-2',
          category: 'planets',
          entityKind: 'planet',
          href: `${SOL_REFERENCE_TARGET.href}?focus=sol-planet-2`,
          isSolarSystem: true,
        },
        {
          id: 'star-b',
          category: 'stars',
          entityKind: 'star-system',
          href: '/galaxy?focus=star-b',
          position: [20, 0, 0],
        },
      ];
      const action = resolveSearchFramingAction(matches);
      expect(action.kind).toBe('frame-galaxy');
      if (action.kind === 'frame-galaxy') {
        expect(action.target).toEqual([10, 0, 0]);
        expect(action.matchCount).toBe(2);
        expect(action.distance).toBeGreaterThan(MIN_SEARCH_FRAMING_DISTANCE_PC);
      }
    });

    it('deduplicates co-located spatial matches within 1e-4 pc and ignores layer items', () => {
      const matches: readonly SearchFramingItem[] = [
        {
          id: 'layer:canon-1',
          category: 'layers',
          entityKind: 'layer',
          href: '/galaxy?layer=canon-1',
        },
        {
          id: 'star-c',
          category: 'stars',
          entityKind: 'star-system',
          href: '/galaxy?focus=star-c',
          position: [5, 5, 5],
        },
        {
          id: 'planet-c1',
          category: 'planets',
          entityKind: 'planet',
          href: '/system/star-c?focus=planet-c1',
          position: [5 + 5e-5, 5, 5],
        },
      ];

      expect(resolveSearchFramingAction(matches)).toEqual({
        kind: 'frame-galaxy',
        target: [5, 5, 5],
        distance: DEFAULT_SINGLE_RESULT_DISTANCE_PC,
        matchCount: 1,
      });
    });

    it('returns enter-scale targeting Sol root without arbitrary body focus when multiple matches are all Solar System non-star bodies', () => {
      const matches: readonly SearchFramingItem[] = [
        {
          id: 'sol-moon-a',
          category: 'planets',
          entityKind: 'moon',
          href: '/planet/sol-planet-a?focus=sol-moon-a',
          isSolarSystem: true,
          systemId: SOL_REFERENCE_TARGET.id,
          parentBodyId: 'sol-planet-a',
        },
        {
          id: 'sol-minor-b',
          category: 'minor-bodies',
          entityKind: 'minor-body',
          href: `${SOL_REFERENCE_TARGET.href}?focus=sol-minor-b`,
          isSolarSystem: true,
          systemId: SOL_REFERENCE_TARGET.id,
        },
      ];

      expect(resolveSearchFramingAction(matches)).toEqual({
        kind: 'enter-scale',
        targetScope: 'system',
        targetId: SOL_REFERENCE_TARGET.id,
        href: SOL_REFERENCE_TARGET.href,
      });
    });

    it('returns enter-scale targeting shared parent planet when multiple moons share parentBodyId', () => {
      const galileanMatches: readonly SearchFramingItem[] = [
        {
          id: 'io',
          category: 'planets',
          entityKind: 'moon',
          href: '/planet/jupiter?focus=io',
          isSolarSystem: true,
          systemId: SOL_REFERENCE_TARGET.id,
          parentBodyId: 'jupiter',
        },
        {
          id: 'europa',
          category: 'planets',
          entityKind: 'moon',
          href: '/planet/jupiter?focus=europa',
          isSolarSystem: true,
          systemId: SOL_REFERENCE_TARGET.id,
          parentBodyId: 'jupiter',
        },
      ];

      expect(resolveSearchFramingAction(galileanMatches, { currentScope: 'galaxy' })).toEqual({
        kind: 'enter-scale',
        targetScope: 'planet',
        targetId: 'jupiter',
        href: '/planet/jupiter',
      });
    });

    it('enters shared exoplanet or system based on currentScope for non-Solar-System matches', () => {
      const exoMoons: readonly SearchFramingItem[] = [
        {
          id: 'exo-moon-1',
          category: 'planets',
          entityKind: 'moon',
          href: '/planet/exo-planet-a?focus=exo-moon-1',
          systemId: 'exo-sys-1',
          parentBodyId: 'exo-planet-a',
          position: [15, 0, 0],
        },
        {
          id: 'exo-moon-2',
          category: 'planets',
          entityKind: 'moon',
          href: '/planet/exo-planet-a?focus=exo-moon-2',
          systemId: 'exo-sys-1',
          parentBodyId: 'exo-planet-a',
          position: [15, 0, 0],
        },
      ];

      expect(resolveSearchFramingAction(exoMoons, { currentScope: 'galaxy' })).toEqual({
        kind: 'frame-galaxy',
        target: [15, 0, 0],
        distance: DEFAULT_SINGLE_RESULT_DISTANCE_PC,
        matchCount: 1,
      });

      expect(resolveSearchFramingAction(exoMoons, { currentScope: 'system' })).toEqual({
        kind: 'enter-scale',
        targetScope: 'planet',
        targetId: 'exo-planet-a',
        href: '/planet/exo-planet-a',
      });

      const exoPlanets: readonly SearchFramingItem[] = [
        {
          id: 'exo-planet-a',
          category: 'planets',
          entityKind: 'planet',
          href: '/system/exo-sys-1?focus=exo-planet-a',
          systemId: 'exo-sys-1',
          position: [15, 0, 0],
        },
        {
          id: 'exo-planet-b',
          category: 'planets',
          entityKind: 'planet',
          href: '/system/exo-sys-1?focus=exo-planet-b',
          systemId: 'exo-sys-1',
          position: [15, 0, 0],
        },
      ];
      expect(resolveSearchFramingAction(exoPlanets, { currentScope: 'planet' })).toEqual({
        kind: 'enter-scale',
        targetScope: 'system',
        targetId: 'exo-sys-1',
        href: '/system/exo-sys-1',
      });
    });

    it('anchors on highest-ranked Sol match when distant outlier exceeds mobile maxDistance', () => {
      const matches: readonly SearchFramingItem[] = [
        {
          id: SOL_REFERENCE_TARGET.id,
          category: 'stars',
          entityKind: 'star-system',
          href: `/galaxy?focus=${SOL_REFERENCE_TARGET.id}`,
          isSolarSystem: true,
          position: [...SOL_REFERENCE_TARGET.coordinatesPc],
        },
        {
          id: 'wasp-96',
          category: 'stars',
          entityKind: 'star-system',
          href: '/galaxy?focus=wasp-96',
          position: [200, 250, -145],
        },
      ];

      expect(
        resolveSearchFramingAction(matches, {
          viewportWidth: 390,
          viewportHeight: 844,
          maxDistance: 122,
        }),
      ).toEqual({
        kind: 'frame-galaxy',
        target: [0, 0, 0],
        distance: DEFAULT_SINGLE_RESULT_DISTANCE_PC,
        matchCount: 2,
      });
    });
  });
});
