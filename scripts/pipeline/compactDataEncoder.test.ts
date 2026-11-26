import { describe, it, expect } from 'vitest';
import {
  buildHybridSummariesAndDetails,
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
  SatelliteRecord,
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
    expect(sat.o).toEqual([1.0, 0.0167, 0.0, 0.0, 102.9, 100.4, 365.25]);

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

  it('omits compact.g and compact.s when surfaceGravityG or esi is non-finite', () => {
    const planetWithNaN = encodeExoplanet({
      id: 'test-planet-nan',
      name: 'Test Planet NaN',
      letter: 'b',
      surfaceGravityG: Number.NaN,
      esi: Number.NaN,
    });
    expect(planetWithNaN.g).toBeUndefined();
    expect(planetWithNaN.s).toBeUndefined();
    const serializedNaN = JSON.stringify(planetWithNaN);
    expect(serializedNaN).not.toContain('"g":');
    expect(serializedNaN).not.toContain('"s":');

    const planetWithInf = encodeExoplanet({
      id: 'test-planet-inf',
      name: 'Test Planet Inf',
      letter: 'c',
      surfaceGravityG: Number.POSITIVE_INFINITY,
      esi: Number.POSITIVE_INFINITY,
    });
    expect(planetWithInf.g).toBeUndefined();
    expect(planetWithInf.s).toBeUndefined();
    const serializedInf = JSON.stringify(planetWithInf);
    expect(serializedInf).not.toContain('"g":');
    expect(serializedInf).not.toContain('"s":');

    const planetWithFinite = encodeExoplanet({
      id: 'test-planet-finite',
      name: 'Test Planet Finite',
      letter: 'd',
      surfaceGravityG: 1.15,
      esi: 0.85,
    });
    expect(planetWithFinite.g).toBe(1.15);
    expect(planetWithFinite.s).toBe(0.85);
    const serializedFinite = JSON.stringify(planetWithFinite);
    expect(serializedFinite).toContain('"g":1.15');
    expect(serializedFinite).toContain('"s":0.85');
  });

  it('throws descriptive error if satellite is missing required orbit elements', () => {
    expect(() =>
      encodeSatellite({
        id: 'europa',
        name: 'Europa',
        parentId: 'jupiter',
      } as unknown as SatelliteRecord),
    ).toThrowError('Satellite "europa" is missing required Keplerian orbit elements.');
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

  it('builds hybrid spatial + domain shards and compact routing table', () => {
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

    const primarySolarBodies: SolarSystemBodyRecord[] = [
      {
        id: 'sol',
        name: 'Sol (Sun)',
        classification: 'Star',
        meanRadiusKm: 696340,
      },
      {
        id: 'earth',
        name: 'Earth',
        classification: 'Planet',
        parentBodyId: 'sol',
        meanRadiusKm: 6371,
      },
    ];

    const minorSolarBodies: SolarSystemBodyRecord[] = [
      {
        id: 'pha-00433',
        name: '(433) Eros',
        classification: 'AsteroidNEO',
        parentBodyId: 'sol',
        meanRadiusKm: 8.42,
      },
      {
        id: 'custom-minor',
        name: 'Custom Minor',
        classification: 'AsteroidMainBelt',
        parentBodyId: 'sol',
        meanRadiusKm: 5.0,
      },
    ];

    const result = buildHybridSummariesAndDetails({
      systems,
      manifests,
      structures,
      primarySolarBodies,
      minorSolarBodies,
    });

    expect(result.summariesBySector.size).toBe(1);
    const originSummaryEnv = result.summariesBySector.get('sector_+000_+000_+000');
    expect(originSummaryEnv?.c).toBe(1);
    expect(originSummaryEnv?.d['sol']?.i).toBeUndefined();
    expect(originSummaryEnv?.d['sol']?.q).toBeUndefined();

    expect(result.detailSectorsBySector.size).toBe(1);
    const originDetailEnv = result.detailSectorsBySector.get('sector_+000_+000_+000');
    const solDetail = originDetailEnv?.d['sol'];
    expect(solDetail?.t).toBe('sys');
    if (solDetail?.t === 'sys') {
      expect(solDetail.q).toBeUndefined();
    }

    // Sol primary star body is keyed as sol-A and does NOT collide with system manifest 'sol'
    expect(result.solPrimary.c).toBe(2);
    expect(result.solPrimary.d['sol-A']?.t).toBe('sol');
    expect(result.solPrimary.d['earth']?.t).toBe('sol');

    expect(result.structures.c).toBe(1);
    expect(result.structures.d['pleiades']?.t).toBe('str');

    expect(result.routing.k).toEqual(['sector_+000_+000_+000']);
    expect(result.routing.s).toEqual({ sol: 0 });
    expect(result.routing.d['sol']).toBe(0);
    expect(result.routing.d['sol-A']).toBe(-1);
    expect(result.routing.d['earth']).toBe(-1);
    expect(result.routing.d['pleiades']).toBe(-2);
    // pha- prefix is inferred O(1) so omitted from routing.d; non-prefixed minor body gets -3
    expect(result.routing.d['pha-00433']).toBeUndefined();
    expect(result.routing.d['custom-minor']).toBe(-3);
  });

  it('encodes axialTiltDeg -> at and planeInclinationDeg -> pi and omits undefined values', () => {
    const uranusCompact = encodeSolarSystemBody({
      id: 'uranus',
      name: 'Uranus',
      classification: 'Planet',
      parentBodyId: 'sol',
      meanRadiusKm: 25362,
      axialTiltDeg: 97.77,
    });
    expect(uranusCompact.at).toBe(97.77);

    const noTiltCompact = encodeSolarSystemBody({
      id: 'ceres',
      name: '1 Ceres',
      classification: 'DwarfPlanet',
      parentBodyId: 'sol',
      meanRadiusKm: 469.73,
    });
    expect(noTiltCompact.at).toBeUndefined();

    const exoplanetWithTilt = encodeExoplanet({
      id: 'uranus',
      name: 'Uranus',
      letter: '',
      axialTiltDeg: 97.77,
    });
    expect(exoplanetWithTilt.at).toBe(97.77);

    const solSummary = encodeSummaryNode({
      id: 'sol',
      name: 'Sol',
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
      planeInclinationDeg: 60.19,
    });
    expect(solSummary.pi).toBe(60.19);

    const unmeasuredSummary = encodeSummaryNode({
      id: 'tau-ceti',
      name: 'Tau Ceti',
      x: 3.15,
      y: 1.54,
      z: -1.0,
      dist: 3.65,
      mag: 3.5,
      absmag: 5.69,
      spect: 'G8V',
      starCount: 1,
      planetCount: 4,
      hasHabitableCandidate: true,
      sectorId: 'sector_+000_+000_-025',
    });
    expect(unmeasuredSummary.pi).toBeUndefined();

    const solManifest = encodeSystemManifest({
      id: 'sol',
      name: 'Sol',
      x: 0,
      y: 0,
      z: 0,
      dist: 0,
      sectorId: 'sector_+000_+000_+000',
      stars: [],
      planets: [],
      planeInclinationDeg: 60.19,
    });
    expect(solManifest.pi).toBe(60.19);
  });

  it('encodes planetary ring systems to rg tuples and omits when absent', () => {
    const saturnCompact = encodeSolarSystemBody({
      id: 'saturn',
      name: 'Saturn',
      classification: 'Planet',
      parentBodyId: 'sol',
      meanRadiusKm: 58232,
      rings: [
        { id: 'saturn-main-rings', name: 'Main Rings (D–F)', innerRadiusAu: 0.000447, outerRadiusAu: 0.000937 },
        { id: 'saturn-e-ring', name: 'E Ring', innerRadiusAu: 0.001203, outerRadiusAu: 0.003209 },
      ],
    });
    expect(saturnCompact.rg).toEqual([
      ['saturn-main-rings', 'Main Rings (D–F)', 0.000447, 0.000937],
      ['saturn-e-ring', 'E Ring', 0.001203, 0.003209],
    ]);

    const marsCompact = encodeSolarSystemBody({
      id: 'mars',
      name: 'Mars',
      classification: 'Planet',
      parentBodyId: 'sol',
      meanRadiusKm: 3389.5,
      rings: [],
    });
    expect(marsCompact.rg).toBeUndefined();

    const exoWithRings = encodeExoplanet({
      id: 'j1407-b',
      name: 'J1407 b',
      letter: 'b',
      rings: [{ id: 'j1407b-rings', name: 'Super-Ring System', innerRadiusAu: 0.002, outerRadiusAu: 0.6 }],
    });
    expect(exoWithRings.rg).toEqual([['j1407b-rings', 'Super-Ring System', 0.002, 0.6]]);
  });
});
