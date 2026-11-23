import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type React from 'react';
import { renderHook, act } from '@testing-library/react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { CameraTransitionController } from './cameraTransitionEngine';
import {
  CameraTransitionProvider,
  useCameraTransition,
} from './useCameraTransition';
import { FRAME_PRIORITY } from '../engineConfig';
import { createSpatialEntityStore } from '../entity/SpatialEntityStore';
import { useUIStore } from '../../../stores/useUIStore';
import {
  clearPendingCrossScaleArrival,
  setPendingCrossScaleArrival,
} from './crossScaleArrivalState';
import {
  registerWebGLGpuTelemetry,
  resetDeviceTierRuntimeState,
} from '../../../services/deviceTierService';

let mockCamera: THREE.PerspectiveCamera;
let mockControls: {
  target: THREE.Vector3;
  enabled: boolean;
  enableDamping: boolean;
  update: ReturnType<typeof vi.fn<() => void>>;
  addEventListener: ReturnType<typeof vi.fn<(event: string, cb: () => void) => void>>;
  removeEventListener: ReturnType<typeof vi.fn<(event: string, cb: () => void) => void>>;
};
let mockInvalidate: ReturnType<typeof vi.fn<() => void>>;

function setMockReducedMotion(reduced: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: reduced && query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
  useThree: (selector?: (s: unknown) => unknown) => {
    const state = {
      camera: mockCamera,
      controls: mockControls,
      invalidate: mockInvalidate,
      get: () => ({ camera: mockCamera, controls: mockControls, invalidate: mockInvalidate }),
    };
    return selector ? selector(state) : state;
  },
}));

