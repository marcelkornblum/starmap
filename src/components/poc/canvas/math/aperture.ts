export type Vec3Tuple = readonly [number, number, number] | [number, number, number];

/**
 * Calculates current focal aperture radius based on camera distance and reference metrics.
 */
export function computeApertureRadius(
  camDistance: number,
  baseRadius: number,
  referenceDistance: number,
  screenConstant = true,
  minRadius = 0,
): number {
  if (!screenConstant) {
    return baseRadius;
  }
  const effectiveRefDist = referenceDistance > 0 ? referenceDistance : 3.49 * baseRadius;
  const clampedCamDist = Math.max(camDistance, minRadius);
  return baseRadius * (clampedCamDist / effectiveRefDist);
}

/**
 * Returns true if a position is within the aperture radius of origin.
 */
export function isInsideAperture(
  pos: Vec3Tuple,
  origin: Vec3Tuple,
  radius: number,
): boolean {
  const dx = pos[0] - origin[0];
  const dy = pos[1] - origin[1];
  const dz = pos[2] - origin[2];
  return dx * dx + dy * dy + dz * dz <= radius * radius;
}

/**
 * Calculates continuous alpha fade across the feathered aperture perimeter buffer.
 * - Inside featherThreshold (e.g. dist <= 0.8 * radius): 1.0 (full opacity).
 * - Between featherThreshold and radius: smooth quadratic fade from 1.0 to 0.0.
 * - Outside radius: 0.0 (fully dissolved).
 */
export function computePerimeterFade(
  dist: number,
  radius: number,
  featherThreshold = 0.8,
): number {
  if (radius <= 0 || dist >= radius) return 0;
  const innerR = radius * featherThreshold;
  if (dist <= innerR) return 1.0;
  const t = (radius - dist) / (radius - innerR);
  return t * t * (3 - 2 * t);
}
