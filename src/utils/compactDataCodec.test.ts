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
  type CompactSectorPartition,
  type ShardedBucketEnvelope,
  type CompactSummaryNode,
  type CompactDetailRecord,
} from './compactDataCodec';
import type {
  CircumstellarDiskRecord,
  SystemManifest,
  SystemSummaryNode,
} from '../types/astro';

describe('AUD-023: Lossless properName Round-Trip in compactDataCodec', () => {
  const baseNode: SystemSummaryNode = {
    id: 'hip-12345',
    name: 'HIP 12345',
    x: 10,
    y: 20,
    z: 30,
    dist: 37.417,
    mag: 6.5,
    absmag: 4.2,
    spect: 'G2V',
    starCount: 1,
    planetCount: 0,
    hasHabitableCandidate: false,
    sectorId: 'sector_+000_+000_+000',
    confidence: 'confirmed',
  };

  it('preserves undefined properName for non-Gaia stars', () => {
    const node: SystemSummaryNode = {
      ...baseNode,
      id: 'hip-12345',
      name: 'HIP 12345',
      properName: undefined,
    };

    const encoded = encodeSummaryNode(node);
    const decoded = decodeSummaryNode(encoded);

    expect(decoded.properName).toBeUndefined();
    expect(decoded.id).toBe(node.id);
    expect(decoded.name).toBe(node.name);
  });

  it('preserves properName for non-Gaia star when properName === name', () => {
    const node: SystemSummaryNode = {
      ...baseNode,
      id: 'sol',
      name: 'Sol',
      properName: 'Sol',
    };

    const encoded = encodeSummaryNode(node);
    const decoded = decodeSummaryNode(encoded);

    expect(decoded.properName).toBe('Sol');
    expect(decoded.name).toBe('Sol');
  });

  it('preserves properName for Gaia star when properName === name', () => {
    const node: SystemSummaryNode = {
      ...baseNode,
      id: 'gaia-123456789',
      name: 'Tau Ceti',
      properName: 'Tau Ceti',
    };

    const encoded = encodeSummaryNode(node);
    const decoded = decodeSummaryNode(encoded);

    expect(decoded.properName).toBe('Tau Ceti');
    expect(decoded.name).toBe('Tau Ceti');
  });

  it('preserves properName when properName !== name', () => {
    const node: SystemSummaryNode = {
      ...baseNode,
      id: 'hip-8102',
      name: 'HD 10700',
      properName: 'Tau Ceti',
    };

    const encoded = encodeSummaryNode(node);
    const decoded = decodeSummaryNode(encoded);

    expect(decoded.properName).toBe('Tau Ceti');
    expect(decoded.name).toBe('HD 10700');
  });

  it('deep-equals the summary node across round-trip', () => {
    const nodeWithoutProper: SystemSummaryNode = {
      ...baseNode,
      id: 'hip-99999',
      name: 'HIP 99999',
      properName: undefined,
    };
    const decodedWithout = decodeSummaryNode(encodeSummaryNode(nodeWithoutProper));
    expect(decodedWithout).toEqual(nodeWithoutProper);

    const nodeWithProper: SystemSummaryNode = {
      ...baseNode,
      id: 'sol',
      name: 'Sol',
      properName: 'Sol',
    };
    const decodedWith = decodeSummaryNode(encodeSummaryNode(nodeWithProper));
    expect(decodedWith).toEqual(nodeWithProper);
  });
});

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
    expect(encoded.b).toBeUndefined();

    const decoded = decodeSummaryNode(encoded);
    expect(decoded.classification).toBe('white-dwarf');
    expect(decoded.reticleType).toBe('white-dwarf');
  });
});
