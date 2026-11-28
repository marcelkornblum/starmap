import { describe, it, expect } from 'vitest';
import { GALACTIC_FRAME, PLANETARY_FRAME, SYSTEM_FRAME } from '../config/referenceFrames';
import { DEG_TO_RADIANS, EARTH_OBLIQUITY_DEG } from './astroCoordinates';
import { easeOutCubic } from './cameraEasing';
import {
  DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG,
  DEFAULT_PLANETARY_OBLIQUITY_DEG,
  GALACTIC_TO_ECLIPTIC_TILT_DEG,
  computeCrossScaleArrivalFade,
  computeCrossScaleDepartureFade,
  computeCrossScaleOrbitAttenuation,
  computeCrossScalePreviewHandoffOpacity,
  computeCrossScaleSceneScale,
  computeCrossScaleStageDurations,
  computePlanePreviewMaxRadius,
  evaluateWindowedProgress,
  getCrossScaleTiltRad,
  getReferenceFrameRadius,
  getScaleRank,
  normaliseWindowProgress,
  resolveTargetReferencePlane,
  type CrossScaleChoreographyConfig,
  type SpatialScale,
} from './referenceFrameOrientation';

describe('referenceFrameOrientation', () => {
  it('exports the expected inclination constants', () => {
    expect(GALACTIC_TO_ECLIPTIC_TILT_DEG).toBe(60.19);
    expect(DEFAULT_PLANETARY_OBLIQUITY_DEG).toBe(EARTH_OBLIQUITY_DEG);
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

  it('computes cross-scale departure fade with default [0.15, 0.95] window and supports custom config', () => {
    expect(computeCrossScaleDepartureFade(-0.2)).toBe(1);
    expect(computeCrossScaleDepartureFade(0)).toBe(1);
    expect(computeCrossScaleDepartureFade(0.15)).toBe(1);
    expect(computeCrossScaleDepartureFade(0.55)).toBeCloseTo(1 - easeOutCubic(0.5), 8);
    expect(computeCrossScaleDepartureFade(0.95)).toBe(0);
    expect(computeCrossScaleDepartureFade(1.0)).toBe(0);
    expect(computeCrossScaleDepartureFade(1.2)).toBe(0);

    const customConfig: CrossScaleChoreographyConfig = {
      ...DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG,
      departureFadeWindow: [0.5, 1.0],
    };
    expect(computeCrossScaleDepartureFade(0.4, customConfig)).toBe(1);
    expect(computeCrossScaleDepartureFade(0.75, customConfig)).toBeCloseTo(
      1 - easeOutCubic(0.5),
      8,
    );
  });

  it('computes cross-scale arrival fade with default [0.18, 0.75] window and supports custom config', () => {
    expect(computeCrossScaleArrivalFade(-0.1)).toBe(0);
    expect(computeCrossScaleArrivalFade(0)).toBe(0);
    expect(computeCrossScaleArrivalFade(0.18)).toBe(0);
    expect(computeCrossScaleArrivalFade(0.465)).toBeCloseTo(easeOutCubic(0.5), 8);
    expect(computeCrossScaleArrivalFade(0.75)).toBe(1);
    expect(computeCrossScaleArrivalFade(1.0)).toBe(1);

    const customConfig: CrossScaleChoreographyConfig = {
      ...DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG,
      arrivalFadeWindow: [0.2, 0.8],
    };
    expect(computeCrossScaleArrivalFade(0.1, customConfig)).toBe(0);
    expect(computeCrossScaleArrivalFade(0.5, customConfig)).toBeCloseTo(easeOutCubic(0.5), 8);
    expect(computeCrossScaleArrivalFade(0.8, customConfig)).toBe(1);
  });

  it('computes cross-scale preview handoff opacity with default [0.15, 0.85] window and supports custom config', () => {
    expect(computeCrossScalePreviewHandoffOpacity(-0.1)).toBe(1);
    expect(computeCrossScalePreviewHandoffOpacity(0)).toBe(1);
    expect(computeCrossScalePreviewHandoffOpacity(0.15)).toBe(1);
    expect(computeCrossScalePreviewHandoffOpacity(0.5)).toBeCloseTo(1 - easeOutCubic(0.5), 8);
    expect(computeCrossScalePreviewHandoffOpacity(0.85)).toBe(0);
    expect(computeCrossScalePreviewHandoffOpacity(1.0)).toBe(0);

    const customConfig: CrossScaleChoreographyConfig = {
      ...DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG,
      arrivalPreviewFadeWindow: [0.1, 0.7],
    };
    expect(computeCrossScalePreviewHandoffOpacity(0.05, customConfig)).toBe(1);
    expect(computeCrossScalePreviewHandoffOpacity(0.4, customConfig)).toBeCloseTo(
      1 - easeOutCubic(0.5),
      8,
    );
    expect(computeCrossScalePreviewHandoffOpacity(0.7, customConfig)).toBe(0);
  });

  it('returns each SpatialScale reference frame radius from ReferenceFrame config', () => {
    expect(getReferenceFrameRadius('galaxy')).toBe(GALACTIC_FRAME.radius);
    expect(getReferenceFrameRadius('system')).toBe(SYSTEM_FRAME.radius);
    expect(getReferenceFrameRadius('planet')).toBe(PLANETARY_FRAME.radius);
  });

  it('exports default CrossScaleChoreographyConfig and computes stage durations', () => {
    expect(DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG.totalDurationSec).toBe(2.4);
    expect(DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG.planePreviewFraction).toBeCloseTo(0.4 / 2.4, 8);
    expect(DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG.departureFraction).toBeCloseTo(1.0 / 2.4, 8);
    expect(DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG.arrivalFraction).toBeCloseTo(1.0 / 2.4, 8);
    expect(DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG.zoomInTiltWindow).toEqual([0.0, 0.75]);
    expect(DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG.zoomInMoveWindow).toEqual([0.15, 1.0]);
    expect(DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG.zoomOutMoveWindow).toEqual([0.0, 0.85]);
    expect(DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG.zoomOutTiltWindow).toEqual([0.35, 1.0]);
    expect(DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG.departureFadeWindow).toEqual([0.15, 0.95]);
    expect(DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG.arrivalFadeWindow).toEqual([0.18, 0.75]);
    expect(DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG.arrivalPreviewFadeWindow).toEqual([0.15, 0.85]);
    expect(DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG.preloadHoldThreshold).toBe(0.78);
    expect(DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG.preloadHoldCeiling).toBe(0.94);
    expect(DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG.preloadCreepTimeConstantSec).toBe(1.8);
    expect(DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG.preloadMaxHoldSec).toBe(4.0);
    expect(DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG.minSceneScale).toBe(0.04);
    expect(DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG.orbitSquashFullScale).toBe(0.35);
    expect(computeCrossScaleOrbitAttenuation(0.04)).toBe(0);
    expect(computeCrossScaleOrbitAttenuation(0.195)).toBeCloseTo(0.5, 6);
    expect(computeCrossScaleOrbitAttenuation(0.35)).toBe(1);
    expect(computeCrossScaleOrbitAttenuation(1.0)).toBe(1);
    expect(computeCrossScaleOrbitAttenuation(Number.NaN)).toBe(1);
    expect(DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG.departureInDistanceMultiplier).toBe(0.22);
    expect(DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG.departureOutDistanceMultiplier).toBe(2.2);
    expect(DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG.arrivalInDistanceMultiplier).toBe(1.85);
    expect(DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG.arrivalOutDistanceMultiplier).toBe(0.45);
    expect(DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG.previewRadiusFactor).toBe(0.16);
    expect(DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG.minPreviewRadius).toBe(0.6);

    expect(computePlanePreviewMaxRadius(10)).toBeCloseTo(1.6, 8);
    expect(computePlanePreviewMaxRadius(1)).toBeCloseTo(0.6, 8);
    expect(computePlanePreviewMaxRadius(0)).toBeCloseTo(0.6, 8);
    expect(computePlanePreviewMaxRadius(-5)).toBeCloseTo(0.6, 8);
    expect(computePlanePreviewMaxRadius(Number.NaN)).toBeCloseTo(0.6, 8);
    expect(
      computePlanePreviewMaxRadius(20, {
        ...DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG,
        previewRadiusFactor: 0.25,
        minPreviewRadius: 1.2,
      }),
    ).toBeCloseTo(5.0, 8);

    const defaults = computeCrossScaleStageDurations();
    expect(defaults.totalSec).toBeCloseTo(2.4, 8);
    expect(defaults.previewSec).toBeCloseTo(0.4, 8);
    expect(defaults.departureSec).toBeCloseTo(1.0, 8);
    expect(defaults.arrivalSec).toBeCloseTo(1.0, 8);

    const custom = computeCrossScaleStageDurations({
      ...DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG,
      totalDurationSec: 4.8,
    });
    expect(custom.totalSec).toBeCloseTo(4.8, 8);
    expect(custom.previewSec).toBeCloseTo(0.8, 8);
    expect(custom.departureSec).toBeCloseTo(2.0, 8);
    expect(custom.arrivalSec).toBeCloseTo(2.0, 8);
  });

  it('resolves data-driven target reference planes with frame fallbacks and metadata overrides', () => {
    expect(resolveTargetReferencePlane('galaxy', 'galaxy')).toEqual({
      inclinationRad: 0,
      ascendingNodeRad: 0,
      tiltAxis: [1, 0, 0],
    });

    const galToSys = resolveTargetReferencePlane('galaxy', 'system');
    expect(galToSys.inclinationRad).toBeCloseTo(60.19 * DEG_TO_RADIANS, 8);
    expect(galToSys.ascendingNodeRad).toBe(0);
    expect(galToSys.tiltAxis).toEqual([1, 0, 0]);

    const sysToGal = resolveTargetReferencePlane('system', 'galaxy');
    expect(sysToGal.inclinationRad).toBeCloseTo(-60.19 * DEG_TO_RADIANS, 8);

    const sysToPlanet = resolveTargetReferencePlane('system', 'planet');
    expect(sysToPlanet.inclinationRad).toBeCloseTo(EARTH_OBLIQUITY_DEG * DEG_TO_RADIANS, 8);

    const galToPlanet = resolveTargetReferencePlane('galaxy', 'planet');
    expect(galToPlanet.inclinationRad).toBeCloseTo(
      (60.19 + EARTH_OBLIQUITY_DEG) * DEG_TO_RADIANS,
      8,
    );

    const customSysIn = resolveTargetReferencePlane('galaxy', 'system', {
      inclinationDeg: 38.5,
      ascendingNodeDeg: 45,
    });
    expect(customSysIn.inclinationRad).toBeCloseTo(38.5 * DEG_TO_RADIANS, 8);
    expect(customSysIn.ascendingNodeRad).toBeCloseTo(45 * DEG_TO_RADIANS, 8);
    expect(customSysIn.tiltAxis[0]).toBeCloseTo(Math.SQRT1_2, 8);
    expect(customSysIn.tiltAxis[1]).toBeCloseTo(Math.SQRT1_2, 8);
    expect(customSysIn.tiltAxis[2]).toBe(0);

    const customSysOut = resolveTargetReferencePlane('system', 'galaxy', {
      inclinationDeg: 38.5,
      ascendingNodeDeg: 45,
    });
    expect(customSysOut.inclinationRad).toBeCloseTo(-38.5 * DEG_TO_RADIANS, 8);
    expect(customSysOut.ascendingNodeRad).toBeCloseTo(45 * DEG_TO_RADIANS, 8);

    const uranusLike = resolveTargetReferencePlane('system', 'planet', {
      axialTiltDeg: 97.77,
      ascendingNodeDeg: 120,
    });
    expect(uranusLike.inclinationRad).toBeCloseTo(97.77 * DEG_TO_RADIANS, 8);
    expect(uranusLike.ascendingNodeRad).toBeCloseTo(120 * DEG_TO_RADIANS, 8);
    expect(Math.hypot(uranusLike.tiltAxis[0], uranusLike.tiltAxis[1], uranusLike.tiltAxis[2])).toBeCloseTo(1, 8);

    const obliquityOverride = resolveTargetReferencePlane('system', 'planet', {
      obliquityDeg: 25.19,
    });
    expect(obliquityOverride.inclinationRad).toBeCloseTo(25.19 * DEG_TO_RADIANS, 8);

    const zeroFallback = resolveTargetReferencePlane('system', 'planet', {
      axialTiltDeg: 0,
      obliquityDeg: 0,
      inclinationDeg: 0,
    });
    expect(zeroFallback.inclinationRad).toBeCloseTo(EARTH_OBLIQUITY_DEG * DEG_TO_RADIANS, 8);
  });

  it('computes cross-scale scene scale for expand-in and shrink-out transitions', () => {
    expect(computeCrossScaleSceneScale(-0.5, 'in')).toBeCloseTo(0.04, 8);
    expect(computeCrossScaleSceneScale(0, 'in')).toBeCloseTo(0.04, 8);
    expect(computeCrossScaleSceneScale(0.5, 'in')).toBeCloseTo(
      0.04 + 0.96 * easeOutCubic(0.5),
      8,
    );
    expect(computeCrossScaleSceneScale(1, 'in')).toBe(1);
    expect(computeCrossScaleSceneScale(1.5, 'in')).toBe(1);

    expect(computeCrossScaleSceneScale(-0.5, 'out')).toBe(1);
    expect(computeCrossScaleSceneScale(0, 'out')).toBe(1);
    expect(computeCrossScaleSceneScale(0.5, 'out')).toBeCloseTo(
      1 - 0.96 * easeOutCubic(0.5),
      8,
    );
    expect(computeCrossScaleSceneScale(1, 'out')).toBeCloseTo(0.04, 8);
    expect(computeCrossScaleSceneScale(1.5, 'out')).toBeCloseTo(0.04, 8);
    expect(computeCrossScaleSceneScale(Number.NaN, 'out')).toBe(1);

    expect(computeCrossScaleSceneScale(0, 'in', 0.1)).toBeCloseTo(0.1, 8);
    expect(computeCrossScaleSceneScale(1, 'out', 0.1)).toBeCloseTo(0.1, 8);
  });
});
