import type * as THREE from 'three';
import { GALACTIC_FRAME } from '../../../config/referenceFrames';
import { useCameraStore, type SavedGalaxyCameraPose } from '../../../stores/useCameraStore';
import {
  getStandardInitialCamera,
  STANDARD_CAMERA_DISTANCES,
} from '../cartography';
import { type OrbitControlsLike, getCameraZoom } from './cameraControllerUtils';
import { applyImmediateCameraPose } from './galacticCameraHelpers';

export interface GalacticLandingPose {
  readonly position: readonly [number, number, number];
  readonly target: readonly [number, number, number];
  readonly up: readonly [number, number, number];
  readonly zoom: number;
  readonly fov: number;
  readonly isTransientZero: boolean;
}

/**
 * Resolves the target landing pose for a GalacticCameraController arrival or mount.
 */
export function resolveGalacticLandingPose(
  saved: SavedGalaxyCameraPose | null,
  targetX: number,
  targetY: number,
  targetZ: number,
  distance: number | undefined,
  hasExplicitCenter: boolean,
): GalacticLandingPose {
  const pendingSearchFrame = useCameraStore.getState().pendingSearchFrame;
  if (pendingSearchFrame) {
    const frameTarget: [number, number, number] = [
      pendingSearchFrame.target[0],
      pendingSearchFrame.target[1],
      pendingSearchFrame.target[2],
    ];
    useCameraStore.getState().clearSearchFrame();
    const initialCam = getStandardInitialCamera(
      pendingSearchFrame.distance,
      frameTarget,
      GALACTIC_FRAME.camera.baseFov,
    );
    return {
      position: initialCam.position,
      target: frameTarget,
      up: initialCam.up,
      zoom: 1,
      fov: GALACTIC_FRAME.camera.baseFov,
      isTransientZero: false,
    };
  }

  if (saved && distance === undefined) {
    const isMatch =
      Math.hypot(
        saved.target[0] - targetX,
        saved.target[1] - targetY,
        saved.target[2] - targetZ,
      ) < 0.05;
    const isTransientZero =
      !hasExplicitCenter &&
      targetX === 0 &&
      targetY === 0 &&
      targetZ === 0 &&
      (saved.target[0] !== 0 || saved.target[1] !== 0 || saved.target[2] !== 0);

    if (isMatch || isTransientZero) {
      return {
        position: saved.position,
        target: saved.target,
        up: saved.up,
        zoom: saved.zoom,
        fov: GALACTIC_FRAME.camera.baseFov,
        isTransientZero,
      };
    }
  }

  const initialDistSetting =
    typeof distance === 'number' && Number.isFinite(distance) && distance > 0
      ? distance
      : STANDARD_CAMERA_DISTANCES.galactic;
  const initialCam = getStandardInitialCamera(
    initialDistSetting,
    [targetX, targetY, targetZ],
    GALACTIC_FRAME.camera.baseFov,
  );
  return {
    position: initialCam.position,
    target: [targetX, targetY, targetZ],
    up: initialCam.up,
    zoom: 1,
    fov: GALACTIC_FRAME.camera.baseFov,
    isTransientZero: false,
  };
}

/**
 * Restores a saved galactic camera pose immediately when target matches or during transient zero.
 * Returns `null` when no saved pose applies.
 */
export function tryRestoreSavedGalaxyPose(params: {
  camera: THREE.Camera;
  controls: OrbitControlsLike | undefined;
  saved: SavedGalaxyCameraPose;
  targetX: number;
  targetY: number;
  targetZ: number;
  hasExplicitCenter: boolean;
  saveCurrentGalaxyPose: (force?: boolean) => void;
}): { appliedControls: boolean; resolvedTarget: [number, number, number] } | null {
  const {
    camera,
    controls,
    saved,
    targetX,
    targetY,
    targetZ,
    hasExplicitCenter,
    saveCurrentGalaxyPose,
  } = params;

  const isMatch =
    Math.hypot(
      saved.target[0] - targetX,
      saved.target[1] - targetY,
      saved.target[2] - targetZ,
    ) < 0.05;
  const isTransientZero =
    !hasExplicitCenter &&
    targetX === 0 &&
    targetY === 0 &&
    targetZ === 0 &&
    (saved.target[0] !== 0 || saved.target[1] !== 0 || saved.target[2] !== 0);

  if (!isMatch && !isTransientZero) return null;

  const appliedControls = applyImmediateCameraPose(
    camera,
    controls,
    saved.position,
    saved.target,
    saved.up,
    saved.zoom,
    GALACTIC_FRAME.camera.baseFov,
  );

  useCameraStore.getState().setCameraPose({
    position: saved.position,
    target: saved.target,
    up: saved.up,
    zoom: getCameraZoom(camera),
    focalDistance: saved.focalDistance,
  });

  if (controls && isMatch) saveCurrentGalaxyPose(true);
  return {
    appliedControls,
    resolvedTarget: isTransientZero
      ? [saved.target[0], saved.target[1], saved.target[2]]
      : [targetX, targetY, targetZ],
  };
}

/**
 * Applies the default initial galactic camera pose when no saved pose is present.
 */
export function applyDefaultInitialGalacticPose(params: {
  camera: THREE.Camera;
  controls: OrbitControlsLike | undefined;
  targetX: number;
  targetY: number;
  targetZ: number;
  distance: number | undefined;
  saveCurrentGalaxyPose: (force?: boolean) => void;
}): boolean {
  const { camera, controls, targetX, targetY, targetZ, distance, saveCurrentGalaxyPose } = params;
  const initialDistSetting =
    typeof distance === 'number' && Number.isFinite(distance) && distance > 0
      ? distance
      : STANDARD_CAMERA_DISTANCES.galactic;
  const initialCam = getStandardInitialCamera(
    initialDistSetting,
    [targetX, targetY, targetZ],
    GALACTIC_FRAME.camera.baseFov,
  );
  const appliedControls = applyImmediateCameraPose(
    camera,
    controls,
    initialCam.position,
    [targetX, targetY, targetZ],
    initialCam.up,
    1,
    GALACTIC_FRAME.camera.baseFov,
  );

  const initialDist = Math.hypot(
    camera.position.x - targetX,
    camera.position.y - targetY,
    camera.position.z - targetZ,
  );
  useCameraStore.getState().setCameraPose({
    position: [camera.position.x, camera.position.y, camera.position.z],
    target: [targetX, targetY, targetZ],
    up: [initialCam.up[0], initialCam.up[1], initialCam.up[2]],
    zoom: 1,
    focalDistance: initialDist,
  });

  if (controls) saveCurrentGalaxyPose(true);
  return appliedControls;
}
