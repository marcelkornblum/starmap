import { describe, it, expect } from 'vitest';
import {
  SOL_REFERENCE_TARGET,
  EARTH_REFERENCE_TARGET,
  DEFAULT_GUIDE_BENCHMARKS,
  DEFAULT_ORIGIN_TARGETS,
} from './referenceTargets';

describe('Reference Targets & Educational Baselines Configuration (DEC-R033)', () => {
  describe('SOL_REFERENCE_TARGET', () => {
    it('defines Sol canonical identifiers and educational physical baselines', () => {
      expect(SOL_REFERENCE_TARGET.id).toBe('sol');
      expect(SOL_REFERENCE_TARGET.name).toBe('Sol');
      expect(SOL_REFERENCE_TARGET.displayName).toBe('Sol');
      expect(SOL_REFERENCE_TARGET.systemId).toBe('sol');
      expect(SOL_REFERENCE_TARGET.systemName).toBe('Sol');
      expect(SOL_REFERENCE_TARGET.href).toBe('/system/sol');
      expect(SOL_REFERENCE_TARGET.coordinatesPc).toEqual([0, 0, 0]);
      expect(SOL_REFERENCE_TARGET.massMsun).toBe(1.0);
      expect(SOL_REFERENCE_TARGET.radiusRsun).toBe(1.0);
      expect(SOL_REFERENCE_TARGET.luminosityLsun).toBe(1.0);
      expect(SOL_REFERENCE_TARGET.effectiveTempK).toBe(5778);
      expect(SOL_REFERENCE_TARGET.visualMagnitude).toBe(-26.74);
      expect(SOL_REFERENCE_TARGET.absoluteMagnitude).toBe(4.83);
    });

    it('contains all required baseline comparison quantities for stellar telemetry', () => {
      const { baselines } = SOL_REFERENCE_TARGET;
      expect(baselines.galacticCoordinates.value).toBe('0.00 pc');
      expect(baselines.galacticCoordinates.familiar).toBe('0.00 light-years (ly)');

      expect(baselines.stellarMagnitude.value).toBe('-26.74 V / +4.83 M_V');
      expect(baselines.stellarMagnitude.familiar).toBe('Brightest celestial body from Earth');

      expect(baselines.stellarMass.value).toBe('1.00 M☉');
      expect(baselines.stellarMass.familiar).toContain('332,950 M⊕');

      expect(baselines.stellarRadius.value).toBe('1.00 R☉');
      expect(baselines.stellarRadius.familiar).toContain('109.2 R⊕');

      expect(baselines.stellarLuminosity.value).toBe('1.00 L☉');
      expect(baselines.stellarLuminosity.familiar).toContain('3.828 × 10²⁶ W');

      expect(baselines.effectiveTemperature.value).toBe('5,778 K');
      expect(baselines.effectiveTemperature.familiar).toContain('5,505 °C');
    });
  });

  describe('EARTH_REFERENCE_TARGET', () => {
    it('defines Earth canonical identifiers and educational physical baselines', () => {
      expect(EARTH_REFERENCE_TARGET.id).toBe('earth');
      expect(EARTH_REFERENCE_TARGET.name).toBe('Earth');
      expect(EARTH_REFERENCE_TARGET.displayName).toBe('Earth');
      expect(EARTH_REFERENCE_TARGET.systemId).toBe('sol');
      expect(EARTH_REFERENCE_TARGET.systemName).toBe('Sol');
      expect(EARTH_REFERENCE_TARGET.href).toBe('/planet/earth');
      expect(EARTH_REFERENCE_TARGET.coordinatesPc).toEqual([0, 0, 0]);
      expect(EARTH_REFERENCE_TARGET.massMearth).toBe(1.0);
      expect(EARTH_REFERENCE_TARGET.radiusRearth).toBe(1.0);
      expect(EARTH_REFERENCE_TARGET.semiMajorAxisAu).toBe(1.0);
      expect(EARTH_REFERENCE_TARGET.periodDays).toBe(365.25);
      expect(EARTH_REFERENCE_TARGET.inclinationDeg).toBe(0.0);
      expect(EARTH_REFERENCE_TARGET.equilibriumTempK).toBe(255);
      expect(EARTH_REFERENCE_TARGET.surfaceGravityG).toBe(1.0);
    });

    it('contains all required baseline comparison quantities for planetary & orbital telemetry', () => {
      const { baselines } = EARTH_REFERENCE_TARGET;
      expect(baselines.semiMajorAxis.value).toBe('1.000 AU');
      expect(baselines.semiMajorAxis.familiar).toContain('8.32 light-minutes');

      expect(baselines.orbitalPeriod.value).toBe('365.25 d');
      expect(baselines.orbitalPeriod.familiar).toContain('1.00 Earth year');

      expect(baselines.orbitalInclination.value).toBe('0.00°');
      expect(baselines.orbitalInclination.familiar).toBe('Coplanar ecliptic reference');

      expect(baselines.planetaryMass.value).toBe('1.00 M⊕');
      expect(baselines.planetaryMass.familiar).toContain('5.972 × 10²⁴ kg');

      expect(baselines.planetaryRadius.value).toBe('1.00 R⊕');
      expect(baselines.planetaryRadius.familiar).toContain('6,371 km radius');

      expect(baselines.equilibriumTemperature.value).toBe('255 K');
      expect(baselines.equilibriumTemperature.familiar).toContain('−18 °C');

      expect(baselines.surfaceGravity.value).toBe('1.00 g');
      expect(baselines.surfaceGravity.familiar).toContain('9.81 m/s²');
    });
  });

  describe('DEFAULT_GUIDE_BENCHMARKS', () => {
    it('defines standard educational benchmark targets for guide comparisons', () => {
      expect(DEFAULT_GUIDE_BENCHMARKS.stellarBenchmarkId).toBe('tau-ceti');
      expect(DEFAULT_GUIDE_BENCHMARKS.stellarBenchmarkName).toBe('Tau Ceti');
      expect(DEFAULT_GUIDE_BENCHMARKS.orbitalBenchmarkId).toBe('tau-ceti-e');
      expect(DEFAULT_GUIDE_BENCHMARKS.orbitalBenchmarkName).toBe('Tau Ceti e');
    });
  });

  describe('DEFAULT_ORIGIN_TARGETS', () => {
    it('defines standard origins and coordinates for interstellar and intra-system route finding', () => {
      expect(DEFAULT_ORIGIN_TARGETS.interstellarOriginId).toBe('sol');
      expect(DEFAULT_ORIGIN_TARGETS.interstellarOriginName).toBe('Sol');
      expect(DEFAULT_ORIGIN_TARGETS.intraSystemOriginId).toBe('earth');
      expect(DEFAULT_ORIGIN_TARGETS.intraSystemOriginName).toBe('Earth');
      expect(DEFAULT_ORIGIN_TARGETS.galacticOriginCoordinates).toEqual([0, 0, 0]);
    });
  });
});
