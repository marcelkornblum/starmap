import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG,
  type CrossScaleChoreographyConfig,
} from '../../../utils/referenceFrameOrientation';
import {
  clearPendingCrossScaleArrival,
  computeCrossScaleArrivalEntryPosition,
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

  it('computes entry position at 1.9x landing distance for "in" and 0.45x for "out" along the landing view ray', () => {
    const landingPos: readonly [number, number, number] = [11, -6, 12];
    const landingTarget: readonly [number, number, number] = [1, -6, 2];
    // Offset = [10, 0, 10]

    const inEntry = computeCrossScaleArrivalEntryPosition(landingPos, landingTarget, 'in');
    expect(inEntry[0]).toBeCloseTo(1 + 10 * 1.9, 6);
    expect(inEntry[1]).toBeCloseTo(-6, 6);
    expect(inEntry[2]).toBeCloseTo(2 + 10 * 1.9, 6);

    const outEntry = computeCrossScaleArrivalEntryPosition(landingPos, landingTarget, 'out');
    expect(outEntry[0]).toBeCloseTo(1 + 10 * 0.45, 6);
    expect(outEntry[1]).toBeCloseTo(-6, 6);
    expect(outEntry[2]).toBeCloseTo(2 + 10 * 0.45, 6);
  });

  it('handles degenerate zero-distance landing pose cleanly without NaN', () => {
    const pos: readonly [number, number, number] = [3, 4, 5];
    expect(computeCrossScaleArrivalEntryPosition(pos, pos, 'in')).toEqual([3, 4, 5]);
    expect(computeCrossScaleArrivalEntryPosition(pos, pos, 'out')).toEqual([3, 4, 5]);
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
