import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useUIStore } from '../../../stores/useUIStore';
import { FRAME_PRIORITY } from '../engineConfig';
import { CameraTransitionController } from './cameraTransitionEngine';
import { hasPendingCrossScaleArrival } from './crossScaleArrivalState';
import {
  createTransitionFrameScheduler,
  type TransitionFrameScheduler,
} from './transitionFrameScheduler';
import {
  isTransitionControlsLike,
  type CameraTransitionApi,
  type CameraTransitionOptions,
} from './cameraTransitionPoseMath';

export type {
  Vector3Input,
  CameraTransitionEasing,
  CameraTransitionOptions,
  CameraTransitionPose,
  TransitionControlsLike,
  CameraTransitionApi,
} from './cameraTransitionPoseMath';

interface ThreeStateSnapshot {
  readonly camera?: THREE.Camera;
  readonly controls?: unknown;
  readonly invalidate?: () => void;
}

interface HudRetractState {
  active: boolean;
}

const CameraTransitionContext = createContext<CameraTransitionApi | null>(null);

function createTransitionOptionsWrapper(
  controller: CameraTransitionController,
  hudRetractState: HudRetractState,
  scheduler: TransitionFrameScheduler,
  options?: CameraTransitionOptions,
): CameraTransitionOptions {
  return {
    ...options,
    onComplete: () => {
      scheduler.cancelPending();
      const didRetractHud = hudRetractState.active;
      hudRetractState.active = false;
      options?.onComplete?.();
      if (
        didRetractHud &&
        !controller.isTransitioning() &&
        !hasPendingCrossScaleArrival()
      ) {
        useUIStore.getState().setCameraTransitioning(false);
      }
    },
    onCancel: () => {
      scheduler.cancelPending();
      const didRetractHud = hudRetractState.active;
      hudRetractState.active = false;
      options?.onCancel?.();
      if (
        didRetractHud &&
        !controller.isTransitioning() &&
        !hasPendingCrossScaleArrival()
      ) {
        useUIStore.getState().setCameraTransitioning(false);
      }
    },
  };
}

function createCameraTransitionApi(
  controller: CameraTransitionController,
  getState: () => ThreeStateSnapshot | undefined,
  hudRetractState: HudRetractState,
  scheduler: TransitionFrameScheduler,
): CameraTransitionApi {
  const resolveThree = () => {
    const liveState = getState();
    const activeControls = isTransitionControlsLike(liveState?.controls)
      ? liveState.controls
      : undefined;
    return {
      activeCamera: liveState?.camera,
      activeControls,
      invalidate: liveState?.invalidate,
    };
  };

  const beginHudRetractionIfNeeded = (options?: CameraTransitionOptions) => {
    if (!controller.isTransitioning()) return;
    const shouldRetractHud = options?.retractHud !== false;
    hudRetractState.active = shouldRetractHud;
    if (shouldRetractHud) {
      useUIStore.getState().setCameraTransitioning(true);
    }
  };

  return {
    transitionTo: (target, options) => {
      const { activeCamera, activeControls, invalidate } = resolveThree();
      if (!activeCamera) return;
      controller.start(
        activeCamera,
        target,
        activeControls?.target,
        createTransitionOptionsWrapper(controller, hudRetractState, scheduler, options),
        undefined,
        activeControls,
      );
      beginHudRetractionIfNeeded(options);
      scheduler.requestInitial(invalidate);
    },
    transitionToPose: (endPose, options) => {
      const { activeCamera, activeControls, invalidate } = resolveThree();
      if (!activeCamera) return;
      controller.startPose(
        activeCamera,
        endPose,
        activeControls,
        createTransitionOptionsWrapper(controller, hudRetractState, scheduler, options),
      );
      beginHudRetractionIfNeeded(options);
      scheduler.requestInitial(invalidate);
    },
    cancelTransition: () => {
      scheduler.cancelPending();
      const didRetractHud = hudRetractState.active;
      controller.cancel();
      hudRetractState.active = false;
      if (didRetractHud && !hasPendingCrossScaleArrival()) {
        useUIStore.getState().setCameraTransitioning(false);
      }
    },
    isTransitioning: () => controller.isTransitioning(),
  };
}

