import * as THREE from 'three';
import {
  computeCameraTransitionDuration,
  evaluateCameraEasing,
  DEFAULT_CAMERA_EASING_CURVE,
  type CameraEasingCurveId,
} from '../../../utils/cameraEasing';
import { normaliseWindowProgress } from '../../../utils/referenceFrameOrientation';
import { criticallyDamped } from '../math/cameraFrustumMath';

export type Vector3Input = THREE.Vector3 | readonly [number, number, number];

export type CameraTransitionEasing =
  | CameraEasingCurveId
  | 'criticallyDamped'
  | ((t: number) => number);

export interface CameraTransitionOptions {
  duration?: number;
  targetDistance?: number;
  easing?: CameraTransitionEasing;
  logarithmicDistance?: boolean;
  /** Normalised progress window `[start, end]` driving orientation/up/tilt (default `[0, 1]`). */
  orientationWindow?: readonly [number, number];
  /** Normalised progress window `[start, end]` driving target/distance/optics (default `[0, 1]`). */
  translationWindow?: readonly [number, number];
  /** Invoked each active transition frame with raw normalised progress in `[0, 1]`. */
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
  onCancel?: () => void;
}

export interface CameraTransitionPose {
  target: Vector3Input;
  position?: Vector3Input;
  direction?: Vector3Input;
  distance?: number;
  up?: Vector3Input;
  fov?: number;
  orthoZoom?: number;
  /** Rigid-body tilt angle in radians applied simultaneously to `startDir` and `startUp`. */
  frameTiltRad?: number;
}

export interface TransitionControlsLike {
  target?: THREE.Vector3;
  enabled?: boolean;
  enableDamping?: boolean;
  update?: () => void;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
}

export function isTransitionControlsLike(value: unknown): value is TransitionControlsLike {
  return typeof value === 'object' && value !== null;
}

export interface CameraTransitionApi {
  transitionTo: (target: THREE.Vector3 | [number, number, number], options?: CameraTransitionOptions) => void;
  transitionToPose: (endPose: CameraTransitionPose, options?: CameraTransitionOptions) => void;
  cancelTransition: () => void;
  isTransitioning: () => boolean;
}

const _scratchHint = new THREE.Vector3();

export function copyVec3Input(dest: THREE.Vector3, src: Vector3Input): void {
  if (src instanceof THREE.Vector3) {
    dest.copy(src);
  } else {
    dest.set(src[0], src[1], src[2]);
  }
}

export function computePerpAxis(
  dir: THREE.Vector3,
  hintA: THREE.Vector3,
  hintB: THREE.Vector3,
  out: THREE.Vector3,
): void {
  const lenSqA = hintA.lengthSq();
  if (lenSqA > 1e-6) {
    _scratchHint.copy(hintA).divideScalar(Math.sqrt(lenSqA));
    if (Math.abs(_scratchHint.dot(dir)) < 0.9) {
      out.crossVectors(dir, _scratchHint).normalize();
      return;
    }
  }
  const lenSqB = hintB.lengthSq();
  if (lenSqB > 1e-6) {
    _scratchHint.copy(hintB).divideScalar(Math.sqrt(lenSqB));
    if (Math.abs(_scratchHint.dot(dir)) < 0.9) {
      out.crossVectors(dir, _scratchHint).normalize();
      return;
    }
  }
  if (Math.abs(dir.z) < 0.9) {
    out.set(-dir.y, dir.x, 0).normalize();
  } else {
    out.set(0, -dir.z, dir.y).normalize();
  }
}

export function computeAngleAndAxis(
  from: THREE.Vector3,
  to: THREE.Vector3,
  hintA: THREE.Vector3,
  hintB: THREE.Vector3,
  outAxis: THREE.Vector3,
): number {
  const dot = Math.max(-1, Math.min(1, from.dot(to)));
  const angle = Math.acos(dot);
  if (angle > 1e-4) {
    if (dot < -1 + 1e-4) {
      computePerpAxis(from, hintA, hintB, outAxis);
    } else {
      outAxis.crossVectors(from, to).normalize();
    }
  }
  return angle;
}

export function evaluateTransitionEasing(
  easing: CameraTransitionEasing | undefined,
  progress: number,
): number {
  const resolved = easing ?? DEFAULT_CAMERA_EASING_CURVE;
  if (typeof resolved === 'function') return resolved(progress);
  if (resolved === 'criticallyDamped') return criticallyDamped(progress);
  return evaluateCameraEasing(resolved, progress);
}

/**
 * Evaluates transition easing over an optional `[start, end]` progress window.
 */
export function evaluateWindowedTransitionEasing(
  easing: CameraTransitionEasing | undefined,
  progress: number,
  window?: readonly [number, number],
): number {
  return evaluateTransitionEasing(easing, normaliseWindowProgress(progress, window));
}

