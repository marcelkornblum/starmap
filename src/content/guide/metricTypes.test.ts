import { describe, expect, it } from 'vitest';
import {
  METRIC_GUIDE_ENTRIES,
  METRIC_LABEL_TO_SLUG,
  METRIC_ALIASES,
  resolveMetricSlugFromLabel,
} from './metricTypes';
import { METRICS_GUIDE_PATH } from './types';

describe('metricTypes content module (AUD-071 & DEC-R032)', () => {
  describe('METRIC_GUIDE_ENTRIES', () => {
    it('contains all 13 canonical telemetry metric guide entries', () => {
      expect(METRIC_GUIDE_ENTRIES.length).toBe(13);
      const ids = METRIC_GUIDE_ENTRIES.map((entry) => entry.id);
      expect(ids).toContain('galactic-coordinates');
      expect(ids).toContain('stellar-magnitude');
      expect(ids).toContain('stellar-mass');
      expect(ids).toContain('stellar-radius');
      expect(ids).toContain('stellar-luminosity');
      expect(ids).toContain('effective-temperature');
      expect(ids).toContain('semi-major-axis');
      expect(ids).toContain('orbital-period');
      expect(ids).toContain('orbital-inclination');
      expect(ids).toContain('planetary-mass');
      expect(ids).toContain('planetary-radius');
      expect(ids).toContain('equilibrium-temperature');
      expect(ids).toContain('surface-gravity');
    });

    it('has unique IDs and valid guide paths for each entry', () => {
      const ids = new Set<string>();
      for (const entry of METRIC_GUIDE_ENTRIES) {
        expect(ids.has(entry.id)).toBe(false);
        ids.add(entry.id);
        expect(entry.href).toBe(`${METRICS_GUIDE_PATH}/${entry.id}`);
        expect(entry.title.length).toBeGreaterThan(0);
        expect(entry.unitSymbol.length).toBeGreaterThan(0);
        expect(entry.summary.length).toBeGreaterThan(0);
        expect(entry.physicalDefinition.length).toBeGreaterThan(0);
        expect(entry.examples.length).toBeGreaterThan(0);
      }
    });

    it('classifies all entries under recognized telemetry categories', () => {
      const recognizedCategories = new Set([
        'Astrometry',
        'Stellar Telemetry',
        'Orbital & Planetary Telemetry',
      ]);
      for (const entry of METRIC_GUIDE_ENTRIES) {
        expect(recognizedCategories.has(entry.category)).toBe(true);
      }
    });
  });

  describe('resolveMetricSlugFromLabel', () => {
    it('resolves exact metric labels to canonical slugs', () => {
      expect(resolveMetricSlugFromLabel('Galactic Coordinates')).toBe('galactic-coordinates');
      expect(resolveMetricSlugFromLabel('Stellar Magnitude')).toBe('stellar-magnitude');
      expect(resolveMetricSlugFromLabel('Stellar Mass')).toBe('stellar-mass');
      expect(resolveMetricSlugFromLabel('Stellar Radius')).toBe('stellar-radius');
      expect(resolveMetricSlugFromLabel('Effective Temperature')).toBe('effective-temperature');
      expect(resolveMetricSlugFromLabel('Semi-Major Axis')).toBe('semi-major-axis');
      expect(resolveMetricSlugFromLabel('Orbital Period')).toBe('orbital-period');
      expect(resolveMetricSlugFromLabel('Orbital Inclination')).toBe('orbital-inclination');
      expect(resolveMetricSlugFromLabel('Planetary Mass')).toBe('planetary-mass');
      expect(resolveMetricSlugFromLabel('Planetary Radius')).toBe('planetary-radius');
      expect(resolveMetricSlugFromLabel('Equilibrium Temperature')).toBe('equilibrium-temperature');
      expect(resolveMetricSlugFromLabel('Surface Gravity')).toBe('surface-gravity');
    });

    it('resolves parenthetical and alternate label variants', () => {
      expect(resolveMetricSlugFromLabel('Semi-Major Axis (a)')).toBe('semi-major-axis');
      expect(resolveMetricSlugFromLabel('Orbital Period (P)')).toBe('orbital-period');
      expect(resolveMetricSlugFromLabel('Orbital Inclination (i)')).toBe('orbital-inclination');
      expect(resolveMetricSlugFromLabel('Effective Temperature (T_eff)')).toBe('effective-temperature');
      expect(resolveMetricSlugFromLabel('Equilibrium Temperature (T_eq)')).toBe('equilibrium-temperature');
      expect(resolveMetricSlugFromLabel('Mass (Star)')).toBe('stellar-mass');
      expect(resolveMetricSlugFromLabel('Radius (Star)')).toBe('stellar-radius');
      expect(resolveMetricSlugFromLabel('Mass (Planet)')).toBe('planetary-mass');
      expect(resolveMetricSlugFromLabel('Radius (Planet)')).toBe('planetary-radius');
      expect(resolveMetricSlugFromLabel('Planet Mass')).toBe('planetary-mass');
      expect(resolveMetricSlugFromLabel('Planet Radius')).toBe('planetary-radius');
      expect(resolveMetricSlugFromLabel('Bolometric Luminosity')).toBe('stellar-luminosity');
      expect(resolveMetricSlugFromLabel('Coordinates')).toBe('galactic-coordinates');
      expect(resolveMetricSlugFromLabel('Position')).toBe('galactic-coordinates');
    });

    it('resolves case-insensitively with leading/trailing whitespace trimmed', () => {
      expect(resolveMetricSlugFromLabel('  semi-major axis  ')).toBe('semi-major-axis');
      expect(resolveMetricSlugFromLabel('ORBITAL PERIOD')).toBe('orbital-period');
      expect(resolveMetricSlugFromLabel('surface gravity')).toBe('surface-gravity');
    });

    it('resolves alias keys defined in METRIC_ALIASES', () => {
      expect(resolveMetricSlugFromLabel('planet-mass')).toBe('planetary-mass');
      expect(resolveMetricSlugFromLabel('planet-radius')).toBe('planetary-radius');
      expect(resolveMetricSlugFromLabel('apparent-magnitude')).toBe('stellar-magnitude');
      expect(resolveMetricSlugFromLabel('absolute-magnitude')).toBe('stellar-magnitude');
      expect(resolveMetricSlugFromLabel('luminosity')).toBe('stellar-luminosity');
      expect(resolveMetricSlugFromLabel('gravity')).toBe('surface-gravity');
    });

    it('resolves direct metric id slugs', () => {
      expect(resolveMetricSlugFromLabel('galactic-coordinates')).toBe('galactic-coordinates');
      expect(resolveMetricSlugFromLabel('stellar-mass')).toBe('stellar-mass');
      expect(resolveMetricSlugFromLabel('surface-gravity')).toBe('surface-gravity');
    });

    it('returns null for empty, whitespace, or unknown metric labels', () => {
      expect(resolveMetricSlugFromLabel('')).toBeNull();
      expect(resolveMetricSlugFromLabel('   ')).toBeNull();
      expect(resolveMetricSlugFromLabel('warp-drive-efficiency')).toBeNull();
      expect(resolveMetricSlugFromLabel('unknown-telemetry-key')).toBeNull();
    });
  });

  describe('label mapping integrity', () => {
    it('ensures all targets in METRIC_LABEL_TO_SLUG exist in METRIC_GUIDE_ENTRIES', () => {
      const validIds = new Set(METRIC_GUIDE_ENTRIES.map((entry) => entry.id));
      for (const [label, slug] of Object.entries(METRIC_LABEL_TO_SLUG)) {
        expect(
          validIds.has(slug),
          `Label "${label}" maps to "${slug}" which is not in METRIC_GUIDE_ENTRIES`,
        ).toBe(true);
      }
    });

    it('ensures all targets in METRIC_ALIASES exist in METRIC_GUIDE_ENTRIES', () => {
      const validIds = new Set(METRIC_GUIDE_ENTRIES.map((entry) => entry.id));
      for (const [alias, slug] of Object.entries(METRIC_ALIASES)) {
        expect(
          validIds.has(slug),
          `Alias "${alias}" maps to "${slug}" which is not in METRIC_GUIDE_ENTRIES`,
        ).toBe(true);
      }
    });
  });
});
