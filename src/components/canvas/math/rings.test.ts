import { describe, expect, it } from 'vitest';
import {
  computeZoomAdaptiveRings,
  populateZoomAdaptiveRings,
  type ScaledRingInfo,
} from './rings';

describe('rings', () => {
  it('computes logarithmic 1-2-5 progression rings for a given aperture radius', () => {
    const rings = computeZoomAdaptiveRings(10, 6);
    expect(rings.length).toBeGreaterThan(0);
    for (let i = 1; i < rings.length; i++) {
      expect(rings[i].radius).toBeGreaterThan(rings[i - 1].radius);
    }
    for (const r of rings) {
      if (Math.abs(Math.log10(r.radius) - Math.round(Math.log10(r.radius))) < 1e-4) {
        expect(r.isMajor).toBe(true);
      }
    }
  });

  it('populates pre-allocated pool with zero allocations', () => {
    const pool: ScaledRingInfo[] = Array.from({ length: 6 }, () => ({
      radius: 0,
      isMajor: false,
      fade: 0,
    }));
    const count = populateZoomAdaptiveRings(25, pool, 6);
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(6);
    expect(pool[0].radius).toBeGreaterThan(0);
    expect(pool[0].fade).toBeGreaterThan(0);
  });

  it('returns 0 rings for non-positive aperture radius', () => {
    const pool: ScaledRingInfo[] = [];
    expect(populateZoomAdaptiveRings(0, pool)).toBe(0);
    expect(populateZoomAdaptiveRings(-10, pool)).toBe(0);
    expect(computeZoomAdaptiveRings(0)).toEqual([]);
  });
});
