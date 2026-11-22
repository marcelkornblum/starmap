import * as THREE from 'three';
import { useCameraStore, type SavedGalaxyCameraPose } from '../../../stores/useCameraStore';
import type { AppRouterAdapter, StarmapSearchParams } from '../../../hooks/useSpaLocation';
import {
  type OrbitControlsLike,
  applyCameraSavedZoom,
  getCameraZoom,
} from './cameraControllerUtils';

export interface CameraPoseSnapshot {
  readonly position: [number, number, number];
  readonly target: [number, number, number];
  readonly up: [number, number, number];
  readonly zoom: number;
  readonly focalDistance: number;
}

export function computeCameraPoseSnapshot(
  camera: THREE.Camera,
  controls: OrbitControlsLike | undefined,
  fallbackTarget: readonly [number, number, number],
): CameraPoseSnapshot {
  const tgt: [number, number, number] = controls?.target
    ? [controls.target.x, controls.target.y, controls.target.z]
    : [fallbackTarget[0], fallbackTarget[1], fallbackTarget[2]];
  const pos: [number, number, number] = [camera.position.x, camera.position.y, camera.position.z];
  const up: [number, number, number] = [camera.up.x, camera.up.y, camera.up.z];
  const focalDistance = controls?.target
    ? camera.position.distanceTo(controls.target)
    : Math.hypot(pos[0] - tgt[0], pos[1] - tgt[1], pos[2] - tgt[2]);

  return {
    position: pos,
    target: tgt,
    up,
    zoom: getCameraZoom(camera),
    focalDistance,
  };
}

export function persistCameraPoseToStore(
  snapshot: CameraPoseSnapshot,
  persistGalaxyPose: boolean,
  force: boolean,
): void {
  if (!persistGalaxyPose) return;
  const store = useCameraStore.getState();
  const posDiff = Math.hypot(
    snapshot.position[0] - store.position[0],
    snapshot.position[1] - store.position[1],
    snapshot.position[2] - store.position[2],
  );
  const targetDiff = Math.hypot(
    snapshot.target[0] - store.target[0],
    snapshot.target[1] - store.target[1],
    snapshot.target[2] - store.target[2],
  );
  const distDiff = Math.abs(snapshot.focalDistance - store.focalDistance);

  if (force || posDiff > 0.002 || targetDiff > 0.002 || distDiff > 0.002) {
    if (force) {
      const savedPose: SavedGalaxyCameraPose = {
        position: snapshot.position,
        target: snapshot.target,
        up: snapshot.up,
        zoom: snapshot.zoom,
        focalDistance: snapshot.focalDistance,
        centerKey: `${snapshot.target[0]},${snapshot.target[1]},${snapshot.target[2]}`,
      };
      store.setSavedGalaxyCamera(savedPose);
    }
    store.setCameraPose({
      position: snapshot.position,
      target: snapshot.target,
      up: snapshot.up,
      zoom: snapshot.zoom,
      focalDistance: snapshot.focalDistance,
    });
  }
}

export function applyImmediateCameraPose(
  camera: THREE.Camera,
  controls: OrbitControlsLike | undefined,
  position: readonly [number, number, number],
  target: readonly [number, number, number],
  up: readonly [number, number, number],
  zoom = 1,
  fov?: number,
): boolean {
  camera.position.set(position[0], position[1], position[2]);
  camera.up.set(up[0], up[1], up[2]);
  if (fov !== undefined && camera instanceof THREE.PerspectiveCamera) {
    camera.fov = fov;
  }
  applyCameraSavedZoom(camera, zoom);

  if (controls) {
    controls.target.set(target[0], target[1], target[2]);
    controls.update?.();
    return true;
  }
  camera.lookAt(target[0], target[1], target[2]);
  return false;
}

export function formatCenterCoordString(
  x: number,
  y: number,
  z: number,
): string {
  return `${x.toFixed(1)},${y.toFixed(1)},${z.toFixed(1)}`;
}

export function navigatePanCenterToRouter(
  router: AppRouterAdapter | undefined,
  controls: OrbitControlsLike | undefined,
  refTarget: { readonly x: number; readonly y: number; readonly z: number },
  pendingPanTargetRef: { current: string | null },
): void {
  if (!controls || !router || typeof router.navigate !== 'function') return;
  const tgt = controls.target;
  const distFromTarget = Math.hypot(
    tgt.x - refTarget.x,
    tgt.y - refTarget.y,
    tgt.z - refTarget.z,
  );
  if (distFromTarget <= 0.05) return;

  const coordStr = formatCenterCoordString(tgt.x, tgt.y, tgt.z);
  const centerParam = router.state?.location?.search?.center;
  if (centerParam === coordStr) return;

  pendingPanTargetRef.current = coordStr;
  void router.navigate({
    to: '.',
    search: (prev: StarmapSearchParams = {}) => ({ ...prev, center: coordStr }),
    replace: true,
  });
}