function useCameraTransitionEngine(): CameraTransitionApi {
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const rawControls = useThree((s) => s.controls);
  const controls = isTransitionControlsLike(rawControls) ? rawControls : undefined;
  const get = useThree((s) => s.get);

  const [controller] = useState(() => new CameraTransitionController());
  const [hudRetractState] = useState<HudRetractState>(() => ({ active: false }));
  const [scheduler] = useState(() => createTransitionFrameScheduler());

  const getLiveSnapshot = useCallback((): ThreeStateSnapshot => {
    const liveState = typeof get === 'function' ? get() : undefined;
    return {
      camera: liveState?.camera ?? camera,
      controls: liveState?.controls ?? controls,
      invalidate: liveState?.invalidate ?? invalidate,
    };
  }, [camera, controls, get, invalidate]);

  const api = useMemo<CameraTransitionApi>(
    () =>
      createCameraTransitionApi(
        controller,
        getLiveSnapshot,
        hudRetractState,
        scheduler,
      ),
    [controller, getLiveSnapshot, hudRetractState, scheduler],
  );

  useEffect(() => {
    if (!controls || typeof controls.addEventListener !== 'function') return;
    const handleUserInteract = () => {
      api.cancelTransition();
    };
    controls.addEventListener('start', handleUserInteract);
    return () => {
      controls.removeEventListener?.('start', handleUserInteract);
    };
  }, [controls, api]);

  useEffect(() => {
    return () => {
      scheduler.cancelPending();
      const didRetractHud = hudRetractState.active;
      if (controller.isTransitioning()) {
        controller.cancel();
        hudRetractState.active = false;
        if (didRetractHud) {
          useUIStore.getState().setCameraTransitioning(false);
        }
      }
    };
  }, [controller, hudRetractState, scheduler]);

  const isStillTransitioning = useCallback(
    () => controller.isTransitioning(),
    [controller],
  );

  useFrame(() => {
    const snapshot = getLiveSnapshot();
    const activeCamera = snapshot.camera;
    if (!activeCamera) return;
    const activeControls = isTransitionControlsLike(snapshot.controls)
      ? snapshot.controls
      : undefined;
    const updated = controller.update(activeCamera, activeControls);
    if (updated) {
      scheduler.requestNext(snapshot.invalidate, isStillTransitioning);
    }
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
  const api = useCameraTransitionEngine();
  return createElement(CameraTransitionContext.Provider, { value: api }, children);
}

const NOOP_CAMERA_TRANSITION_API: CameraTransitionApi = {
  transitionTo: () => {},
  transitionToPose: () => {},
  cancelTransition: () => {},
  isTransitioning: () => false,
};

const selectNoop = (): undefined => undefined;

/**
 * Hook providing smooth, zero-allocation camera and instrument focal transitions.
 * Consumes the enclosing `CameraTransitionProvider` with zero extra allocations or `useFrame`
 * registrations, falling back to a lazy non-`useFrame` controller only when mounted outside a provider.
 */
export function useCameraTransition(): CameraTransitionApi {
  const contextApi = useContext(CameraTransitionContext);
  const get = useThree(contextApi ? selectNoop : (s) => s.get);
  const camera = useThree(contextApi ? selectNoop : (s) => s.camera);
  const rawControls = useThree(contextApi ? selectNoop : (s) => s.controls);
  const invalidate = useThree(contextApi ? selectNoop : (s) => s.invalidate);
  const [fallbackState] = useState<{
    readonly controller: CameraTransitionController;
    readonly hudRetractState: HudRetractState;
    readonly scheduler: TransitionFrameScheduler;
  } | null>(() =>
    contextApi
      ? null
      : {
          controller: new CameraTransitionController(),
          hudRetractState: { active: false },
          scheduler: createTransitionFrameScheduler(),
        },
  );

  const getFallbackSnapshot = useCallback((): ThreeStateSnapshot => {
    const liveState = typeof get === 'function' ? get() : undefined;
    return {
      camera: liveState?.camera ?? camera,
      controls: liveState?.controls ?? rawControls,
      invalidate: liveState?.invalidate ?? invalidate,
    };
  }, [camera, get, invalidate, rawControls]);

  const fallbackApi = useMemo<CameraTransitionApi | null>(
    () =>
      fallbackState
        ? createCameraTransitionApi(
            fallbackState.controller,
            getFallbackSnapshot,
            fallbackState.hudRetractState,
            fallbackState.scheduler,
          )
        : null,
    [fallbackState, getFallbackSnapshot],
  );

  return contextApi ?? fallbackApi ?? NOOP_CAMERA_TRANSITION_API;
}
