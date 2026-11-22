import type { SpatialScale } from '../../../utils/referenceFrameOrientation';

export type CrossScaleDirection = 'in' | 'out';

export interface CrossScaleArrivalDescriptor {
  readonly direction: CrossScaleDirection;
  readonly targetScope: SpatialScale;
  readonly durationSec: number;
}

const ARRIVAL_ENTRY_IN_MULTIPLIER = 1.9;
const ARRIVAL_ENTRY_OUT_MULTIPLIER = 0.45;

let pendingArrival: CrossScaleArrivalDescriptor | null = null;

/**
 * Stores a pending Stage 2 cross-scale arrival descriptor for the incoming scene controller.
 */
export function setPendingCrossScaleArrival(
  arrival: CrossScaleArrivalDescriptor | null,
): void {
  pendingArrival = arrival;
}

/**
 * Returns whether a pending cross-scale arrival descriptor is currently queued.
 */
export function hasPendingCrossScaleArrival(): boolean {
  return pendingArrival !== null;
}

/**
 * Returns and clears the pending arrival descriptor if and only if its `targetScope`
 * matches `scope`.
 */
export function consumePendingCrossScaleArrival(
  scope: SpatialScale,
): CrossScaleArrivalDescriptor | null {
  if (!pendingArrival || pendingArrival.targetScope !== scope) {
    return null;
  }
  const matched = pendingArrival;
  pendingArrival = null;
  return matched;
}

/**
 * Clears any pending cross-scale arrival descriptor.
 */
export function clearPendingCrossScaleArrival(): void {
  pendingArrival = null;
}

/**
 * Computes the Stage 2 arrival entry camera position along the landing view ray.
 * - `'in'` begins farther back at `1.9 * landingDist` and glides in toward `landingPosition`.
 * - `'out'` begins closer in at `0.45 * landingDist` and pulls back to `landingPosition`.
 */
export function computeCrossScaleArrivalEntryPosition(
  landingPosition: readonly [number, number, number],
  landingTarget: readonly [number, number, number],
  direction: CrossScaleDirection,
): [number, number, number] {
  const scale =
    direction === 'in' ? ARRIVAL_ENTRY_IN_MULTIPLIER : ARRIVAL_ENTRY_OUT_MULTIPLIER;
  return [
    landingTarget[0] + (landingPosition[0] - landingTarget[0]) * scale,
    landingTarget[1] + (landingPosition[1] - landingTarget[1]) * scale,
    landingTarget[2] + (landingPosition[2] - landingTarget[2]) * scale,
  ];
}
