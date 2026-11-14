import { describe, it, expect } from 'vitest';
import {
  encodeSystemManifest,
  decodeSystemManifest,
  encodeGalacticStructure,
  decodeGalacticStructure,
  encodeSolarSystemBody,
  decodeSolarSystemBody,
  encodeSectorPartition,
  decodeSectorPartition,
  decodeCompactSearchEntry,
  encodeSummaryNode,
  decodeSummaryNode,
  type CompactSearchEntry,
} from './compactDataCodec';
import { resolveDefaultStructureDescription } from './astroPrecalculation';
import type {
  SystemSummaryNode,
  SystemManifest,
  GalacticStructureRecord,
  SolarSystemBodyRecord,
  SectorPartitionManifest,
} from '../types/astro';

describe('compactDataCodec - Manifests, Structures, Solar Bodies & Sectors', () => {
  it('round-trips natural satellites attached to PlanetRecord', () => {
    const manifest: SystemManifest = {
      id: 'sol',
      name: 'Sol',
      x: 0,
      y: 0,
      z: 0,
      dist: 0,
      sectorId: 'sector_+000_+000_+000',
      stars: [],
      planets: [
        {
          id: 'earth',
          name: 'Earth',
          letter: 'd',
          reticleType: 'terrestrial',
          composition: 'terrestrial',
          satellites: [
            {
              id: 'moon',
              name: 'Moon',
              parentId: 'earth',
              radiusKm: 1737.4,
              radiusEarth: 0.2727,
              massEarth: 0.0123,
              composition: 'terrestrial',
              reticleType: 'moon',
              orbit: {
                semiMajorAxis: 0.00257,
                eccentricity: 0.0549,
                inclination: 5.14,
                ascendingNode: 125.08,
                argumentOfPeriapsis: 318.15,
                meanAnomaly: 135.0,
                periodDays: 27.32,
              },
            },
          ],
        },
      ],
    };

    const encoded = encodeSystemManifest(manifest);
    expect(encoded.E[0].sat?.length).toBe(1);
    expect(encoded.E[0].sat?.[0].i).toBe('moon');
    expect(encoded.E[0].sat?.[0].rt).toBe('moon');

    const decoded = decodeSystemManifest(encoded);
    expect(decoded.planets[0].satellites?.length).toBe(1);
    expect(decoded.planets[0].satellites?.[0].id).toBe('moon');
    expect(decoded.planets[0].satellites?.[0].reticleType).toBe('moon');
  });

  it('strictly enforces 4-tuple planetCompositionCounts in manifest codec', () => {
    const manifest: SystemManifest = {
      id: 'sol',
      name: 'Sol',
      x: 0,
      y: 0,
      z: 0,
      dist: 0,
      sectorId: 'sector_+000_+000_+000',
      stars: [],
      planets: [],
      planetCompositionCounts: [4, 0, 2, 2],
    };

    const encoded = encodeSystemManifest(manifest);
    expect(encoded.b).toEqual([4, 0, 2, 2]);

    const decoded = decodeSystemManifest(encoded);
    expect(decoded.planetCompositionCounts).toEqual([4, 0, 2, 2]);
  });

  it('decodes CompactSearchEntry into named DecodedSearchEntry properties', () => {
    const rawEntry: CompactSearchEntry = {
      i: 'trappist-1-e',
      k: 2,
      n: 'TRAPPIST-1 e',
      s: 'trappist-1',
      p: [12.1, -4.5, 8.2],
      m: [15.5, 'M8V', 7, 1],
      a: 'trappist-1-e 2mass-j23062928-0502285-e',
      u: 'terrestrial',
      z: 1,
      r: 4,
      A: 0.029,
      P: 6.1,
      h: 1,
    };

    const decoded = decodeCompactSearchEntry(rawEntry);
    expect(decoded.id).toBe('trappist-1-e');
    expect(decoded.kind).toBe(2);
    expect(decoded.name).toBe('TRAPPIST-1 e');
    expect(decoded.designations).toEqual(['trappist-1-e', '2mass-j23062928-0502285-e']);
    expect(decoded.systemId).toBe('trappist-1');
    expect(decoded.position).toEqual([12.1, -4.5, 8.2]);
    expect(decoded.magnitude).toBe(15.5);
    expect(decoded.spectralType).toBe('M8V');
    expect(decoded.planetCount).toBe(7);
    expect(decoded.hasHabitableCandidate).toBe(true);
    expect(decoded.reticleType).toBe('terrestrial');
    expect(decoded.isHabitableZonePlanet).toBe(true);
    expect(decoded.isHomeSystem).toBe(true);
    expect(decoded.semiMajorAxisAu).toBe(0.029);
  });

  it('encodes and decodes unnamed field stars with default omission', () => {
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
    expect(compact.i).toBeUndefined();
    expect(compact.p).toEqual([23.201, 0.127, 2.846]);
    expect(compact.v).toEqual([-12.3, 4.5, -8.1]);

    const decoded = decodeSummaryNode(compact, 'gaia-2745860763717896448', 'sector_+000_+000_+000');
    expect(decoded.id).toBe('gaia-2745860763717896448');
    expect(decoded.name).toBe('Gaia DR3 2745860763717896448');
    expect(decoded.velocity?.vx).toBe(-12.3);
  });

  it('encodes SectorPartitionManifest and decodes both compact and legacy formats', () => {
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
    expect(compactSector.d['gaia-2452378776434477184']).toBeDefined();

    const roundTripped = decodeSectorPartition(compactSector);
    expect(roundTripped.sectorId).toBe('sector_+000_+000_-025');
    expect(roundTripped.systems[0].name).toBe('Tau Ceti');

    const legacyDecoded = decodeSectorPartition(manifest);
    expect(legacyDecoded.systems[0].name).toBe('Tau Ceti');
  });

  it('encodes and decodes SystemManifest, GalacticStructureRecord, and SolarSystemBodyRecord losslessly', () => {
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
      description: resolveDefaultStructureDescription('OpenCluster'),
    };

    const compactStruct = encodeGalacticStructure(struct, { omitId: true });
    expect(compactStruct.d).toBeUndefined();
    const decodedStruct = decodeGalacticStructure(compactStruct, 'cluster-hyades');
    expect(decodedStruct.id).toBe('cluster-hyades');
    expect(decodedStruct.type).toBe('OpenCluster');

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
    expect(compactBody.o).toEqual([1.458, 0.223, 10.83, 304.3, 178.8, 240.1, 643.2]);
    const decodedBody = decodeSolarSystemBody(compactBody, 'pha-00433');
    expect(decodedBody.id).toBe('pha-00433');
    expect(decodedBody.orbit?.semiMajorAxis).toBe(1.458);

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
  });
});
