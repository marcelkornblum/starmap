import { useEffect, useCallback, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { FRAME_PRIORITY } from '../engineConfig';
import { useCameraStore } from '../../../stores/useCameraStore';
import { useSettingsStore } from '../../../stores/useSettingsStore';
import { useUIStore } from '../../../stores/useUIStore';
import type { CardinalDirection, ReferenceFrame } from '../../../types/spatial';
import { getCameraZoom } from '../scenes/cameraControllerUtils';
import { handleDiscreteSnapOnEnd } from './cameraRigControls';
import { isOrbitControlsLike, type OrbitControlsLike } from './cameraRigZoomAndPan';
import {
  STANDARD_CAMERA_DISTANCES,
  getStandardInitialCamera,
} from '../cartography/cartographyCamera';
import { useCameraTransition } from './useCameraTransition';
import type { CameraRigThreeState } from './useCameraRigProjection';

const FALLBACK_TARGET = new THREE.Vector3(0, 0, 0);

const SCOPE_STANDARD_DISTANCES: Record<string, number> = {
  galactic: STANDARD_CAMERA_DISTANCES.galactic,
  system: STANDARD_CAMERA_DISTANCES.system,
  planetary: STANDARD_CAMERA_DISTANCES.planetary,
};

export function resolveScopeStandardDistance(frameId: string): number {
  return SCOPE_STANDARD_DISTANCES[frameId] ?? STANDARD_CAMERA_DISTANCES.galactic;
}

function persistGalacticSavedPose(
  cam: THREE.PerspectiveCamera,
  target: readonly [number, number, number],
  onlyIfPresent: boolean,
  explicitDist?: number,
): void {
  const store = useCameraStore.getState();
  if (onlyIfPresent && !store.savedGalaxyCamera) return;
  const focalDistance = explicitDist ?? Math.hypot(cam.position.x - target[0], cam.position.y - target[1], cam.position.z - target[2]);
  store.setSavedGalaxyCamera({
    position: [cam.position.x, cam.position.y, cam.position.z],
    target: [target[0], target[1], target[2]],
    up: [cam.up.x, cam.up.y, cam.up.z],
    zoom: cam.zoom,
    focalDistance,
    centerKey: `${target[0]},${target[1]},${target[2]}`,
  });
}

function resolvePerspectivePresetPose(
  preset: 'reset' | 'radial' | 'reset-zoom' | 'reset-position',
  frame: ReferenceFrame,
  perspCam: THREE.PerspectiveCamera,
  activeTarget: THREE.Vector3,
  fov: number,
) {
  const defaultDist = resolveScopeStandardDistance(frame.id);
  const currentTarget: [number, number, number] = [activeTarget.x, activeTarget.y, activeTarget.z];
  const resetTarget: [number, number, number] = frame.camera.defaultTarget
    ? [frame.camera.defaultTarget[0], frame.camera.defaultTarget[1], frame.camera.defaultTarget[2]]
    : [0, 0, 0];

  if (preset === 'reset') {
    const defPos = frame.camera.defaultPosition;
    const position: [number, number, number] = defPos ? [defPos[0], defPos[1], defPos[2]] : [0, -35, 20];
    return { target: resetTarget, position, resetZoom: true, saveGalacticMode: 'none' as const, defaultDist };
  }
  if (preset === 'radial') {
    const dist = Math.max(frame.camera.minDistance, perspCam.position.distanceTo(activeTarget));
    const cam = getStandardInitialCamera(dist, currentTarget, fov);
    return { target: cam.target, position: cam.position, resetZoom: false, saveGalacticMode: 'if-present' as const, defaultDist };
  }
  if (preset === 'reset-zoom') {
    const cam = getStandardInitialCamera(defaultDist, currentTarget, fov);
    return { target: cam.target, position: cam.position, resetZoom: true, saveGalacticMode: 'if-present' as const, defaultDist };
  }
  useCameraStore.getState().setPendingCenterSlug(null);
  const cam = getStandardInitialCamera(defaultDist, resetTarget, fov);
  return { target: resetTarget, position: cam.position, resetZoom: true, saveGalacticMode: 'always' as const, defaultDist };
}

function ensurePerspectiveMode(
  currentCamera: THREE.Camera | undefined,
  orthoCam: THREE.OrthographicCamera | null,
  perspCam: THREE.PerspectiveCamera | null,
  unlockFromOrthographic: () => void,
): void {
  if (useSettingsStore.getState().projection === 'top-down') {
    useSettingsStore.getState().setProjection('3d');
  }
  if (currentCamera instanceof THREE.OrthographicCamera && orthoCam && perspCam) {
    unlockFromOrthographic();
  }
}

export interface UseCameraRigStoreSyncOptions {
  camera: THREE.Camera;
  controls?: OrbitControlsLike;
  get: () => CameraRigThreeState;
  frame: ReferenceFrame;
  configuredBaseFov: number;
  snapOnRelease?: boolean;
  snapThresholdRad: number;
  perspCamRef: React.RefObject<THREE.PerspectiveCamera | null>;
  orthoCamRef: { current: THREE.OrthographicCamera };
  persistentTargetRef: { current: THREE.Vector3 };
  justUnlockedRef: { current: boolean };
  isOrthoAllowed: () => boolean;
  lockToOrthographic: (cardinal?: CardinalDirection) => void;
  unlockFromOrthographic: () => void;
  glideToCardinal: (cardinal: CardinalDirection) => void;
}

export function useCameraRigStoreSync({
  camera, controls, get, frame, configuredBaseFov, snapOnRelease = true, snapThresholdRad,
  perspCamRef, orthoCamRef, persistentTargetRef, justUnlockedRef,
  isOrthoAllowed, lockToOrthographic, unlockFromOrthographic, glideToCardinal,
}: UseCameraRigStoreSyncOptions) {
  const { transitionToPose } = useCameraTransition();
  const isLocked = useCameraStore((s) => s.isLocked);
  const pendingAxisRequest = useCameraStore((s) => s.pendingAxisRequest);
  const pendingPresetRequest = useCameraStore((s) => s.pendingPresetRequest);
  const enableOrthographicProjection = useSettingsStore((s) => s.enableOrthographicProjection);
  const projection = useSettingsStore((s) => s.projection);
  const isOrthoProjectionActive = projection === 'top-down' || enableOrthographicProjection;

  const syncPoseToStore = useCallback(() => {
    const threeState = get();
    const currentCam = threeState.camera ?? camera;
    if (!currentCam) return;
    const liveControls = isOrbitControlsLike(threeState.controls) ? threeState.controls : controls;
    const targetVec = liveControls?.target;
    const store = useCameraStore.getState();

    const { x: cx, y: cy, z: cz } = currentCam.position;
    const tx = targetVec ? targetVec.x : store.target[0];
    const ty = targetVec ? targetVec.y : store.target[1];
    const tz = targetVec ? targetVec.z : store.target[2];
    const { x: ux, y: uy, z: uz } = currentCam.up;
    const currentZoom = getCameraZoom(currentCam);

    const posDiff = Math.hypot(cx - store.position[0], cy - store.position[1], cz - store.position[2]);
    const targetDiff = Math.hypot(tx - store.target[0], ty - store.target[1], tz - store.target[2]);
    const upDiff = Math.hypot(ux - store.up[0], uy - store.up[1], uz - store.up[2]);
    const zoomDiff = Math.abs(currentZoom - (store.zoom ?? 1));

    if (posDiff > 1e-3 || targetDiff > 1e-3 || zoomDiff > 1e-3 || upDiff > 1e-3) {
      store.setCameraPose({ position: [cx, cy, cz], target: [tx, ty, tz], up: [ux, uy, uz], zoom: currentZoom });
    }
  }, [camera, controls, get]);

  useEffect(() => {
    if (!pendingAxisRequest) return;
    useCameraStore.getState().clearAxisRequest();
    if (isOrthoAllowed()) glideToCardinal(pendingAxisRequest);
  }, [pendingAxisRequest, isOrthoAllowed, glideToCardinal]);

  useEffect(() => {
    if (!pendingPresetRequest) return;
    const preset = pendingPresetRequest;
    useCameraStore.getState().clearPresetRequest();
    const state = get();
    const activeControls = isOrbitControlsLike(state.controls) ? state.controls : undefined;
    const currentCamera = state.camera;
    const perspCam = perspCamRef.current ?? (currentCamera instanceof THREE.PerspectiveCamera ? currentCamera : null);

    if (preset === 'top-down') {
      if (isOrthoAllowed()) glideToCardinal('top');
      return;
    }
    if (preset === 'orbital-lock') {
      if (isOrthoAllowed()) glideToCardinal('front');
      return;
    }

    ensurePerspectiveMode(currentCamera, orthoCamRef.current, perspCam, unlockFromOrthographic);
    if (!perspCam) return;

    const activeTarget = activeControls?.target ?? persistentTargetRef.current ?? FALLBACK_TARGET;
    const plan = resolvePerspectivePresetPose(preset, frame, perspCam, activeTarget, configuredBaseFov);
    justUnlockedRef.current = false;
    persistentTargetRef.current.set(plan.target[0], plan.target[1], plan.target[2]);

    transitionToPose(
      { target: plan.target, position: plan.position, up: [0, 0, 1], fov: configuredBaseFov },
      {
        onComplete: () => {
          if (plan.resetZoom && perspCam.zoom !== 1.0) {
            perspCam.zoom = 1.0;
            perspCam.updateProjectionMatrix();
          }
          syncPoseToStore();
          if (frame.id === 'galactic' && plan.saveGalacticMode !== 'none') {
            persistGalacticSavedPose(
              perspCam,
              plan.target,
              plan.saveGalacticMode === 'if-present',
              plan.saveGalacticMode === 'always' ? plan.defaultDist : undefined,
            );
          }
          state.invalidate?.();
        },
        onCancel: () => syncPoseToStore(),
      },
    );
  }, [
    pendingPresetRequest, get, isOrthoAllowed, glideToCardinal, unlockFromOrthographic,
    transitionToPose, syncPoseToStore, frame, configuredBaseFov, perspCamRef, orthoCamRef,
    persistentTargetRef, justUnlockedRef,
  ]);

  useEffect(() => {
    if (!isOrthoProjectionActive && (useCameraStore.getState().isLocked || get().camera === orthoCamRef.current)) {
      unlockFromOrthographic();
    }
  }, [isOrthoProjectionActive, get, unlockFromOrthographic, orthoCamRef]);

  useEffect(() => {
    const currentCamera = get().camera;
    if (isLocked) {
      if (isOrthoAllowed()) {
        if (currentCamera !== orthoCamRef.current) lockToOrthographic();
      } else {
        useCameraStore.getState().setLocked(false);
      }
    } else if (currentCamera === orthoCamRef.current) {
      unlockFromOrthographic();
    }
  }, [isLocked, isOrthoAllowed, get, lockToOrthographic, unlockFromOrthographic, orthoCamRef]);

  useEffect(() => {
    let prevInFlight = useUIStore.getState().isCameraTransitioning;
    if (!prevInFlight) {
      syncPoseToStore();
    }
    return useUIStore.subscribe((state) => {
      if (prevInFlight && !state.isCameraTransitioning) {
        prevInFlight = false;
        syncPoseToStore();
      } else {
        prevInFlight = state.isCameraTransitioning;
      }
    });
  }, [syncPoseToStore]);

  useEffect(() => {
    if (!controls || typeof controls.addEventListener !== 'function') return;
    const handleChange = () => {
      if (!useUIStore.getState().isCameraTransitioning) {
        syncPoseToStore();
      }
    };
    const handleEnd = () => {
      if (useUIStore.getState().isCameraTransitioning) return;
      syncPoseToStore();
      if (!snapOnRelease || !isOrthoAllowed() || useCameraStore.getState().isLocked) return;
      const currentCamera = get().camera;
      const perspCam = perspCamRef.current ?? currentCamera;
      const target = controls.target ?? FALLBACK_TARGET;
      handleDiscreteSnapOnEnd(perspCam, target, snapThresholdRad, (cardinal) => {
        glideToCardinal(cardinal);
      });
    };

    controls.addEventListener('change', handleChange);
    controls.addEventListener('end', handleEnd);
    if (!useUIStore.getState().isCameraTransitioning) {
      syncPoseToStore();
    }

    return () => {
      controls.removeEventListener?.('change', handleChange);
      controls.removeEventListener?.('end', handleEnd);
    };
  }, [controls, get, snapOnRelease, snapThresholdRad, glideToCardinal, isOrthoAllowed, perspCamRef, syncPoseToStore]);

  const isCameraTransitioning = useUIStore((s) => s.isCameraTransitioning);
  const wasTransitioningRef = useRef(isCameraTransitioning);

  useEffect(() => {
    if (wasTransitioningRef.current && !isCameraTransitioning) {
      syncPoseToStore();
    }
    wasTransitioningRef.current = isCameraTransitioning;
  }, [isCameraTransitioning, syncPoseToStore]);

  useFrame((state) => {
    const activeControls = isOrbitControlsLike(state.controls) ? state.controls : undefined;
    if (activeControls?.target) {
      if (justUnlockedRef.current) {
        if (activeControls.target.distanceTo(persistentTargetRef.current) > 1e-4) {
          activeControls.target.copy(persistentTargetRef.current);
          activeControls.update?.();
        }
        justUnlockedRef.current = false;
      } else {
        persistentTargetRef.current.copy(activeControls.target);
      }
    }

    if (isLocked && isOrthoProjectionActive && activeControls) {
      if (activeControls.enableRotate) activeControls.enableRotate = false;
      if ('enablePan' in activeControls && !activeControls.enablePan) activeControls.enablePan = true;
      if ('screenSpacePanning' in activeControls && !activeControls.screenSpacePanning) activeControls.screenSpacePanning = true;
      if (activeControls.mouseButtons && activeControls.mouseButtons.LEFT !== THREE.MOUSE.PAN) activeControls.mouseButtons.LEFT = THREE.MOUSE.PAN;
      if (activeControls.touches && activeControls.touches.ONE !== THREE.TOUCH.PAN) activeControls.touches.ONE = THREE.TOUCH.PAN;
      if (activeControls.object !== orthoCamRef.current && orthoCamRef.current) activeControls.object = orthoCamRef.current;
    }
  }, FRAME_PRIORITY.cameraRig);

  return { syncPoseToStore };
}
