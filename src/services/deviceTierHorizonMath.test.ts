import { describe, it, expect } from 'vitest';
import { DEFAULT_SECTOR_SIZE_PC } from '../utils/sectorMath';
import { TIER_PROFILE_RECORDS } from './deviceTierProfiles';
import {
  DEFAULT_AVG_BYTES_PER_SECTOR,
  DEFAULT_DENSE_CATALOG_RADIUS_PC,
  DEFAULT_DENSE_EDGE_MARGIN_PC,
  DEFAULT_GALACTIC_FOV_DEG,
  DEFAULT_GALACTIC_MIN_CAMERA_DISTANCE_PC,
  DEFAULT_GALACTIC_REFERENCE_CAMERA_DISTANCE_PC,
  DEFAULT_HORIZON_APERTURE_RATIO,
  computeHorizonReachPerCameraDist,
  computeActiveSectorHorizonCoverPc,
  clampDenseVolumeCeilingDistancePc,
  computeCeilingMaxCameraDistancePc,
  computeGalacticCeilingDistancePc,
} from './deviceTierHorizonMath';

describe('deviceTierHorizonMath', () => {
  it('exports expected constants including DEFAULT_AVG_BYTES_PER_SECTOR', () => {
    expect(DEFAULT_AVG_BYTES_PER_SECTOR).toBe(12_024);
    expect(DEFAULT_DENSE_CATALOG_RADIUS_PC).toBe(100);
    expect(DEFAULT_DENSE_EDGE_MARGIN_PC).toBe(8);
    expect(DEFAULT_HORIZON_APERTURE_RATIO).toBe(2.4);
    expect(DEFAULT_GALACTIC_FOV_DEG).toBe(45);
    expect(DEFAULT_GALACTIC_REFERENCE_CAMERA_DISTANCE_PC).toBe(28);
    expect(DEFAULT_GALACTIC_MIN_CAMERA_DISTANCE_PC).toBe(2.5);
  });

  describe('computeHorizonReachPerCameraDist', () => {
    it('returns baseline horizon ratio when viewportAspect is omitted or narrow', () => {
      const baseRatio = (2.4 * 10) / 34.9;
      expect(computeHorizonReachPerCameraDist()).toBeCloseTo(baseRatio, 6);
      expect(computeHorizonReachPerCameraDist({ viewportAspect: 390 / 844 })).toBeCloseTo(baseRatio, 6);
    });

    it('returns frustum corner reach when wide viewportAspect exceeds horizon ratio', () => {
      const aspect = 16 / 9;
      const expected = Math.tan((45 * Math.PI) / 360) * Math.hypot(1, aspect);
      expect(computeHorizonReachPerCameraDist({ viewportAspect: aspect })).toBeCloseTo(expected, 6);
    });

    it('falls back safely when options are non-finite or out of range', () => {
      const baseRatio = (2.4 * 10) / 34.9;
      expect(
        computeHorizonReachPerCameraDist({
          referenceApertureRadiusPc: -1,
          referenceCameraDistancePc: Number.NaN,
          horizonApertureRatio: 0,
          fovDeg: 180,
          viewportAspect: Number.POSITIVE_INFINITY,
        }),
      ).toBeCloseTo(baseRatio, 6);
    });
  });

  describe('computeActiveSectorHorizonCoverPc', () => {
    it('computes half-side radius using DEFAULT_SECTOR_SIZE_PC and DEFAULT_AVG_BYTES_PER_SECTOR', () => {
      const tier2 = TIER_PROFILE_RECORDS.tier2;
      expect(computeActiveSectorHorizonCoverPc(tier2)).toBeCloseTo(
        0.5 * Math.cbrt(tier2.maxActiveSectors) * DEFAULT_SECTOR_SIZE_PC,
        6,
      );

      const memoryLimited = {
        ...tier2,
        maxBufferBytes: DEFAULT_AVG_BYTES_PER_SECTOR * 8,
      };
      expect(computeActiveSectorHorizonCoverPc(memoryLimited)).toBeCloseTo(
        0.5 * 2 * DEFAULT_SECTOR_SIZE_PC,
        6,
      );
    });
  });

  describe('clampDenseVolumeCeilingDistancePc', () => {
    it('clamps inside the dense catalog radius and bypasses at or beyond the edge margin boundary', () => {
      const tier3 = TIER_PROFILE_RECORDS.tier3;
      const clampedAtSol = clampDenseVolumeCeilingDistancePc(tier3, 375, 2.5, {
        denseCatalogRadiusPc: 100,
        targetDistFromSolPc: 0,
      });
      expect(clampedAtSol).toBeLessThan(375);
      expect(clampedAtSol).toBeGreaterThan(2.5);

      const bypassedAtBoundary = clampDenseVolumeCeilingDistancePc(tier3, 375, 2.5, {
        denseCatalogRadiusPc: 100,
        targetDistFromSolPc: 92,
      });
      expect(bypassedAtBoundary).toBe(375);

      const bypassedOutside = clampDenseVolumeCeilingDistancePc(tier3, 375, 2.5, {
        denseCatalogRadiusPc: 100,
        targetDistFromSolPc: 180,
      });
      expect(bypassedOutside).toBe(375);
    });
  });

  describe('computeGalacticCeilingDistancePc', () => {
    it('computes targetDistFromSolPc from targetCoords and matches computeCeilingMaxCameraDistancePc with galactic defaults', () => {
      const tier3 = TIER_PROFILE_RECORDS.tier3;
      const targetCoords: readonly [number, number, number] = [30, 40, 0]; // hypot = 50 pc
      const viaCoords = computeGalacticCeilingDistancePc(tier3, {
        targetCoords,
        viewportAspect: 16 / 9,
      });
      const direct = computeCeilingMaxCameraDistancePc(tier3, {
        denseCatalogRadiusPc: DEFAULT_DENSE_CATALOG_RADIUS_PC,
        referenceCameraDistancePc: 28,
        minDistancePc: 2.5,
        targetDistFromSolPc: 50,
        viewportAspect: 16 / 9,
      });
      expect(viaCoords).toBeCloseTo(direct, 8);
    });

    it('bypasses dense-volume clamp when targetCoords are >= 92 pc from Sol', () => {
      const tier3 = TIER_PROFILE_RECORDS.tier3;
      const solCeiling = computeGalacticCeilingDistancePc(tier3, {
        targetCoords: [0, 0, 0],
        viewportAspect: 16 / 9,
      });
      const distantCeiling = computeGalacticCeilingDistancePc(tier3, {
        targetCoords: [200, 0, 0],
        viewportAspect: 16 / 9,
      });
      expect(distantCeiling).toBeGreaterThan(solCeiling);
    });

    it('honours explicit targetDistFromSolPc, ceilingApertureRadiusPc, referenceCameraDistancePc, and minDistancePc overrides', () => {
      const tier2 = TIER_PROFILE_RECORDS.tier2;
      const custom = computeGalacticCeilingDistancePc(tier2, {
        ceilingApertureRadiusPc: 12,
        targetDistFromSolPc: 95,
        referenceCameraDistancePc: 28,
        minDistancePc: 3,
        viewportAspect: 1440 / 900,
      });
      const expected = computeCeilingMaxCameraDistancePc(tier2, {
        ceilingApertureRadiusPc: 12,
        denseCatalogRadiusPc: DEFAULT_DENSE_CATALOG_RADIUS_PC,
        targetDistFromSolPc: 95,
        referenceCameraDistancePc: 28,
        minDistancePc: 3,
        viewportAspect: 1440 / 900,
      });
      expect(custom).toBeCloseTo(expected, 8);
    });
  });
});
