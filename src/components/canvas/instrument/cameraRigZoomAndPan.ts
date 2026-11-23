import * as THREE from 'three';
import {
  synchronizeOrthoWithPerspective,
  synchronizePerspectiveWithOrtho,
} from '../math/cameraFrustumMath';
import { DEFAULT_BASE_FOV_DEG } from './instrumentDefaults';
import type { TransitionControlsLike } from './cameraTransitionPoseMath';

export interface OrbitControlsLike extends TransitionControlsLike {
  object?: THREE.Camera;
  enableRotate?: boolean;
  enablePan?: boolean;
  screenSpacePanning?: boolean;
  mouseButtons?: { LEFT: number; MIDDLE?: number; RIGHT?: number };
  touches?: { ONE: number; TWO?: number };
  minDistance?: number;
  maxDistance?: number;
  minZoom?: number;
  maxZoom?: number;
}

export function isOrbitControlsLike(value: unknown): value is OrbitControlsLike {
  return typeof value === 'object' && value !== null;
}

/**
 * Synchronises controls min/max distance constraints with frame camera definition.
 */
export function syncControlsDistance(
  controls?: OrbitControlsLike,
  minDistance?: number,
  maxDistance?: number,
): void {
  if (!controls) return;
  if (typeof minDistance === 'number' && controls.minDistance !== minDistance) {
    controls.minDistance = minDistance;
  }
  if (typeof maxDistance === 'number' && controls.maxDistance !== maxDistance) {
    controls.maxDistance = maxDistance;
  }
}

/**
 * Synchronises a perspective camera's far clipping plane with the active frame
 * when it differs.
 */
export function syncPerspectiveCameraFar(camera: THREE.Camera | null | undefined, far?: number): void {
  if (
    camera instanceof THREE.PerspectiveCamera &&
    typeof far === 'number' &&
    Number.isFinite(far) &&
    far > 0 &&
    camera.far !== far
  ) {
    camera.far = far;
    camera.updateProjectionMatrix();
  }
}

/**
 * Synchronises an orthographic camera's far clipping plane with the active frame
 * when it differs.
 */
export function syncOrthographicCameraFar(
  orthoCam: THREE.OrthographicCamera | null | undefined,
  far?: number,
): void {
  if (
    orthoCam instanceof THREE.OrthographicCamera &&
    typeof far === 'number' &&
    Number.isFinite(far) &&
    far > 0 &&
    orthoCam.far !== far
  ) {
    orthoCam.far = far;
    orthoCam.updateProjectionMatrix();
  }
}

/**
 * Synchronises OrbitControls orthographic zoom bounds (minZoom/maxZoom) from
 * perspective-equivalent distance limits and clamps orthoCam.zoom within them.
 */
export function syncOrthographicControlsZoom(
  orthoCam: THREE.OrthographicCamera,
  controls: OrbitControlsLike | undefined,
  baseFov: number,
  minDistance?: number,
  maxDistance?: number,
): void {
  const halfFovTan = Math.tan((baseFov * Math.PI) / 360);
  if (!(orthoCam.top > 0) || !(halfFovTan > 0)) return;

  let minZoom = 1e-4;
  let maxZoom = Infinity;

  if (typeof maxDistance === 'number' && Number.isFinite(maxDistance) && maxDistance > 0) {
    minZoom = orthoCam.top / (maxDistance * halfFovTan);
    if (controls) controls.minZoom = minZoom;
  }

  if (typeof minDistance === 'number' && Number.isFinite(minDistance) && minDistance > 0) {
    maxZoom = orthoCam.top / (minDistance * halfFovTan);
    if (controls) controls.maxZoom = maxZoom;
  }

  const clampedZoom = Math.max(minZoom, Math.min(maxZoom, orthoCam.zoom));
  if (clampedZoom !== orthoCam.zoom) {
    orthoCam.zoom = clampedZoom;
    orthoCam.updateProjectionMatrix();
    controls?.update?.();
  }
}

