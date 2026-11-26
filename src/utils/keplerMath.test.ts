import { describe, it, expect } from 'vitest';
import {
  J2000_UNIX_MS,
  computeHyperbolicRadiusAu,
  computeOptimisticHabitableZoneAu,
  solveHyperbolicAnomaly,
} from './keplerMath';

describe('keplerMath', () => {
  it('solves hyperbolic anomaly accurately for positive and negative mean anomalies', () => {
    const posM = 3.5;
    const e = 2.4;
    const hPos = solveHyperbolicAnomaly(e, posM);
    expect(hPos).toBeGreaterThan(0);
    expect(e * Math.sinh(hPos) - hPos).toBeCloseTo(posM, 10);

    const negM = -2.75;
    const hNeg = solveHyperbolicAnomaly(e, negM);
    expect(hNeg).toBeCloseTo(-solveHyperbolicAnomaly(e, Math.abs(negM)), 10);
    expect(e * Math.sinh(hNeg) - hNeg).toBeCloseTo(negM, 10);
  });

  it('converges cleanly for near-parabolic eccentricity with small mean anomaly', () => {
    const e = 1.001;
    const smallM = 0.05;
    const hSmall = solveHyperbolicAnomaly(e, smallM);
    expect(Number.isFinite(hSmall)).toBe(true);
    expect(e * Math.sinh(hSmall) - hSmall).toBeCloseTo(smallM, 9);

    const tinyM = 0.0005;
    const hTiny = solveHyperbolicAnomaly(e, tinyM);
    expect(Number.isFinite(hTiny)).toBe(true);
    expect(e * Math.sinh(hTiny) - hTiny).toBeCloseTo(tinyM, 9);
  });

  it('clamps extreme mean anomalies to the hyperbolic anomaly limit and rejects invalid inputs', () => {
    expect(solveHyperbolicAnomaly(2.0, 1e20)).toBe(30);
    expect(solveHyperbolicAnomaly(2.0, -1e20)).toBe(-30);

    expect(solveHyperbolicAnomaly(1.0, 1.5)).toBe(0);
    expect(solveHyperbolicAnomaly(0.8, 1.5)).toBe(0);
    expect(solveHyperbolicAnomaly(-2.0, 1.5)).toBe(0);
    expect(solveHyperbolicAnomaly(Number.NaN, 1.5)).toBe(0);
    expect(solveHyperbolicAnomaly(Number.POSITIVE_INFINITY, 1.5)).toBe(0);
    expect(solveHyperbolicAnomaly(2.0, Number.NaN)).toBe(0);
    expect(solveHyperbolicAnomaly(2.0, Number.POSITIVE_INFINITY)).toBe(0);
    expect(solveHyperbolicAnomaly(2.0, 0)).toBe(0);
  });

  it('scales hyperbolic radius with primaryMassMsun and guards invalid inputs', () => {
    const orbit = { semiMajorAxis: -2.0, eccentricity: 2.5, meanAnomaly: 0 };
    const oneYearAfterJ2000 = J2000_UNIX_MS + 365.25 * 86_400_000;

    const rSun = computeHyperbolicRadiusAu(orbit, oneYearAfterJ2000, 1.0);
    const rMassive = computeHyperbolicRadiusAu(orbit, oneYearAfterJ2000, 4.0);
    expect(rMassive).toBeGreaterThan(rSun);

    const rDefaultAnomaly = computeHyperbolicRadiusAu(
      { semiMajorAxis: -2.0, eccentricity: 2.5 },
      J2000_UNIX_MS,
    );
    expect(rDefaultAnomaly).toBeCloseTo(3.0, 6);

    expect(computeHyperbolicRadiusAu(orbit, oneYearAfterJ2000, 0)).toBe(0);
    expect(computeHyperbolicRadiusAu(orbit, oneYearAfterJ2000, -1.5)).toBe(0);
    expect(computeHyperbolicRadiusAu(orbit, oneYearAfterJ2000, Number.NaN)).toBe(0);
    expect(
      computeHyperbolicRadiusAu({ semiMajorAxis: 0, eccentricity: 2.5 }, oneYearAfterJ2000),
    ).toBe(0);
    expect(
      computeHyperbolicRadiusAu({ semiMajorAxis: -2.0, eccentricity: 1.0 }, oneYearAfterJ2000),
    ).toBe(0);
  });

  it('computes Kopparapu optimistic habitable zone bounds from stellar luminosity', () => {
    expect(computeOptimisticHabitableZoneAu(1.0)).toEqual([0.75, 1.77]);
    expect(computeOptimisticHabitableZoneAu(0.52)).toEqual([0.5408, 1.2764]);
    expect(computeOptimisticHabitableZoneAu(0)).toBeUndefined();
    expect(computeOptimisticHabitableZoneAu(-1)).toBeUndefined();
    expect(computeOptimisticHabitableZoneAu(Number.NaN)).toBeUndefined();
    expect(computeOptimisticHabitableZoneAu(Number.POSITIVE_INFINITY)).toBeUndefined();
    expect(computeOptimisticHabitableZoneAu(undefined)).toBeUndefined();
  });
});
