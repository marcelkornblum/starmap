import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import * as THREE from 'three';
import {
  easeInOutCubic,
  CameraTransitionController,
  useCameraTransition,
  transitionTo,
  transitionToPose,
} from './useCameraTransition';
import { createSpatialEntityStore } from '../entity/SpatialEntityStore';
import { useUIStore } from '../../../stores/useUIStore';

let mockCamera: THREE.PerspectiveCamera;
let mockControls: {
  target: THREE.Vector3;
  enabled: boolean;
  update: ReturnType<typeof vi.fn>;
  addEventListener: (event: string, cb: () => void) => void;
  removeEventListener: (event: string, cb: () => void) => void;
};
let mockInvalidate: ReturnType<typeof vi.fn>;

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
    const state = { camera: mockCamera, controls: mockControls, invalidate: mockInvalidate };
    return selector ? selector(state) : state;
  },
}));

describe('CameraTransitionController & useCameraTransition', () => {
  beforeEach(() => {
    setMockReducedMotion(false);
    mockCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    mockCamera.position.set(0, 10, 20);
    mockControls = {
      target: new THREE.Vector3(0, 0, 0),
      enabled: true,
      update: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    mockInvalidate = vi.fn();
  });

  afterEach(() => {
    setMockReducedMotion(false);
  });

  describe('easeInOutCubic Easing', () => {
    it('evaluates boundary and midpoint easing values accurately', () => {
      expect(easeInOutCubic(0)).toBe(0);
      expect(easeInOutCubic(0.5)).toBe(0.5);
      expect(easeInOutCubic(1)).toBe(1);
    });

    it('is strictly monotonically non-decreasing over [0, 1]', () => {
      let prev = -1;
      for (let i = 0; i <= 20; i++) {
        const val = easeInOutCubic(i / 20);
        expect(val).toBeGreaterThanOrEqual(prev);
        prev = val;
      }
    });
  });

  describe('CameraTransitionController Engine', () => {
    it('initializes and executes transition to target coordinates preserving viewing angle', () => {
      const controller = new CameraTransitionController();
      expect(controller.isTransitioning()).toBe(false);

      const onComplete = vi.fn();
      controller.start(mockCamera, new THREE.Vector3(50, 0, -25), mockControls.target, { duration: 1.0, onComplete }, 1000);
      expect(controller.isTransitioning()).toBe(true);

      controller.update(mockCamera, mockControls, 1500);
      expect(mockControls.target.x).toBeCloseTo(25, 2);
      expect(mockControls.target.y).toBeCloseTo(0, 2);
      expect(mockControls.target.z).toBeCloseTo(-12.5, 2);
      expect(mockCamera.position.x).toBeCloseTo(25, 2);
      expect(mockCamera.position.y).toBeCloseTo(10, 2);
      expect(mockCamera.position.z).toBeCloseTo(7.5, 2);
      expect(mockControls.update).not.toHaveBeenCalled();
      expect(onComplete).not.toHaveBeenCalled();

      controller.update(mockCamera, mockControls, 2000);
      expect(mockControls.update).toHaveBeenCalledTimes(1);
      expect(mockControls.target.x).toBeCloseTo(50, 4);
      expect(mockControls.target.y).toBeCloseTo(0, 4);
      expect(mockControls.target.z).toBeCloseTo(-25, 4);
      expect(mockCamera.position.x).toBeCloseTo(50, 4);
      expect(mockCamera.position.y).toBeCloseTo(10, 4);
      expect(mockCamera.position.z).toBeCloseTo(-5, 4);
      expect(controller.isTransitioning()).toBe(false);
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('accepts array coordinates [x, y, z] without extra vector allocations', () => {
      const controller = new CameraTransitionController();
      controller.start(mockCamera, [10, 20, 30], mockControls.target, { duration: 0.5 }, 1000);
      controller.update(mockCamera, mockControls, 1500);

      expect(mockControls.target.x).toBeCloseTo(10, 4);
      expect(mockControls.target.y).toBeCloseTo(20, 4);
      expect(mockControls.target.z).toBeCloseTo(30, 4);
      expect(controller.isTransitioning()).toBe(false);
    });

    it('supports custom targetDistance zoom adjustment', () => {
      const controller = new CameraTransitionController();
      controller.start(mockCamera, [0, 0, 0], mockControls.target, { duration: 1.0, targetDistance: 10 }, 1000);
      controller.update(mockCamera, mockControls, 2000);
      expect(mockCamera.position.distanceTo(mockControls.target)).toBeCloseTo(10, 3);
    });

    it('cancels immediately and fires onCancel callback', () => {
      const controller = new CameraTransitionController();
      const onCancel = vi.fn();
      controller.start(mockCamera, [100, 0, 0], mockControls.target, { duration: 1.0, onCancel }, 1000);
      expect(controller.isTransitioning()).toBe(true);
      controller.cancel();
      expect(controller.isTransitioning()).toBe(false);
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('falls back to camera.lookAt when controls are not provided', () => {
      const controller = new CameraTransitionController();
      const lookAtSpy = vi.spyOn(mockCamera, 'lookAt');
      controller.start(mockCamera, [10, 0, 0], undefined, { duration: 0.5 }, 1000);
      controller.update(mockCamera, undefined, 1500);
      expect(lookAtSpy).toHaveBeenCalled();
      lookAtSpy.mockRestore();
    });

    it('executes glide transition with criticallyDamped easing and zero overshoot', () => {
      const controller = new CameraTransitionController();
      const onComplete = vi.fn();
      controller.start(mockCamera, new THREE.Vector3(100, 50, -20), mockControls.target, { duration: 1.0, easing: 'criticallyDamped', onComplete }, 1000);
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

    it('supports custom easing functions', () => {
      const controller = new CameraTransitionController();
      controller.start(mockCamera, new THREE.Vector3(10, 0, 0), mockControls.target, { duration: 1.0, easing: (t) => t }, 1000);
      controller.update(mockCamera, mockControls, 1250);
      expect(mockControls.target.x).toBeCloseTo(2.5, 3);
    });

    it('interpolates target distance logarithmically when logarithmicDistance is enabled', () => {
      const controller = new CameraTransitionController();
      mockCamera.position.set(0, 0, 100);
      mockControls.target.set(0, 0, 0);
      controller.start(mockCamera, new THREE.Vector3(0, 0, 0), mockControls.target, { duration: 1.0, targetDistance: 1, logarithmicDistance: true, easing: (t) => t }, 1000);
      controller.update(mockCamera, mockControls, 1500);
      expect(mockCamera.position.distanceTo(mockControls.target)).toBeCloseTo(10, 2);
      controller.update(mockCamera, mockControls, 2000);
      expect(mockCamera.position.distanceTo(mockControls.target)).toBeCloseTo(1, 4);
    });
  });

  describe('useCameraTransition Hook Component Harness', () => {
    it('mounts inside a React component without throwing and exposes API', () => {
      const { result } = renderHook(() => useCameraTransition());
      expect(result.current).not.toBeNull();
      expect(typeof result.current.transitionTo).toBe('function');
      expect(typeof result.current.transitionToPose).toBe('function');
      expect(typeof result.current.cancelTransition).toBe('function');
      expect(typeof result.current.isTransitioning).toBe('function');
      expect(result.current.isTransitioning()).toBe(false);
    });

    it('synchronises transition lifecycle with useUIStore isCameraTransitioning', () => {
      useUIStore.getState().resetUI();
      expect(useUIStore.getState().isCameraTransitioning).toBe(false);
      const { result } = renderHook(() => useCameraTransition());
      act(() => { result.current.transitionTo(new THREE.Vector3(10, 0, 0)); });
      expect(useUIStore.getState().isCameraTransitioning).toBe(true);
      act(() => { result.current.cancelTransition(); });
      expect(useUIStore.getState().isCameraTransitioning).toBe(false);
    });

    it('does not pulse isCameraTransitioning when prefersReducedMotion is active', () => {
      setMockReducedMotion(true);
      useUIStore.getState().resetUI();
      const setTransitionSpy = vi.spyOn(useUIStore.getState(), 'setCameraTransitioning');
      const onComplete = vi.fn();
      const { result } = renderHook(() => useCameraTransition());

      act(() => {
        result.current.transitionToPose({ target: [15, 0, 0], position: [15, 0, 25] }, { onComplete });
      });

      expect(setTransitionSpy).not.toHaveBeenCalledWith(true);
      expect(useUIStore.getState().isCameraTransitioning).toBe(false);
      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(mockControls.target.toArray()).toEqual([15, 0, 0]);
      setTransitionSpy.mockRestore();
    });

    it('registers shared transitionTo and transitionToPose starters on mount', () => {
      useUIStore.getState().resetUI();
      const { result, unmount } = renderHook(() => useCameraTransition());

      act(() => { transitionTo([12, 0, 0]); });
      expect(result.current.isTransitioning()).toBe(true);
      act(() => { result.current.cancelTransition(); });
      act(() => { transitionToPose({ target: [4, 5, 6], position: [4, 5, 26] }); });
      expect(result.current.isTransitioning()).toBe(true);
      unmount();
    });
  });

  describe('SpatialEntityStore Focus & Selection Synchronisation', () => {
    it('sets focused and selected states on double-click selection', () => {
      const store = createSpatialEntityStore();
      store.getState().registerEntity({ id: 'alpha-centauri', name: 'Alpha Centauri', position: [4.37, 0, 0], classification: 'star' });
      expect(store.getState().focusedId).toBeNull();
      expect(store.getState().selectedId).toBeNull();
      store.getState().setSelected('alpha-centauri');
      if (store.getState().focusedId !== 'alpha-centauri') store.getState().setFocused('alpha-centauri');
      expect(store.getState().selectedId).toBe('alpha-centauri');
      expect(store.getState().focusedId).toBe('alpha-centauri');
      expect(store.getState().getEntityState('alpha-centauri')).toBe('focused');
    });
  });
});
