import { describe, it, expect } from 'vitest';
import {
  PARSEC_TO_LY,
  AU_TO_KM,
  AU_TO_LIGHT_MINUTES,
  STANDARD_G_MPS2,
  LY_PER_YEAR2_PER_G,
  computeEuclideanDistance3D,
  computeInterstellarRelativisticTransit,
  computeInterstellarConstantBetaTransit,
  computeIntraSystemBrachistochroneTransit,
  computeHohmannTransferOrbit,
} from './transitDynamics';

describe('transitDynamics (DEC-032 / astroMath decomposition)', () => {
  it('exports accurate astronomical constants', () => {
    expect(PARSEC_TO_LY).toBeCloseTo(3.26156, 4);
    expect(AU_TO_KM).toBeCloseTo(149597870.7, 1);
    expect(AU_TO_LIGHT_MINUTES).toBeCloseTo(8.3167, 3);
    expect(STANDARD_G_MPS2).toBeCloseTo(9.80665, 4);
    expect(LY_PER_YEAR2_PER_G).toBeCloseTo(1.03227, 4);
  });

  describe('computeEuclideanDistance3D', () => {
    it('computes 3D Euclidean distance and coordinate deltas correctly', () => {
      const p1: [number, number, number] = [0, 0, 0];
      const p2: [number, number, number] = [3, 4, 12];
      const result = computeEuclideanDistance3D(p1, p2);
      expect(result.distance).toBe(13);
      expect(result.dx).toBe(3);
      expect(result.dy).toBe(4);
      expect(result.dz).toBe(12);
    });
  });

  describe('computeInterstellarRelativisticTransit', () => {
    it('computes 1g relativistic transit for 11.90 ly correctly', () => {
      const result = computeInterstellarRelativisticTransit(11.9, 1.0);
      expect(result.shipProperTimeYears).toBeGreaterThan(0);
      expect(result.coordinateTimeYears).toBeGreaterThan(result.shipProperTimeYears);
      expect(result.peakBetaC).toBeGreaterThan(0.9);
      expect(result.peakBetaC).toBeLessThan(1.0);
      expect(result.turnaroundDistanceLy).toBe(5.95);
    });

    it('returns zero metrics for non-positive distance or acceleration', () => {
      const zeroDist = computeInterstellarRelativisticTransit(0, 1.0);
      expect(zeroDist.shipProperTimeYears).toBe(0);
      expect(zeroDist.coordinateTimeYears).toBe(0);
      expect(zeroDist.peakBetaC).toBe(0);

      const zeroAccel = computeInterstellarRelativisticTransit(10, 0);
      expect(zeroAccel.shipProperTimeYears).toBe(0);
    });
  });

  describe('computeInterstellarConstantBetaTransit', () => {
    it('computes constant-beta transit times and lorentz gamma', () => {
      const result = computeInterstellarConstantBetaTransit(10, 0.5);
      expect(result.coordinateTimeYears).toBe(20);
      expect(result.lorentzGamma).toBeCloseTo(1 / Math.sqrt(1 - 0.25), 4);
      expect(result.shipProperTimeYears).toBeCloseTo(20 / result.lorentzGamma, 4);
      expect(result.cruiseBetaC).toBe(0.5);
    });

    it('handles zero or negative distance safely', () => {
      const result = computeInterstellarConstantBetaTransit(0, 0.5);
      expect(result.shipProperTimeYears).toBe(0);
      expect(result.coordinateTimeYears).toBe(0);
    });
  });

  describe('computeIntraSystemBrachistochroneTransit', () => {
    it('computes intra-system continuous burn brachistochrone transit time', () => {
      const result = computeIntraSystemBrachistochroneTransit(1.0, 1.0);
      expect(result.transitDays).toBeGreaterThan(0);
      expect(result.transitHours).toBeCloseTo(result.transitDays * 24, 2);
      expect(result.peakVelocityKms).toBeGreaterThan(0);
      expect(result.deltaVKms).toBeCloseTo(result.peakVelocityKms * 2, 2);
      expect(result.turnaroundDistanceAu).toBe(0.5);
    });
  });

  describe('computeHohmannTransferOrbit', () => {
    it('computes Earth to Mars Hohmann transfer orbit parameters', () => {
      const result = computeHohmannTransferOrbit(1.0, 1.524, 1.0);
      expect(result.semiMajorAxisTransferAu).toBeCloseTo(1.262, 3);
      expect(result.transitMonths).toBeGreaterThan(8);
      expect(result.transitMonths).toBeLessThan(9);
      expect(result.totalDeltaVKms).toBeGreaterThan(5);
      expect(result.synodicPeriodDays).toBeDefined();
    });
  });
});
