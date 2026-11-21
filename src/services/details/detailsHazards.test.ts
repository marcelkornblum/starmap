import { describe, expect, it } from 'vitest';
import {
  decodeSystemHazards,
  decodePlanetHazards,
  formatDiskKindLabel,
  isDwarfPlanetInDisk,
  toCoordinatesTuple,
  resolveMinorBodyCategoryLabel,
} from './detailsHazards';
import {
  PLANET_HAZARD_BITS,
  SYSTEM_HAZARD_BITS,
} from '../../utils/astroHazards';
import type { CircumstellarDiskKind } from '../../types/astro';

describe('detailsHazards', () => {
  describe('decodeSystemHazards', () => {
    it('returns empty array for 0 or undefined mask', () => {
      expect(decodeSystemHazards(undefined)).toEqual([]);
      expect(decodeSystemHazards(0)).toEqual([]);
    });

    it('correctly decodes individual system hazard bits', () => {
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

    it('decodes composite masks', () => {
      const composite = decodeSystemHazards(
        SYSTEM_HAZARD_BITS.FLARE_STAR | SYSTEM_HAZARD_BITS.VARIABLE_FLUX,
      );
      expect(composite).toHaveLength(2);
      expect(composite.map((h) => h.code)).toEqual(['flare-star', 'variable-flux']);
    });
  });

  describe('decodePlanetHazards', () => {
    it('returns empty array for 0 or undefined mask', () => {
      expect(decodePlanetHazards(undefined)).toEqual([]);
      expect(decodePlanetHazards(0)).toEqual([]);
    });

    it('correctly decodes all planet hazard bits', () => {
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
  });

  describe('formatDiskKindLabel', () => {
    it('formats canonical disk kind labels', () => {
      expect(formatDiskKindLabel('asteroid-belt')).toBe('Asteroid Belt');
      expect(formatDiskKindLabel('kuiper-belt')).toBe('Kuiper Belt');
      expect(formatDiskKindLabel('debris-disk')).toBe('Debris Disk');
      expect(formatDiskKindLabel('protoplanetary-disk' as unknown as CircumstellarDiskKind)).toBe('Circumstellar Disk');
    });
  });

  describe('isDwarfPlanetInDisk', () => {
    it('detects dwarf planets inside disk bounds', () => {
      const disk = {
        id: 'belt',
        name: 'Asteroid Belt',
        kind: 'asteroid-belt' as const,
        innerRadiusAu: 2.1,
        outerRadiusAu: 3.3,
        semiMajorAxisAu: 2.7,
        composition: 'rock',
      };
      expect(isDwarfPlanetInDisk({ i: 'ceres', n: 'Ceres', p: [0, 0, 0], e: 'belt' }, disk)).toBe(true);
      expect(isDwarfPlanetInDisk(undefined, disk, 2.5)).toBe(true);
      expect(isDwarfPlanetInDisk(undefined, disk, 5.2)).toBe(false);
    });
  });

  describe('toCoordinatesTuple', () => {
    it('normalises array and object coordinates', () => {
      expect(toCoordinatesTuple([1, 2, 3])).toEqual([1, 2, 3]);
      expect(toCoordinatesTuple({ x: 4, y: 5, z: 6 } as import('three').Vector3)).toEqual([4, 5, 6]);
      expect(toCoordinatesTuple(undefined)).toEqual([0, 0, 0]);
    });
  });

  describe('resolveMinorBodyCategoryLabel', () => {
    it('resolves labels by category key', () => {
      expect(resolveMinorBodyCategoryLabel({ i: 'm', n: 'M', p: [0, 0, 0], k: 3 })).toBe('Moon');
      expect(resolveMinorBodyCategoryLabel({ i: 'c', n: 'C', p: [0, 0, 0], k: 4 })).toBe('Dwarf Planet');
      expect(resolveMinorBodyCategoryLabel({ i: 'a', n: 'A', p: [0, 0, 0], k: 6 })).toBe('Asteroid / Minor Body');
    });
  });
});
