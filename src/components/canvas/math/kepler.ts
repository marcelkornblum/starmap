import { DEG_TO_RADIANS, rotateToOrbitalPlane } from '../../../utils/astroMath';

/**
 * Calculates 3D Cartesian position [x, y, z] on a Keplerian orbit for a given mean anomaly in degrees.
 *
 * @param a Semi-major axis (in AU or scene coordinate units)
 * @param e Eccentricity (0 <= e < 1)
 * @param incDeg Orbital inclination in degrees
 * @param nodeDeg Longitude of ascending node in degrees
 * @param periDeg Argument of periapsis in degrees
 * @param meanAnomalyDeg Mean anomaly in degrees [0, 360)
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
  const safeA = Number.isFinite(a) && a > 0 ? a : 0.001;
  const safeE = Number.isFinite(e) ? Math.max(0, Math.min(0.999, e)) : 0;
  const M = meanAnomalyDeg * DEG_TO_RADIANS;

  // Solve Kepler's Equation for Eccentric Anomaly E: M = E - e*sin(E)
  let E = M + safeE * Math.sin(M);
  for (let i = 0; i < 5; i++) {
    const f = E - safeE * Math.sin(E) - M;
    const fPrime = 1 - safeE * Math.cos(E);
    E -= f / fPrime;
  }

  // Position in orbital plane where x is along the periapsis line:
  const b = safeA * Math.sqrt(1 - safeE * safeE);
  const xOrb = safeA * (Math.cos(E) - safeE);
  const yOrb = b * Math.sin(E);

  // Rotate by argument of periapsis omega in orbital plane:
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
  const n = Math.sqrt(mu / (safeA * safeA * safeA)); // mean motion
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
