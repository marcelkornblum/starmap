import * as THREE from 'three';
import {
  interpolateCameraDistance,
  DEFAULT_CAMERA_TRANSITION_DURATION_SEC,
  easeInOutCubic,
} from '../../../utils/cameraEasing';
import { prefersReducedMotion } from '../../../utils/reducedMotion';
import {
  copyVec3Input,
  computeAngleAndAxis,
  evaluateTransitionEasing,
  resolveEndPoseDirectionAndPos,
  resolveStartTarget,
  resolveStartDirection,
  type CameraTransitionOptions,
  type CameraTransitionPose,
  type TransitionControlsLike,
} from './cameraTransitionPoseMath';

export { easeInOutCubic };
export type {
  Vector3Input,
  CameraTransitionEasing,
  CameraTransitionOptions,
  CameraTransitionPose,
  TransitionControlsLike,
  CameraTransitionApi,
} from './cameraTransitionPoseMath';

/**
 * Pure Three.js camera transition controller.
 * Operates zero-allocation frame updates for smooth camera & instrument centering.
 */
export class CameraTransitionController {
  private isTransitioningState = false;
  private pendingStart = false;
  private startTime = 0;
  private duration = DEFAULT_CAMERA_TRANSITION_DURATION_SEC;
  private options?: CameraTransitionOptions;
  private activeControls?: TransitionControlsLike;
  private prevControlsEnabled?: boolean;

  private startTarget = new THREE.Vector3();
  private endTarget = new THREE.Vector3();
  private endCamPos = new THREE.Vector3();
  private startDir = new THREE.Vector3(0, 0, 1);
  private endDir = new THREE.Vector3(0, 0, 1);
  private dirAxis = new THREE.Vector3(0, 1, 0);
  private dirAngle = 0;
  private startDist = 0;
  private endDist = 0;
  private useLogDist = false;

  private animateUp = false;
  private startUp = new THREE.Vector3(0, 0, 1);
  private endUp = new THREE.Vector3(0, 0, 1);
  private upAxis = new THREE.Vector3(1, 0, 0);
  private upAngle = 0;

  private animateFov = false;
  private startFov = 45;
  private endFov = 45;
  private animateOrthoZoom = false;
  private startOrthoZoom = 1;
  private endOrthoZoom = 1;

  private scratchOffset = new THREE.Vector3();
  private scratchDir = new THREE.Vector3();
  private scratchCurrentTarget = new THREE.Vector3();
  private scratchCurrentCamPos = new THREE.Vector3();
  private scratchCurrentUp = new THREE.Vector3();

  public isTransitioning(): boolean {
    return this.isTransitioningState;
  }

  public cancel(): void {
    if (!this.isTransitioningState) return;
    this.isTransitioningState = false;
    this.pendingStart = false;
    this.restoreAndSettleControls();
    const onCancel = this.options?.onCancel;
    this.options = undefined;
    onCancel?.();
  }

  public start(
    camera: THREE.Camera,
    target: THREE.Vector3 | [number, number, number],
    controlsTarget?: THREE.Vector3,
    options?: CameraTransitionOptions,
    now?: number,
  ): void {
    if (this.isTransitioningState) this.cancel();

    copyVec3Input(this.endTarget, target);
    resolveStartTarget(camera, controlsTarget, this.startTarget, this.scratchDir);
    const { startDist } = resolveStartDirection(camera, this.startTarget, this.startDir, this.scratchOffset);
    this.startDist = startDist;

    this.endDir.copy(this.startDir);
    this.dirAngle = 0;
    this.endDist = options?.targetDistance ?? this.startDist;
    this.endCamPos.copy(this.endTarget).addScaledVector(this.endDir, this.endDist);
    this.animateUp = false;
    this.animateFov = false;
    this.animateOrthoZoom = false;
    this.useLogDist = options?.logarithmicDistance ?? true;

    const duration = options?.duration ?? DEFAULT_CAMERA_TRANSITION_DURATION_SEC;
    if (prefersReducedMotion() || duration <= 0) {
      if (controlsTarget instanceof THREE.Vector3) controlsTarget.copy(this.endTarget);
      this.applyFinalPose(camera);
      options?.onComplete?.();
      return;
    }

    this.beginFlight(duration, options, undefined, now);
  }

  public startPose(
    camera: THREE.Camera,
    endPose: CameraTransitionPose,
    controls?: TransitionControlsLike,
    options?: CameraTransitionOptions,
    now?: number,
  ): void {
    if (this.isTransitioningState) this.cancel();

    copyVec3Input(this.endTarget, endPose.target);
    resolveStartTarget(camera, controls?.target, this.startTarget, this.scratchDir);
    const { startDist, hasStartDir } = resolveStartDirection(camera, this.startTarget, this.startDir, this.scratchOffset);
    this.startDist = startDist;

    this.endDist = resolveEndPoseDirectionAndPos(
      endPose,
      options,
      this.startDir,
      this.startDist,
      hasStartDir,
      this.endTarget,
      this.endDir,
      this.endCamPos,
      this.scratchOffset,
    );
    this.initUpAndOptics(camera, endPose);
    this.dirAngle = computeAngleAndAxis(this.startDir, this.endDir, this.startUp, this.endUp, this.dirAxis);
    this.useLogDist = options?.logarithmicDistance ?? true;

    const duration = options?.duration ?? DEFAULT_CAMERA_TRANSITION_DURATION_SEC;
    if (prefersReducedMotion() || duration <= 0) {
      if (controls?.target instanceof THREE.Vector3) controls.target.copy(this.endTarget);
      this.applyFinalPose(camera);
      controls?.update?.();
      options?.onComplete?.();
      return;
    }

    this.beginFlight(duration, options, controls, now);
  }

