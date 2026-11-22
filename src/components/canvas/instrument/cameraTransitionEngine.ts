import * as THREE from 'three';
import {
  DEFAULT_CAMERA_TRANSITION_DURATION_SEC,
  interpolateCameraDistance,
} from '../../../utils/cameraEasing';
import { prefersReducedMotion } from '../../../utils/reducedMotion';
import {
  applyOrientationTransitionValues,
  createTransitionOrientationState,
  initOrientationTransitionState,
} from './cameraTransitionOrientationMath';
import {
  applyOpticalTransitionValues,
  copyVec3Input,
  evaluateWindowedTransitionEasing,
  initOpticalTransitionState,
  resolveEndPoseDirectionAndPos,
  resolveStartDirection,
  resolveStartTarget,
  resolveTransitionDuration,
  type CameraTransitionOptions,
  type CameraTransitionPose,
  type TransitionControlsLike,
  type TransitionOpticsState,
} from './cameraTransitionPoseMath';

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
 * Operates zero-allocation frame updates for smooth camera & instrument centring.
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
  private startDist = 0;
  private endDist = 0;
  private useLogDist = false;

  private orientation = createTransitionOrientationState();

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
    controls?: TransitionControlsLike,
  ): void {
    const effectiveControls =
      controls ?? (controlsTarget ? { target: controlsTarget } : undefined);
    this.startPose(camera, { target }, effectiveControls, options, now);
  }

  public startPose(
    camera: THREE.Camera,
    endPose: CameraTransitionPose,
    controls?: TransitionControlsLike,
    options?: CameraTransitionOptions,
    now?: number,
  ): void {
    if (this.isTransitioningState) this.cancel();

    // Pause damping and drain residual OrbitControls inertia before capturing start pose.
    if (controls) {
      this.pauseControlsDamping(controls);
      controls.update?.();
    }

    copyVec3Input(this.endTarget, endPose.target);
    resolveStartTarget(camera, controls?.target, this.startTarget, this.scratchDir);
    const { startDist, hasStartDir } = resolveStartDirection(
      camera,
      this.startTarget,
      this.orientation.startDir,
      this.scratchOffset,
    );
    this.startDist = startDist;

    this.endDist = resolveEndPoseDirectionAndPos(
      endPose,
      options,
      this.orientation.startDir,
      this.startDist,
      hasStartDir,
      this.endTarget,
      this.orientation.endDir,
      this.endCamPos,
      this.scratchOffset,
    );
    initOrientationTransitionState(
      camera,
      endPose,
      this.endTarget,
      this.endDist,
      this.endCamPos,
      this.orientation,
    );
    initOpticalTransitionState(camera, endPose, this.optics);
    this.useLogDist = options?.logarithmicDistance ?? true;

    const duration = this.resolveDuration(options?.duration);
    if (prefersReducedMotion() || duration <= 0) {
      if (controls?.target instanceof THREE.Vector3) controls.target.copy(this.endTarget);
      this.applyFinalPose(camera);
      this.restoreAndSettleControls(controls);
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
    const easing = this.options?.easing;
    const tOrient = evaluateWindowedTransitionEasing(
      easing,
      progress,
      this.options?.orientationWindow,
    );
    const tTrans = evaluateWindowedTransitionEasing(
      easing,
      progress,
      this.options?.translationWindow,
    );

    this.scratchCurrentTarget.lerpVectors(this.startTarget, this.endTarget, tTrans);
    const d = interpolateCameraDistance(this.startDist, this.endDist, tTrans, this.useLogDist);
    applyOrientationTransitionValues(
      camera,
      tOrient,
      this.orientation,
      this.scratchDir,
      this.scratchCurrentUp,
    );
    this.scratchCurrentCamPos.copy(this.scratchCurrentTarget).addScaledVector(this.scratchDir, d);
    applyOpticalTransitionValues(camera, tTrans, this.optics);

    const activeCtrl = controls ?? this.activeControls;
    if (activeCtrl?.target instanceof THREE.Vector3) {
      activeCtrl.target.copy(this.scratchCurrentTarget);
    }
    camera.position.copy(this.scratchCurrentCamPos);
    camera.lookAt(this.scratchCurrentTarget);

    this.options?.onProgress?.(progress);

    if (progress >= 1.0 && this.isTransitioningState) {
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
    if (this.prevEnableDamping === undefined && controls.enableDamping !== undefined) {
      this.prevEnableDamping = controls.enableDamping;
      controls.enableDamping = false;
    }
  }

  private restoreAndSettleControls(controls?: TransitionControlsLike): void {
    const targetControls = controls ?? this.activeControls;
    if (targetControls) {
      // Commit settled pose while damping is paused, then restore enableDamping.
      targetControls.update?.();
      if (this.prevEnableDamping !== undefined) {
        targetControls.enableDamping = this.prevEnableDamping;
      }
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
    if (this.orientation.animateUp) camera.up.copy(this.orientation.endUp);
    applyOpticalTransitionValues(camera, 1.0, this.optics);
    camera.lookAt(this.endTarget);
    camera.updateMatrixWorld();
  }
}
