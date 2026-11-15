import * as THREE from 'three';
import {
  calculateAdaptiveProjectionFov,
  synchronizeOrthoWithPerspective,
  synchronizePerspectiveWithOrtho,
} from '../math/cameraFrustumMath';
import { DEFAULT_BASE_FOV_DEG } from './instrumentDefaults';

export interface OrbitControlsLike {
  object?: THREE.Camera;
  target?: THREE.Vector3;
  enabled?: boolean;
  enableRotate?: boolean;
  enablePan?: boolean;
  screenSpacePanning?: boolean;
  mouseButtons?: { LEFT: number; MIDDLE?: number; RIGHT?: number };
  touches?: { ONE: number; TWO?: number };
  minDistance?: number;
  maxDistance?: number;
  update?: (() => void) | Function;
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
): void;
export function applyOrthographicLock(camera: THREE.Camera, controls?: OrbitControlsLike, baseFov?: number): void;
export function applyOrthographicLock(
  perspOrCam: THREE.PerspectiveCamera | THREE.Camera,
  orthoOrControls?: THREE.OrthographicCamera | OrbitControlsLike,
  targetOrFov?: THREE.Vector3 | number,
  aspect?: number,
  controls?: OrbitControlsLike,
): void {
  if (orthoOrControls instanceof THREE.OrthographicCamera && targetOrFov instanceof THREE.Vector3) {
    const perspCam = perspOrCam as THREE.PerspectiveCamera;
    const orthoCam = orthoOrControls;
    const target = targetOrFov;
    synchronizeOrthoWithPerspective(perspCam, orthoCam, target, aspect ?? 1.0);

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
  } else {
    const camera = perspOrCam;
    const legacyControls = orthoOrControls as OrbitControlsLike | undefined;
    const baseFov = typeof targetOrFov === 'number' ? targetOrFov : DEFAULT_BASE_FOV_DEG;

    if (legacyControls) {
      if ('enableRotate' in legacyControls) legacyControls.enableRotate = false;
      legacyControls.enablePan = true;
      legacyControls.screenSpacePanning = true;
      if (legacyControls.mouseButtons) legacyControls.mouseButtons.LEFT = THREE.MOUSE.PAN;
      if (legacyControls.touches) legacyControls.touches.ONE = THREE.TOUCH.PAN;
      if ('enabled' in legacyControls) legacyControls.enabled = true;
      legacyControls.update?.();
    }
    if (camera instanceof THREE.PerspectiveCamera) {
      const { fov, zoom } = calculateAdaptiveProjectionFov(baseFov, 1.0, 3.6);
      camera.fov = fov;
      camera.zoom = zoom;
      camera.updateProjectionMatrix();
    }
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
  baseFov?: number,
  controls?: OrbitControlsLike,
): void;
export function releaseOrthographicLock(camera: THREE.Camera, controls?: OrbitControlsLike, baseFov?: number): void;
export function releaseOrthographicLock(
  orthoOrCam: THREE.OrthographicCamera | THREE.Camera,
  perspOrControls?: THREE.PerspectiveCamera | OrbitControlsLike,
  targetOrFov?: THREE.Vector3 | number,
  baseFov: number = DEFAULT_BASE_FOV_DEG,
  controls?: OrbitControlsLike,
): void {
  if (
    orthoOrCam instanceof THREE.OrthographicCamera &&
    perspOrControls instanceof THREE.PerspectiveCamera &&
    targetOrFov instanceof THREE.Vector3
  ) {
    synchronizePerspectiveWithOrtho(orthoOrCam, perspOrControls, targetOrFov, baseFov);

    if (controls) {
      if ('object' in controls) controls.object = perspOrControls;
      if ('target' in controls && controls.target) controls.target.copy(targetOrFov);
      if ('enableRotate' in controls) controls.enableRotate = true;
      controls.enablePan = true;
      controls.screenSpacePanning = true;
      if (controls.mouseButtons) controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
      if (controls.touches) controls.touches.ONE = THREE.TOUCH.ROTATE;
      if ('enabled' in controls) controls.enabled = true;
      controls.update?.();
    }
  } else {
    const camera = orthoOrCam;
    const legacyControls = perspOrControls as OrbitControlsLike | undefined;
    const effectiveBaseFov = typeof targetOrFov === 'number' ? targetOrFov : baseFov;

    if (legacyControls) {
      if ('enableRotate' in legacyControls) legacyControls.enableRotate = true;
      legacyControls.enablePan = true;
      legacyControls.screenSpacePanning = true;
      if (legacyControls.mouseButtons) legacyControls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
      if (legacyControls.touches) legacyControls.touches.ONE = THREE.TOUCH.ROTATE;
      if ('enabled' in legacyControls) legacyControls.enabled = true;
      legacyControls.update?.();
    }
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = effectiveBaseFov;
      camera.zoom = 1.0;
      camera.updateProjectionMatrix();
    }
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
