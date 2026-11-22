import * as THREE from 'three';
import {
  DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG,
  type CrossScaleChoreographyConfig,
  type SpatialScale,
} from '../../../utils/referenceFrameOrientation';

export type CrossScaleDirection = 'in' | 'out';

export interface CrossScaleArrivalDescriptor {
  readonly direction: CrossScaleDirection;
  readonly targetScope: SpatialScale;
  readonly durationSec: number;
  readonly frameTiltRad?: number;
  readonly tiltAxis?: readonly [number, number, number];
  readonly planePreviewPosition?: readonly [number, number, number];
  readonly planePreviewTargetId?: string;
  readonly planePreviewInclinationRad?: number;
  readonly planePreviewAscendingNodeRad?: number;
  readonly planePreviewMaxRadius?: number;
  readonly config?: CrossScaleChoreographyConfig;
}

export interface TiltedArrivalEntryPose {
  readonly position: [number, number, number];
  readonly up: [number, number, number];
}

const ARRIVAL_ENTRY_IN_MULTIPLIER = 1.9;
const ARRIVAL_ENTRY_OUT_MULTIPLIER = 0.45;

const _scratchOffset = new THREE.Vector3();
const _scratchUp = new THREE.Vector3();
const _scratchAxis = new THREE.Vector3();

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

/**
 * Computes the Stage 2 arrival entry `{ position, up }` using distance multipliers from `config`
 * and rotating both the view ray and `up` around `tiltAxis` by `entryTiltRad` when non-zero.
 */
export function computeTiltedArrivalEntryPose(
  landingPosition: readonly [number, number, number],
  landingTarget: readonly [number, number, number],
  landingUp: readonly [number, number, number],
  direction: CrossScaleDirection,
  entryTiltRad: number,
  tiltAxis: readonly [number, number, number] = [1, 0, 0],
  config: CrossScaleChoreographyConfig = DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG,
): TiltedArrivalEntryPose {
  const scale =
    direction === 'in'
      ? config.arrivalInDistanceMultiplier
      : config.arrivalOutDistanceMultiplier;

  _scratchOffset.set(
    (landingPosition[0] - landingTarget[0]) * scale,
    (landingPosition[1] - landingTarget[1]) * scale,
    (landingPosition[2] - landingTarget[2]) * scale,
  );

  _scratchUp.set(landingUp[0], landingUp[1], landingUp[2]);
  const upLenSq = _scratchUp.lengthSq();
  if (Number.isFinite(upLenSq) && upLenSq > 1e-8) {
    _scratchUp.normalize();
  } else {
    _scratchUp.set(0, 1, 0);
  }

  if (Number.isFinite(entryTiltRad) && Math.abs(entryTiltRad) > 1e-6) {
    _scratchAxis.set(tiltAxis[0], tiltAxis[1], tiltAxis[2]);
    const axisLenSq = _scratchAxis.lengthSq();
    if (Number.isFinite(axisLenSq) && axisLenSq > 1e-8) {
      _scratchAxis.normalize();
    } else {
      _scratchAxis.set(1, 0, 0);
    }
    _scratchOffset.applyAxisAngle(_scratchAxis, entryTiltRad);
    _scratchUp.applyAxisAngle(_scratchAxis, entryTiltRad).normalize();
  }

  return {
    position: [
      landingTarget[0] + _scratchOffset.x,
      landingTarget[1] + _scratchOffset.y,
      landingTarget[2] + _scratchOffset.z,
    ],
    up: [_scratchUp.x, _scratchUp.y, _scratchUp.z],
  };
}
