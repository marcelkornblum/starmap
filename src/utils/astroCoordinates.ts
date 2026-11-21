import type { KinematicVector } from '../types/astro';
import type { CartesianTuple } from '../types/astroCoordinates';

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

/** Options for orbital plane rotation transformations. */
export interface PlaneRotationOptions {
  /** If true, angles are treated as degrees instead of radians. Default: false */
  degrees?: boolean;
}

/**
 * Converts celestial Equatorial coordinates (RA, Dec, Distance)
 * to 3D Cartesian coordinates [x, y, z] in parsecs (Equatorial frame, epoch J2000).
 */
export function equatorialToCartesian(
  ra: number,
  dec: number,
  dist: number,
): CartesianTuple;

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
  if (target && (!Number.isInteger(offset) || offset < 0 || offset + 3 > target.length)) {
    throw new RangeError(
      `Target buffer offset out of bounds: offset=${offset}, length=${target.length}`,
    );
  }

  if (dist === 0) {
    if (!target) {
      return [0, 0, 0];
    }
    target[offset] = 0;
    target[offset + 1] = 0;
    target[offset + 2] = 0;
    return target;
  }

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

  target[offset] = x;
  target[offset + 1] = y;
  target[offset + 2] = z;

  return target;
}

/**
 * Reorients 3D Cartesian coordinates in a Float32Array buffer to an arbitrary orbital plane
 * defined by inclination and longitude of the ascending node.
 * Mutates the buffer in-place with zero heap allocations during vertex processing.
 */
export function rotateToOrbitalPlane(
  buffer: Float32Array,
  inclination: number,
  ascendingNode = 0,
  options?: PlaneRotationOptions,
): Float32Array {
  if (!Number.isFinite(inclination) || inclination === 0) {
    return buffer;
  }

  const safeAscendingNode = Number.isFinite(ascendingNode) ? ascendingNode : 0;
  const isDegrees = options?.degrees === true;
  const incRad = isDegrees ? inclination * DEG_TO_RADIANS : inclination;
  const nodeRad = isDegrees ? safeAscendingNode * DEG_TO_RADIANS : safeAscendingNode;

  const cosInc = Math.cos(incRad);
  const sinInc = Math.sin(incRad);
  const k = 1 - cosInc;

  const ux = Math.cos(nodeRad);
  const uy = Math.sin(nodeRad);

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
    if (x === undefined || y === undefined || z === undefined) continue;

    buffer[i] = m00 * x + m01 * y + m02 * z;
    buffer[i + 1] = m10 * x + m11 * y + m12 * z;
    buffer[i + 2] = m20 * x + m21 * y + m22 * z;
  }

  return buffer;
}

/** Conversion factor from parsecs per Julian year (pc/yr) to km/s. */
export const PARSECS_PER_YEAR_TO_KMS = 977792.22168;

/**
 * Parses and converts Cartesian velocity components from parsecs per year into a formal
 * KinematicVector in km/s.
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
    Number.isNaN(vxPcPerYear) ||
    Number.isNaN(vyPcPerYear) ||
    Number.isNaN(vzPcPerYear)
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
    pmra: pmra != null && !Number.isNaN(pmra) ? pmra : undefined,
    pmdec: pmdec != null && !Number.isNaN(pmdec) ? pmdec : undefined,
    radialVelocity:
      radialVelocity != null && !Number.isNaN(radialVelocity) ? radialVelocity : undefined,
  };
}
