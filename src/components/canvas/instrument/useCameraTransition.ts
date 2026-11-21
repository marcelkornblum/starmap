import { useEffect, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useLazyRef } from '../../../hooks/useLazyRef';
import { useUIStore } from '../../../stores/useUIStore';
import { FRAME_PRIORITY } from '../engineConfig';
import {
  CameraTransitionController,
  type CameraTransitionApi,
  type CameraTransitionOptions,
  type CameraTransitionPose,
  type TransitionControlsLike,
} from './cameraTransitionEngine';

export * from './cameraTransitionEngine';

type ControlsWithEvents = TransitionControlsLike & {
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
};

let activeTransitionApi: CameraTransitionApi | null = null;

export function transitionTo(
  target: THREE.Vector3 | [number, number, number],
  options?: CameraTransitionOptions,
): boolean {
  if (!activeTransitionApi) return false;
  activeTransitionApi.transitionTo(target, options);
  return true;
}

export function transitionToPose(
  endPose: CameraTransitionPose,
  options?: CameraTransitionOptions,
): boolean {
  if (!activeTransitionApi) return false;
  activeTransitionApi.transitionToPose(endPose, options);
  return true;
}

export function cancelActiveCameraTransition(): void {
  activeTransitionApi?.cancelTransition();
}

/**
 * Hook providing smooth, zero-allocation camera and instrument focal transitions.
 */
export function useCameraTransition(): CameraTransitionApi {
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const controls = useThree(
    (s) => (s as unknown as { controls?: ControlsWithEvents }).controls,
  );

  const controllerRef = useLazyRef(() => new CameraTransitionController());

  const cancelTransition = useCallback(() => {
    controllerRef.current.cancel();
    useUIStore.getState().setCameraTransitioning(false);
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
      controllerRef.current.start(camera, target, controls?.target, wrapOptions(options));
      if (controllerRef.current.isTransitioning()) {
        useUIStore.getState().setCameraTransitioning(true);
      }
      invalidate();
    },
    [camera, controls, invalidate, controllerRef, wrapOptions],
  );

  const startTransitionToPose = useCallback(
    (endPose: CameraTransitionPose, options?: CameraTransitionOptions) => {
      controllerRef.current.startPose(camera, endPose, controls, wrapOptions(options));
      if (controllerRef.current.isTransitioning()) {
        useUIStore.getState().setCameraTransitioning(true);
      }
      invalidate();
    },
    [camera, controls, invalidate, controllerRef, wrapOptions],
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
    activeTransitionApi = api;
    return () => {
      if (activeTransitionApi === api) activeTransitionApi = null;
    };
  }, [api]);

  useEffect(() => {
    if (!controls || typeof controls.addEventListener !== 'function') return;
    const handleUserInteract = () => {
      cancelTransition();
    };
    controls.addEventListener('start', handleUserInteract);
    return () => {
      controls.removeEventListener?.('start', handleUserInteract);
    };
  }, [controls, cancelTransition]);

  useEffect(() => {
    const controller = controllerRef.current;
    return () => {
      if (controller.isTransitioning()) {
        controller.cancel();
        useUIStore.getState().setCameraTransitioning(false);
      }
    };
  }, [controllerRef]);

  useFrame(() => {
    const updated = controllerRef.current.update(camera, controls);
    if (updated) invalidate();
  }, FRAME_PRIORITY.cameraTransition);

  return api;
}
