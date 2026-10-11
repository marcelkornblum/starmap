import React, { useEffect, useCallback, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useSpatialFrame } from './SpatialFrameProvider';
import { FRAME_PRIORITY } from '../engineConfig';
import {
  CardinalTransitionController,
  applyOrthographicLock,
  releaseOrthographicLock,
  handleDiscreteSnapOnEnd,
  syncControlsDistance,
  resetPerspectiveCamera,
  orientRadialPerspectiveCamera,
  type OrbitControlsLike,
} from './cameraRigControls';
import {
  type CardinalDirection,
  getCardinalDirectionFromVector,
  synchronizePerspectiveWithOrtho,
} from '../math/cameraMath';
import { useCameraStore } from '../../../stores/useCameraStore';
import { useLazyRef } from '../../../hooks/useLazyRef';

const FALLBACK_TARGET = new THREE.Vector3(0, 0, 0);

export interface CameraRigProps {
  /** Baseline perspective field of view in degrees. Default: frame.camera.baseFov (45) */
  baseFov?: number;
  /** Whether to blend FOV and zoom on approach to cardinal views. Kept for backwards compatibility */
  adaptiveProjection?: boolean;
  /** Whether to snap smoothly to the nearest cardinal axis on pointer drag release. Default: true */
  snapOnRelease?: boolean;
  /** Cardinal capture angle in degrees for snap-on-release. Default: 10 */
  snapThresholdDeg?: number;
  /** Duration in seconds for snap-to-cardinal glide. Default: 0.35 */
  snapDuration?: number;
}

