import type { CartesianTuple } from '../types/astro';

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
