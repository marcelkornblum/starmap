import * as THREE from 'three';
import { easeInOutCubic } from './useCameraTransition';
import {
  calculateAdaptiveProjectionFov,
  isNearCardinalAxis,
  getCardinalDirectionFromVector,
  getCardinalNormal,
  getCardinalUp,
  synchronizeOrthoWithPerspective,
  synchronizePerspectiveWithOrtho,
  criticallyDamped,
  calculateLogarithmicZoomStep,
  interpolateLogarithmicDistance,
  type CardinalDirection,
} from '../math/cameraMath';

export {
  criticallyDamped,
  calculateLogarithmicZoomStep,
  interpolateLogarithmicDistance,
};

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
 * Controller executing critically damped, zero-allocation glides to cardinal alignments.
 * Animates position, quaternion, and canonical up vector.
 */
export class CardinalTransitionController {
  private isTransitioningState = false;
  private startTime = 0;
  private duration = 0.35;
  private cardinal: CardinalDirection | null = null;
  private onComplete?: () => void;
  private activeControls?: OrbitControlsLike;
  private prevControlsEnabled?: boolean;

  private target = new THREE.Vector3();
  private radius = 32;
  private startDir = new THREE.Vector3();
  private endDir = new THREE.Vector3();
  private startUp = new THREE.Vector3();
  private endUp = new THREE.Vector3();
  private rotationAxis = new THREE.Vector3();
  private currentDir = new THREE.Vector3();
  private currentUp = new THREE.Vector3();
  private totalAngle = 0;

  public isTransitioning(): boolean {
    return this.isTransitioningState;
  }

  public getActiveCardinal(): CardinalDirection | null {
    return this.cardinal;
  }

  public cancel(): void {
    if (this.isTransitioningState) {
      this.isTransitioningState = false;
      this.cardinal = null;
      this.onComplete = undefined;
      if (this.activeControls && this.prevControlsEnabled !== undefined) {
        this.activeControls.enabled = this.prevControlsEnabled;
        this.activeControls = undefined;
      }
    }
  }

  public start(
    camera: THREE.Camera,
    target: THREE.Vector3,
    cardinal: CardinalDirection,
    duration = 0.35,
    onComplete?: () => void,
    now: number = performance.now(),
    controls?: OrbitControlsLike,
  ): void {
    this.cardinal = cardinal;
    this.duration = Math.max(duration, 0.01);
    this.startTime = now;
    this.onComplete = onComplete;

    if (controls) {
      this.activeControls = controls;
      this.prevControlsEnabled = controls.enabled ?? true;
      controls.enabled = false;
    }

    this.target.copy(target);
    this.radius = Math.max(camera.position.distanceTo(target), 1e-3);

    // Initialise unit direction from target to camera
    this.startDir.copy(camera.position).sub(target).normalize();
    this.endDir.copy(getCardinalNormal(cardinal)).normalize();

    this.startUp.copy(camera.up).normalize();
    this.endUp.copy(getCardinalUp(cardinal)).normalize();

    // Calculate angular distance and great-circle rotation axis
    const dot = Math.max(-1, Math.min(1, this.startDir.dot(this.endDir)));
    this.totalAngle = Math.acos(dot);

    if (this.totalAngle > 1e-4) {
      if (Math.abs(dot + 1) < 1e-4) {
        // Exactly opposite directions (180 deg, e.g. TOP to BOTTOM or LEFT to RIGHT)
        // Choose a rotation axis that aligns with canonical up vectors
        if (Math.abs(this.startUp.dot(this.startDir)) < 0.9) {
          this.rotationAxis.copy(this.startUp).normalize();
        } else if (Math.abs(this.endUp.dot(this.startDir)) < 0.9) {
          this.rotationAxis.copy(this.endUp).normalize();
        } else if (Math.abs(this.startDir.z) < 0.9) {
          this.rotationAxis.set(-this.startDir.y, this.startDir.x, 0).normalize();
        } else {
          this.rotationAxis.set(0, -this.startDir.z, this.startDir.y).normalize();
        }
      } else {
        this.rotationAxis.crossVectors(this.startDir, this.endDir).normalize();
      }
    } else {
      this.rotationAxis.set(0, 1, 0);
    }

    this.isTransitioningState = true;
  }

