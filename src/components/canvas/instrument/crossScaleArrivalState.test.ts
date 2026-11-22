import { describe, it, expect, beforeEach } from 'vitest';
import {
  clearPendingCrossScaleArrival,
  computeCrossScaleArrivalEntryPosition,
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
});
