import * as THREE from 'three';
import {
  evaluateCameraEasing,
  DEFAULT_CAMERA_EASING_CURVE,
} from '../../../utils/cameraEasing';
import { prefersReducedMotion } from '../../../utils/reducedMotion';
import type { CardinalDirection } from '../../../types/spatial';
import {
  isNearCardinalAxis,
  getCardinalDirectionFromVector,
  getCardinalNormal,
  getCardinalUp,
} from '../math/cameraMath';
import type { OrbitControlsLike } from './cameraRigZoomAndPan';

/**
 * Controller executing critically damped, zero-allocation glides to cardinal alignments.
 * Animates position, quaternion, and canonical up vector.
 */
export class CardinalTransitionController {
  private isTransitioningState = false;
  private pendingStart = false;
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
      this.pendingStart = false;
      this.cardinal = null;
      this.onComplete = undefined;
      if (this.activeControls && this.prevControlsEnabled !== undefined) {
        this.activeControls.enabled = this.prevControlsEnabled;
        this.activeControls = undefined;
        this.prevControlsEnabled = undefined;
      }
    }
  }

  public start(
    camera: THREE.Camera,
    target: THREE.Vector3,
    cardinal: CardinalDirection,
    duration = 0.35,
    onComplete?: () => void,
    now?: number,
    controls?: OrbitControlsLike,
  ): void {
    if (this.isTransitioningState) this.cancel();

    this.target.copy(target);
    this.radius = Math.max(camera.position.distanceTo(target), 1e-3);
    this.startDir.copy(camera.position).sub(target).normalize();
    this.endDir.copy(getCardinalNormal(cardinal)).normalize();
    this.startUp.copy(camera.up).normalize();
    this.endUp.copy(getCardinalUp(cardinal)).normalize();

    if (prefersReducedMotion() || duration <= 0) {
      camera.position.copy(this.target).addScaledVector(this.endDir, this.radius);
      camera.up.copy(this.endUp);
      camera.lookAt(this.target);
      camera.updateMatrixWorld();
      this.isTransitioningState = false;
      this.pendingStart = false;
      this.cardinal = null;
      controls?.update?.();
      onComplete?.();
      return;
    }

    this.cardinal = cardinal;
    this.duration = Math.max(duration, 0.01);
    this.pendingStart = now === undefined;
    this.startTime = now ?? 0;
    this.onComplete = onComplete;

    if (controls) {
      this.activeControls = controls;
      this.prevControlsEnabled = controls.enabled ?? true;
      controls.enabled = false;
    }

    const dot = Math.max(-1, Math.min(1, this.startDir.dot(this.endDir)));
    this.totalAngle = Math.acos(dot);

    if (this.totalAngle > 1e-4) {
      if (Math.abs(dot + 1) < 1e-4) {
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
    if (this.pendingStart) {
      this.startTime = now;
      this.pendingStart = false;
    }

    const elapsed = Math.max(0, (now - this.startTime) / 1000);
    const progress = Math.min(elapsed / this.duration, 1.0);
    const t = evaluateCameraEasing(DEFAULT_CAMERA_EASING_CURVE, progress);

    const currentAngle = this.totalAngle * t;
    this.currentDir.copy(this.startDir).applyAxisAngle(this.rotationAxis, currentAngle).normalize();
    camera.position.copy(this.target).addScaledVector(this.currentDir, this.radius);

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