  public update(
    camera: THREE.Camera,
    _controls?: { update?: (() => void) | Function },
    now: number = performance.now(),
  ): boolean {
    if (!this.isTransitioningState) return false;

    const elapsed = (now - this.startTime) / 1000;
    const progress = Math.min(elapsed / this.duration, 1.0);
    const t = easeInOutCubic(progress);

    // 1. Interpolate direction along the great-circle spherical arc
    const currentAngle = this.totalAngle * t;
    this.currentDir
      .copy(this.startDir)
      .applyAxisAngle(this.rotationAxis, currentAngle)
      .normalize();

    // 2. Camera position maintained at exact radius R from focus target
    camera.position.copy(this.target).addScaledVector(this.currentDir, this.radius);

    // 3. Interpolate up vector smoothly and project orthogonal to view direction
    this.currentUp.lerpVectors(this.startUp, this.endUp, t).normalize();
    const dotUpView = this.currentUp.dot(this.currentDir);
    if (Math.abs(dotUpView) > 0.99) {
      if (Math.abs(this.rotationAxis.dot(this.currentDir)) < 0.9) {
        this.currentUp.copy(this.rotationAxis);
      } else {
        this.currentUp.set(0, 1, 0);
      }
    } else {
      this.currentUp.addScaledVector(this.currentDir, -dotUpView).normalize();
    }
    camera.up.copy(this.currentUp);

    // 4. Invariant: Camera continuously points at the target
    camera.lookAt(this.target);
    camera.updateMatrixWorld();

    if (progress >= 1.0) {
      camera.position.copy(this.target).addScaledVector(this.endDir, this.radius);
      camera.up.copy(this.endUp);
      camera.lookAt(this.target);
      camera.updateMatrixWorld();

      this.isTransitioningState = false;
      if (this.activeControls && this.prevControlsEnabled !== undefined) {
        this.activeControls.enabled = this.prevControlsEnabled;
        this.activeControls = undefined;
      }
      const cb = this.onComplete;
      this.onComplete = undefined;
      cb?.();
    }

    return true;
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
export function applyOrthographicLock(
  camera: THREE.Camera,
  controls?: OrbitControlsLike,
  baseFov?: number,
): void;
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
    const effectiveAspect = aspect ?? 1.0;

    // 1. Synchronise ortho frustum and transform with perspective camera at focal point
    synchronizeOrthoWithPerspective(perspCam, orthoCam, target, effectiveAspect);

    // 2. Lock controls: transfer controls.object to orthoCam, disable rotation, map left button & single touch to 2D pan
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
    // Legacy fallback for perspective-only callers
    const camera = perspOrCam;
    const legacyControls = orthoOrControls as OrbitControlsLike | undefined;
    const baseFov = typeof targetOrFov === 'number' ? targetOrFov : 45;

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
 * - Polar singularity mitigation: gently offsets camera off pure Z pole if locked at Top/Bottom.
 */
export function releaseOrthographicLock(
  orthoCam: THREE.OrthographicCamera,
  perspCam: THREE.PerspectiveCamera,
  target: THREE.Vector3,
  baseFov?: number,
  controls?: OrbitControlsLike,
): void;
export function releaseOrthographicLock(
  camera: THREE.Camera,
  controls?: OrbitControlsLike,
  baseFov?: number,
): void;
export function releaseOrthographicLock(
  orthoOrCam: THREE.OrthographicCamera | THREE.Camera,
  perspOrControls?: THREE.PerspectiveCamera | OrbitControlsLike,
  targetOrFov?: THREE.Vector3 | number,
  baseFov: number = 45,
  controls?: OrbitControlsLike,
): void {
  if (
    orthoOrCam instanceof THREE.OrthographicCamera &&
    perspOrControls instanceof THREE.PerspectiveCamera &&
    targetOrFov instanceof THREE.Vector3
  ) {
    const orthoCam = orthoOrCam;
    const perspCam = perspOrControls;
    const target = targetOrFov;

    // 1. Restore perspective camera position, distance, and orientation matching ortho view exactly
    synchronizePerspectiveWithOrtho(orthoCam, perspCam, target, baseFov);

    // 2. Unlock controls: transfer controls.object back to perspCam, re-enable rotation, restore left click & single touch to orbit
    if (controls) {
      if ('object' in controls) controls.object = perspCam;
      if ('target' in controls && controls.target) {
        controls.target.copy(target);
      }
      if ('enableRotate' in controls) controls.enableRotate = true;
      controls.enablePan = true;
      controls.screenSpacePanning = true;
      if (controls.mouseButtons) controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
      if (controls.touches) controls.touches.ONE = THREE.TOUCH.ROTATE;
      if ('enabled' in controls) controls.enabled = true;
      controls.update?.();
    }
  } else {
    // Legacy fallback for perspective-only callers
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

  const camDir = new THREE.Vector3().copy(camera.position).sub(target).divideScalar(dist);
  if (isNearCardinalAxis(camDir, snapThresholdRad)) {
    const cardinal = getCardinalDirectionFromVector(camDir);
    onStartSnap(cardinal);
    return true;
  }
  return false;
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

