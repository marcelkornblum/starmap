import * as THREE from 'three';
import {
  computeAngleAndAxis,
  copyVec3Input,
  type CameraTransitionPose,
} from './cameraTransitionPoseMath';

/** Mutable orientation and rigid-body tilt state owned by `CameraTransitionController`. */
export interface TransitionOrientationState {
  startDir: THREE.Vector3;
  endDir: THREE.Vector3;
  dirAxis: THREE.Vector3;
  dirAngle: number;
  animateUp: boolean;
  startUp: THREE.Vector3;
  endUp: THREE.Vector3;
  upAxis: THREE.Vector3;
  upAngle: number;
  frameTiltRad: number;
  tiltAxis: THREE.Vector3;
}

/**
 * Creates pre-allocated orientation transition buffers (allocated once per controller).
 */
export function createTransitionOrientationState(): TransitionOrientationState {
  return {
    startDir: new THREE.Vector3(0, 0, 1),
    endDir: new THREE.Vector3(0, 0, 1),
    dirAxis: new THREE.Vector3(0, 1, 0),
    dirAngle: 0,
    animateUp: false,
    startUp: new THREE.Vector3(0, 0, 1),
    endUp: new THREE.Vector3(0, 0, 1),
    upAxis: new THREE.Vector3(1, 0, 0),
    upAngle: 0,
    frameTiltRad: 0,
    tiltAxis: new THREE.Vector3(1, 0, 0),
  };
}

/**
 * Computes a unit rigid-body tilt axis perpendicular to `startDir` from `startUp × startDir`,
 * falling back to `[1, 0, 0]` (or `[0, 1, 0]` if collinear with X) orthogonalised against `startDir`.
 */
export function computeRigidBodyTiltAxis(
  startUp: THREE.Vector3,
  startDir: THREE.Vector3,
  out: THREE.Vector3,
): void {
  out.crossVectors(startUp, startDir);
  if (out.lengthSq() > 1e-8) {
    out.normalize();
    return;
  }

  if (Math.abs(startDir.x) < 0.9) {
    out.set(1, 0, 0).addScaledVector(startDir, -startDir.x);
  } else {
    out.set(0, 1, 0).addScaledVector(startDir, -startDir.y);
  }
  out.normalize();
}

/**
 * Initialises orientation, up-vector, and optional rigid-body `frameTiltRad` state for a flight.
 */
export function initOrientationTransitionState(
  camera: THREE.Camera,
  endPose: CameraTransitionPose,
  endTarget: THREE.Vector3,
  endDist: number,
  endCamPos: THREE.Vector3,
  state: TransitionOrientationState,
): void {
  state.startUp.copy(camera.up);
  if (state.startUp.lengthSq() > 1e-8) {
    state.startUp.normalize();
  } else {
    state.startUp.set(0, 0, 1);
  }

  const rawTilt = endPose.frameTiltRad;
  const hasFrameTilt =
    typeof rawTilt === 'number' && Number.isFinite(rawTilt) && Math.abs(rawTilt) > 1e-6;

  if (hasFrameTilt) {
    state.frameTiltRad = rawTilt;
    computeRigidBodyTiltAxis(state.startUp, state.startDir, state.tiltAxis);
    state.endDir.copy(state.startDir).applyAxisAngle(state.tiltAxis, rawTilt).normalize();
    state.endUp.copy(state.startUp).applyAxisAngle(state.tiltAxis, rawTilt).normalize();
    endCamPos.copy(endTarget).addScaledVector(state.endDir, endDist);
    state.animateUp = true;
    state.dirAngle = 0;
    state.upAngle = 0;
    return;
  }

  state.frameTiltRad = 0;
  if (endPose.up !== undefined) {
    state.animateUp = true;
    copyVec3Input(state.endUp, endPose.up);
    if (state.endUp.lengthSq() > 1e-8) {
      state.endUp.normalize();
    } else {
      state.endUp.set(0, 0, 1);
    }
    state.upAngle = computeAngleAndAxis(
      state.startUp,
      state.endUp,
      state.startDir,
      state.endDir,
      state.upAxis,
    );
  } else {
    state.animateUp = false;
  }

  state.dirAngle = computeAngleAndAxis(
    state.startDir,
    state.endDir,
    state.startUp,
    state.endUp,
    state.dirAxis,
  );
}

/**
 * Evaluates view direction and camera `up` at eased orientation progress `tOrient` with zero allocations.
 */
export function applyOrientationTransitionValues(
  camera: THREE.Camera,
  tOrient: number,
  state: TransitionOrientationState,
  outDir: THREE.Vector3,
  outUp: THREE.Vector3,
): void {
  if (state.frameTiltRad !== 0) {
    const angle = state.frameTiltRad * tOrient;
    outDir.copy(state.startDir).applyAxisAngle(state.tiltAxis, angle).normalize();
    outUp.copy(state.startUp).applyAxisAngle(state.tiltAxis, angle).normalize();
    camera.up.copy(outUp);
    return;
  }

  if (state.dirAngle > 1e-4) {
    outDir.copy(state.startDir).applyAxisAngle(state.dirAxis, state.dirAngle * tOrient).normalize();
  } else {
    outDir.copy(state.endDir);
  }

  if (state.animateUp) {
    if (state.upAngle > 1e-4) {
      outUp.copy(state.startUp).applyAxisAngle(state.upAxis, state.upAngle * tOrient).normalize();
    } else {
      outUp.copy(state.endUp);
    }
    camera.up.copy(outUp);
  }
}
