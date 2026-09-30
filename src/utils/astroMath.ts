import type { CartesianTuple } from '../types/astro'

/** Multiplier to convert Right Ascension decimal hours [0, 24) to radians: (2 * PI) / 24 */
export const HOURS_TO_RADIANS = Math.PI / 12

/** Multiplier to convert degrees to radians: PI / 180 */
export const DEG_TO_RADIANS = Math.PI / 180

/** Multiplier to convert radians to degrees: 180 / PI */
export const RADIANS_TO_DEG = 180 / Math.PI

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
