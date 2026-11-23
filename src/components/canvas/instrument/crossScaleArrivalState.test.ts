import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG,
  type CrossScaleChoreographyConfig,
} from '../../../utils/referenceFrameOrientation';
import { CrossScaleChoreographyController } from './CrossScaleChoreographyContext';
import {
  clearPendingCrossScaleArrival,
  computeTiltedArrivalEntryPose,
  consumePendingCrossScaleArrival,
  hasPendingCrossScaleArrival,
  setPendingCrossScaleArrival,
} from './crossScaleArrivalState';

describe('crossScaleArrivalState', () => {
  beforeEach(() => {
    clearPendingCrossScaleArrival();
  });

  it('stores and consumes a pending arrival only when targetScope matches', () => {
    expect(hasPendingCrossScaleArrival()).toBe(false);
    expect(consumePendingCrossScaleArrival('system')).toBeNull();

    setPendingCrossScaleArrival({
      direction: 'in',
      targetScope: 'system',
      durationSec: 0.9,
    });
    expect(hasPendingCrossScaleArrival()).toBe(true);

    // Mismatched scope must neither return nor clear the descriptor
    expect(consumePendingCrossScaleArrival('galaxy')).toBeNull();
    expect(consumePendingCrossScaleArrival('planet')).toBeNull();
    expect(hasPendingCrossScaleArrival()).toBe(true);

    // Matching scope returns and clears it
    expect(consumePendingCrossScaleArrival('system')).toEqual({
      direction: 'in',
      targetScope: 'system',
      durationSec: 0.9,
    });
    expect(hasPendingCrossScaleArrival()).toBe(false);
    expect(consumePendingCrossScaleArrival('system')).toBeNull();
  });

  it('clears pending arrival via clearPendingCrossScaleArrival', () => {
    setPendingCrossScaleArrival({
      direction: 'out',
      targetScope: 'galaxy',
      durationSec: 0.9,
    });
    expect(hasPendingCrossScaleArrival()).toBe(true);

    clearPendingCrossScaleArrival();
    expect(hasPendingCrossScaleArrival()).toBe(false);
    expect(consumePendingCrossScaleArrival('galaxy')).toBeNull();
  });

  it('isolates pending arrival descriptors per CrossScaleChoreographyController instance', () => {
    const controllerA = new CrossScaleChoreographyController();
    const controllerB = new CrossScaleChoreographyController();

    setPendingCrossScaleArrival(
      { direction: 'in', targetScope: 'system', durationSec: 1.0 },
      controllerA,
    );
    expect(hasPendingCrossScaleArrival(controllerA)).toBe(true);
    expect(hasPendingCrossScaleArrival(controllerB)).toBe(false);
    expect(consumePendingCrossScaleArrival('system', controllerB)).toBeNull();
    expect(consumePendingCrossScaleArrival('system', controllerA)?.targetScope).toBe('system');
  });

  it('stores and consumes extended CrossScaleArrivalDescriptor plane preview and choreography fields', () => {
    const descriptor = {
      direction: 'out' as const,
      targetScope: 'galaxy' as const,
      durationSec: 1.0,
      frameTiltRad: -1.05,
      tiltAxis: [0.8, 0.6, 0] as const,
      planePreviewPosition: [1, 2, 3] as const,
      planePreviewTargetId: 'sys-alpha',
      planePreviewInclinationRad: 1.05,
      planePreviewAscendingNodeRad: 0.64,
      planePreviewMaxRadius: 15,
      config: DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG,
    };
    setPendingCrossScaleArrival(descriptor);
    expect(consumePendingCrossScaleArrival('galaxy')).toEqual(descriptor);
  });

  it('computes tilted arrival entry pose using config distance multipliers and tilt rotation', () => {
    const landingPos: readonly [number, number, number] = [0, 0, 20];
    const landingTarget: readonly [number, number, number] = [0, 0, 0];
    const landingUp: readonly [number, number, number] = [0, 1, 0];

    const customConfig: CrossScaleChoreographyConfig = {
      ...DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG,
      arrivalInDistanceMultiplier: 1.5,
      arrivalOutDistanceMultiplier: 0.4,
    };

    const untiltedIn = computeTiltedArrivalEntryPose(
      landingPos,
      landingTarget,
      landingUp,
      'in',
      0,
      [1, 0, 0],
      customConfig,
    );
    expect(untiltedIn.position[0]).toBeCloseTo(0, 6);
    expect(untiltedIn.position[1]).toBeCloseTo(0, 6);
    expect(untiltedIn.position[2]).toBeCloseTo(30, 6);
    expect(untiltedIn.up).toEqual([0, 1, 0]);

    // +90 deg around +X rotates [0, 0, 8] -> [0, -8, 0] and [0, 1, 0] -> [0, 0, 1]
    const tiltedOut = computeTiltedArrivalEntryPose(
      landingPos,
      landingTarget,
      landingUp,
      'out',
      Math.PI / 2,
      [2, 0, 0],
      customConfig,
    );
    expect(tiltedOut.position[0]).toBeCloseTo(0, 6);
    expect(tiltedOut.position[1]).toBeCloseTo(-8, 6);
    expect(tiltedOut.position[2]).toBeCloseTo(0, 6);
    expect(tiltedOut.up[0]).toBeCloseTo(0, 6);
    expect(tiltedOut.up[1]).toBeCloseTo(0, 6);
    expect(tiltedOut.up[2]).toBeCloseTo(1, 6);

    const degenerate = computeTiltedArrivalEntryPose(
      [5, 5, 5],
      [5, 5, 5],
      [0, 0, 0],
      'out',
      Math.PI / 4,
      [0, 0, 0],
    );
    expect(degenerate.position).toEqual([5, 5, 5]);
    expect(Number.isFinite(degenerate.up[0])).toBe(true);
    expect(Number.isFinite(degenerate.up[1])).toBe(true);
    expect(Number.isFinite(degenerate.up[2])).toBe(true);
  });
});
