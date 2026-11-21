import { describe, it, expect } from 'vitest';
import {
  comparePlanetsByOrbit,
  indexExoplanets,
} from './searchEntryIndexers';
import type { SystemManifest } from '../../src/types/astro';
import type { CompactSearchEntry } from '../../src/utils/compactDataTypes';

describe('searchEntryIndexers', () => {
  describe('comparePlanetsByOrbit', () => {
    it('sorts planets by finite semiMajorAxis ascending', () => {
      const p1 = { id: 'planet-inner', orbit: { semiMajorAxis: 0.2 } };
      const p2 = { id: 'planet-outer', orbit: { semiMajorAxis: 1.5 } };
      expect(comparePlanetsByOrbit(p1, p2)).toBeLessThan(0);
      expect(comparePlanetsByOrbit(p2, p1)).toBeGreaterThan(0);
    });

    it('sorts finite semiMajorAxis before NaN or Infinity semiMajorAxis', () => {
      const finitePlanet = { id: 'planet-finite', orbit: { semiMajorAxis: 0.5 } };
      const nanPlanet = { id: 'planet-nan', orbit: { semiMajorAxis: Number.NaN } };
      const infPlanet = { id: 'planet-inf', orbit: { semiMajorAxis: Number.POSITIVE_INFINITY } };

      expect(comparePlanetsByOrbit(finitePlanet, nanPlanet)).toBeLessThan(0);
      expect(comparePlanetsByOrbit(nanPlanet, finitePlanet)).toBeGreaterThan(0);
      expect(comparePlanetsByOrbit(finitePlanet, infPlanet)).toBeLessThan(0);
      expect(comparePlanetsByOrbit(infPlanet, finitePlanet)).toBeGreaterThan(0);
    });

    it('sorts finite semiMajorAxis before missing orbit or undefined semiMajorAxis', () => {
      const finitePlanet = { id: 'planet-finite', orbit: { semiMajorAxis: 0.5 } };
      const missingOrbit = { id: 'planet-no-orbit' };
      const undefinedSma = { id: 'planet-undef-sma', orbit: { semiMajorAxis: undefined } };

      expect(comparePlanetsByOrbit(finitePlanet, missingOrbit)).toBeLessThan(0);
      expect(comparePlanetsByOrbit(missingOrbit, finitePlanet)).toBeGreaterThan(0);
      expect(comparePlanetsByOrbit(finitePlanet, undefinedSma)).toBeLessThan(0);
      expect(comparePlanetsByOrbit(undefinedSma, finitePlanet)).toBeGreaterThan(0);
    });

    it('deterministically breaks ties via id.localeCompare when both have NaN, missing, or identical semiMajorAxis', () => {
      const nanA = { id: 'alpha-nan', orbit: { semiMajorAxis: Number.NaN } };
      const nanB = { id: 'beta-nan', orbit: { semiMajorAxis: Number.NaN } };
      expect(comparePlanetsByOrbit(nanA, nanB)).toBeLessThan(0);
      expect(comparePlanetsByOrbit(nanB, nanA)).toBeGreaterThan(0);

      const noOrbitA = { id: 'alpha-none' };
      const noOrbitB = { id: 'beta-none' };
      expect(comparePlanetsByOrbit(noOrbitA, noOrbitB)).toBeLessThan(0);
      expect(comparePlanetsByOrbit(noOrbitB, noOrbitA)).toBeGreaterThan(0);

      const nanAndNone = { id: 'alpha-nan', orbit: { semiMajorAxis: Number.NaN } };
      const noneAndNan = { id: 'beta-none' };
      expect(comparePlanetsByOrbit(nanAndNone, noneAndNan)).toBeLessThan(0);
      expect(comparePlanetsByOrbit(noneAndNan, nanAndNone)).toBeGreaterThan(0);

      const equalA = { id: 'planet-a', orbit: { semiMajorAxis: 1.0 } };
      const equalB = { id: 'planet-b', orbit: { semiMajorAxis: 1.0 } };
      expect(comparePlanetsByOrbit(equalA, equalB)).toBeLessThan(0);
      expect(comparePlanetsByOrbit(equalB, equalA)).toBeGreaterThan(0);
    });

    it('produces identical sorted array order regardless of input permutation', () => {
      const planets = [
        { id: 'planet-nan-z', orbit: { semiMajorAxis: Number.NaN } },
        { id: 'planet-c', orbit: { semiMajorAxis: 2.0 } },
        { id: 'planet-missing-y' },
        { id: 'planet-a', orbit: { semiMajorAxis: 0.1 } },
        { id: 'planet-nan-a', orbit: { semiMajorAxis: Number.NaN } },
        { id: 'planet-b', orbit: { semiMajorAxis: 0.5 } },
      ];

      const forwardSorted = [...planets].sort(comparePlanetsByOrbit).map((p) => p.id);
      const reverseSorted = [...planets].reverse().sort(comparePlanetsByOrbit).map((p) => p.id);

      expect(forwardSorted).toEqual([
        'planet-a',
        'planet-b',
        'planet-c',
        'planet-missing-y',
        'planet-nan-a',
        'planet-nan-z',
      ]);
      expect(reverseSorted).toEqual(forwardSorted);
    });
  });

  describe('indexExoplanets', () => {
    it('indexes exoplanets with deterministic orbit ranks and handles NaN / missing semiMajorAxis', () => {
      const manifest: SystemManifest = {
        id: 'trappist-1',
        name: 'TRAPPIST-1',
        properName: undefined,
        x: 12.0,
        y: -3.5,
        z: 0.8,
        dist: 12.5,
        sectorId: 'sector_+000_-000_+000',
        stars: [
          {
            id: 'trappist-1-a',
            name: 'TRAPPIST-1 a',
            componentDesignation: 'A',
            spectralType: 'M8V',
            mag: 18.8,
            absmag: 15.8,
            luminosityLsun: 0.000553,
          },
        ],
        planets: [
          {
            id: 'trappist-1-nan',
            name: 'TRAPPIST-1 nan',
            letter: 'x',
            orbit: {
              semiMajorAxis: Number.NaN,
              eccentricity: 0.01,
              inclination: 89.0,
              ascendingNode: 0,
              argumentOfPeriapsis: 0,
              meanAnomaly: 0,
              periodDays: 5.0,
            },
          },
          {
            id: 'trappist-1-c',
            name: 'TRAPPIST-1 c',
            letter: 'c',
            orbit: {
              semiMajorAxis: 0.0158,
              eccentricity: 0.006,
              inclination: 89.7,
              ascendingNode: 0,
              argumentOfPeriapsis: 0,
              meanAnomaly: 0,
              periodDays: 2.42,
            },
          },
          {
            id: 'trappist-1-b',
            name: 'TRAPPIST-1 b',
            letter: 'b',
            orbit: {
              semiMajorAxis: 0.0115,
              eccentricity: 0.006,
              inclination: 89.7,
              ascendingNode: 0,
              argumentOfPeriapsis: 0,
              meanAnomaly: 0,
              periodDays: 1.51,
            },
          },
          {
            id: 'trappist-1-missing',
            name: 'TRAPPIST-1 missing',
            letter: 'y',
          },
        ],
      };

      const coreEntries: CompactSearchEntry[] = [];
      const planetsEntries: CompactSearchEntry[] = [];

      indexExoplanets([manifest], undefined, coreEntries, planetsEntries);

      expect(planetsEntries.length).toBe(4);

      const b = planetsEntries.find((e) => e.i === 'trappist-1-b');
      const c = planetsEntries.find((e) => e.i === 'trappist-1-c');
      const nanPlanet = planetsEntries.find((e) => e.i === 'trappist-1-nan');
      const missingPlanet = planetsEntries.find((e) => e.i === 'trappist-1-missing');

      // Finite planets receive sequential 1-based ranks
      expect(b?.r).toBe(1);
      expect(c?.r).toBe(2);
      expect(b?.A).toBe(0.0115);
      expect(c?.A).toBe(0.0158);

      // Non-finite or missing planets do not receive valid ranks or NaN distance values
      expect(nanPlanet?.r).toBeUndefined();
      expect(nanPlanet?.A).toBeUndefined();
      expect(missingPlanet?.r).toBeUndefined();
      expect(missingPlanet?.A).toBeUndefined();
    });
  });
});
