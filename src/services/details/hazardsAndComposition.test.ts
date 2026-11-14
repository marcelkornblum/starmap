import { describe, expect, it } from 'vitest';
import {
  decodeSystemHazards,
  decodePlanetHazards,
  formatDiskKindLabel,
} from './hazardsAndComposition';
import {
  PLANET_HAZARD_BITS,
  SYSTEM_HAZARD_BITS,
} from '../../utils/astroMath';
import { decodeExoplanet } from '../../utils/compactDataCodec';
import type { CircumstellarDiskKind } from '../../types/astro';

describe('hazardsAndComposition', () => {
  describe('Hazard Bitmask Decoders', () => {
    it('decodeSystemHazards returns empty array for 0 or undefined mask', () => {
      expect(decodeSystemHazards(undefined)).toEqual([]);
      expect(decodeSystemHazards(0)).toEqual([]);
    });

    it('decodeSystemHazards correctly decodes individual system hazard bits', () => {
      const flare = decodeSystemHazards(SYSTEM_HAZARD_BITS.FLARE_STAR);
      expect(flare).toHaveLength(1);
      expect(flare[0]).toMatchObject({
        code: 'flare-star',
        severity: 'warning',
        label: 'Stellar flare activity',
      });

      const ionising = decodeSystemHazards(SYSTEM_HAZARD_BITS.IONISING_RADIATION);
      expect(ionising).toHaveLength(1);
      expect(ionising[0]).toMatchObject({
        code: 'ionising-radiation',
        severity: 'critical',
        label: 'Hard ionising radiation',
      });

      const variable = decodeSystemHazards(SYSTEM_HAZARD_BITS.VARIABLE_FLUX);
      expect(variable).toHaveLength(1);
      expect(variable[0]).toMatchObject({
        code: 'variable-flux',
        severity: 'warning',
        label: 'Variable stellar flux',
      });
    });

    it('decodeSystemHazards decodes composite masks', () => {
      const composite = decodeSystemHazards(
        SYSTEM_HAZARD_BITS.FLARE_STAR | SYSTEM_HAZARD_BITS.VARIABLE_FLUX,
      );
      expect(composite).toHaveLength(2);
      expect(composite.map((h) => h.code)).toEqual(['flare-star', 'variable-flux']);
    });

    it('decodePlanetHazards returns empty array for 0 or undefined mask', () => {
      expect(decodePlanetHazards(undefined)).toEqual([]);
      expect(decodePlanetHazards(0)).toEqual([]);
    });

    it('decodePlanetHazards correctly decodes all planet hazard bits', () => {
      const heat = decodePlanetHazards(PLANET_HAZARD_BITS.EXTREME_HEAT);
      expect(heat).toHaveLength(1);
      expect(heat[0]).toMatchObject({
        code: 'extreme-heat',
        severity: 'critical',
      });

      const cold = decodePlanetHazards(PLANET_HAZARD_BITS.CRYOGENIC_COLD);
      expect(cold).toHaveLength(1);
      expect(cold[0]).toMatchObject({
        code: 'cryogenic-cold',
        severity: 'warning',
      });

      const highG = decodePlanetHazards(PLANET_HAZARD_BITS.HIGH_GRAVITY);
      expect(highG).toHaveLength(1);
      expect(highG[0]).toMatchObject({
        code: 'high-gravity',
        severity: 'warning',
      });

      const tidal = decodePlanetHazards(PLANET_HAZARD_BITS.TIDAL_LOCKING);
      expect(tidal).toHaveLength(1);
      expect(tidal[0]).toMatchObject({
        code: 'tidal-locking',
        severity: 'warning',
      });

      const ecc = decodePlanetHazards(PLANET_HAZARD_BITS.HIGH_ECCENTRICITY);
      expect(ecc).toHaveLength(1);
      expect(ecc[0]).toMatchObject({
        code: 'high-eccentricity',
        severity: 'warning',
      });
    });

    it('decodeExoplanet without H or g derives surfaceGravityG and high-gravity hazard (Tau Ceti e)', () => {
      const decoded = decodeExoplanet({
        i: 'tau-ceti-e',
        n: 'Tau Ceti e',
        l: 'e',
        e: 3.93,
        r: 1.59,
        T: 282,
        o: [0.538, 0.06, 0, 0, 0, 0, 162.87],
      });

      expect(decoded.surfaceGravityG).toBeDefined();
      expect(decoded.surfaceGravityG).toBeGreaterThan(1.2);
      expect(decoded.hazardMask).toBeDefined();
      expect((decoded.hazardMask ?? 0) & PLANET_HAZARD_BITS.HIGH_GRAVITY).toBe(
        PLANET_HAZARD_BITS.HIGH_GRAVITY,
      );
    });
  });

  describe('formatDiskKindLabel', () => {
    it('formats canonical disk kind labels', () => {
      expect(formatDiskKindLabel('asteroid-belt')).toBe('Asteroid Belt');
      expect(formatDiskKindLabel('kuiper-belt')).toBe('Kuiper Belt');
      expect(formatDiskKindLabel('debris-disk')).toBe('Debris Disk');
      expect(formatDiskKindLabel('protoplanetary-disk' as unknown as CircumstellarDiskKind)).toBe('Circumstellar Disk');
    });
  });
});
