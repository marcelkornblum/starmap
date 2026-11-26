import { describe, it, expect } from 'vitest';
import { DEG_TO_RADIANS } from '../../../utils/astroCoordinates';
import {
  J2000_UNIX_MS,
  calculateKeplerianPosition,
  calculateKeplerianVelocity,
  computeHyperbolicRadiusAu,
} from './kepler';

describe('kepler', () => {
  it('computes elliptic Keplerian position and velocity at periapsis and apoapsis', () => {
    const peri = calculateKeplerianPosition(2, 0.5, 0, 0, 0, 0);
    expect(peri[0]).toBeCloseTo(1, 5);
    expect(peri[1]).toBeCloseTo(0, 5);
    expect(peri[2]).toBeCloseTo(0, 5);

    const apo = calculateKeplerianPosition(2, 0.5, 0, 0, 0, 180);
    expect(apo[0]).toBeCloseTo(-3, 5);
    expect(apo[1]).toBeCloseTo(0, 5);
    expect(apo[2]).toBeCloseTo(0, 5);

    const vel = calculateKeplerianVelocity(1, 0, 0, 0, 0, 0);
    expect(vel[0]).toBeCloseTo(0, 5);
    expect(vel[1]).toBeCloseTo(1, 5);
    expect(vel[2]).toBeCloseTo(0, 5);
  });

  it('computes hyperbolic Keplerian position on inbound, periapsis, and outgoing legs', () => {
    const a = -3.2;
    const e = 3.7;
    const expectedPeriapsis = Math.abs(a) * (e - 1);
    const peri = calculateKeplerianPosition(a, e, 35.7, 178, 338, 0);
    const periDist = Math.hypot(peri[0], peri[1], peri[2]);
    expect(periDist).toBeCloseTo(expectedPeriapsis, 4);

    const outgoing = calculateKeplerianPosition(a, e, 35.7, 178, 338, 120);
    const outgoingDist = Math.hypot(outgoing[0], outgoing[1], outgoing[2]);
    expect(outgoingDist).toBeGreaterThan(expectedPeriapsis);

    const inbound = calculateKeplerianPosition(a, e, 35.7, 178, 338, -120);
    const inboundDist = Math.hypot(inbound[0], inbound[1], inbound[2]);
    expect(inboundDist).toBeCloseTo(outgoingDist, 4);
    expect(inbound).not.toEqual(outgoing);
  });

  it('computes hyperbolic Keplerian velocity matching finite-difference position derivative', () => {
    const a = -3.2;
    const e = 3.7;
    const inc = 35.7;
    const node = 178;
    const peri = 338;
    const mu = 2.5;
    const meanMotion = Math.sqrt(mu / (Math.abs(a) ** 3));
    const deltaDeg = 0.05;
    const dt = (2 * deltaDeg * DEG_TO_RADIANS) / meanMotion;

    for (const meanAnomalyDeg of [-45, 0, 60]) {
      const pMinus = calculateKeplerianPosition(a, e, inc, node, peri, meanAnomalyDeg - deltaDeg);
      const pPlus = calculateKeplerianPosition(a, e, inc, node, peri, meanAnomalyDeg + deltaDeg);
      const vel = calculateKeplerianVelocity(a, e, inc, node, peri, meanAnomalyDeg, mu);

      expect(vel[0]).toBeCloseTo((pPlus[0] - pMinus[0]) / dt, 3);
      expect(vel[1]).toBeCloseTo((pPlus[1] - pMinus[1]) / dt, 3);
      expect(vel[2]).toBeCloseTo((pPlus[2] - pMinus[2]) / dt, 3);
    }
  });

  it('falls back safely when e === 1 or a < 0 with e <= 1', () => {
    const parabolicFallbackPos = calculateKeplerianPosition(1.5, 1.0, 10, 20, 30, 45);
    const parabolicFallbackVel = calculateKeplerianVelocity(1.5, 1.0, 10, 20, 30, 45);
    expect(parabolicFallbackPos.every(Number.isFinite)).toBe(true);
    expect(parabolicFallbackVel.every(Number.isFinite)).toBe(true);

    const clampedFallbackPos = calculateKeplerianPosition(-2.0, 0.8, 0, 0, 0, 90);
    const clampedFallbackVel = calculateKeplerianVelocity(-2.0, 0.8, 0, 0, 0, 90);
    expect(clampedFallbackPos.every(Number.isFinite)).toBe(true);
    expect(clampedFallbackVel.every(Number.isFinite)).toBe(true);
  });

  it('computes realistic J2000-propagated hyperbolic heliocentric radii at 2026-11-26', () => {
    const epochMs = Date.UTC(2026, 10, 26);

    const voyager1Au = computeHyperbolicRadiusAu(
      { semiMajorAxis: -3.2, eccentricity: 3.7, meanAnomaly: 1191.0 },
      epochMs,
    );
    expect(voyager1Au).toBeGreaterThan(165);
    expect(voyager1Au).toBeLessThan(173);

    const newHorizonsAu = computeHyperbolicRadiusAu(
      { semiMajorAxis: -4.6, eccentricity: 1.54, meanAnomaly: -290.0 },
      epochMs,
    );
    expect(newHorizonsAu).toBeGreaterThan(62);
    expect(newHorizonsAu).toBeLessThan(68);

    const oumuamuaAu = computeHyperbolicRadiusAu(
      { semiMajorAxis: -1.272, eccentricity: 1.201, meanAnomaly: -4439.0 },
      epochMs,
    );
    expect(oumuamuaAu).toBeGreaterThan(52);
    expect(oumuamuaAu).toBeLessThan(58);

    const atlas3iAu = computeHyperbolicRadiusAu(
      { semiMajorAxis: -0.62, eccentricity: 3.85, meanAnomaly: -19043.9 },
      epochMs,
    );
    expect(atlas3iAu).toBeGreaterThan(8.5);
    expect(atlas3iAu).toBeLessThan(10.5);
  });

  it('returns periapsis at M=0 and J2000 epoch and returns 0 for non-hyperbolic inputs', () => {
    expect(
      computeHyperbolicRadiusAu({ semiMajorAxis: -2.5, eccentricity: 2.0, meanAnomaly: 0 }, J2000_UNIX_MS),
    ).toBeCloseTo(2.5, 6);

    expect(
      computeHyperbolicRadiusAu({ semiMajorAxis: 1.0, eccentricity: 0.2, meanAnomaly: 0 }, J2000_UNIX_MS),
    ).toBe(0);

    expect(
      computeHyperbolicRadiusAu({ semiMajorAxis: -1.0, eccentricity: 0.9, meanAnomaly: 0 }, J2000_UNIX_MS),
    ).toBe(0);

    expect(
      computeHyperbolicRadiusAu({ semiMajorAxis: -1.0, eccentricity: 2.0 }, Number.NaN),
    ).toBe(0);
  });
});
