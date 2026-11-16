import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  arePositionsEqual,
  areOrbitsEqual,
  areCelestialEntityPropsEqual,
  resolvePrimaryEntityPosition,
  resolveKeplerianEntityPosition,
  resolveEntityVelocity,
  calculateOrbitOffset,
} from './celestialEntityHelpers';
import type { CelestialEntityProps } from './CelestialEntity';

describe('celestialEntityHelpers', () => {
  describe('arePositionsEqual', () => {
    it('compares vectors and tuples', () => {
      const v = new THREE.Vector3(1, 2, 3);
      expect(arePositionsEqual(v, [1, 2, 3])).toBe(true);
      expect(arePositionsEqual([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(arePositionsEqual([1, 2, 3], [1, 2, 4])).toBe(false);
      expect(arePositionsEqual(undefined, [1, 2, 3])).toBe(false);
    });
  });

  describe('areOrbitsEqual', () => {
    it('returns true for matching orbits', () => {
      const o1 = { semiMajorAxis: 10, eccentricity: 0.1, primaryEntityId: 'sol' };
      const o2 = { semiMajorAxis: 10, eccentricity: 0.1, primaryEntityId: 'sol' };
      expect(areOrbitsEqual(o1, o2)).toBe(true);
      expect(areOrbitsEqual(o1, { ...o2, semiMajorAxis: 12 })).toBe(false);
    });
  });

  describe('areCelestialEntityPropsEqual', () => {
    it('returns true when memoized props match', () => {
      const p1: CelestialEntityProps = { id: 'sol', name: 'Sol', position: [0, 0, 0] };
      const p2: CelestialEntityProps = { id: 'sol', name: 'Sol', position: [0, 0, 0] };
      expect(areCelestialEntityPropsEqual(p1, p2)).toBe(true);
      expect(areCelestialEntityPropsEqual(p1, { ...p2, name: 'Sun' })).toBe(false);
    });
  });

  describe('resolvePrimaryEntityPosition & resolveKeplerianEntityPosition', () => {
    it('resolves primary entity position with fallback', () => {
      expect(resolvePrimaryEntityPosition([1, 2, 3], null)).toEqual(new THREE.Vector3(1, 2, 3));
      expect(resolvePrimaryEntityPosition(null, [4, 5, 6])).toEqual(new THREE.Vector3(4, 5, 6));
      expect(resolvePrimaryEntityPosition(null, null)).toEqual(new THREE.Vector3(0, 0, 0));
    });

    it('resolves keplerian position when orbit is provided', () => {
      const primary = new THREE.Vector3(0, 0, 0);
      const pos = resolveKeplerianEntityPosition(
        null,
        { semiMajorAxis: 10, eccentricity: 0, meanAnomaly: 0 },
        primary,
      );
      expect(pos.x).toBeCloseTo(10);
    });
  });

  describe('resolveEntityVelocity & calculateOrbitOffset', () => {
    it('resolves explicit velocity or derives from orbit', () => {
      expect(resolveEntityVelocity([0, 1, 0], undefined)).toEqual(new THREE.Vector3(0, 1, 0));
      const derived = resolveEntityVelocity(undefined, { semiMajorAxis: 10, meanAnomaly: 0 });
      expect(derived).toBeDefined();
    });

    it('calculates orbit offset between primary and child position', () => {
      const offset = calculateOrbitOffset(new THREE.Vector3(10, 20, 30), new THREE.Vector3(12, 20, 30));
      expect(offset).toEqual([-2, 0, 0]);
    });
  });
});
