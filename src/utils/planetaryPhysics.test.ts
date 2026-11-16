import { describe, it, expect } from 'vitest';
import {
  classifyPlanetPhysical,
  computePlanetCompositionCounts,
  computePlanetSurfaceGravityG,
  isPlanetTidallyLocked,
  isPlanetHabitableCandidate,
  TERRESTRIAL_MAX_RADIUS_REARTH,
  TERRESTRIAL_MAX_MASS_MEARTH,
  SUPER_EARTH_MAX_RADIUS_REARTH,
  SUPER_EARTH_MAX_MASS_MEARTH,
  ICE_GIANT_MAX_RADIUS_REARTH,
  ICE_GIANT_MAX_MASS_MEARTH,
} from './planetaryPhysics';

describe('planetaryPhysics (DEC-032 / astroMath decomposition)', () => {
  it('exports accurate threshold constants', () => {
    expect(TERRESTRIAL_MAX_RADIUS_REARTH).toBe(1.25);
    expect(TERRESTRIAL_MAX_MASS_MEARTH).toBe(2.0);
    expect(SUPER_EARTH_MAX_RADIUS_REARTH).toBe(2.0);
    expect(SUPER_EARTH_MAX_MASS_MEARTH).toBe(10.0);
    expect(ICE_GIANT_MAX_RADIUS_REARTH).toBe(6.0);
    expect(ICE_GIANT_MAX_MASS_MEARTH).toBe(50.0);
  });

  describe('classifyPlanetPhysical', () => {
    it('classifies by explicit string matching first', () => {
      expect(classifyPlanetPhysical({ classification: 'Super-Earth' })).toBe('super-earth');
      expect(classifyPlanetPhysical({ classification: 'super earth' })).toBe('super-earth');
      expect(classifyPlanetPhysical({ classification: 'superearth' })).toBe('super-earth');
      expect(classifyPlanetPhysical({ classification: 'Terrestrial planet' })).toBe('terrestrial');
      expect(classifyPlanetPhysical({ classification: 'Rocky planet' })).toBe('terrestrial');
      expect(classifyPlanetPhysical({ classification: 'Earth-like' })).toBe('terrestrial');
      expect(classifyPlanetPhysical({ classification: 'Ice Giant' })).toBe('ice-giant');
      expect(classifyPlanetPhysical({ classification: 'Neptunian world' })).toBe('ice-giant');
      expect(classifyPlanetPhysical({ classification: 'Gas giant' })).toBe('gas-giant');
      expect(classifyPlanetPhysical({ classification: 'Jovian world' })).toBe('gas-giant');
    });

    it('classifies by radius correctly', () => {
      expect(classifyPlanetPhysical({ radiusRearth: 1.0 })).toBe('terrestrial');
      expect(classifyPlanetPhysical({ radiusRearth: 1.25 })).toBe('terrestrial');
      expect(classifyPlanetPhysical({ radiusRearth: 1.26 })).toBe('super-earth');
      expect(classifyPlanetPhysical({ radiusRearth: 2.0 })).toBe('super-earth');
      expect(classifyPlanetPhysical({ radiusRearth: 2.01 })).toBe('ice-giant');
      expect(classifyPlanetPhysical({ radiusRearth: 4.0 })).toBe('ice-giant');
      expect(classifyPlanetPhysical({ radiusRearth: 6.0 })).toBe('ice-giant');
      expect(classifyPlanetPhysical({ radiusRearth: 6.1 })).toBe('gas-giant');
      expect(classifyPlanetPhysical({ radiusRearth: 11.2 })).toBe('gas-giant');
    });

    it('classifies by radius with mass override for super-earth', () => {
      expect(classifyPlanetPhysical({ radiusRearth: 1.1, massMearth: 3.5 })).toBe('super-earth');
    });

    it('classifies by mass when radius is absent', () => {
      expect(classifyPlanetPhysical({ massMearth: 1.0 })).toBe('terrestrial');
      expect(classifyPlanetPhysical({ massMearth: 2.0 })).toBe('terrestrial');
      expect(classifyPlanetPhysical({ massMearth: 2.1 })).toBe('super-earth');
      expect(classifyPlanetPhysical({ massMearth: 10.0 })).toBe('super-earth');
      expect(classifyPlanetPhysical({ massMearth: 10.1 })).toBe('ice-giant');
      expect(classifyPlanetPhysical({ massMearth: 17.1 })).toBe('ice-giant');
      expect(classifyPlanetPhysical({ massMearth: 50.0 })).toBe('ice-giant');
      expect(classifyPlanetPhysical({ massMearth: 50.1 })).toBe('gas-giant');
      expect(classifyPlanetPhysical({ massMearth: 317.8 })).toBe('gas-giant');
    });

    it('falls back to terrestrial when no properties are provided', () => {
      expect(classifyPlanetPhysical({})).toBe('terrestrial');
    });
  });

  describe('computePlanetCompositionCounts', () => {
    it('returns undefined for empty planet array', () => {
      expect(computePlanetCompositionCounts([])).toBeUndefined();
    });

    it('returns 4-tuple [terrestrial, superEarth, iceGiant, gasGiant]', () => {
      const planets = [
        { radiusRearth: 1.0 },
        { radiusRearth: 1.6 },
        { massMearth: 5.0 },
        { radiusRearth: 4.0 },
        { radiusRearth: 11.2 },
      ];
      const counts = computePlanetCompositionCounts(planets);
      expect(counts).toEqual([1, 2, 1, 1]);
    });
  });

  describe('computePlanetSurfaceGravityG', () => {
    it('calculates surface gravity in g from mass and radius', () => {
      expect(computePlanetSurfaceGravityG({ massMearth: 1.0, radiusRearth: 1.0 })).toBe(1.0);
      expect(computePlanetSurfaceGravityG({ massMearth: 3.93, radiusRearth: 1.81 })).toBe(1.2);
    });

    it('estimates radius if radius is missing and mass is defined', () => {
      const gEst = computePlanetSurfaceGravityG({ massMearth: 3.93 });
      expect(gEst).toBeDefined();
      expect(typeof gEst).toBe('number');
      expect(gEst).toBeGreaterThan(0);
    });

    it('returns undefined when mass is non-positive or missing', () => {
      expect(computePlanetSurfaceGravityG({})).toBeUndefined();
      expect(computePlanetSurfaceGravityG({ massMearth: 0 })).toBeUndefined();
      expect(computePlanetSurfaceGravityG({ massMearth: -1 })).toBeUndefined();
    });
  });

  describe('isPlanetTidallyLocked', () => {
    it('returns true when period <= 30 days', () => {
      expect(isPlanetTidallyLocked({ periodDays: 11.2 })).toBe(true);
      expect(isPlanetTidallyLocked({ periodDays: 30 })).toBe(true);
    });

    it('returns true when semiMajorAxis <= 0.15 AU', () => {
      expect(isPlanetTidallyLocked({ semiMajorAxisAu: 0.05 })).toBe(true);
      expect(isPlanetTidallyLocked({ semiMajorAxisAu: 0.15 })).toBe(true);
    });

    it('returns false when period > 30 days and semiMajorAxis > 0.15 AU', () => {
      expect(isPlanetTidallyLocked({ periodDays: 365.25, semiMajorAxisAu: 1.0 })).toBe(false);
      expect(isPlanetTidallyLocked({})).toBe(false);
    });
  });

  describe('isPlanetHabitableCandidate', () => {
    it('respects explicit candidate flag', () => {
      expect(isPlanetHabitableCandidate({ isHabitableCandidate: true })).toBe(true);
      expect(isPlanetHabitableCandidate({ isHabitableCandidate: false })).toBe(false);
    });

    it('checks tags for HabitableWorld', () => {
      expect(isPlanetHabitableCandidate({ tags: ['HabitableWorld'] })).toBe(true);
    });

    it('checks equilibrium temperature in [180, 320] K', () => {
      expect(isPlanetHabitableCandidate({ equilibriumTempK: 255 })).toBe(true);
      expect(isPlanetHabitableCandidate({ equilibriumTempK: 100 })).toBe(false);
      expect(isPlanetHabitableCandidate({ equilibriumTempK: 400 })).toBe(false);
    });

    it('checks ESI >= 0.7', () => {
      expect(isPlanetHabitableCandidate({ esi: 0.85 })).toBe(true);
      expect(isPlanetHabitableCandidate({ esi: 0.5 })).toBe(false);
    });

    it('checks stellar luminosity and semiMajorAxis bounds', () => {
      expect(isPlanetHabitableCandidate({ semiMajorAxis: 1.0 }, 1.0)).toBe(true);
      expect(isPlanetHabitableCandidate({ semiMajorAxis: 0.2 }, 1.0)).toBe(false);
    });
  });
});