export const CameraRig: React.FC<CameraRigProps> = ({
  baseFov: explicitBaseFov,
  snapOnRelease = true,
  snapThresholdDeg = 10,
  snapDuration = 0.35,
}) => {
  const threeState = useThree() as {
    camera: THREE.Camera;
    controls?: OrbitControlsLike & {
      minDistance?: number;
      maxDistance?: number;
      addEventListener?: (type: string, listener: () => void) => void;
      removeEventListener?: (type: string, listener: () => void) => void;
    };
    size?: { width: number; height: number };
    get?: () => any;
    set?: (state: any) => void;
    invalidate?: () => void;
  };

  const camera = threeState.camera;
  const controls = threeState.controls;
  const sizeWidth = threeState.size?.width;
  const sizeHeight = threeState.size?.height;
  const get = useMemo(() => threeState.get ?? (() => threeState), [threeState]);
  const { frame } = useSpatialFrame();

  const configuredBaseFov = explicitBaseFov ?? frame.camera.baseFov ?? 45;
  const snapThresholdRad = (snapThresholdDeg * Math.PI) / 180;

  const controllerRef = useLazyRef(() => new CardinalTransitionController());

  // Maintain persistent perspective and orthographic camera instances
  const perspCamRef = useRef<THREE.PerspectiveCamera | null>(
    camera instanceof THREE.PerspectiveCamera ? camera : null,
  );
  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      perspCamRef.current = camera;
    }
  }, [camera]);
  const orthoCamRef = useLazyRef(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 2000));

  // Controls distance constraints synchronisation (immediate for SSR & runtime)
  syncControlsDistance(controls, frame.camera.minDistance, frame.camera.maxDistance);

  useEffect(() => {
    if (!controls) return;
    const prevMin = controls.minDistance;
    const prevMax = controls.maxDistance;

    syncControlsDistance(controls, frame.camera.minDistance, frame.camera.maxDistance);

    return () => {
      syncControlsDistance(controls, prevMin, prevMax);
    };
  }, [controls, frame.camera.minDistance, frame.camera.maxDistance]);

  // Hook into camera store
  const isLocked = useCameraStore((s) => s.isLocked);
  const pendingAxisRequest = useCameraStore((s) => s.pendingAxisRequest);
  const pendingPresetRequest = useCameraStore((s) => s.pendingPresetRequest);

  // Lock to true orthographic camera
  const lockToOrthographic = useCallback(
    (cardinal?: CardinalDirection) => {
      const state = get();
      const currentCamera = state.camera;
      const perspCam = perspCamRef.current ?? (currentCamera instanceof THREE.PerspectiveCamera ? currentCamera : null);
      const orthoCam = orthoCamRef.current;
      if (!perspCam || !orthoCam) return;

      const currentControls = (state as { controls?: OrbitControlsLike }).controls;
      const target = currentControls?.target ?? FALLBACK_TARGET;
      const width = state.size?.width ?? 1920;
      const height = state.size?.height ?? 1080;
      const aspect = width / Math.max(height, 1);

      applyOrthographicLock(perspCam, orthoCam, target, aspect, currentControls);
      state.set?.({ camera: orthoCam });
      useCameraStore.getState().setLocked(true);
      useCameraStore.getState().setMode('orthographic');

      const camDir = new THREE.Vector3().copy(perspCam.position).sub(target).normalize();
      const effectiveCardinal = cardinal ?? getCardinalDirectionFromVector(camDir);
      useCameraStore.getState().setActiveCardinal(effectiveCardinal);

      state.invalidate?.();
    },
    [get, orthoCamRef],
  );

  // Restore to standard 3D perspective camera
  const unlockFromOrthographic = useCallback(() => {
    const state = get();
    const perspCam = perspCamRef.current;
    const orthoCam = orthoCamRef.current;
    if (!perspCam || !orthoCam) return;

    const currentControls = (state as { controls?: OrbitControlsLike }).controls;
    const target = currentControls?.target ?? FALLBACK_TARGET;

    releaseOrthographicLock(orthoCam, perspCam, target, configuredBaseFov, currentControls);
    state.set?.({ camera: perspCam });
    useCameraStore.getState().setLocked(false);
    useCameraStore.getState().setActiveCardinal(null);
    useCameraStore.getState().setMode('perspective');
    state.invalidate?.();
  }, [get, configuredBaseFov, orthoCamRef]);

  // Glide to a designated cardinal axis
  const glideToCardinal = useCallback(
    (cardinal: CardinalDirection) => {
      const state = get();
      const currentCamera = state.camera;
      const perspCam = perspCamRef.current ?? (currentCamera instanceof THREE.PerspectiveCamera ? currentCamera : null);
      if (!perspCam) return;

      const currentControls = (state as { controls?: OrbitControlsLike }).controls;
      const target = currentControls?.target ?? FALLBACK_TARGET;

      if (currentCamera instanceof THREE.OrthographicCamera && orthoCamRef.current) {
        synchronizePerspectiveWithOrtho(orthoCamRef.current, perspCam, target, configuredBaseFov);
        state.set?.({ camera: perspCam });
        useCameraStore.getState().setLocked(false);
        useCameraStore.getState().setMode('perspective');
      }

      controllerRef.current.start(
        perspCam,
        target,
        cardinal,
        snapDuration,
        () => {
          lockToOrthographic(cardinal);
        },
        performance.now(),
        currentControls,
      );
      state.invalidate?.();
    },
    [
      get,
      snapDuration,
      configuredBaseFov,
      controllerRef,
      lockToOrthographic,
      orthoCamRef,
    ],
  );

  // Handle programmatic axis request from store
  useEffect(() => {
    if (!pendingAxisRequest) return;
    useCameraStore.getState().clearAxisRequest();
    glideToCardinal(pendingAxisRequest);
  }, [pendingAxisRequest, glideToCardinal]);

  // Handle programmatic preset requests
  useEffect(() => {
    if (!pendingPresetRequest) return;
    const preset = pendingPresetRequest;
    useCameraStore.getState().clearPresetRequest();

    const state = get();
    const activeControls = (state as { controls?: OrbitControlsLike }).controls;

    switch (preset) {
      case 'top-down':
        glideToCardinal('top');
        break;

      case 'reset': {
        const defaultPos = frame.camera.defaultPosition ?? [0, -35, 20];
        const defaultTgt = frame.camera.defaultTarget ?? [0, 0, 0];
        const currentCamera = state.camera;
        const perspCam =
          perspCamRef.current ??
          (currentCamera instanceof THREE.PerspectiveCamera ? currentCamera : null);

        if (currentCamera instanceof THREE.OrthographicCamera && orthoCamRef.current && perspCam) {
          unlockFromOrthographic();
        }

        if (perspCam) {
          resetPerspectiveCamera(perspCam, defaultPos, defaultTgt, configuredBaseFov, activeControls);
          state.invalidate?.();
        }
        break;
      }

      case 'orbital-lock':
        glideToCardinal('front');
        break;

      case 'radial': {
        const currentCamera = state.camera;
        const perspCam =
          perspCamRef.current ??
          (currentCamera instanceof THREE.PerspectiveCamera ? currentCamera : null);
        if (currentCamera instanceof THREE.OrthographicCamera && orthoCamRef.current && perspCam) {
          unlockFromOrthographic();
        }

        const target = activeControls?.target ?? FALLBACK_TARGET;
        const dist = perspCam ? perspCam.position.distanceTo(target) : 32;

        if (perspCam) {
          orientRadialPerspectiveCamera(perspCam, target, dist, activeControls);
          state.invalidate?.();
        }
        break;
      }
    }
  }, [
    pendingPresetRequest,
    get,
    glideToCardinal,
    unlockFromOrthographic,
    frame.camera.defaultPosition,
    frame.camera.defaultTarget,
    configuredBaseFov,
    perspCamRef,
    orthoCamRef,
  ]);

  // Handle lock state changes from external store toggle
  useEffect(() => {
    const currentCamera = get().camera;
    if (isLocked) {
      if (currentCamera !== orthoCamRef.current) {
        lockToOrthographic();
      }
    } else {
      if (currentCamera === orthoCamRef.current) {
        unlockFromOrthographic();
      }
    }
  }, [isLocked, get, lockToOrthographic, unlockFromOrthographic, orthoCamRef]);

  // Window resize synchronization for orthographic frustum
  useEffect(() => {
    if (!isLocked) return;
    const orthoCam = orthoCamRef.current;
    if (!orthoCam) return;
    const width = sizeWidth ?? 1920;
    const height = sizeHeight ?? 1080;
    const aspect = width / Math.max(height, 1);
    const halfHeight = (orthoCam.top - orthoCam.bottom) / (2 * Math.max(orthoCam.zoom, 1e-4));
    orthoCam.left = -halfHeight * aspect;
    orthoCam.right = halfHeight * aspect;
    orthoCam.updateProjectionMatrix();
    get().invalidate?.();
  }, [sizeWidth, sizeHeight, isLocked, get, orthoCamRef]);

  // OrbitControls interaction listener: discrete snap-on-release and cancel-on-drag
  useEffect(() => {
    if (!controls || typeof controls.addEventListener !== 'function') return;

    const handleStart = () => {
      if (controllerRef.current.isTransitioning()) {
        controllerRef.current.cancel();
      }
    };

    const handleEnd = () => {
      if (!snapOnRelease) return;
      if (useCameraStore.getState().isLocked) return;

      const currentCamera = get().camera;
      const perspCam = perspCamRef.current ?? currentCamera;
      const target = controls.target ?? FALLBACK_TARGET;
      handleDiscreteSnapOnEnd(perspCam, target, snapThresholdRad, (cardinal) => {
        glideToCardinal(cardinal);
      });
    };

    controls.addEventListener('start', handleStart);
    controls.addEventListener('end', handleEnd);

    return () => {
      controls.removeEventListener?.('start', handleStart);
      controls.removeEventListener?.('end', handleEnd);
    };
  }, [
    controls,
    get,
    snapOnRelease,
    snapThresholdRad,
    glideToCardinal,
    controllerRef,
  ]);

  // Frame update loop
  useFrame((state) => {
    const activeControls = (state as { controls?: OrbitControlsLike }).controls;
    const updated = controllerRef.current.update(state.camera, activeControls);
    if (updated) {
      state.invalidate();
    }

    // Strict runtime guard: if locked, tilt is completely disabled and left click & single touch are screen-space pan
    if (isLocked && activeControls) {
      if (activeControls.enableRotate) {
        activeControls.enableRotate = false;
      }
      if ('enablePan' in activeControls && !activeControls.enablePan) {
        activeControls.enablePan = true;
      }
      if ('screenSpacePanning' in activeControls && !activeControls.screenSpacePanning) {
        activeControls.screenSpacePanning = true;
      }
      if (activeControls.mouseButtons && activeControls.mouseButtons.LEFT !== THREE.MOUSE.PAN) {
        activeControls.mouseButtons.LEFT = THREE.MOUSE.PAN;
      }
      if (activeControls.touches && activeControls.touches.ONE !== THREE.TOUCH.PAN) {
        activeControls.touches.ONE = THREE.TOUCH.PAN;
      }
      if (activeControls.object !== orthoCamRef.current && orthoCamRef.current) {
        activeControls.object = orthoCamRef.current;
      }
    }
  }, FRAME_PRIORITY.cameraRig);

  // Cleanup on unmount: restore perspective and unlock
  useEffect(() => {
    const controller = controllerRef.current;
    const orthoCam = orthoCamRef.current;
    return () => {
      controller.cancel();
      if (useCameraStore.getState().isLocked && perspCamRef.current) {
        const state = get();
        const activeControls = (state as { controls?: OrbitControlsLike }).controls;
        releaseOrthographicLock(
          orthoCam,
          perspCamRef.current,
          FALLBACK_TARGET,
          configuredBaseFov,
          activeControls,
        );
        state.set?.({ camera: perspCamRef.current });
      }
    };
  }, [get, configuredBaseFov, controllerRef, orthoCamRef]);

  return null;
};
