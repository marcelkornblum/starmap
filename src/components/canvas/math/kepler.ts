import { DEG_TO_RADIANS, rotateToOrbitalPlane } from '../../../utils/astroCoordinates';

export const J2000_UNIX_MS = Date.UTC(2000, 0, 1, 12, 0, 0);

const GAUSS_K_RAD_PER_DAY = 0.01720209895;
const MS_PER_DAY = 86_400_000;
const HYPERBOLIC_H_LIMIT = 30;

function solveHyperbolicAnomaly(e: number, M: number): number {
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

/**
 * Calculates 3D Cartesian position [x, y, z] on an elliptic or hyperbolic Keplerian orbit.
 *
 * @param a Semi-major axis (positive for elliptic, negative for hyperbolic, in AU or scene units)
 * @param e Eccentricity (0 <= e < 1 for elliptic, e > 1 for hyperbolic)
 * @param incDeg Orbital inclination in degrees
 * @param nodeDeg Longitude of ascending node in degrees
 * @param periDeg Argument of periapsis in degrees
 * @param meanAnomalyDeg Mean anomaly in degrees
 * @returns 3D Cartesian position tuple [x, y, z] relative to the orbital focal origin (0, 0, 0).
 */
export function calculateKeplerianPosition(
  a: number,
  e: number,
  incDeg: number,
  nodeDeg: number,
  periDeg: number,
  meanAnomalyDeg: number,
): [number, number, number] {
  const M = meanAnomalyDeg * DEG_TO_RADIANS;
  let xOrb: number;
  let yOrb: number;

  if (Number.isFinite(a) && a < 0 && Number.isFinite(e) && e > 1) {
    const absA = Math.abs(a);
    const H = solveHyperbolicAnomaly(e, M);
    xOrb = absA * (e - Math.cosh(H));
    yOrb = absA * Math.sqrt(e * e - 1) * Math.sinh(H);
  } else {
    const safeA = Number.isFinite(a) && a > 0 ? a : 0.001;
    const safeE = Number.isFinite(e) ? Math.max(0, Math.min(0.999, e)) : 0;
    let E = M + safeE * Math.sin(M);
    for (let i = 0; i < 5; i++) {
      const f = E - safeE * Math.sin(E) - M;
      const fPrime = 1 - safeE * Math.cos(E);
      E -= f / fPrime;
    }
    const b = safeA * Math.sqrt(1 - safeE * safeE);
    xOrb = safeA * (Math.cos(E) - safeE);
    yOrb = b * Math.sin(E);
  }

  const omegaRad = periDeg * DEG_TO_RADIANS;
  const xRot = xOrb * Math.cos(omegaRad) - yOrb * Math.sin(omegaRad);
  const yRot = xOrb * Math.sin(omegaRad) + yOrb * Math.cos(omegaRad);

  const buf = new Float32Array([xRot, yRot, 0]);
  rotateToOrbitalPlane(buf, incDeg, nodeDeg, { degrees: true });
  return [
    Math.abs(buf[0]) < 1e-6 ? 0 : Number(buf[0].toFixed(6)),
    Math.abs(buf[1]) < 1e-6 ? 0 : Number(buf[1].toFixed(6)),
    Math.abs(buf[2]) < 1e-6 ? 0 : Number(buf[2].toFixed(6)),
  ];
}

/**
 * Computes heliocentric radial distance in AU along a hyperbolic orbit at the specified epoch.
 *
 * @param orbit Hyperbolic orbital elements with a < 0 and e > 1
 * @param epochMs Target epoch timestamp in Unix milliseconds
 * @param primaryMassMsun Primary body mass in solar masses (default 1.0)
 * @returns Radial distance from the focal body in AU, or 0 for non-hyperbolic inputs.
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
  const baseMeanAnomaly = Number.isFinite(orbit.meanAnomaly) ? (orbit.meanAnomaly ?? 0) : 0;
  const M = baseMeanAnomaly * DEG_TO_RADIANS + nRadPerDay * deltaDays;
  const H = solveHyperbolicAnomaly(e, M);
  return absA * (e * Math.cosh(H) - 1);
}

/**
 * Calculates 3D orbital velocity vector [vx, vy, vz] on a Keplerian orbit for a given mean anomaly.
 *
 * @param a Semi-major axis
 * @param e Eccentricity
 * @param incDeg Orbital inclination in degrees
 * @param nodeDeg Longitude of ascending node in degrees
 * @param periDeg Argument of periapsis in degrees
 * @param meanAnomalyDeg Mean anomaly in degrees
 * @param mu Standard gravitational parameter (default 1.0)
 * @returns 3D Cartesian velocity vector [vx, vy, vz].
 */
export function calculateKeplerianVelocity(
  a: number,
  e: number,
  incDeg: number,
  nodeDeg: number,
  periDeg: number,
  meanAnomalyDeg: number,
  mu = 1.0,
): [number, number, number] {
  const safeA = Number.isFinite(a) && a > 0 ? a : 0.001;
  const safeE = Number.isFinite(e) ? Math.max(0, Math.min(0.999, e)) : 0;
  const M = meanAnomalyDeg * DEG_TO_RADIANS;

  let E = M + safeE * Math.sin(M);
  for (let i = 0; i < 5; i++) {
    const f = E - safeE * Math.sin(E) - M;
    const fPrime = 1 - safeE * Math.cos(E);
    E -= f / fPrime;
  }

  const b = safeA * Math.sqrt(1 - safeE * safeE);
  const r = safeA * (1 - safeE * Math.cos(E));
  const n = Math.sqrt(mu / (safeA * safeA * safeA));
  const Edot = (n * safeA) / r;

  const vxOrb = -safeA * Math.sin(E) * Edot;
  const vyOrb = b * Math.cos(E) * Edot;

  const omegaRad = periDeg * DEG_TO_RADIANS;
  const vxRot = vxOrb * Math.cos(omegaRad) - vyOrb * Math.sin(omegaRad);
  const vyRot = vxOrb * Math.sin(omegaRad) + vyOrb * Math.cos(omegaRad);

  const buf = new Float32Array([vxRot, vyRot, 0]);
  rotateToOrbitalPlane(buf, incDeg, nodeDeg, { degrees: true });
  return [
    Math.abs(buf[0]) < 1e-6 ? 0 : Number(buf[0].toFixed(6)),
    Math.abs(buf[1]) < 1e-6 ? 0 : Number(buf[1].toFixed(6)),
    Math.abs(buf[2]) < 1e-6 ? 0 : Number(buf[2].toFixed(6)),
  ];
}
