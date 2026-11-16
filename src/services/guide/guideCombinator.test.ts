import { describe, it, expect } from 'vitest';
import {
  getLuminosityLabel,
  computeSpectralCombination,
  combineStarSpectralAndLuminosity,
} from './guideCombinator';

describe('guideCombinator', () => {
  describe('getLuminosityLabel', () => {
    it('maps luminosity class to human-readable label', () => {
      expect(getLuminosityLabel('Ia')).toBe('Supergiant');
      expect(getLuminosityLabel('Ib')).toBe('Supergiant');
      expect(getLuminosityLabel('II')).toBe('Bright Giant');
      expect(getLuminosityLabel('III')).toBe('Giant');
      expect(getLuminosityLabel('IV')).toBe('Subgiant');
      expect(getLuminosityLabel('V')).toBe('Main-Sequence Dwarf');
      expect(getLuminosityLabel('VI')).toBe('Subdwarf');
      expect(getLuminosityLabel('SD')).toBe('Subdwarf');
      expect(getLuminosityLabel('VII')).toBe('White Dwarf');
      expect(getLuminosityLabel('D')).toBe('White Dwarf');
      expect(getLuminosityLabel('UNKNOWN')).toBeUndefined();
      expect(getLuminosityLabel(undefined)).toBeUndefined();
    });
  });

  describe('computeSpectralCombination', () => {
    it('computes realistic astrophysics parameters for G2V', () => {
      const combo = computeSpectralCombination('G', '2', 'V');
      expect(combo.combinedCode).toBe('G2V');
      expect(combo.effectiveTempK).toBeGreaterThanOrEqual(5200);
      expect(combo.effectiveTempK).toBeLessThanOrEqual(6000);
      expect(combo.chromaticityToken).toBe('var(--star-chromaticity-g)');
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

    it('provides combineStarSpectralAndLuminosity alias for combinator', () => {
      expect(combineStarSpectralAndLuminosity).toBe(computeSpectralCombination);
    });
  });
});
