import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useLazyRef } from '../../../hooks/useLazyRef';
import { useUIStore } from '../../../stores/useUIStore';
import { FRAME_PRIORITY } from '../engineConfig';
import { CameraTransitionController } from './cameraTransitionEngine';
import {
  isTransitionControlsLike,
  type CameraTransitionApi,
  type CameraTransitionOptions,
  type CameraTransitionPose,
} from './cameraTransitionPoseMath';

export type {
  Vector3Input,
  CameraTransitionEasing,
  CameraTransitionOptions,
  CameraTransitionPose,
  TransitionControlsLike,
  CameraTransitionApi,
} from './cameraTransitionPoseMath';

const CameraTransitionContext = createContext<CameraTransitionApi | null>(null);

function useLocalCameraTransitionEngine(enabled: boolean): CameraTransitionApi {
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const rawControls = useThree((s) => s.controls);
  const controls = isTransitionControlsLike(rawControls) ? rawControls : undefined;
  const get = useThree((s) => s.get);

  const controllerRef = useLazyRef(() => new CameraTransitionController());

  const cancelTransition = useCallback(() => {
    const wasTransitioning = controllerRef.current.isTransitioning();
    controllerRef.current.cancel();
    if (wasTransitioning) {
      useUIStore.getState().setCameraTransitioning(false);
    }
  }, [controllerRef]);

  const wrapOptions = useCallback(
    (options?: CameraTransitionOptions): CameraTransitionOptions => ({
      ...options,
      onComplete: () => {
        useUIStore.getState().setCameraTransitioning(false);
        options?.onComplete?.();
      },
      onCancel: () => {
        useUIStore.getState().setCameraTransitioning(false);
        options?.onCancel?.();
      },
    }),
    [],
  );

  const startTransitionTo = useCallback(
    (target: THREE.Vector3 | [number, number, number], options?: CameraTransitionOptions) => {
      const liveState = typeof get === 'function' ? get() : undefined;
      const activeCamera = liveState?.camera ?? camera;
      const rawLiveControls = liveState?.controls ?? controls;
      const activeControls = isTransitionControlsLike(rawLiveControls) ? rawLiveControls : undefined;

      controllerRef.current.start(
        activeCamera,
        target,
        activeControls?.target,
        wrapOptions(options),
        undefined,
        activeControls,
      );
      if (controllerRef.current.isTransitioning()) {
        useUIStore.getState().setCameraTransitioning(true);
      }
      if (typeof invalidate === 'function') invalidate();
    },
    [camera, controls, get, invalidate, controllerRef, wrapOptions],
  );

  const startTransitionToPose = useCallback(
    (endPose: CameraTransitionPose, options?: CameraTransitionOptions) => {
      const liveState = typeof get === 'function' ? get() : undefined;
      const activeCamera = liveState?.camera ?? camera;
      const rawLiveControls = liveState?.controls ?? controls;
      const activeControls = isTransitionControlsLike(rawLiveControls) ? rawLiveControls : undefined;

      controllerRef.current.startPose(
        activeCamera,
        endPose,
        activeControls,
        wrapOptions(options),
      );
      if (controllerRef.current.isTransitioning()) {
        useUIStore.getState().setCameraTransitioning(true);
      }
      if (typeof invalidate === 'function') invalidate();
    },
    [camera, controls, get, invalidate, controllerRef, wrapOptions],
  );

  const isTransitioning = useCallback(
    () => controllerRef.current.isTransitioning(),
    [controllerRef],
  );

  const api = useMemo<CameraTransitionApi>(
    () => ({
      transitionTo: startTransitionTo,
      transitionToPose: startTransitionToPose,
      cancelTransition,
      isTransitioning,
    }),
    [startTransitionTo, startTransitionToPose, cancelTransition, isTransitioning],
  );

  useEffect(() => {
    if (!enabled || !controls || typeof controls.addEventListener !== 'function') return;
    const handleUserInteract = () => {
      cancelTransition();
    };
    controls.addEventListener('start', handleUserInteract);
    return () => {
      controls.removeEventListener?.('start', handleUserInteract);
    };
  }, [enabled, controls, cancelTransition]);

  useEffect(() => {
    if (!enabled) return;
    const controller = controllerRef.current;
    return () => {
      if (controller.isTransitioning()) {
        controller.cancel();
        useUIStore.getState().setCameraTransitioning(false);
      }
    };
  }, [enabled, controllerRef]);

  useFrame(() => {
    if (!enabled) return;
    const liveState = typeof get === 'function' ? get() : undefined;
    const activeCamera = liveState?.camera ?? camera;
    const rawLiveControls = liveState?.controls ?? controls;
    const activeControls = isTransitionControlsLike(rawLiveControls) ? rawLiveControls : undefined;
    const updated = controllerRef.current.update(activeCamera, activeControls);
    if (updated && typeof invalidate === 'function') invalidate();
  }, FRAME_PRIORITY.cameraTransition);

  return api;
}

export interface CameraTransitionProviderProps {
  readonly children: ReactNode;
}

/**
 * Single canvas-level provider owning the authoritative CameraTransitionController,
 * its priority -2 useFrame loop, and its OrbitControls 'start' cancellation listener.
 */
export function CameraTransitionProvider({ children }: CameraTransitionProviderProps) {
  const api = useLocalCameraTransitionEngine(true);
  return createElement(CameraTransitionContext.Provider, { value: api }, children);
}

/**
 * Hook providing smooth, zero-allocation camera and instrument focal transitions.
 * Consumes the enclosing CameraTransitionProvider when present, or falls back to
 * a local controller when called outside a provider (e.g. isolated unit tests).
 */
export function useCameraTransition(): CameraTransitionApi {
  const contextApi = useContext(CameraTransitionContext);
  const fallbackApi = useLocalCameraTransitionEngine(contextApi === null);
  return contextApi ?? fallbackApi;
}
