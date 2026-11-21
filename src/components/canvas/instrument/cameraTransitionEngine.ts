import * as THREE from 'three';
import {
  DEFAULT_CAMERA_TRANSITION_DURATION_SEC,
  interpolateCameraDistance,
  easeInOutCubic,
} from '../../../utils/cameraEasing';
import { prefersReducedMotion } from '../../../utils/reducedMotion';
import {
  applyOpticalTransitionValues,
  copyVec3Input,
  computeAngleAndAxis,
  evaluateTransitionEasing,
  initOpticalTransitionState,
  resolveEndPoseDirectionAndPos,
  resolveStartTarget,
  resolveStartDirection,
  resolveTransitionDuration,
  type CameraTransitionOptions,
  type CameraTransitionPose,
  type TransitionControlsLike,
  type TransitionOpticsState,
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
  private prevEnableDamping?: boolean;

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

  private optics: TransitionOpticsState = {
    animateFov: false,
    startFov: 45,
    endFov: 45,
    animateOrthoZoom: false,
    startOrthoZoom: 1,
    endOrthoZoom: 1,
  };

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
    this.optics.animateFov = false;
    this.optics.animateOrthoZoom = false;
    this.useLogDist = options?.logarithmicDistance ?? true;

    const duration = this.resolveDuration(options?.duration);
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

    const duration = this.resolveDuration(options?.duration);
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
    if (controls && !this.activeControls) this.pauseControlsDamping(controls);
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
    applyOpticalTransitionValues(camera, t, this.optics);

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

    initOpticalTransitionState(camera, endPose, this.optics);
  }

  private beginFlight(
    duration: number,
    options: CameraTransitionOptions | undefined,
    controls: TransitionControlsLike | undefined,
    now: number | undefined,
  ): void {
    if (controls) this.pauseControlsDamping(controls);
    this.duration = duration;
    this.options = options;
    this.pendingStart = now === undefined;
    this.startTime = now ?? 0;
    this.isTransitioningState = true;
  }

  private pauseControlsDamping(controls: TransitionControlsLike): void {
    this.activeControls = controls;
    if (this.prevEnableDamping === undefined && controls.enableDamping === true) {
      this.prevEnableDamping = true;
      controls.enableDamping = false;
    }
  }

  private restoreAndSettleControls(controls?: TransitionControlsLike): void {
    const targetControls = controls ?? this.activeControls;
    if (targetControls) {
      if (this.prevEnableDamping !== undefined) {
        targetControls.enableDamping = this.prevEnableDamping;
      }
      targetControls.update?.();
    }
    this.activeControls = undefined;
    this.prevEnableDamping = undefined;
  }

  private resolveDuration(explicitDuration: number | undefined): number {
    return resolveTransitionDuration(
      explicitDuration,
      this.startTarget,
      this.endTarget,
      this.startDist,
      this.endDist,
    );
  }

  private applyFinalPose(camera: THREE.Camera): void {
    camera.position.copy(this.endCamPos);
    if (this.animateUp) camera.up.copy(this.endUp);
    applyOpticalTransitionValues(camera, 1.0, this.optics);
    camera.lookAt(this.endTarget);
    camera.updateMatrixWorld();
  }
}
