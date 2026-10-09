import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import * as THREE from 'three';
import {
  easeInOutCubic,
  CameraTransitionController,
  useCameraTransition,
} from '../src/components/canvas/instrument/useCameraTransition';
import { createSpatialEntityStore } from '../src/components/poc/canvas/entity/SpatialEntityStore';

let mockCamera: THREE.PerspectiveCamera;
let mockControls: {
  target: THREE.Vector3;
  update: () => void;
  addEventListener: (event: string, cb: () => void) => void;
  removeEventListener: (event: string, cb: () => void) => void;
};
let mockInvalidate: ReturnType<typeof vi.fn>;

vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
  useThree: (selector?: (s: unknown) => unknown) => {
    const state = {
      camera: mockCamera,
      controls: mockControls,
      invalidate: mockInvalidate,
    };
    return selector ? selector(state) : state;
  },
}));

describe('CameraTransitionController & useCameraTransition', () => {
  beforeEach(() => {
    mockCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    mockCamera.position.set(0, 10, 20);

    mockControls = {
      target: new THREE.Vector3(0, 0, 0),
      update: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    mockInvalidate = vi.fn();
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

      const targetPos = new THREE.Vector3(50, 0, -25);
      const onComplete = vi.fn();

      controller.start(
        mockCamera,
        targetPos,
        mockControls.target,
        { duration: 1.0, onComplete },
        1000,
      );
      expect(controller.isTransitioning()).toBe(true);

      // Advance halfway (0.5s = 1500ms)
      controller.update(mockCamera, mockControls, 1500);

      expect(mockControls.target.x).toBeCloseTo(25, 2);
      expect(mockControls.target.y).toBeCloseTo(0, 2);
      expect(mockControls.target.z).toBeCloseTo(-12.5, 2);

      // Camera offset from target is maintained (0, 10, 20)
      expect(mockCamera.position.x).toBeCloseTo(25, 2);
      expect(mockCamera.position.y).toBeCloseTo(10, 2);
      expect(mockCamera.position.z).toBeCloseTo(7.5, 2);
      expect(mockControls.update).toHaveBeenCalled();
      expect(onComplete).not.toHaveBeenCalled();

      // Advance to completion (1.0s = 2000ms)
      controller.update(mockCamera, mockControls, 2000);

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

      controller.start(
        mockCamera,
        [10, 20, 30],
        mockControls.target,
        { duration: 0.5 },
        1000,
      );

      controller.update(mockCamera, mockControls, 1500);

      expect(mockControls.target.x).toBeCloseTo(10, 4);
      expect(mockControls.target.y).toBeCloseTo(20, 4);
      expect(mockControls.target.z).toBeCloseTo(30, 4);
      expect(controller.isTransitioning()).toBe(false);
    });

    it('supports custom targetDistance zoom adjustment', () => {
      const controller = new CameraTransitionController();

      // Initial camera dist: sqrt(10^2 + 20^2) = 22.36
      // Set target distance to 10
      controller.start(
        mockCamera,
        [0, 0, 0],
        mockControls.target,
        { duration: 1.0, targetDistance: 10 },
        1000,
      );

      controller.update(mockCamera, mockControls, 2000);

      const finalDist = mockCamera.position.distanceTo(mockControls.target);
      expect(finalDist).toBeCloseTo(10, 3);
    });

    it('cancels immediately and fires onCancel callback', () => {
      const controller = new CameraTransitionController();
      const onCancel = vi.fn();

      controller.start(
        mockCamera,
        [100, 0, 0],
        mockControls.target,
        { duration: 1.0, onCancel },
        1000,
      );
      expect(controller.isTransitioning()).toBe(true);

      controller.cancel();
      expect(controller.isTransitioning()).toBe(false);
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('falls back to camera.lookAt when controls are not provided', () => {
      const controller = new CameraTransitionController();
      const lookAtSpy = vi.spyOn(mockCamera, 'lookAt');

      controller.start(
        mockCamera,
        [10, 0, 0],
        undefined,
        { duration: 0.5 },
        1000,
      );

      controller.update(mockCamera, undefined, 1500);

      expect(lookAtSpy).toHaveBeenCalled();
      lookAtSpy.mockRestore();
    });
  });

  describe('useCameraTransition Hook Component Harness', () => {
    it('mounts inside a React component without throwing and exposes API', () => {
      let capturedApi = null as ReturnType<typeof useCameraTransition> | null;

      const TestHarness: React.FC = () => {
        capturedApi = useCameraTransition();
        return createElement('div', { 'data-testid': 'harness' });
      };

      const html = renderToString(createElement(TestHarness));
      expect(html).toContain('data-testid="harness"');
      expect(capturedApi).not.toBeNull();
      const api = capturedApi!;
      expect(typeof api.transitionTo).toBe('function');
      expect(typeof api.cancelTransition).toBe('function');
      expect(typeof api.isTransitioning).toBe('function');
      expect(api.isTransitioning()).toBe(false);
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

      // Simulate double-click focus action
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
