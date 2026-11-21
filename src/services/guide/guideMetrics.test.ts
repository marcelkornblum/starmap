import { describe, it, expect, beforeEach } from 'vitest';
import {
  resolveMetricGuideEntry,
  resolveMetricGuideEntries,
  resolveMetricComparison,
  hydrateMetricComparison,
} from './guideMetrics';
import {
  clearDetailsRepositoryCache,
  seedDetailRecord,
} from '../../data/detailsRepository';
import {
  clearReferenceBaselinesCache,
  seedReferenceBaselines,
} from '../../data/referenceBaselinesRepository';
import type { SystemManifest } from '../../types/astro';
import type { ReferenceBaselinesDataset } from '../../types/guideData';

const BASELINES_FIXTURE: ReferenceBaselinesDataset = {
  version: 1,
  generatedAt: '2026-01-01T00:00:00.000Z',
  targets: {
    sol: {
      id: 'sol',
      name: 'Sol',
      systemId: 'sol',
      href: '/system/sol',
      spectralType: 'G2V',
      coordinatesPc: [0, 0, 0],
      massMsun: { value: 1.0, unit: 'M☉' },
      radiusRsun: { value: 1.0, unit: 'R☉' },
      luminosityLsun: { value: 1.0, unit: 'L☉' },
      effectiveTempK: { value: 5778, unit: 'K' },
      visualMagnitude: { value: -26.74, unit: 'V' },
      absoluteMagnitude: { value: 4.83, unit: 'M_V' },
      reticleType: 'stellar-system',
    },
    earth: {
      id: 'earth',
      name: 'Earth',
      systemId: 'sol',
      systemName: 'Sol',
      href: '/planet/earth',
      coordinatesPc: [0, 0, 0],
      massMearth: { value: 1.0, unit: 'M⊕' },
      radiusRearth: { value: 1.0, unit: 'R⊕' },
      semiMajorAxisAu: { value: 1.0, unit: 'AU' },
      periodDays: { value: 365.26, unit: 'd' },
      inclinationDeg: { value: 0, unit: '°' },
      equilibriumTempK: { value: 248.52, unit: 'K' },
      surfaceGravityG: { value: 1.0, unit: 'g' },
      reticleType: 'terrestrial',
    },
    stellarBenchmark: {
      id: 'tau-ceti',
      systemId: 'gaia-2452378776434477184',
      name: 'Tau Ceti',
      href: '/system/tau-ceti',
      spectralType: 'G8V',
      coordinatesPc: [3.156, 1.54, -1.003],
      reticleType: 'stellar-system',
    },
    orbitalBenchmark: {
      id: 'tau-ceti-e',
      systemId: 'gaia-2452378776434477184',
      systemName: 'Tau Ceti',
      name: 'Tau Ceti e',
      href: '/system/tau-ceti?focus=tau-ceti-e',
      reticleType: 'super-earth',
    },
  },
  metrics: {
    'surface-gravity': {
      baselineId: 'earth',
      baselineName: 'Earth',
      baselineHref: '/planet/earth',
      baselineReticleType: 'terrestrial',
      value: '1.00 g',
      familiar: '1.00 g (9.81 m/s²)',
      numericValue: 1.0,
      unit: 'g',
    },
  },
};

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

