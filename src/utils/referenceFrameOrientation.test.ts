import { describe, it, expect } from 'vitest';
import { DEG_TO_RADIANS, EARTH_OBLIQUITY_DEG } from './astroCoordinates';
import { easeOutCubic } from './cameraEasing';
import {
  CROSS_SCALE_ORIENTATION_WINDOW,
  CROSS_SCALE_STAGE_DURATION_SEC,
  CROSS_SCALE_TOTAL_DURATION_SEC,
  CROSS_SCALE_TRANSLATION_WINDOW,
  DEFAULT_PLANETARY_OBLIQUITY_DEG,
  GALACTIC_TO_ECLIPTIC_TILT_DEG,
  computeCrossScaleArrivalFade,
  computeCrossScaleDepartureFade,
  evaluateWindowedProgress,
  getCrossScaleTiltRad,
  getScaleRank,
  normaliseWindowProgress,
  type SpatialScale,
} from './referenceFrameOrientation';

describe('referenceFrameOrientation', () => {
  it('exports the expected constants and timing windows', () => {
    expect(GALACTIC_TO_ECLIPTIC_TILT_DEG).toBe(60.19);
    expect(DEFAULT_PLANETARY_OBLIQUITY_DEG).toBe(EARTH_OBLIQUITY_DEG);
    expect(CROSS_SCALE_STAGE_DURATION_SEC).toBe(0.9);
    expect(CROSS_SCALE_TOTAL_DURATION_SEC).toBe(1.8);
    expect(CROSS_SCALE_ORIENTATION_WINDOW).toEqual([0, 0.5]);
    expect(CROSS_SCALE_TRANSLATION_WINDOW).toEqual([0.2, 1.0]);
  });

  it('maps each SpatialScale to its hierarchical rank', () => {
    const scales: SpatialScale[] = ['galaxy', 'system', 'planet'];
    expect(scales.map(getScaleRank)).toEqual([0, 1, 2]);
  });

  it('computes signed cross-scale orbital-plane tilts in radians', () => {
    expect(getCrossScaleTiltRad('galaxy', 'galaxy')).toBe(0);
    expect(getCrossScaleTiltRad('system', 'system')).toBe(0);
    expect(getCrossScaleTiltRad('planet', 'planet')).toBe(0);

    expect(getCrossScaleTiltRad('galaxy', 'system')).toBeCloseTo(
      60.19 * DEG_TO_RADIANS,
      8,
    );
    expect(getCrossScaleTiltRad('system', 'galaxy')).toBeCloseTo(
      -60.19 * DEG_TO_RADIANS,
      8,
    );

    expect(getCrossScaleTiltRad('system', 'planet')).toBeCloseTo(
      23.4392911 * DEG_TO_RADIANS,
      8,
    );
    expect(getCrossScaleTiltRad('planet', 'system')).toBeCloseTo(
      -23.4392911 * DEG_TO_RADIANS,
      8,
    );

    const combinedRad = (60.19 + 23.4392911) * DEG_TO_RADIANS;
    expect(getCrossScaleTiltRad('galaxy', 'planet')).toBeCloseTo(combinedRad, 8);
    expect(getCrossScaleTiltRad('planet', 'galaxy')).toBeCloseTo(-combinedRad, 8);
  });

  it('normalises windowed progress and evaluates easeOutCubic over arbitrary windows', () => {
    expect(normaliseWindowProgress(0.1, [0.2, 1.0])).toBe(0);
    expect(normaliseWindowProgress(0.2, [0.2, 1.0])).toBe(0);
    expect(normaliseWindowProgress(0.6, [0.2, 1.0])).toBeCloseTo(0.5, 8);
    expect(normaliseWindowProgress(1.0, [0.2, 1.0])).toBe(1);
    expect(normaliseWindowProgress(1.4, [0.2, 1.0])).toBe(1);
    expect(normaliseWindowProgress(Number.NaN, [0.2, 1.0])).toBe(0);

    expect(evaluateWindowedProgress(-0.1, [0, 0.5])).toBe(0);
    expect(evaluateWindowedProgress(0, [0, 0.5])).toBe(0);
    expect(evaluateWindowedProgress(0.25, [0, 0.5])).toBeCloseTo(easeOutCubic(0.5), 8);
    expect(evaluateWindowedProgress(0.5, [0, 0.5])).toBe(1);
    expect(evaluateWindowedProgress(0.8, [0, 0.5])).toBe(1);
  });

  it('computes cross-scale departure fade: holds 1.0 until 0.3 then dissolves with easeOutCubic', () => {
    expect(computeCrossScaleDepartureFade(-0.2)).toBe(1);
    expect(computeCrossScaleDepartureFade(0)).toBe(1);
    expect(computeCrossScaleDepartureFade(0.3)).toBe(1);
    expect(computeCrossScaleDepartureFade(0.65)).toBeCloseTo(1 - easeOutCubic(0.5), 8);
    expect(computeCrossScaleDepartureFade(1.0)).toBe(0);
    expect(computeCrossScaleDepartureFade(1.2)).toBe(0);
  });

  it('computes cross-scale arrival fade: materialises 0 -> 1 over [0, 0.7] with easeOutCubic', () => {
    expect(computeCrossScaleArrivalFade(-0.1)).toBe(0);
    expect(computeCrossScaleArrivalFade(0)).toBe(0);
    expect(computeCrossScaleArrivalFade(0.35)).toBeCloseTo(easeOutCubic(0.5), 8);
    expect(computeCrossScaleArrivalFade(0.7)).toBe(1);
    expect(computeCrossScaleArrivalFade(1.0)).toBe(1);
  });
});
