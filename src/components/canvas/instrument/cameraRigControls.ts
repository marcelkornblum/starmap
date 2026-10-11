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
  type CardinalDirection,
} from '../math/cameraMath';

export interface OrbitControlsLike {
  object?: THREE.Camera;
  target?: THREE.Vector3;
  enabled?: boolean;
  enableRotate?: boolean;
  enablePan?: boolean;
  screenSpacePanning?: boolean;
  mouseButtons?: { LEFT: number; MIDDLE?: number; RIGHT?: number };
  update?: (() => void) | Function;
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
    const currentDir = new THREE.Vector3()
      .copy(this.startDir)
      .applyAxisAngle(this.rotationAxis, currentAngle)
      .normalize();

    // 2. Camera position maintained at exact radius R from focus target
    camera.position.copy(this.target).addScaledVector(currentDir, this.radius);

    // 3. Interpolate up vector smoothly and project orthogonal to view direction
    const currentUp = new THREE.Vector3().lerpVectors(this.startUp, this.endUp, t).normalize();
    const dotUpView = currentUp.dot(currentDir);
    if (Math.abs(dotUpView) > 0.99) {
      if (Math.abs(this.rotationAxis.dot(currentDir)) < 0.9) {
        currentUp.copy(this.rotationAxis);
      } else {
        currentUp.set(0, 1, 0);
      }
    } else {
      currentUp.addScaledVector(currentDir, -dotUpView).normalize();
    }
    camera.up.copy(currentUp);

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

    // 2. Lock controls: transfer controls.object to orthoCam, disable rotation, map left button to 2D pan
    if (controls) {
      if ('object' in controls) controls.object = orthoCam;
      if ('enableRotate' in controls) controls.enableRotate = false;
      controls.enablePan = true;
      controls.screenSpacePanning = true;
      if (controls.mouseButtons) controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
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

    // 1. Restore perspective camera position and distance matching ortho view
    synchronizePerspectiveWithOrtho(orthoCam, perspCam, target, baseFov);

    // 2. Polar singularity mitigation:
    // If camera is near the +Z or -Z pole with up=[0, 1, 0], tilt slightly by ~1 deg
    // so that switching back to Z-up [0, 0, 1] does not cause collinearity or gimbal flip.
    const dist = perspCam.position.distanceTo(target);
    const camDir = new THREE.Vector3()
      .copy(perspCam.position)
      .sub(target)
      .divideScalar(Math.max(dist, 1e-4));
    const isNearPole = Math.abs(camDir.z) > 0.999;
    if (isNearPole && dist > 1e-4) {
      const signZ = Math.sign(camDir.z) || 1;
      const tiltAngle = (1 * Math.PI) / 180;
      const newZ = dist * Math.cos(tiltAngle) * signZ;
      const newY = -dist * Math.sin(tiltAngle);
      perspCam.position.copy(target).add(new THREE.Vector3(0, newY, newZ));
      perspCam.up.set(0, 0, 1);
      perspCam.lookAt(target);
    } else {
      perspCam.up.set(0, 0, 1);
    }
    perspCam.updateProjectionMatrix();

    // 3. Unlock controls: transfer controls.object back to perspCam, re-enable rotation, restore left click to orbit
    if (controls) {
      if ('object' in controls) controls.object = perspCam;
      if ('enableRotate' in controls) controls.enableRotate = true;
      controls.enablePan = true;
      controls.screenSpacePanning = true;
      if (controls.mouseButtons) controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
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
      if ('enabled' in legacyControls) legacyControls.enabled = true;
      legacyControls.update?.();
    }
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = effectiveBaseFov;
      camera.zoom = 1.0;
      camera.updateProjectionMatrix();
    }

    const dist = camera.position.length();
    const isNearPole = Math.abs(camera.position.z) / Math.max(dist, 1e-4) > 0.999;
    if (isNearPole && dist > 1e-4) {
      const signZ = Math.sign(camera.position.z) || 1;
      const tiltAngle = (1 * Math.PI) / 180;
      const newZ = dist * Math.cos(tiltAngle) * signZ;
      const newY = -dist * Math.sin(tiltAngle);
      camera.position.set(0, newY, newZ);
      camera.up.set(0, 0, 1);
      camera.lookAt(0, 0, 0);
      legacyControls?.update?.();
    } else {
      camera.up.set(0, 0, 1);
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