describe('guideMetrics', () => {
  beforeEach(() => {
    clearDetailsRepositoryCache();
    clearReferenceBaselinesCache();
  });

  describe('resolveMetricGuideEntry & resolveMetricGuideEntries', () => {
    const requiredMetricSlugs = [
      'galactic-coordinates',
      'stellar-magnitude',
      'stellar-mass',
      'stellar-radius',
      'stellar-luminosity',
      'effective-temperature',
      'semi-major-axis',
      'orbital-period',
      'orbital-inclination',
      'planetary-mass',
      'planetary-radius',
      'equilibrium-temperature',
      'surface-gravity',
    ];

    it('resolves all 13 required metrics', () => {
      for (const slug of requiredMetricSlugs) {
        const entry = resolveMetricGuideEntry(slug);
        expect(entry).not.toBeNull();
        expect(entry?.id).toBe(slug);
      }
    });

    it('resolves metric aliases smoothly', () => {
      expect(resolveMetricGuideEntry('planet-mass')?.id).toBe('planetary-mass');
      expect(resolveMetricGuideEntry('planet-radius')?.id).toBe('planetary-radius');
      expect(resolveMetricGuideEntry('apparent-magnitude')?.id).toBe('stellar-magnitude');
      expect(resolveMetricGuideEntry('absolute-magnitude')?.id).toBe('stellar-magnitude');
      expect(resolveMetricGuideEntry('luminosity')?.id).toBe('stellar-luminosity');
    });

    it('returns null for unknown metrics or empty string', () => {
      expect(resolveMetricGuideEntry('')).toBeNull();
      expect(resolveMetricGuideEntry('warp-factor')).toBeNull();
    });

    it('resolves multi-value metric slugs', () => {
      const results = resolveMetricGuideEntries('stellar-mass,stellar-radius');
      expect(results).toHaveLength(2);
      expect(results[0]?.id).toBe('stellar-mass');
      expect(results[1]?.id).toBe('stellar-radius');
    });
  });

  describe('resolveMetricComparison', () => {
    beforeEach(() => {
      seedReferenceBaselines(BASELINES_FIXTURE);
      seedDetailRecord('tau-ceti', { kind: 'system', record: TAU_CETI_FIXTURE });
      seedDetailRecord('tau-ceti-e', { kind: 'system', record: TAU_CETI_FIXTURE });
    });

    it('resolves metric comparison against Sol baseline for galactic-coordinates with focus=tau-ceti', () => {
      const comparison = resolveMetricComparison('galactic-coordinates', 'tau-ceti');
      expect(comparison).not.toBeNull();
      expect(comparison?.metricId).toBe('galactic-coordinates');
      expect(comparison?.baselineName).toBe('Sol');
      expect(comparison?.baselineHref).toBe('/system/sol');
      expect(comparison?.targetId).toBe('tau-ceti');
      expect(comparison?.targetValue).toContain('pc');
      expect(comparison?.targetFamiliar).toContain('light-years');
      expect(comparison?.relativeRatioLabel).toContain('light-years from Sol');
      expect(comparison?.isFromFocusedContext).toBe(true);
    });

    it('resolves metric comparison against Earth baseline for semi-major-axis with focus=tau-ceti-e', () => {
      const comparison = resolveMetricComparison('semi-major-axis', 'tau-ceti-e');
      expect(comparison).not.toBeNull();
      expect(comparison?.metricId).toBe('semi-major-axis');
      expect(comparison?.baselineName).toBe('Earth');
      expect(comparison?.baselineHref).toBe('/planet/earth');
      expect(comparison?.targetId).toBe('tau-ceti-e');
      expect(comparison?.targetValue).toContain('AU');
      expect(comparison?.targetFamiliar).toContain('light-minutes');
      expect(comparison?.relativeRatioLabel).toContain('Earth orbit');
      expect(comparison?.isFromFocusedContext).toBe(true);
    });

    it('resolves metric comparison for planetary-mass with focus=tau-ceti-e', () => {
      const comparison = resolveMetricComparison('planetary-mass', 'tau-ceti-e');
      expect(comparison).not.toBeNull();
      expect(comparison?.baselineName).toBe('Earth');
      expect(comparison?.targetValue).toContain('M⊕');
      expect(comparison?.relativeRatioLabel).toContain('Earth mass');
    });

    it('resolves metric comparison for equilibrium-temperature with focus=tau-ceti-e', () => {
      const comparison = resolveMetricComparison('equilibrium-temperature', 'tau-ceti-e');
      expect(comparison).not.toBeNull();
      expect(comparison?.targetFamiliar).toContain('°C');
    });

    it('resolves metric comparison for surface-gravity with focus=tau-ceti-e', () => {
      const comparison = resolveMetricComparison('surface-gravity', 'tau-ceti-e');
      expect(comparison).not.toBeNull();
      expect(comparison?.metricId).toBe('surface-gravity');
      expect(comparison?.baselineName).toBe('Earth');
      expect(comparison?.baselineValue).toBe('1.00 g');
      expect(comparison?.targetValue).toContain('g');
      expect(comparison?.relativeRatioLabel).toContain('Earth gravity');
    });

    it('falls back to default benchmark when focusedEntityId is omitted', () => {
      const stellarComp = resolveMetricComparison('stellar-mass');
      expect(stellarComp?.targetId).toBe('tau-ceti');
      expect(stellarComp?.isFromFocusedContext).toBe(false);

      const orbitalComp = resolveMetricComparison('semi-major-axis');
      expect(orbitalComp?.targetId).toBe('tau-ceti-e');
      expect(orbitalComp?.isFromFocusedContext).toBe(false);
    });

    it('returns uncatalogued target with "—" and isCatalogued: false when focused target is uncached', () => {
      const comparison = resolveMetricComparison('stellar-mass', 'proxima-centauri');
      expect(comparison).not.toBeNull();
      expect(comparison?.targetId).toBe('proxima-centauri');
      expect(comparison?.targetValue).toBe('—');
      expect(comparison?.targetFamiliar).toBe('—');
      expect(comparison?.relativeRatioLabel).toBe('—');
      expect(comparison?.isCatalogued).toBe(false);
    });

    it('populates numericValue and unit on catalogued target comparisons', () => {
      const stellarMass = resolveMetricComparison('stellar-mass', 'tau-ceti');
      expect(stellarMass?.targetNumericValue).toBe(0.78);
      expect(stellarMass?.targetUnit).toBe('M☉');

      const semiMajorAxis = resolveMetricComparison('semi-major-axis', 'tau-ceti-e');
      expect(semiMajorAxis?.targetNumericValue).toBe(0.538);
      expect(semiMajorAxis?.targetUnit).toBe('AU');

      const surfaceGravity = resolveMetricComparison('surface-gravity', 'tau-ceti-e');
      expect(surfaceGravity?.targetNumericValue).toBe(1.2);
      expect(surfaceGravity?.targetUnit).toBe('g');

      const effectiveTemp = resolveMetricComparison('effective-temperature', 'tau-ceti');
      expect(effectiveTemp?.targetNumericValue).toBe(5344);
      expect(effectiveTemp?.targetUnit).toBe('K');
    });

    it('supports comma-separated targets in focusedEntityId', () => {
      const comparison = resolveMetricComparison('stellar-mass', 'alpha-centauri-a,alpha-centauri-b');
      expect(comparison).not.toBeNull();
      expect(comparison?.targets).toBeDefined();
      expect(comparison?.targets?.length).toBe(2);
      expect(comparison?.targets?.[0]?.targetId).toBe('alpha-centauri-a');
      expect(comparison?.targets?.[1]?.targetId).toBe('alpha-centauri-b');
    });

    it('hydrates comparison cache without errors', async () => {
      await expect(hydrateMetricComparison('stellar-mass', 'tau-ceti')).resolves.not.toThrow();
    });
  });
});
