import { describe, it, expect, beforeEach } from 'vitest';
import {
  METRIC_GUIDE_ENTRIES,
  resolveMetricGuideEntry,
  resolveMetricGuideEntries,
  resolveMetricComparison,
  computeSpectralCombination,
  METRICS_GUIDE_PATH,
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

describe('guideService - Metrics & Comparisons', () => {
  beforeEach(() => {
    clearDetailsRepositoryCache();
  });

  describe('METRIC_GUIDE_ENTRIES & resolveMetricGuideEntry', () => {
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

    it('covers all 13 required metrics with full telemetry metadata', () => {
      expect(METRIC_GUIDE_ENTRIES.length).toBe(13);
      for (const slug of requiredMetricSlugs) {
        const entry = resolveMetricGuideEntry(slug);
        expect(entry).not.toBeNull();
        expect(entry?.id).toBe(slug);
        expect(entry?.title).toBeTruthy();
        expect(entry?.unitSymbol).toBeTruthy();
        expect(['Astrometry', 'Stellar Telemetry', 'Orbital & Planetary Telemetry']).toContain(entry?.category);
        expect(entry?.physicalDefinition).toBeTruthy();
        expect(entry?.referenceBaseline).toBeTruthy();
        expect(entry?.href).toBe(`${METRICS_GUIDE_PATH}/${slug}`);
        expect(entry?.examples.length).toBeGreaterThan(0);
        expect(entry?.familiarConversion).toBeTruthy();
        expect(['Sol', 'Earth']).toContain(entry?.comparisonBaselineLabel);
        expect(entry?.comparisonBaselineValue).toBeTruthy();
      }
    });

    it('provides familiar audience conversions including light-years for coordinates', () => {
      const coords = resolveMetricGuideEntry('galactic-coordinates');
      expect(coords?.familiarConversion).toContain('light-years');
      expect(coords?.comparisonBaselineLabel).toBe('Sol');

      const sma = resolveMetricGuideEntry('semi-major-axis');
      expect(sma?.familiarConversion).toContain('light-minutes');
      expect(sma?.comparisonBaselineLabel).toBe('Earth');
    });

    it('resolves legacy and shorthand aliases smoothly', () => {
      expect(resolveMetricGuideEntry('planet-mass')?.id).toBe('planetary-mass');
      expect(resolveMetricGuideEntry('planet-radius')?.id).toBe('planetary-radius');
      expect(resolveMetricGuideEntry('apparent-magnitude')?.id).toBe('stellar-magnitude');
      expect(resolveMetricGuideEntry('absolute-magnitude')?.id).toBe('stellar-magnitude');
      expect(resolveMetricGuideEntry('luminosity')?.id).toBe('stellar-luminosity');
    });

    it('returns null for unknown metrics', () => {
      expect(resolveMetricGuideEntry('')).toBeNull();
      expect(resolveMetricGuideEntry('warp-factor')).toBeNull();
    });
  });

  describe('resolveMetricComparison (DEC-028)', () => {
    beforeEach(() => {
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
  });

  describe('computeSpectralCombination', () => {
    it('computes realistic astrophysics parameters for G2V', () => {
      const combo = computeSpectralCombination('G', '2', 'V');
      expect(combo.combinedCode).toBe('G2V');
      expect(combo.effectiveTempK).toBeGreaterThanOrEqual(5200);
      expect(combo.effectiveTempK).toBeLessThanOrEqual(6000);
      expect(combo.chromaticityHex).toBe('var(--star-chromaticity-g)');
      expect(combo.radiusRsun).toBeCloseTo(1.0, 1);
      expect(combo.luminosityLsun).toBeGreaterThan(0.5);
      expect(combo.luminosityLsun).toBeLessThan(1.5);
      expect(combo.habitableZoneAu).toContain('AU');
      expect(combo.classEffect).toBeTruthy();
      expect(combo.subdivisionEffect).toBeTruthy();
      expect(combo.luminosityEffect).toBeTruthy();
    });

    it('scales radius and luminosity up for Supergiant (I)', () => {
      const supergiant = computeSpectralCombination('B', '0', 'I');
      expect(supergiant.combinedCode).toBe('B0I');
      expect(supergiant.radiusRsun).toBeGreaterThanOrEqual(100);
      expect(supergiant.luminosityLsun).toBeGreaterThan(10000);
    });

    it('scales radius down for White Dwarf (VII)', () => {
      const whiteDwarf = computeSpectralCombination('D', '2', 'VII');
      expect(whiteDwarf.combinedCode).toBe('D2VII');
      expect(whiteDwarf.radiusRsun).toBeCloseTo(0.012, 3);
    });
  });

  describe('plural resolvers - metrics', () => {
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

    it('populates numericValue and unit on catalogued target comparisons (AUD-C)', () => {
      seedDetailRecord('tau-ceti', { kind: 'system', record: TAU_CETI_FIXTURE });
      seedDetailRecord('tau-ceti-e', { kind: 'system', record: TAU_CETI_FIXTURE });

      const stellarMass = resolveMetricComparison('stellar-mass', 'tau-ceti');
      expect(stellarMass?.targetNumericValue).toBe(0.78);
      expect(stellarMass?.targetUnit).toBe('M☉');
      expect(stellarMass?.targets?.[0]?.numericValue).toBe(0.78);
      expect(stellarMass?.targets?.[0]?.unit).toBe('M☉');

      const semiMajorAxis = resolveMetricComparison('semi-major-axis', 'tau-ceti-e');
      expect(semiMajorAxis?.targetNumericValue).toBe(0.538);
      expect(semiMajorAxis?.targetUnit).toBe('AU');
      expect(semiMajorAxis?.targets?.[0]?.numericValue).toBe(0.538);
      expect(semiMajorAxis?.targets?.[0]?.unit).toBe('AU');

      const surfaceGravity = resolveMetricComparison('surface-gravity', 'tau-ceti-e');
      expect(surfaceGravity?.targetNumericValue).toBe(1.2);
      expect(surfaceGravity?.targetUnit).toBe('g');
      expect(surfaceGravity?.targets?.[0]?.numericValue).toBe(1.2);
      expect(surfaceGravity?.targets?.[0]?.unit).toBe('g');

      const effectiveTemp = resolveMetricComparison('effective-temperature', 'tau-ceti');
      expect(effectiveTemp?.targetNumericValue).toBe(5344);
      expect(effectiveTemp?.targetUnit).toBe('K');
      expect(effectiveTemp?.targets?.[0]?.numericValue).toBe(5344);
      expect(effectiveTemp?.targets?.[0]?.unit).toBe('K');
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