/**
 * Puts controls and camera into the orthographic lock state:
 * - OrbitControls rotation disabled (tilt strictly impossible).
 * - Left-click drag mapped to screen-space pan.
 * - Camera configured with true parallel orthographic projection matching baseline screen scale.
 */
export function applyOrthographicLock(
  perspCam: THREE.PerspectiveCamera,
  orthoCam: THREE.OrthographicCamera,
  target: THREE.Vector3,
  aspect: number,
  controls?: OrbitControlsLike,
): void {
  synchronizeOrthoWithPerspective(perspCam, orthoCam, target, aspect);

  if (controls) {
    if ('object' in controls) controls.object = orthoCam;
    if ('enableRotate' in controls) controls.enableRotate = false;
    controls.enablePan = true;
    controls.screenSpacePanning = true;
    if (controls.mouseButtons) controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
    if (controls.touches) controls.touches.ONE = THREE.TOUCH.PAN;
    if ('enabled' in controls) controls.enabled = true;
    controls.update?.();
  }
}

/**
 * Releases orthographic lock and restores standard 3D perspective orbit:
 * - OrbitControls rotation re-enabled.
 * - Left-click drag mapped back to orbit rotation.
 * - Camera restored to baseline perspective FOV and 1.0 zoom without scale popping.
 */
export function releaseOrthographicLock(
  orthoCam: THREE.OrthographicCamera,
  perspCam: THREE.PerspectiveCamera,
  target: THREE.Vector3,
  baseFov: number = DEFAULT_BASE_FOV_DEG,
  controls?: OrbitControlsLike,
): void {
  synchronizePerspectiveWithOrtho(orthoCam, perspCam, target, baseFov);

  if (controls) {
    if ('object' in controls) controls.object = perspCam;
    if ('target' in controls && controls.target) controls.target.copy(target);
    if ('enableRotate' in controls) controls.enableRotate = true;
    controls.enablePan = true;
    controls.screenSpacePanning = true;
    if (controls.mouseButtons) controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
    if (controls.touches) controls.touches.ONE = THREE.TOUCH.ROTATE;
    controls.minZoom = 0;
    controls.maxZoom = Infinity;
    if ('enabled' in controls) controls.enabled = true;
    controls.update?.();
  }
}

/**
 * Resets a perspective camera to canonical frame coordinates and clears zoom/FOV overrides.
 */
export function resetPerspectiveCamera(
  cam: THREE.PerspectiveCamera,
  position: readonly [number, number, number],
  target: readonly [number, number, number],
  fov: number,
  controls?: OrbitControlsLike,
): void {
  cam.position.set(position[0], position[1], position[2]);
  cam.up.set(0, 0, 1);
  if (controls) {
    controls.target?.set(target[0], target[1], target[2]);
    controls.update?.();
  } else {
    cam.lookAt(target[0], target[1], target[2]);
  }
  cam.fov = fov;
  cam.zoom = 1.0;
  cam.updateProjectionMatrix();
}

/**
 * Positions perspective camera at an elevated radial isometric viewpoint (e.g. 30 deg pitch, -45 deg yaw).
 */
export function orientRadialPerspectiveCamera(
  cam: THREE.PerspectiveCamera,
  target: THREE.Vector3,
  distance: number,
  controls?: OrbitControlsLike,
): void {
  const safeDist = Math.max(1, distance);
  const elev = Math.sin((30 * Math.PI) / 180);
  const planeR = Math.cos((30 * Math.PI) / 180);
  const posX = target.x + safeDist * planeR * Math.cos((-45 * Math.PI) / 180);
  const posY = target.y + safeDist * planeR * Math.sin((-45 * Math.PI) / 180);
  const posZ = target.z + safeDist * elev;

  cam.position.set(posX, posY, posZ);
  cam.up.set(0, 0, 1);
  if (controls) {
    controls.update?.();
  } else {
    cam.lookAt(target);
  }
  cam.updateMatrixWorld();
}
