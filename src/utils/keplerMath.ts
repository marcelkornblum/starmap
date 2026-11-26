import { DEG_TO_RADIANS } from './astroCoordinates';

export const J2000_UNIX_MS = Date.UTC(2000, 0, 1, 12, 0, 0);

const GAUSS_K_RAD_PER_DAY = 0.01720209895;
const MS_PER_DAY = 86_400_000;
const HYPERBOLIC_H_LIMIT = 30;

/**
 * Solves Kepler's hyperbolic equation M = e * sinh(H) - H for hyperbolic eccentric anomaly H.
 */
export function solveHyperbolicAnomaly(e: number, M: number): number {
  if (!Number.isFinite(e) || e <= 1 || !Number.isFinite(M) || M === 0) {
    return 0;
  }
  const absM = Math.abs(M);
  const maxM = e * Math.sinh(HYPERBOLIC_H_LIMIT) - HYPERBOLIC_H_LIMIT;
  if (absM >= maxM) {
    return Math.sign(M) * HYPERBOLIC_H_LIMIT;
  }
  let lo = 0;
  const candidateHi = Math.min(
    HYPERBOLIC_H_LIMIT,
    Math.max(Math.cbrt((6 * absM) / e), Math.log((2 * absM) / e + 1.8)) + 0.5,
  );
  let hi =
    e * Math.sinh(candidateHi) - candidateHi >= absM
      ? candidateHi
      : HYPERBOLIC_H_LIMIT;
  const rawInitialH =
    absM > 1
      ? Math.log((2 * absM) / e + 1.8)
      : Math.asinh(absM / e);
  let absH = Math.max(lo, Math.min(hi, rawInitialH));
  for (let i = 0; i < 24; i++) {
    const f = e * Math.sinh(absH) - absH - absM;
    if (Math.abs(f) < 1e-12) {
      break;
    }
    if (f < 0) {
      lo = absH;
    } else {
      hi = absH;
    }
    const fPrime = e * Math.cosh(absH) - 1;
    const candidate = Math.abs(fPrime) >= 1e-12 ? absH - f / fPrime : (lo + hi) * 0.5;
    absH = candidate > lo && candidate < hi && Number.isFinite(candidate) ? candidate : (lo + hi) * 0.5;
  }
  return Math.sign(M) * Math.min(HYPERBOLIC_H_LIMIT, absH);
}

/**
 * Computes heliocentric radial distance in AU along a hyperbolic orbit at the specified epoch.
 */
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
  const baseMeanAnomaly =
    typeof orbit.meanAnomaly === 'number' && Number.isFinite(orbit.meanAnomaly)
      ? orbit.meanAnomaly
      : 0;
  const M = baseMeanAnomaly * DEG_TO_RADIANS + nRadPerDay * deltaDays;
  const H = solveHyperbolicAnomaly(e, M);
  return absA * (e * Math.cosh(H) - 1);
}

/**
 * Computes Kopparapu optimistic habitable zone bounds `[innerAu, outerAu]` from stellar luminosity.
 */
export function computeOptimisticHabitableZoneAu(
  luminosityLsun: number | undefined,
): readonly [number, number] | undefined {
  if (
    typeof luminosityLsun !== 'number' ||
    !Number.isFinite(luminosityLsun) ||
    luminosityLsun <= 0
  ) {
    return undefined;
  }
  const sqrtL = Math.sqrt(luminosityLsun);
  return [Number((0.75 * sqrtL).toFixed(4)), Number((1.77 * sqrtL).toFixed(4))];
}
