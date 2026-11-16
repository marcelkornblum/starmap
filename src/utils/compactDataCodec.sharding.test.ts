import { describe, it, expect } from 'vitest';
import { getShardKey } from './compactDataCodec';
import { buildShardedSummariesAndDetails } from '../../scripts/pipeline/compactDataEncoder';
import { buildSearchIndices } from '../../scripts/pipeline/searchIndexBuilder';
import type {
  SystemSummaryNode,
  SystemManifest,
} from '../types/astro';
import type {
  GalacticStructureRecord,
  SolarSystemBodyRecord,
} from '../types/astroStructures';

describe('compactDataCodec - Sharding & Search Indices', () => {
  it('builds 36-bucket summaries and details dictionaries and dual-tier + category-sharded search indices', () => {
    const systems: SystemSummaryNode[] = [
      {
        id: 'sol',
        name: 'Sol',
        properName: 'Sun',
        x: 0,
        y: 0,
        z: 0,
        dist: 0,
        mag: -26.74,
        absmag: 4.83,
        spect: 'G2V',
        starCount: 1,
        planetCount: 8,
        hasHabitableCandidate: true,
        sectorId: 'sector_+000_+000_+000',
      },
      {
        id: 'gaia-2452378776434477184',
        name: 'Tau Ceti',
        x: 3.156,
        y: 1.54,
        z: -1.003,
        dist: 3.652,
        mag: 3.5,
        absmag: 5.69,
        spect: 'G8V',
        starCount: 1,
        planetCount: 7,
        hasHabitableCandidate: true,
        sectorId: 'sector_+000_+000_-025',
      },
    ];

    const manifests: SystemManifest[] = [
      {
        id: 'gaia-2452378776434477184',
        name: 'Tau Ceti',
        x: 3.156,
        y: 1.54,
        z: -1.003,
        dist: 3.652,
        sectorId: 'sector_+000_+000_-025',
        stars: [
          {
            id: '2452378776434477184-A',
            name: 'Tau Ceti',
            componentDesignation: 'A',
            spectralType: 'G8V',
            mag: 3.5,
            absmag: 5.69,
          },
        ],
        planets: [
          {
            id: 'tau-ceti-e',
            name: 'Tau Ceti e',
            letter: 'e',
            massMearth: 3.94,
            equilibriumTempK: 286.2,
          },
        ],
      },
    ];

    const structures: GalacticStructureRecord[] = [
      {
        id: 'cluster-hyades',
        name: 'Hyades',
        type: 'OpenCluster',
        x: 17.5,
        y: 41.2,
        z: 13.8,
        dist: 46.8,
        designations: ['Melotte 25'],
        description: 'Open cluster.',
      },
    ];

    const solarBodies: SolarSystemBodyRecord[] = [
      {
        id: 'earth',
        name: 'Earth',
        classification: 'Planet',
        parentBodyId: 'sol',
        meanRadiusKm: 6371,
      },
      {
        id: 'pha-00433',
        name: '(433) Eros',
        classification: 'AsteroidNEO',
        parentBodyId: 'sol',
        meanRadiusKm: 8.42,
      },
    ];

    const { summariesByBucket, detailsByBucket } = buildShardedSummariesAndDetails({
      systems,
      manifests,
      structures,
      solarBodies,
    });

    const tauBucket = getShardKey('gaia-2452378776434477184');
    expect(summariesByBucket.get(tauBucket)?.d['gaia-2452378776434477184']?.n).toBe('Tau Ceti');
    expect(detailsByBucket.get(tauBucket)?.d['gaia-2452378776434477184']).toBeDefined();

    const erosBucket = getShardKey('pha-00433');
    expect(detailsByBucket.get(erosBucket)?.d['pha-00433']).toBeDefined();

    const layerEntries = [
      {
        i: 'phm-erid',
        n: '40 Eridani',
        k: 7 as const,
        t: 'layer-entry',
        w: 'project-hail-mary',
        c: 'Project Hail Mary',
      },
    ];

    const indices = buildSearchIndices({
      systems,
      manifests,
      structures,
      solarBodies,
      starAliasesById: new Map([
        ['gaia-2452378776434477184', ['Tau Ceti', 'Tau Cet', 'HD 10700', 'HIP 8102', 'Gl 71', 'GJ 71']],
      ]),
      layerEntries,
    });

    expect(indices.core.d.some((e) => e.i === 'gaia-2452378776434477184')).toBe(true);
    expect(indices.core.d.some((e) => e.i === 'tau-ceti-e')).toBe(true);
    expect(indices.core.d.some((e) => e.i === 'earth' && e.h === 1)).toBe(true);
    expect(indices.core.d.some((e) => e.i === 'phm-erid')).toBe(true);
    expect(indices.full.d.some((e) => e.i === 'phm-erid')).toBe(true);
    expect(indices.layers.d.some((e) => e.i === 'phm-erid')).toBe(true);
    expect(indices.core.d.some((e) => e.i === 'pha-00433')).toBe(false);
    expect(indices.full.d.some((e) => e.i === 'pha-00433')).toBe(true);
    expect(indices.minorBodies.d.some((e) => e.i === 'pha-00433')).toBe(true);
    expect(indices.stars.d.some((e) => e.i === 'gaia-2452378776434477184')).toBe(true);
    expect(indices.planets.d.some((e) => e.i === 'tau-ceti-e')).toBe(true);
    expect(indices.structures.d.some((e) => e.i === 'cluster-hyades')).toBe(true);

    const tauEntry = indices.stars.d.find((e) => e.i === 'gaia-2452378776434477184');
    expect(tauEntry?.a).toContain('tauceti');
    expect(tauEntry?.a).not.toContain('taucet ');
    expect(tauEntry?.a).toContain('hd10700');
    expect(tauEntry?.m).toEqual([3.5, 'G8V', 7, 1]);
  });

  it('precalculates orbital rank r and region overlap e and z on exoplanets and solar bodies (DEC-014)', () => {
    const dummyOrbit = (semiMajorAxis: number) => ({
      semiMajorAxis,
      eccentricity: 0.01,
      inclination: 0,
      ascendingNode: 0,
      argumentOfPeriapsis: 0,
      meanAnomaly: 0,
      periodDays: 365,
    });

    const manifests: SystemManifest[] = [
      {
        id: 'gaia-2452378776434477184',
        name: 'Tau Ceti',
        x: 3.156,
        y: 1.54,
        z: -1.003,
        dist: 3.652,
        sectorId: 'sector_+000_+000_-025',
        stars: [
          {
            id: '2452378776434477184-A',
            name: 'Tau Ceti',
            componentDesignation: 'A',
            spectralType: 'G8V',
            mag: 3.5,
            absmag: 5.69,
          },
        ],
        planets: [
          {
            id: 'tau-ceti-f',
            name: 'Tau Ceti f',
            letter: 'f',
            orbit: dummyOrbit(1.334),
          },
          {
            id: 'tau-ceti-e',
            name: 'Tau Ceti e',
            letter: 'e',
            orbit: dummyOrbit(0.538),
          },
        ],
      },
    ];

    const solarBodies: SolarSystemBodyRecord[] = [
      {
        id: 'earth',
        name: 'Earth',
        classification: 'Planet',
        parentBodyId: 'sol',
        meanRadiusKm: 6371,
        orbit: dummyOrbit(1.0),
      },
      {
        id: 'moon',
        name: 'Moon',
        classification: 'Moon',
        parentBodyId: 'earth',
        meanRadiusKm: 1737,
        orbit: dummyOrbit(0.00257),
      },
      {
        id: 'ceres',
        name: 'Ceres',
        classification: 'DwarfPlanet',
        parentBodyId: 'sol',
        meanRadiusKm: 473,
        orbit: dummyOrbit(2.77),
      },
      {
        id: 'pluto',
        name: 'Pluto',
        classification: 'DwarfPlanet',
        parentBodyId: 'sol',
        meanRadiusKm: 1188,
        orbit: dummyOrbit(39.48),
      },
      {
        id: 'vesta',
        name: 'Vesta',
        classification: 'AsteroidMainBelt',
        parentBodyId: 'sol',
        meanRadiusKm: 262,
        orbit: dummyOrbit(2.36),
      },
    ];

    const indices = buildSearchIndices({
      systems: [],
      manifests,
      structures: [],
      solarBodies,
    });

    const tauE = indices.planets.d.find((e) => e.i === 'tau-ceti-e');
    const tauF = indices.planets.d.find((e) => e.i === 'tau-ceti-f');
    expect(tauE?.r).toBe(1);
    expect(tauF?.r).toBe(2);

    const earth = indices.planets.d.find((e) => e.i === 'earth');
    const vesta = indices.minorBodies.d.find((e) => e.i === 'vesta');
    const ceres = indices.planets.d.find((e) => e.i === 'ceres');
    const pluto = indices.planets.d.find((e) => e.i === 'pluto');
    const moon = indices.planets.d.find((e) => e.i === 'moon');

    expect(earth?.r).toBe(1);
    expect(earth?.z).toBe(1);
    expect(earth?.e).toBeUndefined();

    expect(vesta?.r).toBe(2);
    expect(vesta?.e).toBe('belt');

    expect(ceres?.r).toBe(3);
    expect(ceres?.e).toBe('belt');

    expect(pluto?.r).toBe(4);
    expect(pluto?.e).toBe('kuiper');

    expect(moon?.r).toBe(1);
    expect(moon?.o).toBe('earth');
    expect(moon?.e).toBeUndefined();
  });
});
