import { describe, it, expect, beforeEach } from 'vitest';
import {
  resolveStarTypeGuideEntry,
  resolveStarTypeGuideEntries,
  resolvePlanetTypeGuideEntries,
  resolveHazardGuideEntries,
  resolveMetricGuideEntries,
  resolveMetricComparison,
} from './guideService';
import {
  clearDetailsRepositoryCache,
  seedDetailRecord,
} from '../data/detailsRepository';
import type { SystemManifest } from '../types/astro';

const TAU_CETI_FIXTURE: SystemManifest = {
  id: 'gaia-2452378776434477184',
  name: 'Tau Ceti',
  x: 3.156,
  y: 1.54,
  z: -1.003,
  dist: 3.65,
  sectorId: 'sector_+000_+000_-025',
  stars: [
    {
      id: '2452378776434477184-A',
      name: 'Tau Ceti',
      componentDesignation: 'A',
      spectralType: 'G8V',
      mag: 3.5,
      absmag: 5.68,
      massMsun: 0.783,
      radiusRsun: 0.793,
      luminosityLsun: 0.52,
      effectiveTempK: 5344,
    },
  ],
  planets: [
    {
      id: 'tau-ceti-e',
      name: 'Tau Ceti e',
      letter: 'e',
      massMearth: 3.93,
      radiusRearth: 1.81,
      equilibriumTempK: 282,
      surfaceGravityG: 1.2,
      composition: 'super-earth',
      isHabitableCandidate: true,
      orbit: {
        semiMajorAxis: 0.538,
        periodDays: 162.87,
        eccentricity: 0.18,
        inclination: 0,
        ascendingNode: 0,
        argumentOfPeriapsis: 22.3,
        meanAnomaly: 0,
      },
    },
  ],
};

describe('guideService (AUD-020 & AUD-092)', () => {
  beforeEach(() => {
    clearDetailsRepositoryCache();
  });

  describe('plural resolvers (AUD-092 / DEC-R014k)', () => {
    it('resolveStarTypeGuideEntries parses comma-separated star types', () => {
      const results = resolveStarTypeGuideEntries('G2V,K1V');
      expect(results.length).toBe(2);
      expect(results[0]?.decodedSubtype?.spectralLetter).toBe('G');
      expect(results[1]?.decodedSubtype?.spectralLetter).toBe('K');
    });

    it('resolveStarTypeGuideEntries parses plus-separated compound star types', () => {
      const results = resolveStarTypeGuideEntries('G2V+K1V');
      expect(results.length).toBe(2);
      expect(results[0]?.decodedSubtype?.spectralLetter).toBe('G');
      expect(results[1]?.decodedSubtype?.spectralLetter).toBe('K');
    });

    it('resolveStarTypeGuideEntry handles compound spectral string G2V+K1V gracefully', () => {
      const single = resolveStarTypeGuideEntry('G2V+K1V');
      expect(single).not.toBeNull();
      expect(single?.decodedSubtype?.spectralLetter).toBe('G');
    });

    it('resolvePlanetTypeGuideEntries parses comma- and plus-separated planet types', () => {
      const results = resolvePlanetTypeGuideEntries('terrestrial,super-earth');
      expect(results.length).toBe(2);
      expect(results[0]?.id).toBe('terrestrial');
      expect(results[1]?.id).toBe('super-earth');
    });

    it('resolveHazardGuideEntries parses multi-value hazard slugs', () => {
      const results = resolveHazardGuideEntries('high-gravity,tidal-locking');
      expect(results.length).toBe(2);
      expect(results[0]?.id).toBe('high-gravity');
      expect(results[1]?.id).toBe('tidal-locking');
    });

    it('resolveMetricGuideEntries parses multi-value metric slugs', () => {
      const results = resolveMetricGuideEntries('stellar-mass,stellar-radius');
      expect(results.length).toBe(2);
      expect(results[0]?.id).toBe('stellar-mass');
      expect(results[1]?.id).toBe('stellar-radius');
    });
  });

  describe('resolveMetricComparison telemetry correctness (AUD-020 & AUD-092)', () => {
    it('returns uncatalogued target with "—" and isCatalogued: false when focused target is uncached (zero numeric fallbacks)', () => {
      const comparison = resolveMetricComparison('stellar-mass', 'proxima-centauri');
      expect(comparison).not.toBeNull();
      expect(comparison?.targetId).toBe('proxima-centauri');
      expect(comparison?.targetValue).toBe('—');
      expect(comparison?.targetFamiliar).toBe('—');
      expect(comparison?.relativeRatioLabel).toBe('—');
      expect(comparison?.isCatalogued).toBe(false);
      // Top-level targetValue must NEVER be 0.78 or 0.783 (fabricated Tau Ceti)
      expect(comparison?.targetValue).not.toContain('0.78');
    });

    it('supports default benchmark when focus is omitted and target is cached', () => {
      seedDetailRecord('tau-ceti', { kind: 'system', record: TAU_CETI_FIXTURE });
      seedDetailRecord('tau-ceti-e', { kind: 'system', record: TAU_CETI_FIXTURE });
      const stellar = resolveMetricComparison('stellar-mass');
      expect(stellar).not.toBeNull();
      expect(stellar?.targetId).toBe('tau-ceti');
      expect(stellar?.targetValue).toContain('M☉');
      expect(stellar?.isCatalogued).toBe(true);

      const orbital = resolveMetricComparison('semi-major-axis');
      expect(orbital).not.toBeNull();
      expect(orbital?.targetId).toBe('tau-ceti-e');
      expect(orbital?.targetValue).toContain('AU');
      expect(orbital?.isCatalogued).toBe(true);
    });

    it('supports comma-separated targets in focusedEntityId (DEC-R020)', () => {
      const comparison = resolveMetricComparison('stellar-mass', 'alpha-centauri-a,alpha-centauri-b');
      expect(comparison).not.toBeNull();
      expect(comparison?.targets).toBeDefined();
      expect(comparison?.targets?.length).toBe(2);
      expect(comparison?.targets?.[0]?.targetId).toBe('alpha-centauri-a');
      expect(comparison?.targets?.[1]?.targetId).toBe('alpha-centauri-b');
    });
  });
});
