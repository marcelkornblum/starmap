import * as THREE from 'three';
import type { SpatialEntityStore } from '../../canvas/entity/SpatialEntityStore';
import type { OrbitControlsLike } from '../../canvas/scenes/cameraControllerUtils';
import { computeCameraPoseSnapshot } from '../../canvas/scenes/galacticCameraHelpers';
import { useCameraStore } from '../../../stores/useCameraStore';
import type { SpatialScale } from '../../../utils/referenceFrameOrientation';

/**
 * Resolves an entity's 3D position from the outer `SpatialEntityStore` by ID or slug.
 */
export function resolveEntityPosition(
  outerStore: SpatialEntityStore | null,
  targetId?: string,
): [number, number, number] | null {
  if (!outerStore || !targetId) return null;
  const state = outerStore.getState();
  const resolvedId = state.resolveEntityId(targetId) ?? targetId;
  const entity = state.entities[resolvedId];
  if (!entity?.position) return null;
  return entity.position instanceof THREE.Vector3
    ? [entity.position.x, entity.position.y, entity.position.z]
    : [entity.position[0], entity.position[1], entity.position[2]];
}

/**
 * Resolves the focal target for Stage 1 cross-scale departure.
 */
export function resolveDepartureTarget(
  direction: 'in' | 'out',
  outerStore: SpatialEntityStore | null,
  nextTargetId: string | undefined,
  committedCenterCoordinates: readonly [number, number, number] | undefined,
  controls: OrbitControlsLike | undefined,
): [number, number, number] {
  if (direction === 'in') {
    const entityPos = resolveEntityPosition(outerStore, nextTargetId);
    if (entityPos) return entityPos;
    if (committedCenterCoordinates) {
      return [
        committedCenterCoordinates[0],
        committedCenterCoordinates[1],
        committedCenterCoordinates[2],
      ];
    }
  }
  if (controls?.target) {
    return [controls.target.x, controls.target.y, controls.target.z];
  }
  return [0, 0, 0];
}

/**
 * Returns `true` when two scene targets represent the same mounted scene identity.
 */
export function isMatchingSceneTarget(
  aScope: SpatialScale,
  aTargetId: string | undefined,
  bScope: SpatialScale,
  bTargetId: string | undefined,
): boolean {
  return aScope === bScope && (aScope === 'galaxy' || aTargetId === bTargetId);
}

/**
 * Captures and persists the pre-dive galactic camera pose before Stage 1 tilts or zooms.
 */
export function snapshotPreDiveGalaxyCamera(
  camera: THREE.Camera,
  controls: OrbitControlsLike | undefined,
  fallbackTarget: readonly [number, number, number],
): void {
  const snapshot = computeCameraPoseSnapshot(camera, controls, fallbackTarget);
  useCameraStore.getState().setSavedGalaxyCamera({
    position: snapshot.position,
    target: snapshot.target,
    up: snapshot.up,
    zoom: snapshot.zoom,
    focalDistance: snapshot.focalDistance,
    centerKey: `${snapshot.target[0]},${snapshot.target[1]},${snapshot.target[2]}`,
  });
}
