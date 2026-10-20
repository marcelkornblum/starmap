import { describe, it, expect } from 'vitest';
import {
  encodeCircumstellarDisk,
  decodeCircumstellarDisk,
  encodeSystemManifest,
  decodeSystemManifest,
} from '../src/utils/compactDataCodec';
import type { CircumstellarDiskRecord, SystemManifest } from '../src/types/astro';

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

  const sampleDebrisDisk: CircumstellarDiskRecord = {
    id: 'tau-ceti-debris-disk',
    name: 'Tau Ceti Outer Debris Disk',
    kind: 'debris-disk',
    innerRadiusAu: 6.0,
    outerRadiusAu: 55.0,
    semiMajorAxisAu: 30.0,
    tempK: 60,
    composition: 'Massive cold cometary & icy planetesimal belt (~10× Sol Kuiper Belt, ALMA)',
  };

  it('encodes and decodes CircumstellarDiskRecord cleanly with compact keys and numeric kinds', () => {
    const compactAsteroid = encodeCircumstellarDisk(sampleAsteroidBelt);
    expect(compactAsteroid).toEqual({
      i: 'main-asteroid-belt',
      n: 'Main Asteroid Belt',
      k: 1,
      a: [2.1, 3.3, 2.7],
      T: 165,
      c: 'Silicate, carbonaceous & metallic planetesimals (C/S/M-type)',
    });
    // Confirmed confidence is omitted by default
    expect(compactAsteroid.C).toBeUndefined();

    const decodedAsteroid = decodeCircumstellarDisk(compactAsteroid);
    expect(decodedAsteroid).toEqual(sampleAsteroidBelt);

    const compactKuiper = encodeCircumstellarDisk(sampleKuiperBelt);
    expect(compactKuiper.k).toBe(2);
    expect(compactKuiper.C).toBe(2); // candidate code
    const decodedKuiper = decodeCircumstellarDisk(compactKuiper);
    expect(decodedKuiper).toEqual(sampleKuiperBelt);

    const compactDebris = encodeCircumstellarDisk(sampleDebrisDisk);
    expect(compactDebris.k).toBe(3);
    const decodedDebris = decodeCircumstellarDisk(compactDebris);
    expect(decodedDebris).toEqual({
      ...sampleDebrisDisk,
      confidence: 'confirmed',
    });
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
        },
      ],
      planets: [],
      disks: [sampleAsteroidBelt, sampleKuiperBelt],
    };

    const compact = encodeSystemManifest(manifest);
    expect(compact.D).toBeDefined();
    expect(compact.D?.length).toBe(2);
    expect(compact.D?.[0].i).toBe('main-asteroid-belt');
    expect(compact.D?.[1].i).toBe('kuiper-belt');

    const decoded = decodeSystemManifest(compact);
    expect(decoded.disks).toBeDefined();
    expect(decoded.disks?.length).toBe(2);
    expect(decoded.disks?.[0]).toEqual(sampleAsteroidBelt);
    expect(decoded.disks?.[1]).toEqual(sampleKuiperBelt);
  });

  it('omits D field in CompactSystemManifest when system has no disks', () => {
    const manifest: SystemManifest = {
      id: 'proxima',
      name: 'Proxima Centauri',
      x: -0.47,
      y: 1.32,
      z: -0.33,
      dist: 1.3,
      sectorId: 'sector_+000_+000_+000',
      stars: [
        {
          id: 'proxima-A',
          name: 'Proxima Centauri',
          componentDesignation: 'A',
          spectralType: 'M5.5Ve',
          mag: 11.13,
          absmag: 15.6,
        },
      ],
      planets: [],
    };

    const compact = encodeSystemManifest(manifest);
    expect(compact.D).toBeUndefined();

    const decoded = decodeSystemManifest(compact);
    expect(decoded.disks).toBeUndefined();
  });
});
