import { describe, it, expect } from 'vitest';
import {
  COMPACT_SCHEMA_VERSION,
  encodeCircumstellarDisk,
  decodeCircumstellarDisk,
  encodeSystemManifest,
  decodeSystemManifest,
  encodeSummaryNode,
  decodeSummaryNode,
  decodeSectorPartition,
  decodeSummaryBucket,
  decodeDetailBucket,
  decodeCompactSearchEntry,
  type CompactSearchEntry,
  type CompactSectorPartition,
  type ShardedBucketEnvelope,
  type CompactSummaryNode,
  type CompactDetailRecord,
} from '../src/utils/compactDataCodec';
import type {
  CircumstellarDiskRecord,
  SystemManifest,
  SystemSummaryNode,
} from '../src/types/astro';

describe('DEC-035: Circumstellar Disk & Belt Compact Codec', () => {
  const sampleAsteroidBelt: CircumstellarDiskRecord = {
    id: 'main-asteroid-belt',
    name: 'Main Asteroid Belt',
    kind: 'asteroid-belt',
    innerRadiusAu: 2.1,
    outerRadiusAu: 3.3,
    semiMajorAxisAu: 2.7,
    tempK: 165,
    composition: 'Silicate, carbonaceous & metallic planetesimals (C/S/M-type)',
    confidence: 'confirmed',
    reticleType: 'asteroid-belt',
  };

  const sampleKuiperBelt: CircumstellarDiskRecord = {
    id: 'kuiper-belt',
    name: 'Kuiper Belt',
    kind: 'kuiper-belt',
    innerRadiusAu: 30.0,
    outerRadiusAu: 50.0,
    semiMajorAxisAu: 40.0,
    tempK: 44,
    composition: 'Volatiles, water ice, methane & trans-Neptunian planetesimals',
    confidence: 'candidate',
  };

  it('encodes and decodes CircumstellarDiskRecord cleanly with compact keys and numeric kinds', () => {
    const compactAsteroid = encodeCircumstellarDisk(sampleAsteroidBelt);
    expect(compactAsteroid.i).toBe('main-asteroid-belt');
    expect(compactAsteroid.k).toBe(1);
    expect(compactAsteroid.rt).toBe('asteroid-belt');

    const decodedAsteroid = decodeCircumstellarDisk(compactAsteroid);
    expect(decodedAsteroid).toEqual(sampleAsteroidBelt);
  });

  it('round-trips SystemManifest with attached circumstellar disks (D)', () => {
    const manifest: SystemManifest = {
      id: 'sol',
      name: 'Sol',
      x: 0,
      y: 0,
      z: 0,
      dist: 0,
      sectorId: 'sector_+000_+000_+000',
      stars: [
        {
          id: 'sol-A',
          name: 'Sol',
          componentDesignation: 'A',
          spectralType: 'G2V',
          mag: -26.74,
          absmag: 4.83,
          reticleType: 'star',
        },
      ],
      planets: [],
      disks: [sampleAsteroidBelt, sampleKuiperBelt],
    };

    const compact = encodeSystemManifest(manifest);
    expect(compact.D?.length).toBe(2);

    const decoded = decodeSystemManifest(compact);
    expect(decoded.disks?.length).toBe(2);
    expect(decoded.stars[0].reticleType).toBe('star');
  });
});

describe('AUD-048 / AUD-051 / DEC-R029: Wire Format Versioning & Precalculated Fields', () => {
  it('exports COMPACT_SCHEMA_VERSION as 1', () => {
    expect(COMPACT_SCHEMA_VERSION).toBe(1);
  });

  it('validates envelope schema version on decodeSectorPartition', () => {
    const validPartition: CompactSectorPartition = {
      v: 1,
      i: 'sector_+000_+000_+000',
      b: [0, 0, 0, 25, 25, 25],
      c: 0,
      d: {},
    };
    expect(() => decodeSectorPartition(validPartition)).not.toThrow();

    const invalidPartition: CompactSectorPartition = {
      ...validPartition,
      v: 2,
    };
    expect(() => decodeSectorPartition(invalidPartition)).toThrow(
      /unsupported schema version/i,
    );
  });

  it('validates envelope schema version on decodeSummaryBucket and decodeDetailBucket', () => {
    const invalidSummaryBucket: ShardedBucketEnvelope<CompactSummaryNode> = {
      v: 99,
      i: '0',
      c: 0,
      d: {},
    };
    expect(() => decodeSummaryBucket(invalidSummaryBucket)).toThrow(
      /unsupported schema version/i,
    );

    const invalidDetailBucket: ShardedBucketEnvelope<CompactDetailRecord> = {
      v: 99,
      i: '0',
      c: 0,
      d: {},
    };
    expect(() => decodeDetailBucket(invalidDetailBucket)).toThrow(
      /unsupported schema version/i,
    );
  });

  it('round-trips precalculated classification and reticleType on SystemSummaryNode', () => {
    const node: SystemSummaryNode = {
      id: 'sirius-b',
      name: 'Sirius B',
      x: -1.6,
      y: 2.1,
      z: -0.6,
      dist: 2.64,
      mag: 8.44,
      absmag: 11.18,
      spect: 'DA2',
      starCount: 1,
      planetCount: 0,
      hasHabitableCandidate: false,
      sectorId: 'sector_+000_+000_+000',
      classification: 'white-dwarf',
      reticleType: 'white-dwarf',
      planetCompositionCounts: [0, 0, 0, 0],
    };

    const encoded = encodeSummaryNode(node);
    expect(encoded.rt).toBe('white-dwarf');
    expect(encoded.k).toBe('white-dwarf');
    expect(encoded.b).toBeUndefined(); // all-zeros omitted

    const decoded = decodeSummaryNode(encoded);
    expect(decoded.classification).toBe('white-dwarf');
    expect(decoded.reticleType).toBe('white-dwarf');
  });

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
});
