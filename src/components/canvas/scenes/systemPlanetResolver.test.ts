import { describe, it, expect } from 'vitest';
import type { CompactSearchEntry } from '../../../utils/compactDataTypes';
import {
  resolveCorpusPlanetEntity,
  resolveSystemPlanetEntity,
  resolveSystemSceneEntities,
} from './systemPlanetResolver';

describe('systemPlanetResolver', () => {
  it('derives semi-major axis from periodDays and primaryStarMassMsun when orbit semiMajorAxis is omitted', () => {
    const entity = resolveSystemPlanetEntity(
      {
        id: 'kepler-b',
        name: 'Kepler b',
        letter: 'b',
        composition: 'super-earth',
        orbit: {
          semiMajorAxis: undefined as unknown as number,
          eccentricity: 0.05,
          inclination: 1.2,
          ascendingNode: 10,
          argumentOfPeriapsis: 20,
          meanAnomaly: 30,
          periodDays: 365.25,
        },
      },
      0,
      1.0,
    );

    expect(entity.classification).toBe('super-earth');
    expect(entity.orbit?.semiMajorAxis).toBeCloseTo(1.0, 4);
    expect(entity.orbit?.lineStyle).toBe('dotted');
  });

  it('maps catalogued corpus planet entries with dashed orbit style when semiMajorAxis is present', () => {
    const entry: CompactSearchEntry = {
      i: 'jupiter',
      k: 2,
      n: 'Jupiter',
      s: 'sol',
      u: 'gas-giant',
      A: 5.2,
    };

    const entity = resolveCorpusPlanetEntity(entry, 4);
    expect(entity.classification).toBe('gas-giant');
    expect(entity.orbit?.semiMajorAxis).toBe(5.2);
    expect(entity.orbit?.lineStyle).toBe('dashed');
    expect(entity.orbit?.period).toBe(Math.round(Math.pow(5.2, 1.5) * 365.25));
  });

  it('returns empty array when both resolvedId and targetId are absent', () => {
    expect(
      resolveSystemSceneEntities({
        activeCorpus: [],
        focusedId: null,
        selectedIds: new Set(),
      }),
    ).toEqual([]);
  });

  it('resolves manifest planets, dwarf planets, and targeted minor bodies without duplicating existing IDs', () => {
    const activeCorpus: CompactSearchEntry[] = [
      { i: 'sol', k: 1, n: 'Sol', s: 'sol', m: [-26.7, 'G2V', 8] },
      { i: 'earth', k: 2, n: 'Earth', s: 'sol', u: 'terrestrial', A: 1.0 },
      { i: 'pluto', k: 4, n: 'Pluto', s: 'sol', u: 'terrestrial', A: 39.48 },
      { i: 'ceres', k: 6, n: 'Ceres', s: 'sol', u: 'terrestrial', A: 2.77 },
      { i: 'vesta', k: 6, n: 'Vesta', s: 'sol', u: 'terrestrial', A: 2.36 },
      { i: 'other-star-planet', k: 2, n: 'Other', s: 'sol', o: 'other-star', A: 2.0 },
    ];

    const entities = resolveSystemSceneEntities({
      targetId: 'sol',
      resolvedId: 'sol',
      sysManifest: {
        id: 'sol',
        name: 'Sol',
        x: 0,
        y: 0,
        z: 0,
        dist: 0,
        sectorId: 'sector_0_0_0',
        stars: [
          {
            id: 'sol-a',
            name: 'Sol',
            componentDesignation: 'A',
            spectralType: 'G2V',
            mag: -26.7,
            absmag: 4.83,
            massMsun: 1.0,
            reticleType: 'star',
          },
        ],
        planets: [
          {
            id: 'earth',
            name: 'Earth',
            letter: 'c',
            composition: 'terrestrial',
            orbit: {
              semiMajorAxis: 1.0,
              eccentricity: 0.017,
              inclination: 0,
              ascendingNode: 0,
              argumentOfPeriapsis: 0,
              meanAnomaly: 0,
              periodDays: 365.25,
            },
          },
        ],
      },
      activeCorpus,
      centerId: 'ceres',
      focusedId: null,
      selectedIds: new Set(),
    });

    const ids = entities.map((e) => e.id);
    expect(ids).toEqual(['sol', 'earth', 'pluto', 'ceres']);
    expect(ids).not.toContain('vesta');
    expect(ids).not.toContain('other-star-planet');
  });
});
