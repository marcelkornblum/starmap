import type {
  CartesianTuple,
  CartesianCoordinates,
  KinematicVector,
} from '../types/astro';

/** Multiplier to convert Right Ascension decimal hours [0, 24) to radians: (2 * PI) / 24 */
export const HOURS_TO_RADIANS = Math.PI / 12;

/** Multiplier to convert degrees to radians: PI / 180 */
export const DEG_TO_RADIANS = Math.PI / 180;

/** Multiplier to convert radians to degrees: 180 / PI */
export const RADIANS_TO_DEG = 180 / Math.PI;

/** Obliquity of the Earth's ecliptic plane in degrees (epoch J2000) */
export const EARTH_OBLIQUITY_DEG = 23.4392911;

/** Obliquity of the Earth's ecliptic plane in radians (epoch J2000) */
export const EARTH_OBLIQUITY_RAD = EARTH_OBLIQUITY_DEG * DEG_TO_RADIANS;

/**
 * Options for orbital plane rotation transformations.
 */
export interface PlaneRotationOptions {
  /** If true, angles are treated as degrees instead of radians. Default: false */
  degrees?: boolean;
}

/**
 * Converts celestial Equatorial coordinates (Right Ascension, Declination, Distance)
 * to 3D Cartesian coordinates [x, y, z] in parsecs (Equatorial frame, epoch J2000).
 *
 * @param ra Right Ascension in decimal hours [0, 24)
 * @param dec Declination in decimal degrees [-90, +90]
 * @param dist Distance from origin in parsecs
 * @returns New Cartesian tuple [x, y, z]
 */
export function equatorialToCartesian(
  ra: number,
  dec: number,
  dist: number,
): CartesianTuple;

/**
 * Converts celestial Equatorial coordinates (Right Ascension, Declination, Distance)
 * directly into an existing output buffer or array (zero-allocation).
 *
 * @param ra Right Ascension in decimal hours [0, 24)
 * @param dec Declination in decimal degrees [-90, +90]
 * @param dist Distance from origin in parsecs
 * @param target Output buffer or array to mutate directly
 * @param offset Optional offset index into target (default 0)
 * @returns The mutated target array
 */
export function equatorialToCartesian<
  T extends Float32Array | Float64Array | number[],
>(
  ra: number,
  dec: number,
  dist: number,
  target: T,
  offset?: number,
): T;

export function equatorialToCartesian(
  ra: number,
  dec: number,
  dist: number,
  target?: Float32Array | Float64Array | number[],
  offset = 0,
): CartesianTuple | Float32Array | Float64Array | number[] {
  const raRad = ra * HOURS_TO_RADIANS;
  const decRad = dec * DEG_TO_RADIANS;

  const cosDec = Math.cos(decRad);
  const sinDec = Math.sin(decRad);
  const cosRa = Math.cos(raRad);
  const sinRa = Math.sin(raRad);

  const x = dist * cosDec * cosRa;
  const y = dist * cosDec * sinRa;
  const z = dist * sinDec;

  if (!target) {
    return [x, y, z];
  }

  if (offset < 0 || offset + 3 > target.length) {
    throw new RangeError(
      `Target buffer offset out of bounds: offset=${offset}, length=${target.length}`,
    );
  }

  target[offset] = x;
  target[offset + 1] = y;
  target[offset + 2] = z;

  return target;
}

/**
 * Reorients 3D Cartesian coordinates in a Float32Array buffer to an arbitrary orbital plane
 * defined by inclination and longitude of the ascending node.
 * Mutates the buffer in-place with zero heap allocations during vertex processing.
 *
 * Mathematical foundation:
 *   Rotation around the line of nodes unit vector u = [cos(Omega), sin(Omega), 0]
 *   by inclination angle i using Rodrigues' rotation matrix.
 *
 * @param buffer Interleaved Float32Array [x0, y0, z0, x1, y1, z1, ..., xN, yN, zN]
 * @param inclination Tilt angle relative to reference plane (radians, or degrees if options.degrees = true)
 * @param ascendingNode Longitude of ascending node defining tilt axis (radians, or degrees if options.degrees = true)
 * @param options Optional configuration flags (e.g. degrees)
 * @returns The mutated Float32Array buffer (same reference)
 */
export function rotateToOrbitalPlane(
  buffer: Float32Array,
  inclination: number,
  ascendingNode = 0,
  options?: PlaneRotationOptions,
): Float32Array {
  if (inclination === 0) {
    return buffer;
  }

  const isDegrees = options?.degrees === true;
  const incRad = isDegrees ? inclination * DEG_TO_RADIANS : inclination;
  const nodeRad = isDegrees ? ascendingNode * DEG_TO_RADIANS : ascendingNode;

  const cosInc = Math.cos(incRad);
  const sinInc = Math.sin(incRad);
  const k = 1 - cosInc;

  const ux = Math.cos(nodeRad);
  const uy = Math.sin(nodeRad);

  // 3x3 rotation matrix coefficients computed once prior to iteration
  const m00 = cosInc + k * ux * ux;
  const m01 = k * ux * uy;
  const m02 = -sinInc * uy;

  const m10 = k * ux * uy;
  const m11 = cosInc + k * uy * uy;
  const m12 = sinInc * ux;

  const m20 = sinInc * uy;
  const m21 = -sinInc * ux;
  const m22 = cosInc;

  const length = buffer.length - (buffer.length % 3);

  for (let i = 0; i < length; i += 3) {
    const x = buffer[i];
    const y = buffer[i + 1];
    const z = buffer[i + 2];

    buffer[i] = m00 * x + m01 * y + m02 * z;
    buffer[i + 1] = m10 * x + m11 * y + m12 * z;
    buffer[i + 2] = m20 * x + m21 * y + m22 * z;
  }

  return buffer;
}

