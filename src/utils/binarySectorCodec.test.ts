import { describe, it, expect } from 'vitest';
import {
  BINARY_SECTOR_MAGIC,
  BINARY_SECTOR_VERSION,
  HEADER_BYTE_LENGTH,
  BINARY_SECTOR_HEADER_BYTES,
  BINARY_SECTOR_RECORD_BYTES,
  BINARY_SECTOR_STRIDE_ELEMENTS,
  fnv1a32,
  getShardKeyFromHash,
  encodeBinarySector,
  decodeBinarySectorHeader,
  decodeBinarySector,
  type BinarySectorHeader,
  type DecodedBinarySector,
} from './binarySectorCodec';
import { getShardKey } from './compactDataCodec';
import type { SectorPartitionManifest, SystemSummaryNode } from '../types/astro';

function toArrayBuffer(arr: Uint8Array): ArrayBuffer {
  return arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength) as ArrayBuffer;
}

describe('binarySectorCodec (AUD-048 / DEC-R029)', () => {
  describe('Constants', () => {
    it('defines expected versioned 28-byte header and 16-byte record constants', () => {
      expect(BINARY_SECTOR_MAGIC).toBe(0x52415453);
      expect(BINARY_SECTOR_VERSION).toBe(1);
      expect(HEADER_BYTE_LENGTH).toBe(28);
      expect(BINARY_SECTOR_HEADER_BYTES).toBe(28);
      expect(BINARY_SECTOR_RECORD_BYTES).toBe(16);
      expect(BINARY_SECTOR_STRIDE_ELEMENTS).toBe(4);
    });
  });

  describe('fnv1a32 and getShardKeyFromHash', () => {
    const testIds = [
      'sol',
      'gaia-2452378776434477184',
      'hip-32349',
      'alpha-centauri',
      'tau-ceti',
      'proxima-centauri',
      'barnards-star',
    ];

    it('produces deterministic 32-bit unsigned hashes', () => {
      for (const id of testIds) {
        const hash1 = fnv1a32(id);
        const hash2 = fnv1a32(id);
        expect(hash1).toBe(hash2);
        expect(hash1).toBeGreaterThanOrEqual(0);
        expect(hash1).toBeLessThanOrEqual(0xffffffff);
        expect(Number.isInteger(hash1)).toBe(true);
      }
    });

    it('matches getShardKey(id) === getShardKeyFromHash(fnv1a32(id)) across all test IDs', () => {
      for (const id of testIds) {
        const legacyKey = getShardKey(id);
        const fastKey = getShardKeyFromHash(fnv1a32(id));
        expect(fastKey).toBe(legacyKey);
      }
    });
  });

  describe('encodeBinarySector and decodeBinarySectorHeader', () => {
    it('correctly encodes and decodes the 28-byte versioned header', () => {
      const manifest: SectorPartitionManifest = {
        sectorId: 'sector_+000_+000_+000',
        bounds: {
          min: { x: -12.5, y: -12.5, z: -12.5 },
          max: { x: 12.5, y: 12.5, z: 12.5 },
        },
        count: 0,
        systems: [],
      };

      const encoded = encodeBinarySector(manifest);
      expect(encoded.byteLength).toBe(BINARY_SECTOR_HEADER_BYTES);

      const header: BinarySectorHeader = decodeBinarySectorHeader(toArrayBuffer(encoded));
      expect(header.magic).toBe(BINARY_SECTOR_MAGIC);
      expect(header.version).toBe(1);
      expect(header.count).toBe(0);
      expect(header.origin[0]).toBeCloseTo(-12.5, 4);
      expect(header.origin[1]).toBeCloseTo(-12.5, 4);
      expect(header.origin[2]).toBeCloseTo(-12.5, 4);
      expect(header.sectorSize).toBeCloseTo(25.0, 4);
    });

    it('uses fallback sectorSize 25.0 when bounds difference is zero', () => {
      const manifest: SectorPartitionManifest = {
        sectorId: 'sector_+000_+000_+000',
        bounds: {
          min: { x: 0, y: 0, z: 0 },
          max: { x: 0, y: 0, z: 0 },
        },
        count: 0,
        systems: [],
      };

      const encoded = encodeBinarySector(manifest);
      const header = decodeBinarySectorHeader(toArrayBuffer(encoded));
      expect(header.sectorSize).toBe(25.0);
    });
  });

  describe('Round-trip encoding and decoding', () => {
    const mockSystems: SystemSummaryNode[] = [
      {
        id: 'sol',
        name: 'Sol',
        x: 0.0,
        y: 0.0,
        z: 0.0,
        dist: 0.0,
        mag: -26.7,
        absmag: 4.83,
        spect: 'G2V',
        starCount: 1,
        planetCount: 8,
        hasHabitableCandidate: true,
        sectorId: 'sector_+000_+000_+000',
      },
      {
        id: 'alpha-centauri',
        name: 'Alpha Centauri',
        x: -0.4715,
        y: -0.3614,
        z: -1.2508,
        dist: 1.34,
        mag: -0.27,
        absmag: 4.38,
        spect: 'G2V',
        starCount: 3,
        planetCount: 2,
        hasHabitableCandidate: true,
        sectorId: 'sector_+000_+000_+000',
      },
      {
        id: 'hip-32349',
        name: 'Sirius',
        x: -1.6148,
        y: 1.4883,
        z: -1.5306,
        dist: 2.64,
        mag: -1.46,
        absmag: 1.42,
        spect: 'A1V',
        starCount: 2,
        planetCount: 0,
        hasHabitableCandidate: false,
        sectorId: 'sector_+000_+000_+000',
      },
      {
        id: 'gaia-2452378776434477184',
        name: 'Gaia Star 2452378776434477184',
        x: 10.125,
        y: -8.75,
        z: 3.5,
        dist: 13.84,
        mag: 11.2,
        absmag: 7.9,
        spect: 'M2V',
        starCount: 1,
        planetCount: 0,
        hasHabitableCandidate: false,
        sectorId: 'sector_+000_+000_+000',
      },
    ];

    const testManifest: SectorPartitionManifest = {
      sectorId: 'sector_-025_+000_-025',
      bounds: {
        min: { x: -25.0, y: 0.0, z: -25.0 },
        max: { x: 0.0, y: 25.0, z: 0.0 },
      },
      count: mockSystems.length,
      systems: mockSystems,
    };

    it('enforces byte-size alignment 28 + N * 16', () => {
      const encoded = encodeBinarySector(testManifest);
      const expectedBytes = BINARY_SECTOR_HEADER_BYTES + mockSystems.length * BINARY_SECTOR_RECORD_BYTES;
      expect(encoded.byteLength).toBe(expectedBytes);
      expect(expectedBytes % 16).toBe(12); // 28 + N*16
      expect(expectedBytes).toBe(28 + 4 * 16); // 92 bytes
    });

    it('decodes all coordinates and IDs correctly matching the manifest', () => {
      const encoded = encodeBinarySector(testManifest);
      const arrayBuffer = toArrayBuffer(encoded);
      const decoded: DecodedBinarySector = decodeBinarySector(arrayBuffer);

      expect(decoded.header.magic).toBe(BINARY_SECTOR_MAGIC);
      expect(decoded.header.version).toBe(1);
      expect(decoded.header.count).toBe(mockSystems.length);
      expect(decoded.header.origin[0]).toBeCloseTo(-25.0, 4);
      expect(decoded.header.origin[1]).toBeCloseTo(0.0, 4);
      expect(decoded.header.origin[2]).toBeCloseTo(-25.0, 4);
      expect(decoded.header.sectorSize).toBeCloseTo(25.0, 4);

      expect(decoded.positions.length).toBe(mockSystems.length * 3);
      expect(decoded.ids.length).toBe(mockSystems.length);

      for (let i = 0; i < mockSystems.length; i++) {
        const sys = mockSystems[i];
        expect(decoded.positions[i * 3 + 0]).toBeCloseTo(sys.x, 4);
        expect(decoded.positions[i * 3 + 1]).toBeCloseTo(sys.y, 4);
        expect(decoded.positions[i * 3 + 2]).toBeCloseTo(sys.z, 4);
        expect(decoded.ids[i]).toBe(fnv1a32(sys.id));
      }
    });

    it('verifies zero-copy interleaved views match buffer and offsets', () => {
      const encoded = encodeBinarySector(testManifest);
      const arrayBuffer = toArrayBuffer(encoded);
      const decoded = decodeBinarySector(arrayBuffer);

      expect(decoded.interleavedFloats.buffer).toBe(arrayBuffer);
      expect(decoded.interleavedUints.buffer).toBe(arrayBuffer);
      expect(decoded.interleavedFloats.byteOffset).toBe(BINARY_SECTOR_HEADER_BYTES);
      expect(decoded.interleavedUints.byteOffset).toBe(BINARY_SECTOR_HEADER_BYTES);
      expect(decoded.interleavedFloats.length).toBe(mockSystems.length * BINARY_SECTOR_STRIDE_ELEMENTS);
      expect(decoded.interleavedUints.length).toBe(mockSystems.length * BINARY_SECTOR_STRIDE_ELEMENTS);

      for (let i = 0; i < mockSystems.length; i++) {
        const sys = mockSystems[i];
        const offset = i * BINARY_SECTOR_STRIDE_ELEMENTS;
        expect(decoded.interleavedFloats[offset + 0]).toBeCloseTo(sys.x, 4);
        expect(decoded.interleavedFloats[offset + 1]).toBeCloseTo(sys.y, 4);
        expect(decoded.interleavedFloats[offset + 2]).toBeCloseTo(sys.z, 4);
        expect(decoded.interleavedUints[offset + 3]).toBe(fnv1a32(sys.id));
      }
    });

    it('verifies exact little-endian layout using raw DataView', () => {
      const encoded = encodeBinarySector(testManifest);
      const view = new DataView(encoded.buffer, encoded.byteOffset, encoded.byteLength);

      // Header fields (28 bytes)
      expect(view.getUint32(0, true)).toBe(BINARY_SECTOR_MAGIC);
      expect(view.getUint32(4, true)).toBe(BINARY_SECTOR_VERSION);
      expect(view.getUint32(8, true)).toBe(mockSystems.length);
      expect(view.getFloat32(12, true)).toBeCloseTo(-25.0, 4);
      expect(view.getFloat32(16, true)).toBeCloseTo(0.0, 4);
      expect(view.getFloat32(20, true)).toBeCloseTo(-25.0, 4);
      expect(view.getFloat32(24, true)).toBeCloseTo(25.0, 4);

      // Star records
      for (let i = 0; i < mockSystems.length; i++) {
        const recOffset = BINARY_SECTOR_HEADER_BYTES + i * BINARY_SECTOR_RECORD_BYTES;
        const sys = mockSystems[i];
        expect(view.getFloat32(recOffset + 0, true)).toBeCloseTo(sys.x, 4);
        expect(view.getFloat32(recOffset + 4, true)).toBeCloseTo(sys.y, 4);
        expect(view.getFloat32(recOffset + 8, true)).toBeCloseTo(sys.z, 4);
        expect(view.getUint32(recOffset + 12, true)).toBe(fnv1a32(sys.id));
      }
    });

    it('handles empty sector with zero stars cleanly', () => {
      const emptyManifest: SectorPartitionManifest = {
        sectorId: 'sector_+025_+025_+025',
        bounds: {
          min: { x: 25.0, y: 25.0, z: 25.0 },
          max: { x: 50.0, y: 50.0, z: 50.0 },
        },
        count: 0,
        systems: [],
      };

      const encoded = encodeBinarySector(emptyManifest);
      expect(encoded.byteLength).toBe(BINARY_SECTOR_HEADER_BYTES);

      const decoded = decodeBinarySector(toArrayBuffer(encoded));
      expect(decoded.header.count).toBe(0);
      expect(decoded.positions.length).toBe(0);
      expect(decoded.ids.length).toBe(0);
      expect(decoded.interleavedFloats.length).toBe(0);
      expect(decoded.interleavedUints.length).toBe(0);
    });
  });

  describe('Error handling and corruption checks', () => {
    it('throws error on truncated buffer smaller than header size', () => {
      const truncated = new ArrayBuffer(20);
      expect(() => decodeBinarySectorHeader(truncated)).toThrow(/too short/i);
      expect(() => decodeBinarySector(truncated)).toThrow(/too short/i);
    });

    it('throws error on corrupted magic number', () => {
      const buf = new ArrayBuffer(BINARY_SECTOR_HEADER_BYTES);
      const view = new DataView(buf);
      view.setUint32(0, 0x12345678, true);
      view.setUint32(4, BINARY_SECTOR_VERSION, true);

      expect(() => decodeBinarySectorHeader(buf)).toThrow(/invalid binary sector magic/i);
      expect(() => decodeBinarySector(buf)).toThrow(/invalid binary sector magic/i);
    });

    it('throws error on unsupported binary sector version', () => {
      const buf = new ArrayBuffer(BINARY_SECTOR_HEADER_BYTES);
      const view = new DataView(buf);
      view.setUint32(0, BINARY_SECTOR_MAGIC, true);
      view.setUint32(4, 999, true);

      expect(() => decodeBinarySectorHeader(buf)).toThrow(/unsupported binary sector version/i);
      expect(() => decodeBinarySector(buf)).toThrow(/unsupported binary sector version/i);
    });

    it('throws error on mismatched payload byte length', () => {
      const buf = new ArrayBuffer(BINARY_SECTOR_HEADER_BYTES + 32);
      const view = new DataView(buf);
      view.setUint32(0, BINARY_SECTOR_MAGIC, true);
      view.setUint32(4, BINARY_SECTOR_VERSION, true);
      view.setUint32(8, 1, true); // Header claims 1 star (needs 16 bytes payload, total 44 bytes)

      expect(() => decodeBinarySector(buf)).toThrow(/byte length mismatch/i);
    });
  });
});
