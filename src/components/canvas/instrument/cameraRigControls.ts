import * as THREE from 'three';
import type { CardinalDirection } from '../../../types/spatial';
import {
  isNearCardinalAxis,
  getCardinalDirectionFromVector,
} from '../math/cameraMath';

const _scratchCamDir = new THREE.Vector3();

/**
 * Evaluates whether pointer release occurred within capture angle of a cardinal axis,
 * initiating snap glide if within capture threshold.
 */
export function handleDiscreteSnapOnEnd(
  camera: THREE.Camera,
  target: THREE.Vector3,
  snapThresholdRad: number,
  onStartSnap: (cardinal: CardinalDirection) => void,
): boolean {
  const dist = camera.position.distanceTo(target);
  if (dist < 1e-4) return false;

  _scratchCamDir.copy(camera.position).sub(target).divideScalar(dist);
  if (isNearCardinalAxis(_scratchCamDir, snapThresholdRad)) {
    const cardinal = getCardinalDirectionFromVector(_scratchCamDir);
    onStartSnap(cardinal);
    return true;
  }
  return false;
}
