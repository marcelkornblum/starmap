import { useEffect, useCallback, useRef } from 'react';
import * as THREE from 'three';
import { useLazyRef } from '../../../hooks/useLazyRef';
import { useCameraStore } from '../../../stores/useCameraStore';
import { useSettingsStore } from '../../../stores/useSettingsStore';
import type { CardinalDirection, ReferenceFrame } from '../../../types/spatial';
import { DEFAULT_CAMERA_EASING_CURVE } from '../../../utils/cameraEasing';
import { CARDINAL_CONFIG, getCardinalDirectionFromVector } from '../math/cameraMath';
import {
  applyOrthographicLock,
  isOrbitControlsLike,
  releaseOrthographicLock,
  syncControlsDistance,
  type OrbitControlsLike,
} from './cameraRigZoomAndPan';
import { useCameraTransition } from './useCameraTransition';
import {
  DEFAULT_BASE_FOV_DEG,
  DEFAULT_VIEWPORT_WIDTH_PX,
  DEFAULT_VIEWPORT_HEIGHT_PX,
} from './instrumentDefaults';

const _scratchCamDir = new THREE.Vector3();

export interface CameraRigThreeState {
  camera: THREE.Camera;
  controls?: unknown;
  size?: { width: number; height: number };
  set?: (partial: { camera?: THREE.PerspectiveCamera | THREE.OrthographicCamera }) => void;
  invalidate?: () => void;
}

export interface UseCameraRigProjectionOptions {
  camera: THREE.Camera;
  controls?: OrbitControlsLike;
  sizeWidth?: number;
  sizeHeight?: number;
  get: () => CameraRigThreeState;
  frame: ReferenceFrame;
  explicitBaseFov?: number;
  snapThresholdDeg?: number;
  snapDuration?: number;
}