export function resolveEndPoseDirectionAndPos(
  endPose: CameraTransitionPose,
  options: CameraTransitionOptions | undefined,
  startDir: THREE.Vector3,
  startDist: number,
  hasStartDir: boolean,
  endTarget: THREE.Vector3,
  endDir: THREE.Vector3,
  endCamPos: THREE.Vector3,
  scratchOffset: THREE.Vector3,
): number {
  let endDist: number;
  if (endPose.position !== undefined) {
    copyVec3Input(endCamPos, endPose.position);
    scratchOffset.copy(endCamPos).sub(endTarget);
    const posDist = scratchOffset.length();
    if (posDist > 1e-4) {
      endDir.copy(scratchOffset).divideScalar(posDist);
    } else if (endPose.direction !== undefined) {
      copyVec3Input(endDir, endPose.direction);
      if (endDir.lengthSq() > 1e-8) endDir.normalize();
      else endDir.copy(startDir);
    } else {
      endDir.copy(startDir);
    }
    endDist = endPose.distance ?? posDist;
    if (endPose.distance !== undefined) {
      endCamPos.copy(endTarget).addScaledVector(endDir, endDist);
    }
  } else if (endPose.direction !== undefined) {
    copyVec3Input(endDir, endPose.direction);
    if (endDir.lengthSq() > 1e-8) endDir.normalize();
    else endDir.copy(startDir);
    endDist = endPose.distance ?? options?.targetDistance ?? startDist;
    endCamPos.copy(endTarget).addScaledVector(endDir, endDist);
  } else {
    endDir.copy(startDir);
    endDist = endPose.distance ?? options?.targetDistance ?? startDist;
    endCamPos.copy(endTarget).addScaledVector(endDir, endDist);
  }

  if (!hasStartDir) startDir.copy(endDir);
  if (endDist <= 1e-4 && hasStartDir) endDir.copy(startDir);
  return endDist;
}

export function resolveStartTarget(
  camera: THREE.Camera,
  controlsTarget: THREE.Vector3 | undefined,
  outStartTarget: THREE.Vector3,
  scratchDir: THREE.Vector3,
): void {
  if (controlsTarget instanceof THREE.Vector3) {
    outStartTarget.copy(controlsTarget);
  } else {
    camera.getWorldDirection(scratchDir);
    const camDist = Math.max(camera.position.length(), 1.0);
    outStartTarget.copy(camera.position).addScaledVector(scratchDir, camDist);
  }
}

export function resolveStartDirection(
  camera: THREE.Camera,
  startTarget: THREE.Vector3,
  outStartDir: THREE.Vector3,
  scratchOffset: THREE.Vector3,
): { startDist: number; hasStartDir: boolean } {
  scratchOffset.copy(camera.position).sub(startTarget);
  const startDist = scratchOffset.length();
  if (startDist > 1e-4) {
    outStartDir.copy(scratchOffset).divideScalar(startDist);
    return { startDist, hasStartDir: true };
  }
  outStartDir.set(0, 0, 1);
  return { startDist, hasStartDir: false };
}

export function resolveTransitionDuration(
  explicitDuration: number | undefined,
  startTarget: THREE.Vector3,
  endTarget: THREE.Vector3,
  startDist: number,
  endDist: number,
): number {
  if (explicitDuration !== undefined) {
    return explicitDuration;
  }
  return computeCameraTransitionDuration(
    startTarget.distanceTo(endTarget),
    Math.max(startDist, endDist, 1),
  );
}

export interface TransitionOpticsState {
  animateFov: boolean;
  startFov: number;
  endFov: number;
  animateOrthoZoom: boolean;
  startOrthoZoom: number;
  endOrthoZoom: number;
}

export function initOpticalTransitionState(
  camera: THREE.Camera,
  endPose: CameraTransitionPose,
  optics: TransitionOpticsState,
): void {
  optics.animateFov = typeof endPose.fov === 'number' && camera instanceof THREE.PerspectiveCamera;
  if (typeof endPose.fov === 'number' && camera instanceof THREE.PerspectiveCamera) {
    optics.startFov = camera.fov;
    optics.endFov = endPose.fov;
  }
  optics.animateOrthoZoom =
    typeof endPose.orthoZoom === 'number' && camera instanceof THREE.OrthographicCamera;
  if (typeof endPose.orthoZoom === 'number' && camera instanceof THREE.OrthographicCamera) {
    optics.startOrthoZoom = camera.zoom;
    optics.endOrthoZoom = endPose.orthoZoom;
  }
}

export function applyOpticalTransitionValues(
  camera: THREE.Camera,
  t: number,
  optics: TransitionOpticsState,
): void {
  if (optics.animateFov && camera instanceof THREE.PerspectiveCamera) {
    camera.fov = optics.startFov + (optics.endFov - optics.startFov) * t;
    camera.updateProjectionMatrix();
  }
  if (optics.animateOrthoZoom && camera instanceof THREE.OrthographicCamera) {
    camera.zoom = optics.startOrthoZoom + (optics.endOrthoZoom - optics.startOrthoZoom) * t;
    camera.updateProjectionMatrix();
  }
}

