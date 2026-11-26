import { DEG_TO_RADIANS, rotateToOrbitalPlane } from '../../../utils/astroCoordinates';
import {
  J2000_UNIX_MS,
  computeHyperbolicRadiusAu,
  solveHyperbolicAnomaly,
} from '../../../utils/keplerMath';

export { J2000_UNIX_MS, computeHyperbolicRadiusAu };

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
 * Calculates 3D orbital velocity vector [vx, vy, vz] on an elliptic or hyperbolic Keplerian orbit.
 *
 * @param a Semi-major axis (positive for elliptic, negative for hyperbolic)
 * @param e Eccentricity (0 <= e < 1 for elliptic, e > 1 for hyperbolic)
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
  const M = meanAnomalyDeg * DEG_TO_RADIANS;
  const safeMu = Number.isFinite(mu) && mu > 0 ? mu : 1.0;
  let vxOrb: number;
  let vyOrb: number;

  if (Number.isFinite(a) && a < 0 && Number.isFinite(e) && e > 1) {
    const absA = Math.abs(a);
    const H = solveHyperbolicAnomaly(e, M);
    const vScale = Math.sqrt(safeMu / absA);
    const denom = e * Math.cosh(H) - 1;
    vxOrb = (-vScale * Math.sinh(H)) / denom;
    vyOrb = (vScale * Math.sqrt(e * e - 1) * Math.cosh(H)) / denom;
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
    const r = safeA * (1 - safeE * Math.cos(E));
    const n = Math.sqrt(safeMu / (safeA * safeA * safeA));
    const Edot = (n * safeA) / r;

    vxOrb = -safeA * Math.sin(E) * Edot;
    vyOrb = b * Math.cos(E) * Edot;
  }

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
