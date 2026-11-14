import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  appendMultiplicityPips,
  appendPlanetaryPips,
  createReticleGeometry,
  formatDesignationTag,
} from './reticleGeometry';

describe('reticleGeometry', () => {
  describe('Multiplicity Pips', () => {
    it('generates multiplicity pips as solid star dots aligned towards the left point (0 for single, 2+ for multiples)', () => {
      const pointsSingle: THREE.Vector3[] = [];
      appendMultiplicityPips(pointsSingle, 1.0, 1);
      // Single star system renders 0 pips (Approach B)
      expect(pointsSingle.length).toBe(0);

      const pointsBinary: THREE.Vector3[] = [];
      appendMultiplicityPips(pointsBinary, 1.0, 2);
      expect(pointsBinary.length).toBe(96); // 2 star dots

      const pointsTriple: THREE.Vector3[] = [];
      appendMultiplicityPips(pointsTriple, 1.0, 3);
      expect(pointsTriple.length).toBe(144); // 3 star dots

      const pointsQuat: THREE.Vector3[] = [];
      appendMultiplicityPips(pointsQuat, 1.0, 4);
      expect(pointsQuat.length).toBe(192); // 4 star dots

      // Verify dots are aligned towards the left point (all X coordinates negative, near left corner)
      for (const pt of pointsQuat) {
        expect(pt.x).toBeLessThan(0);
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

      const pointsBool: THREE.Vector3[] = [];
      appendPlanetaryPips(pointsBool, 1.0, manyPlanets);

      // Terrestrial (24 segs = 48 pts) + Gas Giant (28 segs = 56 pts + 4 slash pts = 60 pts) + Ice Giant (24 segs = 48 pts + 4 tick pts = 52 pts)
      // Total points = 48 + 60 + 52 = 160 points
      expect(pointsBool.length).toBe(160);

      // Single category presence: only terrestrial
      const pointsOnlyTerr: THREE.Vector3[] = [];
      appendPlanetaryPips(pointsOnlyTerr, 1.0, [{ id: '1', name: 'Earth', classification: 'terrestrial' }]);
      expect(pointsOnlyTerr.length).toBe(48);

      // Single category presence: only super-earth (24 segs * 2 rings = 48 segs = 96 points)
      const pointsOnlySuperEarth: THREE.Vector3[] = [];
      appendPlanetaryPips(pointsOnlySuperEarth, 1.0, [{ id: '2', name: 'Tau Ceti e', classification: 'super-earth' }]);
      expect(pointsOnlySuperEarth.length).toBe(96);

      // All 4 categories present (count > 3 triggers tStep = 0.22):
      // Terrestrial (48) + Super-Earth (96) + Gas Giant (60) + Ice Giant (52) = 256 points
      const allFourPlanets = [
        { id: '1', name: 'Earth', classification: 'terrestrial' as const },
        { id: '2', name: 'Tau Ceti e', classification: 'super-earth' as const },
        { id: '3', name: 'Jupiter', classification: 'gas-giant' as const },
        { id: '4', name: 'Neptune', classification: 'ice-giant' as const },
      ];
      const pointsAllFour: THREE.Vector3[] = [];
      appendPlanetaryPips(pointsAllFour, 1.0, allFourPlanets);
      expect(pointsAllFour.length).toBe(256);
    });
  });

  describe('createReticleGeometry', () => {
    it('creates reticle geometry with annotations in selected/focused state', () => {
      const geom = createReticleGeometry('stellar-system', 1.0, {
        multiplicity: 2,
        planets: [{ id: '1', name: 'Earth', classification: 'terrestrial' }],
        isAnnotated: true,
      });
      // 8 diamond points + 96 multiplicity points + 48 planetary points = 152 points
      expect(geom.getAttribute('position').count).toBe(152);
      geom.dispose();
    });

    it('creates concentric double-circle reticle geometry for super-earth', () => {
      const geom = createReticleGeometry('super-earth', 1.0);
      // Concentric double circle: 32 segs inner (64 pts) + 32 segs outer (64 pts) = 128 points
      expect(geom.getAttribute('position').count).toBe(128);
      geom.dispose();
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
