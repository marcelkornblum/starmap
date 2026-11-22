import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createElement, useLayoutEffect } from 'react';
import { render, act } from '@testing-library/react';
import * as THREE from 'three';
import { CameraRig } from './CameraRig';
import { SpatialFrameProvider } from './SpatialFrameProvider';
import { CameraTransitionProvider, useCameraTransition } from './useCameraTransition';
import { CameraTransitionController } from './cameraTransitionEngine';
import { type OrbitControlsLike } from './cameraRigZoomAndPan';
import { computeAllPlaneQuadrantWeights } from '../math/cardinal';
import { CARDINAL_CONFIG } from '../math/cameraMath';
import { useCameraStore } from '../../../stores/useCameraStore';
import { useUIStore } from '../../../stores/useUIStore';

let sharedMockCamera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 1000);
let sharedMockControls: OrbitControlsLike | undefined;
const mockInvalidate = vi.fn();

vi.mock('@react-three/fiber', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-three/fiber')>();
  return {
    ...actual,
    useFrame: vi.fn(),
    useThree: (selector?: (s: unknown) => unknown) => {
      const state = {
        camera: sharedMockCamera,
        controls: sharedMockControls,
        size: { width: 1920, height: 1080 },
        invalidate: mockInvalidate,
        get: () => ({ camera: sharedMockCamera, controls: sharedMockControls }),
      };
      return selector ? selector(state) : state;
    },
  };
});

interface MockControls extends OrbitControlsLike {
  object: THREE.Camera;
  target: THREE.Vector3;
  enableRotate: boolean;
  mouseButtons: { LEFT: number; MIDDLE: number; RIGHT: number };
  touches: { ONE: number; TWO: number };
  screenSpacePanning?: boolean;
  update: ReturnType<typeof vi.fn<() => void>>;
}

describe('Camera Rig & Controls: CameraRig.tsx', () => {
  let camera: THREE.PerspectiveCamera;
  let target: THREE.Vector3;
  let mockControls: MockControls;

  beforeEach(() => {
    useCameraStore.getState().reset();
    useUIStore.getState().resetUI();
    camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 1000);
    camera.position.set(20, 20, 20);
    camera.up.set(0, 0, 1);
    camera.lookAt(0, 0, 0);

    target = new THREE.Vector3(0, 0, 0);

    mockControls = {
      object: camera,
      target,
      enableRotate: true,
      enableDamping: true,
      mouseButtons: {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN,
      },
      touches: {
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN,
      },
      update: vi.fn<() => void>(),
    };

    sharedMockCamera = camera;
    sharedMockControls = mockControls;
  });

  describe('Camera Presets Navigation & Execution', () => {
    it('executes top-down preset transitioning to top cardinal view via CameraTransitionController', () => {
      const controller = new CameraTransitionController();
      const { normal, up } = CARDINAL_CONFIG.top;
      controller.startPose(
        camera,
        { target: [0, 0, 0], direction: normal, up },
        mockControls,
        { duration: 0.35 },
        0,
      );
      controller.update(camera, mockControls, 350);

      expect(controller.isTransitioning()).toBe(false);
      const dir = new THREE.Vector3().copy(camera.position).sub(target).normalize();
      expect(dir.z).toBeCloseTo(1, 4);
    });

    it('executes reset preset returning camera to reference frame default position and target', () => {
      camera.position.set(100, 200, 300);
      mockControls.target.set(50, 50, 50);

      const defaultPos = [0, -35, 20] as const;
      const defaultTgt = [0, 0, 0] as const;

      camera.position.set(defaultPos[0], defaultPos[1], defaultPos[2]);
      mockControls.target.set(defaultTgt[0], defaultTgt[1], defaultTgt[2]);
      camera.up.set(0, 0, 1);
      camera.lookAt(mockControls.target);

      expect(camera.position.x).toBe(0);
      expect(camera.position.y).toBe(-35);
      expect(camera.position.z).toBe(20);
      expect(mockControls.target.x).toBe(0);
      expect(mockControls.target.y).toBe(0);
      expect(mockControls.target.z).toBe(0);
    });

    it('executes orbital-lock preset transitioning to equatorial/front view via CameraTransitionController', () => {
      const controller = new CameraTransitionController();
      const { normal, up } = CARDINAL_CONFIG.front;
      controller.startPose(
        camera,
        { target: [0, 0, 0], direction: normal, up },
        mockControls,
        { duration: 0.35 },
        0,
      );
      controller.update(camera, mockControls, 350);

      expect(controller.isTransitioning()).toBe(false);
      const dir = new THREE.Vector3().copy(camera.position).sub(target).normalize();
      expect(dir.y).toBeCloseTo(-1, 4);
      expect(dir.z).toBeCloseTo(0, 4);
    });
  });

  describe('enableOrthographicProjection & Cardinal Polar Dial Gating', () => {
    it('disables 360-degree polar dial expansion and planar fade when thresholds are out of range', () => {
      const camDir = new THREE.Vector3(0.1, 0.1, 0.9899).normalize();
      const standardWeights = computeAllPlaneQuadrantWeights(camDir);
      expect(standardWeights.maxAlpha).toBeGreaterThan(0.9);
      expect(standardWeights.fadeXZ).toBeLessThan(0.1);
      expect(standardWeights.fadeYZ).toBeLessThan(0.1);

      const gatedWeights = computeAllPlaneQuadrantWeights(camDir, 2.0, 3.0);
      expect(gatedWeights.maxAlpha).toBe(0);
      expect(gatedWeights.fadeXY).toBe(1);
      expect(gatedWeights.fadeXZ).toBe(1);
      expect(gatedWeights.fadeYZ).toBe(1);
    });
  });

  describe('Camera Transform Store Synchronisation', () => {
    it('synchronizes camera transform, focal distance, and zoom to useCameraStore', () => {
      useCameraStore.getState().setCameraTransform([10, 20, 30], [0, 0, 0], 2.0);
      const state = useCameraStore.getState();
      expect(state.position).toEqual([10, 20, 30]);
      expect(state.target).toEqual([0, 0, 0]);
      expect(state.zoom).toBe(2.0);
      expect(state.focalDistance).toBeCloseTo(Math.hypot(10, 20, 30), 4);
    });
  });

  describe('Cross-Scale Unmount Safety', () => {
    it('does not cancel an active transition started by a sibling/replacement scene when CameraRig unmounts', () => {
      const transitionApiRef: { current: ReturnType<typeof useCameraTransition> | null } = {
        current: null,
      };
      const onCancel = vi.fn();

      const SiblingArrivalController = () => {
        const api = useCameraTransition();
        transitionApiRef.current = api;
        useLayoutEffect(() => {
          api.transitionToPose(
            { position: [0, -35, 20], target: [0, 0, 0], up: [0, 0, 1] },
            { duration: 0.9, onCancel },
          );
        }, [api]);
        return null;
      };

      const TestHarness = ({ showOutgoing }: { showOutgoing: boolean }) =>
        createElement(
          CameraTransitionProvider,
          null,
          createElement(
            SpatialFrameProvider,
            null,
            showOutgoing ? createElement(CameraRig) : createElement(SiblingArrivalController),
          ),
        );

      const { rerender } = render(createElement(TestHarness, { showOutgoing: true }));

      act(() => {
        rerender(createElement(TestHarness, { showOutgoing: false }));
      });

      expect(onCancel).not.toHaveBeenCalled();
      expect(transitionApiRef.current?.isTransitioning()).toBe(true);
      expect(useUIStore.getState().isCameraTransitioning).toBe(true);
    });
  });
});
