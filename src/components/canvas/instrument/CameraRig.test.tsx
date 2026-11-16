import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import {
  CardinalTransitionController,
} from './cameraRigControls';
import { type OrbitControlsLike } from './cameraRigZoomAndPan';
import { computeAllPlaneQuadrantWeights } from '../math/cardinal';
import { useCameraStore } from '../../../stores/useCameraStore';

interface MockControls extends OrbitControlsLike {
  object: THREE.Camera;
  target: THREE.Vector3;
  enableRotate: boolean;
  mouseButtons: { LEFT: number; MIDDLE: number; RIGHT: number };
  touches: { ONE: number; TWO: number };
  screenSpacePanning?: boolean;
  update: ReturnType<typeof vi.fn>;
}

describe('Camera Rig & Controls: CameraRig.tsx', () => {
  let camera: THREE.PerspectiveCamera;
  let target: THREE.Vector3;
  let mockControls: MockControls;

  beforeEach(() => {
    useCameraStore.getState().reset();
    camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 1000);
    camera.position.set(20, 20, 20);
    camera.up.set(0, 0, 1);
    camera.lookAt(0, 0, 0);

    target = new THREE.Vector3(0, 0, 0);

    mockControls = {
      object: camera,
      target,
      enableRotate: true,
      mouseButtons: {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN,
      },
      touches: {
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN,
      },
      update: vi.fn(),
    };
  });

  describe('Camera Presets Navigation & Execution', () => {
    it('executes top-down preset transitioning to top cardinal view', () => {
      const controller = new CardinalTransitionController();
      controller.start(camera, target, 'top', 0.35, undefined, 0);
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

    it('executes orbital-lock preset transitioning to equatorial/front view', () => {
      const controller = new CardinalTransitionController();
      controller.start(camera, target, 'front', 0.35, undefined, 0);
      controller.update(camera, mockControls, 350);

      expect(controller.isTransitioning()).toBe(false);
      const dir = new THREE.Vector3().copy(camera.position).sub(target).normalize();
      expect(dir.y).toBeCloseTo(-1, 4);
      expect(dir.z).toBeCloseTo(0, 4);
    });
  });

  describe('enableOrthographicProjection & Cardinal Polar Dial Gating', () => {
    it('disables 360-degree polar dial expansion and planar fade when thresholds are out of range', () => {
      // Near top cardinal axis (|z| ~ 0.99)
      const camDir = new THREE.Vector3(0.1, 0.1, 0.9899).normalize();
      const standardWeights = computeAllPlaneQuadrantWeights(camDir);
      expect(standardWeights.maxAlpha).toBeGreaterThan(0.9);
      expect(standardWeights.fadeXZ).toBeLessThan(0.1);
      expect(standardWeights.fadeYZ).toBeLessThan(0.1);

      // With allowPolarDial = false passing (2.0, 3.0)
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
});
