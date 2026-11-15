import * as THREE from 'three';
import type { CardinalDirection } from '../../../types/spatial';

/**
 * Static registry of cardinal orientations, canonical normals, and singular-free up vectors.
 */
export const CARDINAL_CONFIG: Record<
  CardinalDirection,
  { normal: [number, number, number]; up: [number, number, number] }
> = {
  top: { normal: [0, 0, 1], up: [0, 1, 0] },
  bottom: { normal: [0, 0, -1], up: [0, 1, 0] },
  front: { normal: [0, -1, 0], up: [0, 0, 1] },
  back: { normal: [0, 1, 0], up: [0, 0, 1] },
  right: { normal: [1, 0, 0], up: [0, 0, 1] },
  left: { normal: [-1, 0, 0], up: [0, 0, 1] },
};

/**
 * Resolves the closest cardinal normal axis (+/- X, +/- Y, or +/- Z) for a given camera direction.
 */
export function getClosestCardinalAxis(
  camDir: THREE.Vector3,
  outVector?: THREE.Vector3,
): THREE.Vector3 {
  const result = outVector ?? new THREE.Vector3();
  const absX = Math.abs(camDir.x);
  const absY = Math.abs(camDir.y);
  const absZ = Math.abs(camDir.z);

  if (absZ >= absX && absZ >= absY) {
    result.set(0, 0, camDir.z < 0 ? -1 : 1);
  } else if (absY >= absX && absY >= absZ) {
    result.set(0, camDir.y < 0 ? -1 : 1, 0);
  } else {
    result.set(camDir.x < 0 ? -1 : 1, 0, 0);
  }

  return result;
}

/**
 * Returns whether a normalized camera direction vector is within a threshold angle of any cardinal axis.
 * Default threshold is 10 degrees (~0.175 rad).
 */
export function isNearCardinalAxis(
  camDir: THREE.Vector3,
  thresholdAngleRad: number = (10 * Math.PI) / 180,
): boolean {
  const closest = getClosestCardinalAxis(camDir);
  const dot = camDir.dot(closest);
  return dot >= Math.cos(thresholdAngleRad) - 1e-5;
}

/**
 * Resolves the CardinalDirection name for a given vector by finding the closest cardinal axis.
 */
export function getCardinalDirectionFromVector(vec: THREE.Vector3): CardinalDirection {
  const axis = getClosestCardinalAxis(vec);
  if (axis.z === 1) return 'top';
  if (axis.z === -1) return 'bottom';
  if (axis.y === 1) return 'back';
  if (axis.y === -1) return 'front';
  if (axis.x === 1) return 'right';
  return 'left';
}

/**
 * Returns the unit normal vector for a given cardinal direction.
 */
export function getCardinalNormal(dir: CardinalDirection): THREE.Vector3 {
  const [x, y, z] = CARDINAL_CONFIG[dir].normal;
  return new THREE.Vector3(x, y, z);
}

/**
 * Returns the canonical up vector for a given cardinal direction.
 * Top/bottom return [0, 1, 0] to eliminate gimbal lock along the Z axis.
 */
export function getCardinalUp(dir: CardinalDirection): THREE.Vector3 {
  const [x, y, z] = CARDINAL_CONFIG[dir].up;
  return new THREE.Vector3(x, y, z);
}
