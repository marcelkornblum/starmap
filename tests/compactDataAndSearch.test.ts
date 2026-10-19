import { describe, it, expect } from 'vitest';
import {
  getShardKey,
  encodeSummaryNode,
  decodeSummaryNode,
  encodeSystemManifest,
  decodeSystemManifest,
  encodeGalacticStructure,
  decodeGalacticStructure,
  encodeSolarSystemBody,
  decodeSolarSystemBody,
  encodeSectorPartition,
  decodeSectorPartition,
  buildShardedSummariesAndDetails,
  buildSearchIndices,
} from '../src/utils/compactDataCodec';
import type {
  SystemSummaryNode,
  SystemManifest,
  GalacticStructureRecord,
  SolarSystemBodyRecord,
  SectorPartitionManifest,
} from '../src/types/astro';

describe('Step 2: 36-Bucket Shard Key & Compact 1-Letter Codecs (DEC-004 & DEC-006)', () => {
  it('distributes prefix-heavy astronomical IDs across all 36 buckets (0-9, a-z)', () => {
    const buckets = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const key = getShardKey(`gaia-${5000000000000000000n + BigInt(i * 9973)}`);
      expect(key).toMatch(/^[0-9a-z]$/);
      buckets.add(key);
    }
    // Should spread across nearly all 36 buckets even though every ID starts with "gaia-"
    expect(buckets.size).toBeGreaterThanOrEqual(30);
  });

  it('encodes and decodes SystemSummaryNode with 1-letter keys, tuples, and default omission', () => {
    const unnamedFieldStar: SystemSummaryNode = {
      id: 'gaia-2745860763717896448',
      name: 'Gaia DR3 2745860763717896448',
      x: 23.201,
      y: 0.127,
      z: 2.846,
      dist: 23.375,
      mag: 15.42,
      absmag: 13.58,
      spect: 'M',
      ci: 2.84,
      starCount: 1,
      planetCount: 0,
      hasHabitableCandidate: false,
      sectorId: 'sector_+000_+000_+000',
      velocity: { vx: -12.3, vy: 4.5, vz: -8.1, speed: 15.4 },
    };

    const compact = encodeSummaryNode(unnamedFieldStar, { omitId: true, omitSectorId: true });
    // Default values (starCount=1, planetCount=0, hasHabitable=false) and redundant Gaia DR3 name are omitted
    expect(compact.i).toBeUndefined();
    expect(compact.n).toBeUndefined();
    expect(compact.u).toBeUndefined();
    expect(compact.k).toBeUndefined();
    expect(compact.h).toBeUndefined();
    expect(compact.q).toBeUndefined();
    expect(compact.p).toEqual([23.201, 0.127, 2.846]);
    expect(compact.v).toEqual([-12.3, 4.5, -8.1]);

    const decoded = decodeSummaryNode(compact, 'gaia-2745860763717896448', 'sector_+000_+000_+000');
    expect(decoded.id).toBe('gaia-2745860763717896448');
    expect(decoded.name).toBe('Gaia DR3 2745860763717896448');
    expect(decoded.x).toBe(23.201);
    expect(decoded.dist).toBeCloseTo(23.375, 2);
    expect(decoded.starCount).toBe(1);
    expect(decoded.planetCount).toBe(0);
    expect(decoded.hasHabitableCandidate).toBe(false);
    expect(decoded.velocity?.vx).toBe(-12.3);
    expect(decoded.velocity?.speed).toBeCloseTo(15.4, 1);
  });

  it('encodes SectorPartitionManifest using keyed dictionary d: Record<id, CompactSummaryNode> and decodes both compact and legacy formats', () => {
    const manifest: SectorPartitionManifest = {
      sectorId: 'sector_+000_+000_-025',
      bounds: {
        min: { x: 0, y: 0, z: -25 },
        max: { x: 25, y: 25, z: 0 },
      },
      count: 1,
      systems: [
        {
          id: 'gaia-2452378776434477184',
          name: 'Tau Ceti',
          properName: 'Tau Ceti',
          x: 3.156,
          y: 1.54,
          z: -1.003,
          dist: 3.652,
          mag: 3.5,
          absmag: 5.69,
          spect: 'G8V',
          ci: 0.72,
          starCount: 1,
          planetCount: 7,
          planetCensus: ['terrestrial'],
          hasHabitableCandidate: true,
          sectorId: 'sector_+000_+000_-025',
          tags: ['SolarNeighborhood10pc', 'NakedEye', 'ExoplanetHost', 'HabitableCandidate'],
        },
      ],
    };

    const compactSector = encodeSectorPartition(manifest);
    expect(compactSector.i).toBe('sector_+000_+000_-025');
    expect(compactSector.b).toEqual([0, 0, -25, 25, 25, 0]);
    expect(compactSector.d['gaia-2452378776434477184']).toBeDefined();
    expect(compactSector.d['gaia-2452378776434477184'].n).toBe('Tau Ceti');
    // O(1) dictionary lookup omits redundant 'i' inside value
    expect(compactSector.d['gaia-2452378776434477184'].i).toBeUndefined();

    // Decode compact format
    const roundTripped = decodeSectorPartition(compactSector);
    expect(roundTripped.sectorId).toBe('sector_+000_+000_-025');
    expect(roundTripped.systems).toHaveLength(1);
    expect(roundTripped.systems[0].id).toBe('gaia-2452378776434477184');
    expect(roundTripped.systems[0].name).toBe('Tau Ceti');
    expect(roundTripped.systems[0].planetCount).toBe(7);
    expect(roundTripped.systems[0].hasHabitableCandidate).toBe(true);
    expect(roundTripped.systems[0].planetCensus).toEqual(['terrestrial']);

    // Also decode legacy format seamlessly
    const legacyDecoded = decodeSectorPartition(manifest);
    expect(legacyDecoded.systems[0].name).toBe('Tau Ceti');
  });

  it('encodes and decodes SystemManifest, GalacticStructureRecord, and SolarSystemBodyRecord losslessly', () => {
    const sys: SystemManifest = {
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
          name: 'tau Ceti e',
          letter: 'e',
          discoveryYear: 2012,
          discoveryMethod: 'Radial Velocity',
          massMearth: 3.94,
          equilibriumTempK: 286.2,
          orbit: {
            semiMajorAxis: 0.538,
            eccentricity: 0.18,
            inclination: 0,
            ascendingNode: 0,
            argumentOfPeriapsis: 22.3,
            meanAnomaly: 0,
            periodDays: 162.87,
          },
        },
      ],
    };

    const compactSys = encodeSystemManifest(sys, { omitId: true });
    expect(compactSys.i).toBeUndefined();
    expect(compactSys.E?.[0].o).toEqual([0.538, 0.18, 0, 0, 22.3, 0, 162.87]);

    const decodedSys = decodeSystemManifest(compactSys, 'gaia-2452378776434477184');
    expect(decodedSys.id).toBe('gaia-2452378776434477184');
    expect(decodedSys.planets[0].name).toBe('tau Ceti e');
    expect(decodedSys.planets[0].orbit?.semiMajorAxis).toBe(0.538);
    expect(decodedSys.planets[0].orbit?.periodDays).toBe(162.87);

    const struct: GalacticStructureRecord = {
      id: 'cluster-hyades',
      name: 'Hyades',
      type: 'OpenCluster',
      x: 17.5,
      y: 41.2,
      z: 13.8,
      dist: 46.8,
      ageMyr: 625,
      memberCount: 724,
      designations: ['Melotte 25', 'Collinder 50'],
      description: 'Galactic open star cluster cataloged in Cantat-Gaudin Gaia survey.',
    };

    const compactStruct = encodeGalacticStructure(struct, { omitId: true });
    // Generic boilerplate description is omitted in compact wire format and restored on decode
    expect(compactStruct.d).toBeUndefined();
    const decodedStruct = decodeGalacticStructure(compactStruct, 'cluster-hyades');
    expect(decodedStruct.id).toBe('cluster-hyades');
    expect(decodedStruct.type).toBe('OpenCluster');
    expect(decodedStruct.description).toContain('Cantat-Gaudin');

    const body: SolarSystemBodyRecord = {
      id: 'pha-00433',
      name: '(433) Eros',
      classification: 'AsteroidNEO',
      parentBodyId: 'sol',
      meanRadiusKm: 8.42,
      albedo: 0.25,
      orbit: {
        semiMajorAxis: 1.458,
        eccentricity: 0.223,
        inclination: 10.83,
        ascendingNode: 304.3,
        argumentOfPeriapsis: 178.8,
        meanAnomaly: 240.1,
        periodDays: 643.2,
      },
    };

    const compactBody = encodeSolarSystemBody(body, { omitId: true });
    expect(compactBody.b).toBeUndefined(); // 'sol' default omitted
    expect(compactBody.C).toBeUndefined(); // 'confirmed' default omitted
    expect(compactBody.f).toBeUndefined(); // 0 default omitted
    expect(compactBody.o).toEqual([1.458, 0.223, 10.83, 304.3, 178.8, 240.1, 643.2]);
    const decodedBody = decodeSolarSystemBody(compactBody, 'pha-00433');
    expect(decodedBody.id).toBe('pha-00433');
    expect(decodedBody.parentBodyId).toBe('sol');
    expect(decodedBody.confidence).toBe('confirmed');
    expect(decodedBody.orbit?.semiMajorAxis).toBe(1.458);

    // Non-default confidence ('candidate' = 2, 'theoretical' = 3) and theoreticalFlags (f) round-trip
    const candidateStar: SystemSummaryNode = {
      id: 'gaia-123',
      name: 'Gaia DR3 123',
      x: 50,
      y: 20,
      z: -10,
      dist: 54.772,
      mag: 14.2,
      absmag: 10.5,
      spect: 'M',
      starCount: 1,
      planetCount: 0,
      hasHabitableCandidate: false,
      sectorId: 'sector_+050_+000_-025',
      confidence: 'candidate',
      theoreticalFlags: 3, // bit 1 (spect) | bit 2 (rv)
    };
    const compactCandidateStar = encodeSummaryNode(candidateStar, { omitId: true });
    expect(compactCandidateStar.C).toBe(2);
    expect(compactCandidateStar.f).toBe(3);
    const decodedCandidateStar = decodeSummaryNode(compactCandidateStar, 'gaia-123');
    expect(decodedCandidateStar.confidence).toBe('candidate');
    expect(decodedCandidateStar.theoreticalFlags).toBe(3);

    const theoreticalStruct: GalacticStructureRecord = {
      ...struct,
      id: 'snr-g006-4-00-1',
      name: 'SNR G006.4-00.1',
      type: 'SupernovaRemnant',
      confidence: 'theoretical',
      theoreticalFlags: 1,
    };
    const compactTheoStruct = encodeGalacticStructure(theoreticalStruct, { omitId: true });
    expect(compactTheoStruct.C).toBe(3);
    expect(compactTheoStruct.f).toBe(1);
    const decodedTheoStruct = decodeGalacticStructure(compactTheoStruct, 'snr-g006-4-00-1');
    expect(decodedTheoStruct.confidence).toBe('theoretical');
    expect(decodedTheoStruct.theoreticalFlags).toBe(1);
  });

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

    const indices = buildSearchIndices({
      systems,
      manifests,
      structures,
      solarBodies,
      starAliasesById: new Map([
        ['gaia-2452378776434477184', ['Tau Ceti', 'Tau Cet', 'HD 10700', 'HIP 8102', 'Gl 71', 'GJ 71']],
      ]),
    });

    expect(indices.core.d.some((e) => e.i === 'gaia-2452378776434477184')).toBe(true);
    expect(indices.core.d.some((e) => e.i === 'tau-ceti-e')).toBe(true);
    expect(indices.core.d.some((e) => e.i === 'earth' && e.h === 1)).toBe(true);
    // Minor body Eros is in full and minorBodies shard, not core
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

    // Exoplanet ranks ordered by semiMajorAxis
    const tauE = indices.planets.d.find((e) => e.i === 'tau-ceti-e');
    const tauF = indices.planets.d.find((e) => e.i === 'tau-ceti-f');
    expect(tauE?.r).toBe(1);
    expect(tauF?.r).toBe(2);

    // Solar bodies heliocentric rank: Earth (1.0) -> Vesta (2.36) -> Ceres (2.77) -> Pluto (39.48)
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

    // Moon orbits earth (parentKey === 'earth') -> rank 1 in earth orbit
    expect(moon?.r).toBe(1);
    expect(moon?.o).toBe('earth');
    expect(moon?.e).toBeUndefined();
  });
});