describe('CameraTransitionProvider & useCameraTransition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setMockReducedMotion(false);
    useUIStore.getState().resetUI();
    mockCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    mockCamera.position.set(0, 10, 20);
    mockControls = {
      target: new THREE.Vector3(0, 0, 0),
      enabled: true,
      enableDamping: true,
      update: vi.fn<() => void>(),
      addEventListener: vi.fn<(event: string, cb: () => void) => void>(),
      removeEventListener: vi.fn<(event: string, cb: () => void) => void>(),
    };
    mockInvalidate = vi.fn<() => void>();
  });

  afterEach(() => {
    clearPendingCrossScaleArrival();
    resetDeviceTierRuntimeState();
    setMockReducedMotion(false);
    vi.useRealTimers();
  });

  describe('CameraTransitionProvider single-owner context', () => {
    const providerWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <CameraTransitionProvider>{children}</CameraTransitionProvider>
    );

    it('provides one shared CameraTransitionApi, one useFrame at priority -2, and one OrbitControls start listener across consumers', () => {
      const hookCalls = renderHook(
        () => ({
          consumerA: useCameraTransition(),
          consumerB: useCameraTransition(),
        }),
        { wrapper: providerWrapper },
      );

      expect(hookCalls.result.current.consumerA).toBe(hookCalls.result.current.consumerB);

      // Only the provider registers a working useFrame at cameraTransition (-2) and one 'start' listener
      const startListenerCalls = mockControls.addEventListener.mock.calls.filter(
        ([event]) => event === 'start',
      );
      expect(startListenerCalls).toHaveLength(1);

      const frameCallsAtTransitionPriority = vi.mocked(useFrame).mock.calls.filter(
        ([, priority]) => priority === FRAME_PRIORITY.cameraTransition,
      );
      expect(frameCallsAtTransitionPriority.length).toBeGreaterThanOrEqual(1);

      // Consumer A starts a transition; Consumer B sees isTransitioning() === true and preempts cleanly
      const onCancelA = vi.fn();
      act(() => {
        hookCalls.result.current.consumerA.transitionTo([10, 0, 0], {
          duration: 1.0,
          onCancel: onCancelA,
        });
      });
      expect(hookCalls.result.current.consumerA.isTransitioning()).toBe(true);
      expect(hookCalls.result.current.consumerB.isTransitioning()).toBe(true);
      expect(mockControls.enableDamping).toBe(false);
      expect(mockControls.update).toHaveBeenCalledTimes(1);

      act(() => {
        hookCalls.result.current.consumerB.transitionToPose(
          { target: [30, 0, 0], position: [30, 0, 20] },
          { duration: 1.0 },
        );
      });
      expect(onCancelA).toHaveBeenCalledTimes(1);
      expect(hookCalls.result.current.consumerA.isTransitioning()).toBe(true);
      expect(useUIStore.getState().isCameraTransitioning).toBe(true);

      // Firing the single OrbitControls 'start' listener cancels the transition and restores damping
      const startHandler = startListenerCalls[0]?.[1];
      act(() => {
        startHandler?.();
      });
      expect(hookCalls.result.current.consumerA.isTransitioning()).toBe(false);
      expect(useUIStore.getState().isCameraTransitioning).toBe(false);
      expect(mockControls.enableDamping).toBe(true);

      hookCalls.unmount();
    });

    it('registers zero useFrame hooks per consumer when inside CameraTransitionProvider', () => {
      vi.mocked(useFrame).mockClear();
      renderHook(
        () => {
          useCameraTransition();
          useCameraTransition();
          return useCameraTransition();
        },
        { wrapper: providerWrapper },
      );

      const frameCallsAtTransitionPriority = vi.mocked(useFrame).mock.calls.filter(
        ([, priority]) => priority === FRAME_PRIORITY.cameraTransition,
      );
      expect(frameCallsAtTransitionPriority).toHaveLength(1);
    });

    it('runs options.onComplete before checking pending cross-scale arrival so isCameraTransitioning stays true during Stage 1 to Stage 2 handoff', () => {
      const perfSpy = vi.spyOn(performance, 'now').mockReturnValue(1000);
      const { result } = renderHook(() => useCameraTransition(), { wrapper: providerWrapper });

      const transitionFrameCb = vi.mocked(useFrame).mock.calls.find(
        ([, priority]) => priority === FRAME_PRIORITY.cameraTransition,
      )?.[0];
      expect(transitionFrameCb).toBeDefined();

      act(() => {
        result.current.transitionTo([10, 0, 0], {
          duration: 0.5,
          onComplete: () => {
            setPendingCrossScaleArrival({
              direction: 'in',
              targetScope: 'system',
              durationSec: 1.0,
            });
          },
        });
      });

      expect(useUIStore.getState().isCameraTransitioning).toBe(true);
      act(() => {
        transitionFrameCb?.({} as never, 0.016);
      });
      perfSpy.mockReturnValue(1500);
      act(() => {
        transitionFrameCb?.({} as never, 0.016);
      });

      expect(result.current.isTransitioning()).toBe(false);
      expect(useUIStore.getState().isCameraTransitioning).toBe(true);
      perfSpy.mockRestore();
    });

    it('does not set or clear isCameraTransitioning when retractHud is false', () => {
      const perfSpy = vi.spyOn(performance, 'now').mockReturnValue(1000);
      const { result } = renderHook(() => useCameraTransition(), { wrapper: providerWrapper });

      const transitionFrameCb = vi.mocked(useFrame).mock.calls.find(
        ([, priority]) => priority === FRAME_PRIORITY.cameraTransition,
      )?.[0];
      expect(transitionFrameCb).toBeDefined();

      act(() => {
        result.current.transitionToPose(
          { target: [0, 0, 0], direction: [0, 0, 1], distance: 20 },
          { duration: 0.35, retractHud: false },
        );
      });
      expect(result.current.isTransitioning()).toBe(true);
      expect(useUIStore.getState().isCameraTransitioning).toBe(false);

      useUIStore.getState().setCameraTransitioning(true);
      act(() => {
        transitionFrameCb?.({} as never, 0.016);
      });
      perfSpy.mockReturnValue(1400);
      act(() => {
        transitionFrameCb?.({} as never, 0.016);
      });
      expect(result.current.isTransitioning()).toBe(false);
      expect(useUIStore.getState().isCameraTransitioning).toBe(true);
      perfSpy.mockRestore();
    });

    it('does not call invalidate inside useFrame on the completion tick after controller settles', () => {
      const perfSpy = vi.spyOn(performance, 'now').mockReturnValue(1000);
      const { result } = renderHook(() => useCameraTransition(), { wrapper: providerWrapper });

      const transitionFrameCb = vi.mocked(useFrame).mock.calls.find(
        ([, priority]) => priority === FRAME_PRIORITY.cameraTransition,
      )?.[0];
      expect(transitionFrameCb).toBeDefined();

      act(() => {
        result.current.transitionTo([10, 0, 0], { duration: 0.5 });
      });
      mockInvalidate.mockClear();

      act(() => {
        transitionFrameCb?.({} as never, 0.016);
      });
      perfSpy.mockReturnValue(1200);
      act(() => {
        transitionFrameCb?.({} as never, 0.016);
      });
      expect(result.current.isTransitioning()).toBe(true);
      expect(mockInvalidate).toHaveBeenCalled();

      mockInvalidate.mockClear();
      perfSpy.mockReturnValue(1500);
      act(() => {
        transitionFrameCb?.({} as never, 0.016);
      });

      expect(result.current.isTransitioning()).toBe(false);
      expect(mockInvalidate).not.toHaveBeenCalled();
      perfSpy.mockRestore();
    });

    it('paces invalidate on constrained software GPUs instead of queuing every 16ms frame, and cancels pending timer on settle', () => {
      vi.useFakeTimers();
      registerWebGLGpuTelemetry({ gpuRenderer: 'ANGLE (Google, SwiftShader)' });
      let nowMs = 1000;
      const perfSpy = vi.spyOn(performance, 'now').mockImplementation(() => nowMs);
      const { result } = renderHook(() => useCameraTransition(), { wrapper: providerWrapper });

      const transitionFrameCb = vi.mocked(useFrame).mock.calls.find(
        ([, priority]) => priority === FRAME_PRIORITY.cameraTransition,
      )?.[0];
      expect(transitionFrameCb).toBeDefined();

      act(() => {
        result.current.transitionTo([10, 0, 0], { duration: 0.5 });
      });
      expect(mockInvalidate).toHaveBeenCalledTimes(1);
      mockInvalidate.mockClear();

      nowMs = 1016;
      act(() => {
        transitionFrameCb?.({} as never, 0.016);
      });
      expect(mockInvalidate).not.toHaveBeenCalled();

      act(() => {
        nowMs = 1070;
        vi.advanceTimersByTime(54);
      });
      expect(mockInvalidate).toHaveBeenCalledTimes(1);
      mockInvalidate.mockClear();

      nowMs = 1068;
      act(() => {
        transitionFrameCb?.({} as never, 0.016);
      });
      expect(mockInvalidate).not.toHaveBeenCalled();

      nowMs = 1520;
      act(() => {
        transitionFrameCb?.({} as never, 0.016);
      });
      expect(result.current.isTransitioning()).toBe(false);
      expect(mockInvalidate).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(mockInvalidate).not.toHaveBeenCalled();
      perfSpy.mockRestore();
    });
  });

  describe('useCameraTransition fallback outside CameraTransitionProvider', () => {
    it('falls back cleanly to a local useLazyRef controller when mounted without provider', () => {
      const { result } = renderHook(() => useCameraTransition());
      expect(result.current).not.toBeNull();
      expect(typeof result.current.transitionTo).toBe('function');
      expect(typeof result.current.transitionToPose).toBe('function');
      expect(typeof result.current.cancelTransition).toBe('function');
      expect(typeof result.current.isTransitioning).toBe('function');
      expect(result.current.isTransitioning()).toBe(false);
    });

    it('synchronises transition lifecycle with useUIStore isCameraTransitioning and passes controls', () => {
      useUIStore.getState().resetUI();
      expect(useUIStore.getState().isCameraTransitioning).toBe(false);
      const { result } = renderHook(() => useCameraTransition());
      act(() => {
        result.current.transitionTo(new THREE.Vector3(10, 0, 0));
      });
      expect(useUIStore.getState().isCameraTransitioning).toBe(true);
      expect(mockControls.enableDamping).toBe(false);
      expect(mockControls.update).toHaveBeenCalledTimes(1);

      act(() => {
        result.current.cancelTransition();
      });
      expect(useUIStore.getState().isCameraTransitioning).toBe(false);
      expect(mockControls.enableDamping).toBe(true);
      expect(mockControls.update).toHaveBeenCalledTimes(2);
    });

    it('does not pulse isCameraTransitioning when prefersReducedMotion is active', () => {
      setMockReducedMotion(true);
      useUIStore.getState().resetUI();
      const setTransitionSpy = vi.spyOn(useUIStore.getState(), 'setCameraTransitioning');
      const onComplete = vi.fn();
      const { result } = renderHook(() => useCameraTransition());

      act(() => {
        result.current.transitionToPose(
          { target: [15, 0, 0], position: [15, 0, 25] },
          { onComplete },
        );
      });

      expect(setTransitionSpy).not.toHaveBeenCalledWith(true);
      expect(useUIStore.getState().isCameraTransitioning).toBe(false);
      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(mockControls.target.toArray()).toEqual([15, 0, 0]);
      setTransitionSpy.mockRestore();
    });
  });

  describe('CameraTransitionController direct usage', () => {
    it('executes glide transition with criticallyDamped easing and zero overshoot', () => {
      const controller = new CameraTransitionController();
      const onComplete = vi.fn();
      controller.start(
        mockCamera,
        new THREE.Vector3(100, 50, -20),
        mockControls.target,
        { duration: 1.0, easing: 'criticallyDamped', onComplete },
        1000,
      );
      for (let tMs = 1100; tMs <= 1900; tMs += 100) {
        controller.update(mockCamera, mockControls, tMs);
        expect(mockControls.target.x).toBeLessThanOrEqual(100);
        expect(mockControls.target.y).toBeLessThanOrEqual(50);
        expect(mockControls.target.z).toBeGreaterThanOrEqual(-20);
      }
      controller.update(mockCamera, mockControls, 2000);
      expect(mockControls.target.x).toBeCloseTo(100, 4);
      expect(mockControls.target.y).toBeCloseTo(50, 4);
      expect(mockControls.target.z).toBeCloseTo(-20, 4);
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('SpatialEntityStore Focus & Selection Synchronisation', () => {
    it('sets focused and selected states on double-click selection', () => {
      const store = createSpatialEntityStore();
      store.getState().registerEntity({
        id: 'alpha-centauri',
        name: 'Alpha Centauri',
        position: [4.37, 0, 0],
        classification: 'star',
      });
      expect(store.getState().focusedId).toBeNull();
      expect(store.getState().selectedId).toBeNull();
      store.getState().setSelected('alpha-centauri');
      if (store.getState().focusedId !== 'alpha-centauri') {
        store.getState().setFocused('alpha-centauri');
      }
      expect(store.getState().selectedId).toBe('alpha-centauri');
      expect(store.getState().focusedId).toBe('alpha-centauri');
      expect(store.getState().getEntityState('alpha-centauri')).toBe('focused');
    });
  });
});
