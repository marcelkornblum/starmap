// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import {
  resolveSystemPlanetEntity,
  resolveCorpusPlanetEntity,
} from './systemPlanetResolver';
import type { ExoplanetRecord } from '../../../types/astro';
import type { CompactSearchEntry } from '../../../utils/compactDataCodec';

describe('SystemScene orbital element resolution (AUD-024 / DEC-R019)', () => {
  describe('resolveSystemPlanetEntity', () => {
    it('uses catalogued semi-major axis, defaults unmeasured angles to 0, and marks lineStyle as dashed', () => {
      const planet: ExoplanetRecord = {
        id: 'trappist-1-b',
        name: 'TRAPPIST-1 b',
        letter: 'b',
        orbit: {
          semiMajorAxis: 0.0115,
          eccentricity: 0.006,
          inclination: 89.7,
          ascendingNode: 0,
          argumentOfPeriapsis: 0,
          meanAnomaly: 45,
          periodDays: 1.51,
        },
      };

      const entity = resolveSystemPlanetEntity(planet, 0, 0.09);

      expect(entity.id).toBe('trappist-1-b');
      expect(entity.name).toBe('TRAPPIST-1 b');
      expect(entity.orbit?.semiMajorAxis).toBe(0.0115);
      expect(entity.orbit?.eccentricity).toBe(0.006);
      expect(entity.orbit?.inclination).toBe(89.7);
      expect(entity.orbit?.ascendingNode).toBe(0);
      expect(entity.orbit?.argumentOfPeriapsis).toBe(0);
      expect(entity.orbit?.meanAnomaly).toBe(45);
      expect(entity.orbit?.period).toBe(1.51);
      expect(entity.orbit?.lineStyle).toBe('dashed');
    });

    it('does not fabricate orbital angles when unmeasured and sets lineStyle dashed for catalogued a', () => {
      const planet: ExoplanetRecord = {
        id: 'kepler-999-b',
        name: 'Kepler-999 b',
        letter: 'b',
        orbit: {
          semiMajorAxis: 0.8,
          // Missing e, inc, node, peri, meanAnomaly
          eccentricity: undefined as unknown as number,
          inclination: undefined as unknown as number,
          ascendingNode: undefined as unknown as number,
          argumentOfPeriapsis: undefined as unknown as number,
          meanAnomaly: undefined as unknown as number,
          periodDays: 260,
        },
      };

      const entity = resolveSystemPlanetEntity(planet, 2, 1.0);

      expect(entity.orbit?.semiMajorAxis).toBe(0.8);
      expect(entity.orbit?.eccentricity).toBe(0);
      expect(entity.orbit?.inclination).toBe(0);
      expect(entity.orbit?.ascendingNode).toBe(0);
      expect(entity.orbit?.argumentOfPeriapsis).toBe(0);
      // Fallback mean anomaly distributes planets cleanly: (index * 60) % 360
      expect(entity.orbit?.meanAnomaly).toBe(120);
      expect(entity.orbit?.period).toBe(260);
      expect(entity.orbit?.lineStyle).toBe('dashed');
    });

    it('infers semi-major axis from periodDays via Kepler Third Law when a is missing/0 and marks lineStyle dotted', () => {
      const planet: ExoplanetRecord = {
        id: 'kepler-earth-analog',
        name: 'Kepler Earth Analog',
        letter: 'b',
        orbit: {
          semiMajorAxis: 0, // Missing / unmeasured
          periodDays: 365.25,
          eccentricity: 0,
          inclination: 0,
          ascendingNode: 0,
          argumentOfPeriapsis: 0,
          meanAnomaly: 0,
        },
      };

      // Star with 1.0 Msun and period of 365.25 days -> a = 1.0 AU
      const entity = resolveSystemPlanetEntity(planet, 0, 1.0);

      expect(entity.orbit?.semiMajorAxis).toBe(1);
      expect(entity.orbit?.lineStyle).toBe('dotted');
      expect(entity.orbit?.eccentricity).toBe(0);
      expect(entity.orbit?.inclination).toBe(0);
    });

    it('uses fallback spacing when both semiMajorAxis and periodDays are missing/0 and marks lineStyle dotted', () => {
      const planet: ExoplanetRecord = {
        id: 'unknown-orbit-planet',
        name: 'Unknown Orbit Planet',
        letter: 'c',
      };

      const entity = resolveSystemPlanetEntity(planet, 1, 1.0);

      // index 1: 0.4 + 1 * 0.6 = 1.0
      expect(entity.orbit?.semiMajorAxis).toBe(1.0);
      expect(entity.orbit?.lineStyle).toBe('dotted');
      expect(entity.orbit?.period).toBe(Math.round(Math.pow(1.0, 1.5) * 365.25));
    });

    it('uses planet.composition if present, otherwise classifies via physical properties', () => {
      const planetWithComp: ExoplanetRecord = {
        id: 'gas-giant-planet',
        name: 'Gas Giant Planet',
        letter: 'b',
        composition: 'gas-giant',
      };
      const entityWithComp = resolveSystemPlanetEntity(planetWithComp, 0);
      expect(entityWithComp.classification).toBe('gas-giant');

      const planetWithoutComp: ExoplanetRecord = {
        id: 'classified-planet',
        name: 'Classified Planet',
        letter: 'c',
        radiusRearth: 11.2, // Jupiter radius -> gas-giant
      };
      const entityWithoutComp = resolveSystemPlanetEntity(planetWithoutComp, 0);
      expect(entityWithoutComp.classification).toBe('gas-giant');
    });
  });

  describe('resolveCorpusPlanetEntity', () => {
    it('uses entry.A when present, respects entry.u composition, and marks lineStyle dashed', () => {
      const entry: CompactSearchEntry = {
        i: 'hd-106906-b',
        n: 'HD 106906 b',
        k: 2,
        s: 'hd-106906',
        A: 650,
        u: 'gas-giant',
      };

      const entity = resolveCorpusPlanetEntity(entry, 0);

      expect(entity.id).toBe('hd-106906-b');
      expect(entity.name).toBe('HD 106906 b');
      expect(entity.classification).toBe('gas-giant');
      expect(entity.orbit?.semiMajorAxis).toBe(650);
      expect(entity.orbit?.lineStyle).toBe('dashed');
      expect(entity.orbit?.eccentricity).toBe(0);
      expect(entity.orbit?.inclination).toBe(0);
      expect(entity.orbit?.ascendingNode).toBe(0);
      expect(entity.orbit?.argumentOfPeriapsis).toBe(0);
      expect(entity.orbit?.meanAnomaly).toBe(0);
    });

    it('falls back to spacing and marks lineStyle dotted when entry.A is missing', () => {
      const entry: CompactSearchEntry = {
        i: 'corpus-planet-fallback',
        n: 'Corpus Planet Fallback',
        k: 2,
        s: 'host-star',
      };

      const entity = resolveCorpusPlanetEntity(entry, 1);

      expect(entity.orbit?.semiMajorAxis).toBe(1.0); // 0.4 + 1 * 0.6
      expect(entity.orbit?.lineStyle).toBe('dotted');
      expect(entity.classification).toBe('terrestrial');
      expect(entity.orbit?.meanAnomaly).toBe(60); // (1 * 60) % 360
    });
  });
});