/**
 * Conversion factor from parsecs per Julian year (pc/yr) to kilometers per second (km/s).
 * 1 pc = 3.085677581491367e13 km
 * 1 Julian year = 31557600 s (365.25 days)
 * 1 pc/yr = 977,792.22168 km/s
 */
export const PARSECS_PER_YEAR_TO_KMS = 977792.22168;

/**
 * Parses and converts Cartesian velocity components from parsecs per year into a formal
 * KinematicVector in kilometers per second (km/s).
 *
 * @param vxPcPerYear Velocity component X in pc/yr (Equatorial J2000)
 * @param vyPcPerYear Velocity component Y in pc/yr (Equatorial J2000)
 * @param vzPcPerYear Velocity component Z in pc/yr (Equatorial J2000)
 * @param pmra Optional proper motion in Right Ascension (mas/yr)
 * @param pmdec Optional proper motion in Declination (mas/yr)
 * @param radialVelocity Optional line-of-sight radial velocity (km/s)
 * @returns KinematicVector in km/s or undefined if Cartesian velocity components are unavailable
 */
export function parseKinematicVector(
  vxPcPerYear?: number | null,
  vyPcPerYear?: number | null,
  vzPcPerYear?: number | null,
  pmra?: number | null,
  pmdec?: number | null,
  radialVelocity?: number | null,
): KinematicVector | undefined {
  if (
    vxPcPerYear === undefined ||
    vxPcPerYear === null ||
    vyPcPerYear === undefined ||
    vyPcPerYear === null ||
    vzPcPerYear === undefined ||
    vzPcPerYear === null ||
    isNaN(vxPcPerYear) ||
    isNaN(vyPcPerYear) ||
    isNaN(vzPcPerYear)
  ) {
    return undefined;
  }

  const vx = vxPcPerYear * PARSECS_PER_YEAR_TO_KMS;
  const vy = vyPcPerYear * PARSECS_PER_YEAR_TO_KMS;
  const vz = vzPcPerYear * PARSECS_PER_YEAR_TO_KMS;
  const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);

  return {
    vx,
    vy,
    vz,
    speed,
    pmra: pmra != null && !isNaN(pmra) ? pmra : undefined,
    pmdec: pmdec != null && !isNaN(pmdec) ? pmdec : undefined,
    radialVelocity:
      radialVelocity != null && !isNaN(radialVelocity) ? radialVelocity : undefined,
  };
}

/** Default 3D spatial partition sector cube side length in parsecs */
export const DEFAULT_SECTOR_SIZE_PC = 25;

/**
 * Calculates the lower-bound axis alignment coordinate for a given 1D position.
 *
 * @param val Position along a Cartesian axis in parsecs
 * @param size Sector dimension in parsecs (default: 25)
 * @returns Aligned sector base coordinate
 */
export function getSectorCoordinate(
  val: number,
  size = DEFAULT_SECTOR_SIZE_PC,
): number {
  return Math.floor(val / size) * size;
}

/**
 * Formats a formal 3D spatial sector identifier based on coordinates in parsecs.
 * Uses uniform signed 3-digit zero-padded coordinates: e.g. "sector_+000_-050_+025".
 *
 * @param x Cartesian X in parsecs
 * @param y Cartesian Y in parsecs
 * @param z Cartesian Z in parsecs
 * @param size Sector dimension in parsecs (default: 25)
 * @returns Standardized sector identifier string
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
 *
 * @param sectorId Standard sector identifier string (e.g. "sector_+000_-050_+025")
 * @param size Sector dimension in parsecs (default: 25)
 * @returns Bounding box with min and max CartesianCoordinates, or null if malformed
 */
export function getSectorBounds(
  sectorId: string,
  size = DEFAULT_SECTOR_SIZE_PC,
): { min: CartesianCoordinates; max: CartesianCoordinates } | null {
  const match = /^sector_([+-]\d{3})_([+-]\d{3})_([+-]\d{3})$/.exec(sectorId);
  if (!match) return null;

  const minX = parseInt(match[1], 10);
  const minY = parseInt(match[2], 10);
  const minZ = parseInt(match[3], 10);

  return {
    min: { x: minX, y: minY, z: minZ },
    max: { x: minX + size, y: minY + size, z: minZ + size },
  };
}
