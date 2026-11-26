import { DEG_TO_RADIANS } from './astroCoordinates';

export const J2000_UNIX_MS = Date.UTC(2000, 0, 1, 12, 0, 0);

const GAUSS_K_RAD_PER_DAY = 0.01720209895;
const MS_PER_DAY = 86_400_000;
const HYPERBOLIC_H_LIMIT = 30;

export function solveHyperbolicAnomaly(e: number, M: number): number {
  if (!Number.isFinite(M) || M === 0) return 0;
  const absM = Math.abs(M);
  let H =
    absM > 1
      ? Math.sign(M) * Math.log((2 * absM) / e + 1.8)
      : M / (e - 1);
  for (let i = 0; i < 12; i++) {
    const clampedH = Math.max(-HYPERBOLIC_H_LIMIT, Math.min(HYPERBOLIC_H_LIMIT, H));
    const f = e * Math.sinh(clampedH) - clampedH - M;
    const fPrime = e * Math.cosh(clampedH) - 1;
    if (Math.abs(fPrime) < 1e-12) break;
    H = clampedH - f / fPrime;
  }
  return Math.max(-HYPERBOLIC_H_LIMIT, Math.min(HYPERBOLIC_H_LIMIT, H));
}

export function computeHyperbolicRadiusAu(
  orbit: { semiMajorAxis: number; eccentricity: number; meanAnomaly?: number },
  epochMs: number,
  primaryMassMsun = 1.0,
): number {
  if (
    !Number.isFinite(orbit.semiMajorAxis) ||
    orbit.semiMajorAxis >= 0 ||
    !Number.isFinite(orbit.eccentricity) ||
    orbit.eccentricity <= 1 ||
    !Number.isFinite(epochMs) ||
    !Number.isFinite(primaryMassMsun) ||
    primaryMassMsun <= 0
  ) {
    return 0;
  }
  const absA = Math.abs(orbit.semiMajorAxis);
  const e = orbit.eccentricity;
  const nRadPerDay = GAUSS_K_RAD_PER_DAY * Math.sqrt(primaryMassMsun / (absA ** 3));
  const deltaDays = (epochMs - J2000_UNIX_MS) / MS_PER_DAY;
  const baseMeanAnomaly = Number.isFinite(orbit.meanAnomaly) ? (orbit.meanAnomaly ?? 0) : 0;
  const M = baseMeanAnomaly * DEG_TO_RADIANS + nRadPerDay * deltaDays;
  const H = solveHyperbolicAnomaly(e, M);
  return absA * (e * Math.cosh(H) - 1);
}
