import { useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { FRAME_PRIORITY } from '../engineConfig';
import { useLazyRef } from '../../../hooks/useLazyRef';
import { useCameraStore } from '../../../stores/useCameraStore';
import { useSettingsStore } from '../../../stores/useSettingsStore';
import { useUIStore } from '../../../stores/useUIStore';
import type { CardinalDirection, ReferenceFrame } from '../../../types/spatial';
import {
  handleDiscreteSnapOnEnd,
  type CardinalTransitionController,
} from './cameraRigControls';
import { type OrbitControlsLike } from './cameraRigZoomAndPan';
import {
  CameraTransitionController,
  type CameraTransitionPose,
} from './cameraTransitionEngine';
import type { CameraRigThreeState } from './useCameraRigProjection';

const FALLBACK_TARGET = new THREE.Vector3(0, 0, 0);

export interface UseCameraRigStoreSyncOptions {
  camera: THREE.Camera;
  controls?: OrbitControlsLike & {
    addEventListener?: (type: string, listener: () => void) => void;
    removeEventListener?: (type: string, listener: () => void) => void;
  };
  get: () => CameraRigThreeState;
  frame: ReferenceFrame;
  configuredBaseFov: number;
  snapOnRelease?: boolean;
  snapThresholdRad: number;
  controllerRef: { current: CardinalTransitionController };
  perspCamRef: React.RefObject<THREE.PerspectiveCamera | null>;
  orthoCamRef: { current: THREE.OrthographicCamera };
  persistentTargetRef: { current: THREE.Vector3 };
  justUnlockedRef: { current: boolean };
  isOrthoAllowed: () => boolean;
  lockToOrthographic: (cardinal?: CardinalDirection) => void;
  unlockFromOrthographic: () => void;
  glideToCardinal: (cardinal: CardinalDirection) => void;
}

export function useCameraRigStoreSync(options: UseCameraRigStoreSyncOptions) {
  const {
    camera,
    controls,
    get,
    frame,
    configuredBaseFov,
    snapOnRelease = true,
    snapThresholdRad,
    controllerRef,
    perspCamRef,
    orthoCamRef,
    persistentTargetRef,
    justUnlockedRef,
    isOrthoAllowed,
    lockToOrthographic,
    unlockFromOrthographic,
    glideToCardinal,
  } = options;

  const poseControllerRef = useLazyRef(() => new CameraTransitionController());
  const isLocked = useCameraStore((s) => s.isLocked);
  const pendingAxisRequest = useCameraStore((s) => s.pendingAxisRequest);
  const pendingPresetRequest = useCameraStore((s) => s.pendingPresetRequest);
  const isCameraTransitioning = useUIStore((s) => s.isCameraTransitioning);
  const enableOrthographicProjection = useSettingsStore((s) => s.enableOrthographicProjection);
  const projection = useSettingsStore((s) => s.projection);
  const isOrthoProjectionActive = projection === 'top-down' || enableOrthographicProjection;

  const syncPoseToStore = useCallback(() => {
    const currentCam = get().camera ?? camera;
    if (!currentCam) return;
    const targetVec = controls?.target ?? persistentTargetRef.current ?? FALLBACK_TARGET;
    const store = useCameraStore.getState();
    const currentPos: [number, number, number] = [currentCam.position.x, currentCam.position.y, currentCam.position.z];
    const currentTarget: [number, number, number] = [targetVec.x, targetVec.y, targetVec.z];
    const currentZoom = (currentCam as THREE.OrthographicCamera | THREE.PerspectiveCamera).zoom ?? 1;

    const posDiff = Math.hypot(currentPos[0] - store.position[0], currentPos[1] - store.position[1], currentPos[2] - store.position[2]);
    const targetDiff = Math.hypot(currentTarget[0] - store.target[0], currentTarget[1] - store.target[1], currentTarget[2] - store.target[2]);
    const zoomDiff = Math.abs(currentZoom - (store.zoom ?? 1));

    if (posDiff > 1e-3 || targetDiff > 1e-3 || zoomDiff > 1e-3) {
      store.setCameraTransform(currentPos, currentTarget, currentZoom);
    }
  }, [camera, controls, get, persistentTargetRef]);

  const startPresetPoseGlide = useCallback(
    (
      perspCam: THREE.PerspectiveCamera,
      endPose: CameraTransitionPose,
      activeControls: OrbitControlsLike | undefined,
      afterSettle?: () => void,
    ) => {
      poseControllerRef.current.startPose(perspCam, endPose, activeControls, {
        onComplete: () => {
          afterSettle?.();
          useUIStore.getState().setCameraTransitioning(false);
          syncPoseToStore();
        },
        onCancel: () => {
          useUIStore.getState().setCameraTransitioning(false);
          syncPoseToStore();
        },
      });
      if (poseControllerRef.current.isTransitioning()) {
        useUIStore.getState().setCameraTransitioning(true);
      }
      get().invalidate?.();
    },
    [get, poseControllerRef, syncPoseToStore],
  );

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
    const activeControls = (state as { controls?: OrbitControlsLike }).controls;
    const currentCamera = state.camera;
    const perspCam = perspCamRef.current ?? (currentCamera instanceof THREE.PerspectiveCamera ? currentCamera : null);

    switch (preset) {
      case 'top-down':
        if (isOrthoAllowed()) glideToCardinal('top');
        break;
      case 'reset': {
        if (currentCamera instanceof THREE.OrthographicCamera && orthoCamRef.current && perspCam) {
          unlockFromOrthographic();
        }
        if (perspCam) {
          startPresetPoseGlide(
            perspCam,
            {
              target: frame.camera.defaultTarget ?? [0, 0, 0],
              position: frame.camera.defaultPosition ?? [0, -35, 20],
              up: [0, 0, 1],
              fov: configuredBaseFov,
            },
            activeControls,
            () => {
              if (perspCam.zoom !== 1.0) {
                perspCam.zoom = 1.0;
                perspCam.updateProjectionMatrix();
              }
              state.invalidate?.();
            },
          );
        }
        break;
      }
      case 'orbital-lock':
        if (isOrthoAllowed()) glideToCardinal('front');
        break;
      case 'radial': {
        if (currentCamera instanceof THREE.OrthographicCamera && orthoCamRef.current && perspCam) {
          unlockFromOrthographic();
        }
        if (perspCam) {
          const target = activeControls?.target ?? FALLBACK_TARGET;
          const dist = Math.max(1, perspCam.position.distanceTo(target));
          const elev = Math.sin((30 * Math.PI) / 180);
          const planeR = Math.cos((30 * Math.PI) / 180);
          const yaw = (-45 * Math.PI) / 180;
          startPresetPoseGlide(
            perspCam,
            {
              target: [target.x, target.y, target.z],
              direction: [planeR * Math.cos(yaw), planeR * Math.sin(yaw), elev],
              distance: dist,
              up: [0, 0, 1],
            },
            activeControls,
            () => { state.invalidate?.(); },
          );
        }
        break;
      }
    }
  }, [pendingPresetRequest, get, isOrthoAllowed, glideToCardinal, unlockFromOrthographic, startPresetPoseGlide, frame, configuredBaseFov, perspCamRef, orthoCamRef]);

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
    if (!isCameraTransitioning) {
      syncPoseToStore();
    }
  }, [isCameraTransitioning, syncPoseToStore]);

  useEffect(() => {
    const poseController = poseControllerRef.current;
    return () => {
      if (poseController.isTransitioning()) {
        poseController.cancel();
        useUIStore.getState().setCameraTransitioning(false);
      }
    };
  }, [poseControllerRef]);

  useEffect(() => {
    if (!controls || typeof controls.addEventListener !== 'function') return;
    const handleStart = () => {
      if (controllerRef.current.isTransitioning()) controllerRef.current.cancel();
      if (poseControllerRef.current.isTransitioning()) poseControllerRef.current.cancel();
    };
    const handleChange = () => {
      if (!useUIStore.getState().isCameraTransitioning) {
        syncPoseToStore();
      }
    };
    const handleEnd = () => {
      syncPoseToStore();
      if (!snapOnRelease || !isOrthoAllowed() || useCameraStore.getState().isLocked) return;
      const currentCamera = get().camera;
      const perspCam = perspCamRef.current ?? currentCamera;
      const target = controls.target ?? FALLBACK_TARGET;
      handleDiscreteSnapOnEnd(perspCam, target, snapThresholdRad, (cardinal) => { glideToCardinal(cardinal); });
    };

    controls.addEventListener('start', handleStart);
    controls.addEventListener('change', handleChange);
    controls.addEventListener('end', handleEnd);
    syncPoseToStore();

    return () => {
      controls.removeEventListener?.('start', handleStart);
      controls.removeEventListener?.('change', handleChange);
      controls.removeEventListener?.('end', handleEnd);
    };
  }, [controls, get, snapOnRelease, snapThresholdRad, glideToCardinal, controllerRef, poseControllerRef, isOrthoAllowed, perspCamRef, syncPoseToStore]);

  useFrame((state) => {
    const activeControls = (state as { controls?: OrbitControlsLike }).controls;
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

    const cardinalUpdated = controllerRef.current.update(state.camera, activeControls);
    const poseUpdated = poseControllerRef.current.update(state.camera, activeControls);
    if (cardinalUpdated || poseUpdated) {
      if (!useUIStore.getState().isCameraTransitioning) {
        syncPoseToStore();
      }
      state.invalidate();
    }

    if (isLocked && enableOrthographicProjection && activeControls) {
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
