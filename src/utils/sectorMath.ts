import type { CartesianCoordinates } from '../types/astroCoordinates';

/** Default 3D spatial partition sector cube side length in parsecs */
export const DEFAULT_SECTOR_SIZE_PC = 25;

/**
 * Calculates the lower-bound axis alignment coordinate for a given 1D position.
 */
export function getSectorCoordinate(
  val: number,
  size = DEFAULT_SECTOR_SIZE_PC,
): number {
  if (!Number.isFinite(val)) {
    throw new TypeError(`Coordinate value must be a finite number: ${val}`);
  }
  if (!Number.isFinite(size) || size <= 0) {
    throw new RangeError(`Sector size must be a positive finite number: ${size}`);
  }

  const coord = Math.floor(val / size) * size;
  return Object.is(coord, -0) ? 0 : coord;
}

/**
 * Formats a formal 3D spatial sector identifier based on coordinates in parsecs.
 * Uses uniform signed 3-digit zero-padded coordinates: e.g. "sector_+000_-050_+025".
 */
export function formatSectorId(
  x: number,
  y: number,
  z: number,
  size = DEFAULT_SECTOR_SIZE_PC,
): string {
  const sx = getSectorCoordinate(x, size);
  const sy = getSectorCoordinate(y, size);
  const sz = getSectorCoordinate(z, size);

  const formatCoord = (n: number) => {
    const sign = n >= 0 ? '+' : '-';
    const abs = Math.abs(n);
    return `${sign}${String(abs).padStart(3, '0')}`;
  };

  return `sector_${formatCoord(sx)}_${formatCoord(sy)}_${formatCoord(sz)}`;
}

/**
 * Resolves the 3D bounding box coordinates [min, max] for a given sector identifier.
 */
export function getSectorBounds(
  sectorId: string,
  size = DEFAULT_SECTOR_SIZE_PC,
): { min: CartesianCoordinates; max: CartesianCoordinates } | null {
  if (!Number.isFinite(size) || size <= 0) {
    return null;
  }

  const match = /^sector_([+-]\d+)_([+-]\d+)_([+-]\d+)$/.exec(sectorId);
  const rawX = match?.[1];
  const rawY = match?.[2];
  const rawZ = match?.[3];
  if (!rawX || !rawY || !rawZ) return null;

  const minX = parseInt(rawX, 10);
  const minY = parseInt(rawY, 10);
  const minZ = parseInt(rawZ, 10);

  return {
    min: { x: minX, y: minY, z: minZ },
    max: { x: minX + size, y: minY + size, z: minZ + size },
  };
}
