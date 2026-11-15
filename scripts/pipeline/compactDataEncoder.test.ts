import { describe, it, expect } from 'vitest';
import {
  buildShardedSummariesAndDetails,
  encodePlanetCensusMask,
  encodeSectorPartition,
  encodeSummaryNode,
  encodeSystemManifest,
  encodeTagsMask,
} from './compactDataEncoder';
import {
  encodeCircumstellarDisk,
  encodeExoplanet,
  encodeGalacticStructure,
  encodeOrbitTuple,
  encodeSatellite,
  encodeSolarSystemBody,
} from './compactEntityEncoder';
import type {
  KeplerianOrbit,
  SystemManifest,
  SystemSummaryNode,
} from '../../src/types/astro';
import type {
  GalacticStructureRecord,
  SolarSystemBodyRecord,
} from '../../src/types/astroStructures';

describe('compactDataEncoder & compactEntityEncoder', () => {
  const dummyOrbit: KeplerianOrbit = {
    semiMajorAxis: 1.0,
    eccentricity: 0.0167,
    inclination: 0.0,
    ascendingNode: 0.0,
    argumentOfPeriapsis: 102.9,
    meanAnomaly: 100.4,
    periodDays: 365.25,
  };

  it('encodes orbit tuples and masks correctly', () => {
    expect(encodeOrbitTuple(undefined)).toBeUndefined();
    expect(encodeOrbitTuple(dummyOrbit)).toEqual([1.0, 0.0167, 0.0, 0.0, 102.9, 100.4, 365.25]);

    expect(encodePlanetCensusMask(undefined)).toBeUndefined();
    expect(encodePlanetCensusMask([])).toBeUndefined();
    expect(encodePlanetCensusMask(['terrestrial', 'gas-giant'])).toBe(1 | 4);

    expect(encodeTagsMask(undefined)).toBeUndefined();
    expect(encodeTagsMask([])).toBeUndefined();
    expect(encodeTagsMask(['HomeSystem', 'NakedEye'])).toBe(1 | 4);
  });

  it('encodes satellite, circumstellar disk, and exoplanet records', () => {
    const sat = encodeSatellite({
      id: 'moon',
      name: 'Moon',
      parentId: 'earth',
      radiusKm: 1737.4,
      orbit: dummyOrbit,
    });
    expect(sat.i).toBe('moon');
    expect(sat.r).toBe(1737.4);

    const disk = encodeCircumstellarDisk({
      id: 'kuiper-belt',
      name: 'Kuiper Belt',
      kind: 'kuiper-belt',
      innerRadiusAu: 30,
      outerRadiusAu: 50,
      semiMajorAxisAu: 40,
      composition: 'Icy debris',
    });
    expect(disk.k).toBe(2);
    expect(disk.a).toEqual([30, 50, 40]);

    const planet = encodeExoplanet({
      id: 'tau-ceti-e',
      name: 'Tau Ceti e',
      letter: 'e',
      orbit: dummyOrbit,
      isHabitableCandidate: true,
      confidence: 'candidate',
    });
    expect(planet.i).toBe('tau-ceti-e');
    expect(planet.h).toBe(1);
    expect(planet.C).toBe(2);
  });

  it('encodes summary nodes, system manifests, sectors, structures, and solar bodies', () => {
    const summary = encodeSummaryNode({
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
    });
    expect(summary.i).toBe('sol');
    expect(summary.P).toBe('Sun');

    const manifest = encodeSystemManifest({
      id: 'sol',
      name: 'Sol',
      x: 0,
      y: 0,
      z: 0,
      dist: 0,
      sectorId: 'sector_+000_+000_+000',
      stars: [],
      planets: [],
    });
    expect(manifest.n).toBe('Sol');

    const sector = encodeSectorPartition({
      sectorId: 'sector_+000_+000_+000',
      bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 25, y: 25, z: 25 } },
      count: 0,
      systems: [],
    });
    expect(sector.i).toBe('sector_+000_+000_+000');

    const struct = encodeGalacticStructure({
      id: 'crab',
      name: 'Crab',
      type: 'SupernovaRemnant',
      x: 0,
      y: 0,
      z: 0,
      dist: 0,
      designations: ['M1'],
      description: 'Supernova',
    });
    expect(struct.n).toBe('Crab');

    const body = encodeSolarSystemBody({
      id: 'mars',
      name: 'Mars',
      classification: 'Planet',
      parentBodyId: 'sol',
      meanRadiusKm: 3389.5,
    });
    expect(body.n).toBe('Mars');
  });

  it('builds sharded summaries and details across 36 buckets', () => {
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
    ];

    const manifests: SystemManifest[] = [
      {
        id: 'sol',
        name: 'Sol',
        properName: 'Sun',
        x: 0,
        y: 0,
        z: 0,
        dist: 0,
        sectorId: 'sector_+000_+000_+000',
        stars: [],
        planets: [],
      },
    ];

    const structures: GalacticStructureRecord[] = [
      {
        id: 'pleiades',
        name: 'Pleiades',
        type: 'OpenCluster',
        x: -40,
        y: 120,
        z: -50,
        dist: 136,
        designations: ['M45'],
        description: 'Open Cluster in Taurus',
      },
    ];

    const solarBodies: SolarSystemBodyRecord[] = [
      {
        id: 'earth',
        name: 'Earth',
        classification: 'Planet',
        parentBodyId: 'sol',
        meanRadiusKm: 6371,
        targetStarId: 'sol',
      },
    ];

    const { summariesByBucket, detailsByBucket } = buildShardedSummariesAndDetails({
      systems,
      manifests,
      structures,
      solarBodies,
    });

    expect(summariesByBucket.size).toBe(36);
    expect(detailsByBucket.size).toBe(36);

    let totalSummaries = 0;
    for (const [, env] of summariesByBucket) totalSummaries += env.c;
    expect(totalSummaries).toBe(1);

    let totalDetails = 0;
    for (const [, env] of detailsByBucket) totalDetails += env.c;
    expect(totalDetails).toBe(3); // sol manifest + pleiades + earth
  });
});