  public update(
    camera: THREE.Camera,
    controls?: TransitionControlsLike,
    now: number = performance.now(),
  ): boolean {
    if (!this.isTransitioningState) return false;
    if (controls && !this.activeControls) this.lockControls(controls);
    if (this.pendingStart) {
      this.startTime = now;
      this.pendingStart = false;
    }

    const elapsed = Math.max(0, (now - this.startTime) / 1000);
    const progress = Math.min(elapsed / Math.max(this.duration, 0.001), 1.0);
    const t = evaluateTransitionEasing(this.options?.easing, progress);

    this.scratchCurrentTarget.lerpVectors(this.startTarget, this.endTarget, t);
    const d = interpolateCameraDistance(this.startDist, this.endDist, t, this.useLogDist);
    if (this.dirAngle > 1e-4) {
      this.scratchDir.copy(this.startDir).applyAxisAngle(this.dirAxis, this.dirAngle * t).normalize();
    } else {
      this.scratchDir.copy(this.endDir);
    }
    this.scratchCurrentCamPos.copy(this.scratchCurrentTarget).addScaledVector(this.scratchDir, d);

    if (this.animateUp) {
      if (this.upAngle > 1e-4) {
        this.scratchCurrentUp.copy(this.startUp).applyAxisAngle(this.upAxis, this.upAngle * t).normalize();
      } else {
        this.scratchCurrentUp.copy(this.endUp);
      }
      camera.up.copy(this.scratchCurrentUp);
    }
    this.applyOpticalValues(camera, t);

    const activeCtrl = controls ?? this.activeControls;
    if (activeCtrl?.target instanceof THREE.Vector3) {
      activeCtrl.target.copy(this.scratchCurrentTarget);
    }
    camera.position.copy(this.scratchCurrentCamPos);
    camera.lookAt(this.scratchCurrentTarget);

    if (progress >= 1.0) {
      if (activeCtrl?.target instanceof THREE.Vector3) activeCtrl.target.copy(this.endTarget);
      this.applyFinalPose(camera);
      this.isTransitioningState = false;
      this.restoreAndSettleControls(activeCtrl);
      const onComplete = this.options?.onComplete;
      this.options = undefined;
      onComplete?.();
    }
    return true;
  }

  private initUpAndOptics(camera: THREE.Camera, endPose: CameraTransitionPose): void {
    this.startUp.copy(camera.up);
    if (this.startUp.lengthSq() > 1e-8) this.startUp.normalize();
    else this.startUp.set(0, 0, 1);

    if (endPose.up !== undefined) {
      this.animateUp = true;
      copyVec3Input(this.endUp, endPose.up);
      if (this.endUp.lengthSq() > 1e-8) this.endUp.normalize();
      else this.endUp.set(0, 0, 1);
      this.upAngle = computeAngleAndAxis(this.startUp, this.endUp, this.startDir, this.endDir, this.upAxis);
    } else {
      this.animateUp = false;
    }

    this.animateFov = typeof endPose.fov === 'number' && camera instanceof THREE.PerspectiveCamera;
    if (typeof endPose.fov === 'number' && camera instanceof THREE.PerspectiveCamera) {
      this.startFov = camera.fov;
      this.endFov = endPose.fov;
    }
    this.animateOrthoZoom = typeof endPose.orthoZoom === 'number' && camera instanceof THREE.OrthographicCamera;
    if (typeof endPose.orthoZoom === 'number' && camera instanceof THREE.OrthographicCamera) {
      this.startOrthoZoom = camera.zoom;
      this.endOrthoZoom = endPose.orthoZoom;
    }
  }

  private beginFlight(
    duration: number,
    options: CameraTransitionOptions | undefined,
    controls: TransitionControlsLike | undefined,
    now: number | undefined,
  ): void {
    if (controls) this.lockControls(controls);
    this.duration = duration;
    this.options = options;
    this.pendingStart = now === undefined;
    this.startTime = now ?? 0;
    this.isTransitioningState = true;
  }

  private lockControls(controls: TransitionControlsLike): void {
    this.activeControls = controls;
    if (typeof controls.enabled === 'boolean') {
      this.prevControlsEnabled = controls.enabled;
      controls.enabled = false;
    }
  }

  private restoreAndSettleControls(controls?: TransitionControlsLike): void {
    const targetControls = controls ?? this.activeControls;
    if (targetControls) {
      if (this.prevControlsEnabled !== undefined) {
        targetControls.enabled = this.prevControlsEnabled;
      }
      targetControls.update?.();
    }
    this.activeControls = undefined;
    this.prevControlsEnabled = undefined;
  }

  private applyOpticalValues(camera: THREE.Camera, t: number): void {
    if (this.animateFov && camera instanceof THREE.PerspectiveCamera) {
      camera.fov = this.startFov + (this.endFov - this.startFov) * t;
      camera.updateProjectionMatrix();
    }
    if (this.animateOrthoZoom && camera instanceof THREE.OrthographicCamera) {
      camera.zoom = this.startOrthoZoom + (this.endOrthoZoom - this.startOrthoZoom) * t;
      camera.updateProjectionMatrix();
    }
  }

  private applyFinalPose(camera: THREE.Camera): void {
    camera.position.copy(this.endCamPos);
    if (this.animateUp) camera.up.copy(this.endUp);
    this.applyOpticalValues(camera, 1.0);
    camera.lookAt(this.endTarget);
    camera.updateMatrixWorld();
  }
}
