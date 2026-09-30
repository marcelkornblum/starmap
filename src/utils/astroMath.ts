import type { CartesianTuple } from '../types/astro'

/** Multiplier to convert Right Ascension decimal hours [0, 24) to radians: (2 * PI) / 24 */
export const HOURS_TO_RADIANS = Math.PI / 12

/** Multiplier to convert degrees to radians: PI / 180 */
export const DEG_TO_RADIANS = Math.PI / 180

/** Multiplier to convert radians to degrees: 180 / PI */
export const RADIANS_TO_DEG = 180 / Math.PI

/**
 * Options for orbital plane rotation transformations.
 */
export interface PlaneRotationOptions {
  /** If true, angles are treated as degrees instead of radians. Default: false */
  degrees?: boolean
}

/**
 * Converts celestial Equatorial coordinates (Right Ascension, Declination, Distance)
 * to 3D Cartesian coordinates [x, y, z] in parsecs (Equatorial frame, epoch J2000).
 *
 * Mathematical formulas:
 *   x = dist * cos(decRad) * cos(raRad)
 *   y = dist * cos(decRad) * sin(raRad)
 *   z = dist * sin(decRad)
 *
 * @param ra Right Ascension in decimal hours [0, 24)
 * @param dec Declination in decimal degrees [-90, +90]
 * @param dist Distance from origin in parsecs
 * @param target Optional output buffer or array to mutate directly (avoids GC allocations)
 * @param offset Optional offset index into target (default 0)
 * @returns The Cartesian tuple or target array mutated with [x, y, z]
 */
export function equatorialToCartesian<
  T extends Float32Array | Float64Array | number[] = CartesianTuple,
>(
  ra: number,
  dec: number,
  dist: number,
  target?: T,
  offset = 0,
): T {
  const raRad = ra * HOURS_TO_RADIANS
  const decRad = dec * DEG_TO_RADIANS

  const cosDec = Math.cos(decRad)
  const sinDec = Math.sin(decRad)
  const cosRa = Math.cos(raRad)
  const sinRa = Math.sin(raRad)

  const x = dist * cosDec * cosRa
  const y = dist * cosDec * sinRa
  const z = dist * sinDec

  const out = (target ?? [0, 0, 0]) as unknown as T
  out[offset] = x
  out[offset + 1] = y
  out[offset + 2] = z

  return out
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
    return buffer
  }

  const isDegrees = options?.degrees === true
  const incRad = isDegrees ? inclination * DEG_TO_RADIANS : inclination
  const nodeRad = isDegrees ? ascendingNode * DEG_TO_RADIANS : ascendingNode

  const cosInc = Math.cos(incRad)
  const sinInc = Math.sin(incRad)
  const k = 1 - cosInc

  const ux = Math.cos(nodeRad)
  const uy = Math.sin(nodeRad)

  // 3x3 rotation matrix coefficients computed once prior to iteration
  const m00 = cosInc + k * ux * ux
  const m01 = k * ux * uy
  const m02 = -sinInc * uy

  const m10 = k * ux * uy
  const m11 = cosInc + k * uy * uy
  const m12 = sinInc * ux

  const m20 = sinInc * uy
  const m21 = -sinInc * ux
  const m22 = cosInc

  const length = buffer.length - (buffer.length % 3)

  for (let i = 0; i < length; i += 3) {
    const x = buffer[i]
    const y = buffer[i + 1]
    const z = buffer[i + 2]

    buffer[i] = m00 * x + m01 * y + m02 * z
    buffer[i + 1] = m10 * x + m11 * y + m12 * z
    buffer[i + 2] = m20 * x + m21 * y + m22 * z
  }

  return buffer
}
