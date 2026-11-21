import { describe, it, expect, beforeEach } from 'vitest';
import {
  appendMultiplicityPips,
  appendPlanetaryPips,
  clearReticleGeometryCache,
  createReticleGeometry,
  formatDesignationTag,
  getReticleGeometryCacheSize,
} from './reticleGeometry';

describe('reticleGeometry', () => {
  beforeEach(() => {
    clearReticleGeometryCache();
  });

  describe('Multiplicity Pips', () => {
    it('generates multiplicity pips as solid star dots aligned towards the left point (0 for single, 2+ for multiples)', () => {
      const coordsSingle: number[] = [];
      appendMultiplicityPips(coordsSingle, 1.0, 1);
      // Single star system renders 0 pips (Approach B)
      expect(coordsSingle.length).toBe(0);

      const coordsBinary: number[] = [];
      appendMultiplicityPips(coordsBinary, 1.0, 2);
      expect(coordsBinary.length).toBe(96 * 3); // 2 star dots

      const coordsTriple: number[] = [];
      appendMultiplicityPips(coordsTriple, 1.0, 3);
      expect(coordsTriple.length).toBe(144 * 3); // 3 star dots

      const coordsQuat: number[] = [];
      appendMultiplicityPips(coordsQuat, 1.0, 4);
      expect(coordsQuat.length).toBe(192 * 3); // 4 star dots

      // Verify dots are aligned towards the left point (all X coordinates negative, near left corner)
      for (let i = 0; i < coordsQuat.length; i += 3) {
        expect(coordsQuat[i]).toBeLessThan(0);
        expect(coordsQuat[i + 2]).toBe(0);
      }
    });
  });

  describe('Planetary Pips', () => {
    it('generates planetary symbols as boolean category presence at 2x-3x size', () => {
      // 5 terrestrial planets, 3 gas giants, 2 ice giants -> strictly 3 symbols rendered
      const manyPlanets = [
        { id: '1', name: 'p1', classification: 'terrestrial' as const },
        { id: '2', name: 'p2', classification: 'terrestrial' as const },
        { id: '3', name: 'p3', classification: 'terrestrial' as const },
        { id: '4', name: 'p4', classification: 'gas-giant' as const },
        { id: '5', name: 'p5', classification: 'gas-giant' as const },
        { id: '6', name: 'p6', classification: 'ice-giant' as const },
      ];

      const coordsBool: number[] = [];
      appendPlanetaryPips(coordsBool, 1.0, manyPlanets);

      // Terrestrial (24 segs = 48 pts) + Gas Giant (28 segs = 56 pts + 4 slash pts = 60 pts) + Ice Giant (24 segs = 48 pts + 4 tick pts = 52 pts)
      // Total points = 48 + 60 + 52 = 160 points
      expect(coordsBool.length).toBe(160 * 3);

      // Single category presence: only terrestrial
      const coordsOnlyTerr: number[] = [];
      appendPlanetaryPips(coordsOnlyTerr, 1.0, [{ id: '1', name: 'Earth', classification: 'terrestrial' }]);
      expect(coordsOnlyTerr.length).toBe(48 * 3);

      // Single category presence: only super-earth (24 segs * 2 rings = 48 segs = 96 points)
      const coordsOnlySuperEarth: number[] = [];
      appendPlanetaryPips(coordsOnlySuperEarth, 1.0, [{ id: '2', name: 'Tau Ceti e', classification: 'super-earth' }]);
      expect(coordsOnlySuperEarth.length).toBe(96 * 3);

      // All 4 categories present (count > 3 triggers tStep = 0.22):
      // Terrestrial (48) + Super-Earth (96) + Gas Giant (60) + Ice Giant (52) = 256 points
      const allFourPlanets = [
        { id: '1', name: 'Earth', classification: 'terrestrial' as const },
        { id: '2', name: 'Tau Ceti e', classification: 'super-earth' as const },
        { id: '3', name: 'Jupiter', classification: 'gas-giant' as const },
        { id: '4', name: 'Neptune', classification: 'ice-giant' as const },
      ];
      const coordsAllFour: number[] = [];
      appendPlanetaryPips(coordsAllFour, 1.0, allFourPlanets);
      expect(coordsAllFour.length).toBe(256 * 3);
    });
  });

  describe('createReticleGeometry & geometry cache', () => {
    it('creates reticle geometry with annotations in selected/focused state', () => {
      const geom = createReticleGeometry('stellar-system', 1.0, {
        multiplicity: 2,
        planets: [{ id: '1', name: 'Earth', classification: 'terrestrial' }],
        isAnnotated: true,
      });
      // 8 diamond points + 96 multiplicity points + 48 planetary points = 152 points
      expect(geom.getAttribute('position').count).toBe(152);
    });

    it('creates concentric double-circle reticle geometry for super-earth', () => {
      const geom = createReticleGeometry('super-earth', 1.0);
      // Concentric double circle: 32 segs inner (64 pts) + 32 segs outer (64 pts) = 128 points
      expect(geom.getAttribute('position').count).toBe(128);
    });

    it('returns the exact cached BufferGeometry instance (===) for equivalent star entities', () => {
      const geomA = createReticleGeometry('star', 0.22, {
        isAnnotated: true,
        multiplicity: 4,
        planets: [
          { id: 'a1', name: 'Alpha b', classification: 'terrestrial' },
          { id: 'a2', name: 'Alpha c', classification: 'gas-giant' },
        ],
      });
      const geomB = createReticleGeometry('star', 0.22, {
        isAnnotated: true,
        multiplicity: 7, // capped at 4
        planets: [
          { id: 'b1', name: 'Beta b', classification: 'gas-giant' },
          { id: 'b2', name: 'Beta c', classification: 'terrestrial' },
          { id: 'b3', name: 'Beta d', classification: 'terrestrial' },
        ],
      });

      expect(geomA).toBe(geomB);
      expect(getReticleGeometryCacheSize()).toBe(1);
    });

    it('shares cache for unannotated or non-star reticles regardless of multiplicity/planets', () => {
      const unannotatedA = createReticleGeometry('star', 0.22, {
        isAnnotated: false,
        multiplicity: 3,
        planets: [{ id: 'p1', name: 'Planet', classification: 'terrestrial' }],
      });
      const unannotatedB = createReticleGeometry('star', 0.22);
      expect(unannotatedA).toBe(unannotatedB);

      const bdA = createReticleGeometry('brown-dwarf', 0.22, {
        isAnnotated: true,
        multiplicity: 2,
        planets: [{ id: 'p2', name: 'Planet', classification: 'ice-giant' }],
      });
      const bdB = createReticleGeometry('brown-dwarf', 0.22);
      expect(bdA).toBe(bdB);
      expect(getReticleGeometryCacheSize()).toBe(2);
    });

    it('separates cache entries for distinct classifications, sizes, multiplicities, and planet bitmasks', () => {
      const star = createReticleGeometry('star', 0.22, { isAnnotated: true, multiplicity: 2 });
      const system = createReticleGeometry('stellar-system', 0.22, { isAnnotated: true, multiplicity: 2 });
      const larger = createReticleGeometry('star', 0.45, { isAnnotated: true, multiplicity: 2 });
      const triple = createReticleGeometry('star', 0.22, { isAnnotated: true, multiplicity: 3 });
      const withSuper = createReticleGeometry('star', 0.22, {
        isAnnotated: true,
        multiplicity: 2,
        planets: [{ id: 'p1', name: 'SE', classification: 'super-earth' }],
      });
      const withIce = createReticleGeometry('star', 0.22, {
        isAnnotated: true,
        multiplicity: 2,
        planets: [{ id: 'p2', name: 'IG', classification: 'ice-giant' }],
      });

      const unique = new Set([star, system, larger, triple, withSuper, withIce]);
      expect(unique.size).toBe(6);
      expect(getReticleGeometryCacheSize()).toBe(6);
    });

    it('clears and disposes cached geometries via clearReticleGeometryCache()', () => {
      const geom = createReticleGeometry('star', 0.22);
      expect(getReticleGeometryCacheSize()).toBe(1);

      clearReticleGeometryCache();
      expect(getReticleGeometryCacheSize()).toBe(0);

      const nextGeom = createReticleGeometry('star', 0.22);
      expect(nextGeom).not.toBe(geom);
      expect(getReticleGeometryCacheSize()).toBe(1);
    });
  });

  describe('formatDesignationTag', () => {
    it('formats multiple star designations with centered dot and no spaces', () => {
      expect(formatDesignationTag('A1V + DA2')).toBe('A1V·DA2');
      expect(formatDesignationTag('G2V + K1V')).toBe('G2V·K1V');
      expect(formatDesignationTag('G0V + M3V + M5V')).toBe('G0V·M3V·M5V');
      expect(formatDesignationTag('G2V')).toBe('G2V');
      expect(formatDesignationTag('')).toBe('');
      expect(formatDesignationTag(undefined)).toBe('');
    });
  });
});