export function useCameraRigProjection(options: UseCameraRigProjectionOptions) {
  const {
    camera,
    controls,
    sizeWidth,
    sizeHeight,
    get,
    frame,
    explicitBaseFov,
    snapThresholdDeg = 10,
    snapDuration = 0.35,
  } = options;

  const { transitionToPose } = useCameraTransition();
  const configuredBaseFov = explicitBaseFov ?? frame.camera.baseFov ?? DEFAULT_BASE_FOV_DEG;
  const snapThresholdRad = (snapThresholdDeg * Math.PI) / 180;

  const perspCamRef = useRef<THREE.PerspectiveCamera | null>(
    camera instanceof THREE.PerspectiveCamera ? camera : null,
  );
  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) perspCamRef.current = camera;
  }, [camera]);
  const orthoCamRef = useLazyRef(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 2000));

  const controlsMax = controls?.maxDistance;
  const frameMax = frame.camera.maxDistance;
  const hasStricterMax =
    typeof controlsMax === 'number' && Number.isFinite(controlsMax) && controlsMax > 0 &&
    typeof frameMax === 'number' && controlsMax < frameMax;

  const resolvedMaxDistance = hasStricterMax && typeof controlsMax === 'number' && typeof frameMax === 'number'
    ? Math.min(controlsMax, frameMax)
    : frameMax;
  const resolvedMinDistance = hasStricterMax
    ? Math.max(controls?.minDistance ?? 0, frame.camera.minDistance ?? 0)
    : frame.camera.minDistance;

  useEffect(() => {
    if (!controls) return;
    const prevMin = controls.minDistance;
    const prevMax = controls.maxDistance;
    syncControlsDistance(controls, resolvedMinDistance, resolvedMaxDistance);
    return () => { syncControlsDistance(controls, prevMin, prevMax); };
  }, [controls, resolvedMinDistance, resolvedMaxDistance]);

  const persistentTargetRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const justUnlockedRef = useRef<boolean>(false);

  const isOrthoAllowed = useCallback(() => {
    const s = useSettingsStore.getState();
    return s.enableOrthographicProjection || s.projection === 'top-down';
  }, []);

  const lockToOrthographic = useCallback(
    (cardinal?: CardinalDirection) => {
      if (!isOrthoAllowed()) return;
      const state = get();
      const currentCamera = state.camera;
      const perspCam = perspCamRef.current ?? (currentCamera instanceof THREE.PerspectiveCamera ? currentCamera : null);
      const orthoCam = orthoCamRef.current;
      if (!perspCam || !orthoCam) return;

      const currentControls = isOrbitControlsLike(state.controls) ? state.controls : undefined;
      const target = currentControls?.target ? persistentTargetRef.current.copy(currentControls.target) : persistentTargetRef.current;
      const width = state.size?.width ?? DEFAULT_VIEWPORT_WIDTH_PX;
      const height = state.size?.height ?? DEFAULT_VIEWPORT_HEIGHT_PX;
      const aspect = width / Math.max(height, 1);

      applyOrthographicLock(perspCam, orthoCam, target, aspect, currentControls);
      state.set?.({ camera: orthoCam });
      useCameraStore.getState().setLocked(true);
      useCameraStore.getState().setMode('orthographic');

      _scratchCamDir.copy(perspCam.position).sub(target).normalize();
      const effectiveCardinal = cardinal ?? getCardinalDirectionFromVector(_scratchCamDir);
      useCameraStore.getState().setActiveCardinal(effectiveCardinal);
      state.invalidate?.();
    },
    [get, isOrthoAllowed, orthoCamRef],
  );

  const unlockFromOrthographic = useCallback(() => {
    const state = get();
    const perspCam = perspCamRef.current;
    const orthoCam = orthoCamRef.current;
    if (!perspCam || !orthoCam) return;

    const currentControls = isOrbitControlsLike(state.controls) ? state.controls : undefined;
    const target = currentControls?.target ? persistentTargetRef.current.copy(currentControls.target) : persistentTargetRef.current;

    releaseOrthographicLock(orthoCam, perspCam, target, configuredBaseFov, currentControls);
    state.set?.({ camera: perspCam });
    useCameraStore.getState().setLocked(false);
    useCameraStore.getState().setActiveCardinal(null);
    useCameraStore.getState().setMode('perspective');
    useCameraStore.getState().setCameraTransform(
      [perspCam.position.x, perspCam.position.y, perspCam.position.z],
      [target.x, target.y, target.z],
    );
    justUnlockedRef.current = true;
    state.invalidate?.();
  }, [get, configuredBaseFov, orthoCamRef]);

  const glideToCardinal = useCallback(
    (cardinal: CardinalDirection) => {
      if (!isOrthoAllowed()) return;
      const state = get();
      const currentCamera = state.camera;
      const perspCam = perspCamRef.current ?? (currentCamera instanceof THREE.PerspectiveCamera ? currentCamera : null);
      if (!perspCam) return;

      const currentControls = isOrbitControlsLike(state.controls) ? state.controls : undefined;
      const target = currentControls?.target ?? persistentTargetRef.current;

      if (currentCamera instanceof THREE.OrthographicCamera && orthoCamRef.current) {
        releaseOrthographicLock(orthoCamRef.current, perspCam, target, configuredBaseFov, currentControls);
        state.set?.({ camera: perspCam });
        useCameraStore.getState().setLocked(false);
        useCameraStore.getState().setActiveCardinal(null);
        useCameraStore.getState().setMode('perspective');
        justUnlockedRef.current = false;
      }

      const distance = Math.max(perspCam.position.distanceTo(target), 1e-3);
      const { normal, up } = CARDINAL_CONFIG[cardinal];

      transitionToPose(
        {
          target: [target.x, target.y, target.z],
          direction: normal,
          distance,
          up,
        },
        {
          duration: snapDuration,
          easing: DEFAULT_CAMERA_EASING_CURVE,
          retractHud: false,
          onComplete: () => {
            if (isOrthoAllowed()) lockToOrthographic(cardinal);
          },
        },
      );
    },
    [get, snapDuration, configuredBaseFov, isOrthoAllowed, lockToOrthographic, orthoCamRef, transitionToPose],
  );

  useEffect(() => {
    const isLocked = useCameraStore.getState().isLocked;
    if (!isLocked) return;
    const orthoCam = orthoCamRef.current;
    if (!orthoCam) return;
    const width = sizeWidth ?? DEFAULT_VIEWPORT_WIDTH_PX;
    const height = sizeHeight ?? DEFAULT_VIEWPORT_HEIGHT_PX;
    const aspect = width / Math.max(height, 1);
    const halfHeight = (orthoCam.top - orthoCam.bottom) / (2 * Math.max(orthoCam.zoom, 1e-4));
    orthoCam.left = -halfHeight * aspect;
    orthoCam.right = halfHeight * aspect;
    orthoCam.updateProjectionMatrix();
    get().invalidate?.();
  }, [sizeWidth, sizeHeight, get, orthoCamRef]);

  return {
    configuredBaseFov,
    snapThresholdRad,
    perspCamRef,
    orthoCamRef,
    persistentTargetRef,
    justUnlockedRef,
    isOrthoAllowed,
    lockToOrthographic,
    unlockFromOrthographic,
    glideToCardinal,
  };
}
