import { describe, it, expect } from 'vitest';
import {
  BINARY_SECTOR_MAGIC,
  BINARY_SECTOR_VERSION,
  HEADER_BYTE_LENGTH,
  encodeBinarySector,
  decodeBinarySectorHeader,
  decodeBinarySector,
} from './binarySectorCodec';
import type { SectorPartitionManifest } from '../types/astro';

function toArrayBuffer(arr: Uint8Array): ArrayBuffer {
  return arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength) as ArrayBuffer;
}

describe('AUD-048 / DEC-R029: Binary Sector Versioning & Codec', () => {
  const sampleManifest: SectorPartitionManifest = {
    sectorId: 'sector_+000_+000_+000',
    bounds: {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 25, y: 25, z: 25 },
    },
    count: 2,
    systems: [
      {
        id: 'sol',
        name: 'Sol',
        x: 0,
        y: 0,
        z: 0,
        dist: 0,
        mag: -26.74,
        absmag: 4.83,
        starCount: 1,
        planetCount: 8,
        hasHabitableCandidate: true,
        sectorId: 'sector_+000_+000_+000',
      },
      {
        id: 'alpha-centauri',
        name: 'Alpha Centauri',
        x: -0.47,
        y: -0.36,
        z: -1.25,
        dist: 1.34,
        mag: -0.27,
        absmag: 4.07,
        starCount: 3,
        planetCount: 2,
        hasHabitableCandidate: true,
        sectorId: 'sector_+000_+000_+000',
      },
    ],
  };

  it('exports format version 1 and 28-byte header constant', () => {
    expect(BINARY_SECTOR_VERSION).toBe(1);
    expect(HEADER_BYTE_LENGTH).toBe(28);
  });

  it('encodes and decodes binary sector with version 1 header', () => {
    const encoded = encodeBinarySector(sampleManifest);
    const buffer = toArrayBuffer(encoded);
    const decoded = decodeBinarySector(buffer);

    expect(decoded.header.magic).toBe(BINARY_SECTOR_MAGIC);
    expect(decoded.header.version).toBe(1);
    expect(decoded.header.count).toBe(2);
    expect(decoded.header.origin).toEqual([0, 0, 0]);
    expect(decoded.header.sectorSize).toBe(25);
    expect(decoded.ids.length).toBe(2);
    expect(decoded.positions.length).toBe(6);
  });

  it('rejects unsupported binary sector version', () => {
    const encoded = encodeBinarySector(sampleManifest);
    const buffer = toArrayBuffer(encoded);
    const view = new DataView(buffer);

    // Corrupt the version field at offset 4 to 999
    view.setUint32(4, 999, true);

    expect(() => decodeBinarySectorHeader(buffer)).toThrow(
      /unsupported binary sector version/i,
    );
    expect(() => decodeBinarySector(buffer)).toThrow(
      /unsupported binary sector version/i,
    );
  });
});
