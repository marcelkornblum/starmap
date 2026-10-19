import { describe, it, expect } from 'vitest';
import {
  classifyPlanetPhysical,
  computePlanetCompositionCounts,
  computePlanetSurfaceGravityG,
  isPlanetTidallyLocked,
  computeSystemHazardMask,
  computePlanetHazardMask,
  SYSTEM_HAZARD_BITS,
  PLANET_HAZARD_BITS,
  TERRESTRIAL_MAX_RADIUS_REARTH,
  TERRESTRIAL_MAX_MASS_MEARTH,
  SUPER_EARTH_MAX_RADIUS_REARTH,
  SUPER_EARTH_MAX_MASS_MEARTH,
  ICE_GIANT_MAX_RADIUS_REARTH,
  ICE_GIANT_MAX_MASS_MEARTH,
} from '../astroMath';

describe('4-Class Planet Taxonomy & Physical Classification (DEC-032)', () => {
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
      // <= 1.25 -> terrestrial
      expect(classifyPlanetPhysical({ radiusRearth: 1.0 })).toBe('terrestrial');
      expect(classifyPlanetPhysical({ radiusRearth: 1.25 })).toBe('terrestrial');
      // > 1.25 && <= 2.0 -> super-earth
      expect(classifyPlanetPhysical({ radiusRearth: 1.26 })).toBe('super-earth');
      expect(classifyPlanetPhysical({ radiusRearth: 2.0 })).toBe('super-earth');
      // > 2.0 && <= 6.0 -> ice-giant
      expect(classifyPlanetPhysical({ radiusRearth: 2.01 })).toBe('ice-giant');
      expect(classifyPlanetPhysical({ radiusRearth: 4.0 })).toBe('ice-giant');
      expect(classifyPlanetPhysical({ radiusRearth: 6.0 })).toBe('ice-giant');
      // > 6.0 -> gas-giant
      expect(classifyPlanetPhysical({ radiusRearth: 6.1 })).toBe('gas-giant');
      expect(classifyPlanetPhysical({ radiusRearth: 11.2 })).toBe('gas-giant');
    });

    it('classifies by radius with mass override for super-earth', () => {
      // radius <= 1.25 but mass > 2.0 and <= 10.0 -> super-earth
      expect(classifyPlanetPhysical({ radiusRearth: 1.1, massMearth: 3.5 })).toBe('super-earth');
    });

    it('classifies by mass when radius is absent', () => {
      // <= 2.0 -> terrestrial
      expect(classifyPlanetPhysical({ massMearth: 1.0 })).toBe('terrestrial');
      expect(classifyPlanetPhysical({ massMearth: 2.0 })).toBe('terrestrial');
      // > 2.0 && <= 10.0 -> super-earth
      expect(classifyPlanetPhysical({ massMearth: 2.1 })).toBe('super-earth');
      expect(classifyPlanetPhysical({ massMearth: 10.0 })).toBe('super-earth');
      // > 10.0 && <= 50.0 -> ice-giant
      expect(classifyPlanetPhysical({ massMearth: 10.1 })).toBe('ice-giant');
      expect(classifyPlanetPhysical({ massMearth: 17.1 })).toBe('ice-giant');
      expect(classifyPlanetPhysical({ massMearth: 50.0 })).toBe('ice-giant');
      // > 50.0 -> gas-giant
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
        { radiusRearth: 1.0 }, // terrestrial
        { radiusRearth: 1.6 }, // super-earth
        { massMearth: 5.0 }, // super-earth
        { radiusRearth: 4.0 }, // ice-giant
        { radiusRearth: 11.2 }, // gas-giant
      ];
      const counts = computePlanetCompositionCounts(planets);
      expect(counts).toEqual([1, 2, 1, 1]);
    });
  });

  describe('computePlanetSurfaceGravityG', () => {
    it('calculates surface gravity in g from mass and radius', () => {
      // Earth: 1.0 Mearth, 1.0 Rearth -> 1.0 g
      expect(computePlanetSurfaceGravityG({ massMearth: 1.0, radiusRearth: 1.0 })).toBe(1.0);
      // Tau Ceti e: ~3.93 Mearth, ~1.81 Rearth -> 3.93 / (1.81^2) = 3.93 / 3.2761 ≈ 1.20 g
      expect(computePlanetSurfaceGravityG({ massMearth: 3.93, radiusRearth: 1.81 })).toBe(1.2);
    });

    it('estimates radius if radius is missing and mass is defined', () => {
      // mass <= 10 uses mass^0.28
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

  describe('computeSystemHazardMask & SYSTEM_HAZARD_BITS', () => {
    it('computes FLARE_STAR bit (1)', () => {
      expect(computeSystemHazardMask({ spect: 'M5.5Ve' })).toBe(SYSTEM_HAZARD_BITS.FLARE_STAR);
      expect(computeSystemHazardMask({ spect: 'dMe' })).toBe(SYSTEM_HAZARD_BITS.FLARE_STAR);
      expect(computeSystemHazardMask({ varType: 'UV' })).toBe(SYSTEM_HAZARD_BITS.FLARE_STAR);
      expect(computeSystemHazardMask({ varType: 'Flare' })).toBe(SYSTEM_HAZARD_BITS.FLARE_STAR);
    });

    it('computes IONISING_RADIATION bit (2)', () => {
      expect(computeSystemHazardMask({ spect: 'O5V' })).toBe(SYSTEM_HAZARD_BITS.IONISING_RADIATION);
      expect(computeSystemHazardMask({ spect: 'B2Ia' })).toBe(SYSTEM_HAZARD_BITS.IONISING_RADIATION);
      expect(computeSystemHazardMask({ spect: 'DA2' })).toBe(SYSTEM_HAZARD_BITS.IONISING_RADIATION);
      expect(computeSystemHazardMask({ lum: 30 })).toBe(SYSTEM_HAZARD_BITS.IONISING_RADIATION);
      expect(computeSystemHazardMask({ effectiveTempK: 12000 })).toBe(SYSTEM_HAZARD_BITS.IONISING_RADIATION);
    });

    it('computes VARIABLE_FLUX bit (4) when not already FLARE_STAR', () => {
      expect(computeSystemHazardMask({ tags: ['VariableStar'] })).toBe(SYSTEM_HAZARD_BITS.VARIABLE_FLUX);
      expect(computeSystemHazardMask({ varType: 'BY' })).toBe(SYSTEM_HAZARD_BITS.VARIABLE_FLUX);
      // If flare star, VARIABLE_FLUX is suppressed
      const flareAndVar = computeSystemHazardMask({ spect: 'M5.5Ve', tags: ['VariableStar'] });
      expect(flareAndVar & SYSTEM_HAZARD_BITS.FLARE_STAR).toBeTruthy();
      expect(flareAndVar & SYSTEM_HAZARD_BITS.VARIABLE_FLUX).toBe(0);
    });

    it('returns 0 for nominal solar-type star', () => {
      expect(computeSystemHazardMask({ spect: 'G2V', lum: 1.0, effectiveTempK: 5778 })).toBe(0);
    });
  });

  describe('computePlanetHazardMask & PLANET_HAZARD_BITS', () => {
    it('computes EXTREME_HEAT bit (1)', () => {
      expect(computePlanetHazardMask({ equilibriumTempK: 400 })).toBe(PLANET_HAZARD_BITS.EXTREME_HEAT);
    });

    it('computes CRYOGENIC_COLD bit (2)', () => {
      expect(computePlanetHazardMask({ equilibriumTempK: 120 })).toBe(PLANET_HAZARD_BITS.CRYOGENIC_COLD);
    });

    it('computes HIGH_GRAVITY bit (4)', () => {
      expect(computePlanetHazardMask({ surfaceGravityG: 1.3 })).toBe(PLANET_HAZARD_BITS.HIGH_GRAVITY);
    });

    it('computes TIDAL_LOCKING bit (8)', () => {
      expect(computePlanetHazardMask({ periodDays: 10 })).toBe(PLANET_HAZARD_BITS.TIDAL_LOCKING);
    });

    it('computes HIGH_ECCENTRICITY bit (16)', () => {
      expect(computePlanetHazardMask({ eccentricity: 0.25 })).toBe(PLANET_HAZARD_BITS.HIGH_ECCENTRICITY);
    });

    it('combines multiple hazards', () => {
      const mask = computePlanetHazardMask({
        equilibriumTempK: 450,
        surfaceGravityG: 1.5,
        periodDays: 5,
        eccentricity: 0.3,
      });
      expect(mask).toBe(
        PLANET_HAZARD_BITS.EXTREME_HEAT |
          PLANET_HAZARD_BITS.HIGH_GRAVITY |
          PLANET_HAZARD_BITS.TIDAL_LOCKING |
          PLANET_HAZARD_BITS.HIGH_ECCENTRICITY,
      );
    });

    it('returns 0 for nominal Earth-like planet', () => {
      expect(
        computePlanetHazardMask({
          equilibriumTempK: 255,
          surfaceGravityG: 1.0,
          periodDays: 365.25,
          semiMajorAxisAu: 1.0,
          eccentricity: 0.0167,
        }),
      ).toBe(0);
    });
  });
});
