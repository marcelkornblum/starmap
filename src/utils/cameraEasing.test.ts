import { describe, it, expect } from 'vitest';
import {
  CAMERA_EASING_CURVES,
  DEFAULT_CAMERA_EASING_CURVE,
  DEFAULT_CAMERA_TRANSITION_DURATION_SEC,
  easeInOutQuad,
  easeOutQuad,
  easeInOutCubic,
  easeOutCubic,
  linear,
  evaluateCameraEasing,
  interpolateCameraDistance,
  type CameraEasingCurveId,
} from './cameraEasing';

describe('cameraEasing', () => {
  it('exposes the expected defaults and curve registry', () => {
    expect(DEFAULT_CAMERA_EASING_CURVE).toBe('easeInOutQuad');
    expect(DEFAULT_CAMERA_TRANSITION_DURATION_SEC).toBe(0.8);

    const ids = CAMERA_EASING_CURVES.map((c) => c.id);
    expect(ids).toEqual([
      'easeInOutQuad',
      'easeOutQuad',
      'easeInOutCubic',
      'easeOutCubic',
      'linear',
    ]);
    for (const entry of CAMERA_EASING_CURVES) {
      expect(entry.label.trim().length).toBeGreaterThan(0);
    }
  });

  it('returns exact endpoints 0 and 1 and clamps out-of-range t across all curves', () => {
    const curveIds: CameraEasingCurveId[] = [
      'easeInOutQuad',
      'easeOutQuad',
      'easeInOutCubic',
      'easeOutCubic',
      'linear',
    ];

    for (const id of curveIds) {
      expect(evaluateCameraEasing(id, 0)).toBe(0);
      expect(evaluateCameraEasing(id, 1)).toBe(1);
      expect(evaluateCameraEasing(id, -0.5)).toBe(0);
      expect(evaluateCameraEasing(id, 1.5)).toBe(1);
      expect(evaluateCameraEasing(id, Number.NaN)).toBe(0);
    }
  });

  it('is monotonically non-decreasing across [0, 1] for every curve', () => {
    const curveIds: CameraEasingCurveId[] = [
      'easeInOutQuad',
      'easeOutQuad',
      'easeInOutCubic',
      'easeOutCubic',
      'linear',
    ];

    for (const id of curveIds) {
      let prev = 0;
      for (let i = 1; i <= 20; i += 1) {
        const val = evaluateCameraEasing(id, i / 20);
        expect(val).toBeGreaterThanOrEqual(prev);
        prev = val;
      }
    }
  });

  it('computes expected midpoint and intermediate shapes per curve', () => {
    expect(linear(0.25)).toBeCloseTo(0.25, 6);
    expect(easeInOutQuad(0.5)).toBeCloseTo(0.5, 6);
    expect(easeInOutQuad(0.25)).toBeCloseTo(0.125, 6);
    expect(easeInOutQuad(0.75)).toBeCloseTo(0.875, 6);

    expect(easeOutQuad(0.5)).toBeCloseTo(0.75, 6);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 6);
    expect(easeInOutCubic(0.25)).toBeCloseTo(0.0625, 6);
    expect(easeOutCubic(0.5)).toBeCloseTo(0.875, 6);
  });

  it('interpolates camera distance logarithmically across large positive spans when enabled', () => {
    const mid = interpolateCameraDistance(1, 100, 0.5, true);
    expect(mid).toBeCloseTo(10, 6);
    expect(interpolateCameraDistance(1, 100, 0, true)).toBeCloseTo(1, 6);
    expect(interpolateCameraDistance(1, 100, 1, true)).toBeCloseTo(100, 6);
  });

  it('falls back to linear lerp when logarithmic interpolation is disabled, span is tiny, or distances are non-positive', () => {
    // Disabled
    expect(interpolateCameraDistance(1, 100, 0.5, false)).toBeCloseTo(50.5, 6);
    // Tiny ratio: |log10(1.05 / 1)| ~= 0.021 <= 0.05
    expect(interpolateCameraDistance(1, 1.05, 0.5, true)).toBeCloseTo(1.025, 6);
    // Non-positive start or end
    expect(interpolateCameraDistance(0, 100, 0.5, true)).toBeCloseTo(50, 6);
    expect(interpolateCameraDistance(-10, 100, 0.5, true)).toBeCloseTo(45, 6);
  });
});
