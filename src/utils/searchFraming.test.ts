import { describe, it, expect } from 'vitest';
import { GALACTIC_FRAME } from '../config/referenceFrames';
import type { ViewportSafeRect } from './viewportSafeRect';
import {
  SEARCH_FRAMING_SETTLE_MS,
  DEFAULT_SEARCH_FRAMING_PADDING,
  MIN_SEARCH_FRAMING_DISTANCE_PC,
  DEFAULT_SINGLE_RESULT_DISTANCE_PC,
  computeBoundingSphereFraming,
} from './searchFraming';

describe('searchFraming utility', () => {
  it('exports expected framing constants', () => {
    expect(SEARCH_FRAMING_SETTLE_MS).toBe(600);
    expect(DEFAULT_SEARCH_FRAMING_PADDING).toBe(1.15);
    expect(MIN_SEARCH_FRAMING_DISTANCE_PC).toBe(8);
    expect(DEFAULT_SINGLE_RESULT_DISTANCE_PC).toBe(18);
  });

  describe('computeBoundingSphereFraming', () => {
    it('returns null for empty or non-finite position lists', () => {
      expect(computeBoundingSphereFraming([])).toBeNull();
      expect(
        computeBoundingSphereFraming([
          [Number.NaN, 0, 0],
          [0, Number.POSITIVE_INFINITY, 0],
          [0, 0, Number.NEGATIVE_INFINITY],
        ]),
      ).toBeNull();
    });

    it('filters out non-finite coordinates and frames remaining valid positions', () => {
      const result = computeBoundingSphereFraming([
        [Number.NaN, 1, 2],
        [4, 6, -2],
      ]);
      expect(result).toEqual({
        target: [4, 6, -2],
        distance: DEFAULT_SINGLE_RESULT_DISTANCE_PC,
        radius: 0,
      });
    });

    it('returns DEFAULT_SINGLE_RESULT_DISTANCE_PC clamped to bounds for a single position', () => {
      const single = computeBoundingSphereFraming([[2, -3, 5]]);
      expect(single).toEqual({
        target: [2, -3, 5],
        distance: DEFAULT_SINGLE_RESULT_DISTANCE_PC,
        radius: 0,
      });

      const clampedMin = computeBoundingSphereFraming([[2, -3, 5]], { minDistance: 25 });
      expect(clampedMin?.distance).toBe(25);

      const clampedMax = computeBoundingSphereFraming([[2, -3, 5]], { maxDistance: 12 });
      expect(clampedMax?.distance).toBe(12);
    });

    it('returns minDistance and radius 0 for co-located multi-point results', () => {
      const result = computeBoundingSphereFraming([
        [1, 2, 3],
        [1 + 1e-5, 2, 3],
      ]);
      expect(result).not.toBeNull();
      expect(result?.radius).toBe(0);
      expect(result?.distance).toBe(MIN_SEARCH_FRAMING_DISTANCE_PC);
      expect(result?.target[0]).toBeCloseTo(1, 4);
      expect(result?.target[1]).toBeCloseTo(2, 4);
      expect(result?.target[2]).toBeCloseTo(3, 4);
    });

    it('frames 2 separated positions around their midpoint with bounding radius', () => {
      const result = computeBoundingSphereFraming([
        [-10, 0, 0],
        [10, 0, 0],
      ]);
      expect(result).not.toBeNull();
      expect(result?.target).toEqual([0, 0, 0]);
      expect(result?.radius).toBeCloseTo(10, 6);
      expect(result?.distance).toBeGreaterThan(10);
      expect(result?.distance).toBeLessThanOrEqual(GALACTIC_FRAME.camera.maxDistance);
    });

    it('frames colinear positions using AABB midpoint and max Euclidean radius', () => {
      const result = computeBoundingSphereFraming([
        [0, 0, 0],
        [6, 0, 0],
        [20, 0, 0],
      ]);
      expect(result).not.toBeNull();
      expect(result?.target).toEqual([10, 0, 0]);
      expect(result?.radius).toBeCloseTo(10, 6);
      expect(result?.distance).toBeGreaterThan(MIN_SEARCH_FRAMING_DISTANCE_PC);
    });

    it('frames around the bounding-sphere centroid at maxDistance when wide-spread results exceed maxDistance', () => {
      const result = computeBoundingSphereFraming(
        [
          [-400, -400, 0],
          [400, 400, 0],
        ],
        { maxDistance: 120 },
      );
      expect(result).not.toBeNull();
      expect(result?.target).toEqual([0, 0, 0]);
      expect(result?.distance).toBe(120);
    });

    it('keeps target at bounding-sphere centroid rather than positions[0] when outlier spread exceeds maxDistance', () => {
      const result = computeBoundingSphereFraming(
        [
          [1, 2, 3],
          [81, 2, 3],
        ],
        { maxDistance: 50 },
      );
      expect(result).not.toBeNull();
      expect(result?.target).toEqual([41, 2, 3]);
      expect(result?.distance).toBe(50);
      expect(result?.radius).toBeCloseTo(40, 6);
    });

    it('frames multi-result cluster tightly inside active safeRect without double-dividing by visRatio', () => {
      const clusterPositions: readonly [number, number, number][] = [
        [-10, 0, 0],
        [10, 0, 0],
        [0, 5, 0],
      ];
      const safeRect: ViewportSafeRect = {
        top: 64,
        right: 340,
        bottom: 120,
        left: 340,
        width: 760,
        height: 716,
        bypass: false,
      };
      const result = computeBoundingSphereFraming(clusterPositions, {
        fovDeg: 45,
        viewportWidth: 1440,
        viewportHeight: 900,
        safeRect,
      });

      expect(result).not.toBeNull();
      if (!result) {
        return;
      }
      const tanVHalf = Math.tan((45 * Math.PI) / 360);
      const safeFullH = safeRect.height + safeRect.top + safeRect.bottom;
      const expectedLimitingTan = Math.min(
        tanVHalf * (safeRect.height / safeFullH),
        tanVHalf * (safeRect.width / safeFullH),
      );
      const expectedDistance = (result.radius * 1.15) / expectedLimitingTan;
      expect(result.distance).toBeCloseTo(expectedDistance, 5);
      expect(result.distance).toBeLessThan(40);
    });

    it('widens framing distance when an active safeRect insets the visible viewport', () => {
      const positions: readonly [number, number, number][] = [
        [-12, -8, 0],
        [12, 8, 0],
      ];
      const fullResult = computeBoundingSphereFraming(positions, {
        viewportWidth: 1440,
        viewportHeight: 900,
      });

      const insetSafeRect: ViewportSafeRect = {
        top: 64,
        right: 340,
        bottom: 120,
        left: 340,
        width: 760,
        height: 716,
        bypass: false,
      };
      const insetResult = computeBoundingSphereFraming(positions, {
        viewportWidth: 1440,
        viewportHeight: 900,
        safeRect: insetSafeRect,
      });

      expect(fullResult).not.toBeNull();
      expect(insetResult).not.toBeNull();
      expect(insetResult!.distance).toBeGreaterThan(fullResult!.distance);

      const bypassedResult = computeBoundingSphereFraming(positions, {
        viewportWidth: 1440,
        viewportHeight: 900,
        safeRect: { ...insetSafeRect, bypass: true },
      });
      expect(bypassedResult?.distance).toBeCloseTo(fullResult!.distance, 6);
    });
  });
});
