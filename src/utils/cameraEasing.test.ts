import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CAMERA_EASING_CURVE,
  DEFAULT_CAMERA_TRANSITION_DURATION_SEC,
  easeOutCubic,
  evaluateCameraEasing,
  interpolateCameraDistance,
  computeCameraTransitionDuration,
} from './cameraEasing';

describe('cameraEasing', () => {
  it('exposes the expected defaults and easeOutCubic curve', () => {
    expect(DEFAULT_CAMERA_EASING_CURVE).toBe('easeOutCubic');
    expect(DEFAULT_CAMERA_TRANSITION_DURATION_SEC).toBe(0.8);
    expect(evaluateCameraEasing('easeOutCubic', 0)).toBe(0);
    expect(evaluateCameraEasing('easeOutCubic', 1)).toBe(1);
    expect(evaluateCameraEasing('easeOutCubic', -0.5)).toBe(0);
    expect(evaluateCameraEasing('easeOutCubic', 1.5)).toBe(1);
    expect(evaluateCameraEasing('easeOutCubic', Number.NaN)).toBe(0);
    expect(easeOutCubic(0.5)).toBeCloseTo(0.875, 6);
  });

  it('is monotonically non-decreasing across [0, 1] for easeOutCubic', () => {
    let prev = 0;
    for (let i = 1; i <= 20; i += 1) {
      const val = evaluateCameraEasing('easeOutCubic', i / 20);
      expect(val).toBeGreaterThanOrEqual(prev);
      prev = val;
    }
  });

  it('interpolates camera distance logarithmically across large positive spans when enabled', () => {
    const mid = interpolateCameraDistance(1, 100, 0.5, true);
    expect(mid).toBeCloseTo(10, 6);
    expect(interpolateCameraDistance(1, 100, 0, true)).toBeCloseTo(1, 6);
    expect(interpolateCameraDistance(1, 100, 1, true)).toBeCloseTo(100, 6);
  });

  it('falls back to linear lerp when logarithmic interpolation is disabled, span is tiny, or distances are non-positive', () => {
    expect(interpolateCameraDistance(1, 100, 0.5, false)).toBeCloseTo(50.5, 6);
    expect(interpolateCameraDistance(1, 1.05, 0.5, true)).toBeCloseTo(1.025, 6);
    expect(interpolateCameraDistance(0, 100, 0.5, true)).toBeCloseTo(50, 6);
    expect(interpolateCameraDistance(-10, 100, 0.5, true)).toBeCloseTo(45, 6);
  });

  it('computes distance-dependent durations across pure rotation, short, medium, and long hops', () => {
    expect(computeCameraTransitionDuration(0, 20)).toBe(0.8);
    expect(computeCameraTransitionDuration(1e-4, 20)).toBe(0.8);
    expect(computeCameraTransitionDuration(-5, 20)).toBe(0.8);
    expect(computeCameraTransitionDuration(0.001, 1000)).toBeCloseTo(0.75, 4);

    const shortHop = computeCameraTransitionDuration(10, 100);
    expect(shortHop).toBeGreaterThanOrEqual(0.75);
    expect(shortHop).toBeLessThan(0.9);

    const mediumHop = computeCameraTransitionDuration(100, 100);
    expect(mediumHop).toBeGreaterThan(1.1);
    expect(mediumHop).toBeLessThan(1.3);

    expect(computeCameraTransitionDuration(250, 100)).toBeCloseTo(1.5, 6);
    expect(computeCameraTransitionDuration(1000, 100)).toBe(1.5);
    expect(computeCameraTransitionDuration(10, 0)).toBe(1.5);
  });
});
