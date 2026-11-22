import { useEffect, useCallback } from 'react';
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
import { useCameraTransition } from './useCameraTransition';
import type { CameraRigThreeState } from './useCameraRigProjection';

const FALLBACK_TARGET = new THREE.Vector3(0, 0, 0);

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

export function useCameraRigStoreSync(options: UseCameraRigStoreSyncOptions) {
  const {
    camera,
    controls,
    get,
    frame,
    configuredBaseFov,
    snapOnRelease = true,
    snapThresholdRad,
    perspCamRef,
    orthoCamRef,
    persistentTargetRef,
    justUnlockedRef,
    isOrthoAllowed,
    lockToOrthographic,
    unlockFromOrthographic,
    glideToCardinal,
  } = options;

  const { transitionToPose } = useCameraTransition();
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
    const targetVec = controls?.target;
    const store = useCameraStore.getState();
    const currentPos: [number, number, number] = [
      currentCam.position.x,
      currentCam.position.y,
      currentCam.position.z,
    ];
    const currentTarget: [number, number, number] = targetVec
      ? [targetVec.x, targetVec.y, targetVec.z]
      : [store.target[0], store.target[1], store.target[2]];
    const currentZoom = getCameraZoom(currentCam);

    const posDiff = Math.hypot(
      currentPos[0] - store.position[0],
      currentPos[1] - store.position[1],
      currentPos[2] - store.position[2],
    );
    const targetDiff = Math.hypot(
      currentTarget[0] - store.target[0],
      currentTarget[1] - store.target[1],
      currentTarget[2] - store.target[2],
    );
    const zoomDiff = Math.abs(currentZoom - (store.zoom ?? 1));

    if (posDiff > 1e-3 || targetDiff > 1e-3 || zoomDiff > 1e-3) {
      store.setCameraTransform(currentPos, currentTarget, currentZoom);
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
    const perspCam =
      perspCamRef.current ?? (currentCamera instanceof THREE.PerspectiveCamera ? currentCamera : null);

    switch (preset) {
      case 'top-down':
        if (isOrthoAllowed()) glideToCardinal('top');
        break;
      case 'reset': {
        if (useSettingsStore.getState().projection === 'top-down') {
          useSettingsStore.getState().setProjection('3d');
        }
        if (currentCamera instanceof THREE.OrthographicCamera && orthoCamRef.current && perspCam) {
          unlockFromOrthographic();
        }
        if (perspCam) {
          const resetTarget = frame.camera.defaultTarget ?? [0, 0, 0];
          justUnlockedRef.current = false;
          persistentTargetRef.current.set(resetTarget[0], resetTarget[1], resetTarget[2]);
          transitionToPose(
            {
              target: resetTarget,
              position: frame.camera.defaultPosition ?? [0, -35, 20],
              up: [0, 0, 1],
              fov: configuredBaseFov,
            },
            {
              onComplete: () => {
                if (perspCam.zoom !== 1.0) {
                  perspCam.zoom = 1.0;
                  perspCam.updateProjectionMatrix();
                }
                syncPoseToStore();
                state.invalidate?.();
              },
              onCancel: () => {
                syncPoseToStore();
              },
            },
          );
        }
        break;
      }
      case 'orbital-lock':
        if (isOrthoAllowed()) glideToCardinal('front');
        break;
      case 'radial': {
        if (useSettingsStore.getState().projection === 'top-down') {
          useSettingsStore.getState().setProjection('3d');
        }
        if (currentCamera instanceof THREE.OrthographicCamera && orthoCamRef.current && perspCam) {
          unlockFromOrthographic();
        }
        if (perspCam) {
          const target = activeControls?.target ?? persistentTargetRef.current ?? FALLBACK_TARGET;
          justUnlockedRef.current = false;
          persistentTargetRef.current.copy(target);
          const dist = Math.max(1, perspCam.position.distanceTo(target));
          const elev = Math.sin((30 * Math.PI) / 180);
          const planeR = Math.cos((30 * Math.PI) / 180);
          const yaw = (-45 * Math.PI) / 180;
          transitionToPose(
            {
              target: [target.x, target.y, target.z],
              direction: [planeR * Math.cos(yaw), planeR * Math.sin(yaw), elev],
              distance: dist,
              up: [0, 0, 1],
            },
            {
              onComplete: () => {
                syncPoseToStore();
                state.invalidate?.();
              },
              onCancel: () => {
                syncPoseToStore();
              },
            },
          );
        }
        break;
      }
    }
  }, [
    pendingPresetRequest,
    get,
    isOrthoAllowed,
    glideToCardinal,
    unlockFromOrthographic,
    transitionToPose,
    syncPoseToStore,
    frame,
    configuredBaseFov,
    perspCamRef,
    orthoCamRef,
    persistentTargetRef,
    justUnlockedRef,
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
    if (!isCameraTransitioning) {
      syncPoseToStore();
    }
  }, [isCameraTransitioning, syncPoseToStore]);

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
    syncPoseToStore();

    return () => {
      controls.removeEventListener?.('change', handleChange);
      controls.removeEventListener?.('end', handleEnd);
    };
  }, [controls, get, snapOnRelease, snapThresholdRad, glideToCardinal, isOrthoAllowed, perspCamRef, syncPoseToStore]);

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
