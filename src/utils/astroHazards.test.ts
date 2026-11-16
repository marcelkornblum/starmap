import { describe, it, expect } from 'vitest';
import {
  computeSystemHazardMask,
  computePlanetHazardMask,
  SYSTEM_HAZARD_BITS,
  PLANET_HAZARD_BITS,
} from './astroHazards';

describe('astroHazards (DEC-032 / astroMath decomposition)', () => {
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
