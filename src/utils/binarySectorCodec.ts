import type { SectorPartitionManifest } from '../types/astro';

/**
 * Binary sector format constants for Frontier-defined spatial sector partitions.
 */
export const BINARY_SECTOR_MAGIC = 0x52415453; // 'STAR' in little-endian ASCII
export const BINARY_SECTOR_HEADER_BYTES = 24;
export const BINARY_SECTOR_RECORD_BYTES = 16;
export const BINARY_SECTOR_STRIDE_ELEMENTS = 4;

/**
 * Deterministic unsigned 32-bit FNV-1a hash algorithm.
 * Uses 32-bit offset basis 2166136261 and FNV prime 16777619.
 */
export function fnv1a32(id: string): number {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Converts a 32-bit unsigned ID hash directly into a 36-bucket shard key ('0'-'9', 'a'-'z').
 * Matches the legacy getShardKey(id) distribution exactly.
 */
export function getShardKeyFromHash(idHash: number): string {
  return ((idHash >>> 0) % 36).toString(36);
}

/**
 * Binary sector header layout (24 bytes).
 */
export interface BinarySectorHeader {
  readonly magic: number;
  readonly count: number;
  readonly origin: readonly [number, number, number];
  readonly sectorSize: number;
}

/**
 * Decoded binary sector structure with packed typed arrays and zero-copy views.
 */
export interface DecodedBinarySector {
  readonly header: BinarySectorHeader;
  /** Packed [x0, y0, z0, x1, y1, z1, ...] of length count * 3 */
  readonly positions: Float32Array;
  /** Packed [id0, id1, ...] of length count */
  readonly ids: Uint32Array;
  /** Zero-copy interleaved Float32Array view over buffer body (length count * 4, stride 4) */
  readonly interleavedFloats: Float32Array;
  /** Zero-copy interleaved Uint32Array view over buffer body (length count * 4, stride 4) */
  readonly interleavedUints: Uint32Array;
  readonly buffer: ArrayBuffer;
}

/**
 * Encodes a SectorPartitionManifest into the 16-byte aligned binary sector format.
 *
 * Buffer layout:
 * - 0x00..0x03: Uint32 magic (0x52415453)
 * - 0x04..0x07: Uint32 star count N
 * - 0x08..0x0B: Float32 origin X (parsecs)
 * - 0x0C..0x0F: Float32 origin Y (parsecs)
 * - 0x10..0x13: Float32 origin Z (parsecs)
 * - 0x14..0x17: Float32 sectorSize (parsecs, defaults to 25.0)
 * - Records (i = 0..N-1) at offset 24 + i * 16:
 *   - +0: Float32 X
 *   - +4: Float32 Y
 *   - +8: Float32 Z
 *   - +12: Uint32 FNV-1a hash of ID
 */
export function encodeBinarySector(manifest: SectorPartitionManifest): Uint8Array {
  const count = manifest.systems.length;
  const buffer = new ArrayBuffer(BINARY_SECTOR_HEADER_BYTES + count * BINARY_SECTOR_RECORD_BYTES);
  const view = new DataView(buffer);

  const minX = manifest.bounds.min.x;
  const minY = manifest.bounds.min.y;
  const minZ = manifest.bounds.min.z;
  const maxX = manifest.bounds.max.x;
  const rawSize = maxX - minX;
  const sectorSize = Number.isFinite(rawSize) && rawSize > 0 ? rawSize : 25.0;

  // Header (24 bytes)
  view.setUint32(0, BINARY_SECTOR_MAGIC, true);
  view.setUint32(4, count, true);
  view.setFloat32(8, minX, true);
  view.setFloat32(12, minY, true);
  view.setFloat32(16, minZ, true);
  view.setFloat32(20, sectorSize, true);

  // Star records (16 bytes each)
  let offset = BINARY_SECTOR_HEADER_BYTES;
  for (let i = 0; i < count; i++) {
    const sys = manifest.systems[i];
    view.setFloat32(offset + 0, sys.x, true);
    view.setFloat32(offset + 4, sys.y, true);
    view.setFloat32(offset + 8, sys.z, true);
    view.setUint32(offset + 12, fnv1a32(sys.id), true);
    offset += BINARY_SECTOR_RECORD_BYTES;
  }

  return new Uint8Array(buffer);
}

/**
 * Decodes the 24-byte header of a binary sector file.
 */
export function decodeBinarySectorHeader(buffer: ArrayBuffer): BinarySectorHeader {
  if (buffer.byteLength < BINARY_SECTOR_HEADER_BYTES) {
    throw new Error(
      `Binary sector buffer too short: ${buffer.byteLength} bytes, expected at least ${BINARY_SECTOR_HEADER_BYTES} bytes`,
    );
  }

  const view = new DataView(buffer);
  const magic = view.getUint32(0, true);
  if (magic !== BINARY_SECTOR_MAGIC) {
    throw new Error(
      `Invalid binary sector magic: 0x${magic.toString(16)}, expected 0x${BINARY_SECTOR_MAGIC.toString(16)}`,
    );
  }

  const count = view.getUint32(4, true);
  const originX = view.getFloat32(8, true);
  const originY = view.getFloat32(12, true);
  const originZ = view.getFloat32(16, true);
  const sectorSize = view.getFloat32(20, true);

  return {
    magic,
    count,
    origin: [originX, originY, originZ],
    sectorSize,
  };
}

/**
 * Decodes a complete binary sector buffer into structured typed arrays and zero-copy views.
 */
export function decodeBinarySector(buffer: ArrayBuffer): DecodedBinarySector {
  const header = decodeBinarySectorHeader(buffer);
  const expectedByteLength = BINARY_SECTOR_HEADER_BYTES + header.count * BINARY_SECTOR_RECORD_BYTES;

  if (buffer.byteLength !== expectedByteLength) {
    throw new Error(
      `Binary sector byte length mismatch: buffer has ${buffer.byteLength} bytes, header expects ${expectedByteLength} bytes (${header.count} stars)`,
    );
  }

  const interleavedFloats = new Float32Array(
    buffer,
    BINARY_SECTOR_HEADER_BYTES,
    header.count * BINARY_SECTOR_STRIDE_ELEMENTS,
  );
  const interleavedUints = new Uint32Array(
    buffer,
    BINARY_SECTOR_HEADER_BYTES,
    header.count * BINARY_SECTOR_STRIDE_ELEMENTS,
  );

  const positions = new Float32Array(header.count * 3);
  const ids = new Uint32Array(header.count);
  const view = new DataView(buffer);

  let offset = BINARY_SECTOR_HEADER_BYTES;
  for (let i = 0; i < header.count; i++) {
    positions[i * 3 + 0] = view.getFloat32(offset + 0, true);
    positions[i * 3 + 1] = view.getFloat32(offset + 4, true);
    positions[i * 3 + 2] = view.getFloat32(offset + 8, true);
    ids[i] = view.getUint32(offset + 12, true);
    offset += BINARY_SECTOR_RECORD_BYTES;
  }

  return {
    header,
    positions,
    ids,
    interleavedFloats,
    interleavedUints,
    buffer,
  };
}
