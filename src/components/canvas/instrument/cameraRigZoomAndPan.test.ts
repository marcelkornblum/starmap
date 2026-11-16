import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import {
  applyOrthographicLock,
  releaseOrthographicLock,
  syncControlsDistance,
  resetPerspectiveCamera,
  orientRadialPerspectiveCamera,
  type OrbitControlsLike,
} from './cameraRigZoomAndPan';
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

describe('cameraRigZoomAndPan', () => {
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

  describe('applyOrthographicLock & releaseOrthographicLock (Dual-Camera)', () => {
    it('applies dual-camera orthographic lock switching controls to orthoCam and disabling rotation', () => {
      const orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
      const aspect = 16 / 9;

      applyOrthographicLock(camera, orthoCam, target, aspect, mockControls);

      expect(mockControls.object).toBe(orthoCam);
      expect(mockControls.enableRotate).toBe(false);
      expect(mockControls.mouseButtons.LEFT).toBe(THREE.MOUSE.PAN);
      expect(mockControls.touches.ONE).toBe(THREE.TOUCH.PAN);
      expect(orthoCam.position).toEqual(camera.position);
      expect(orthoCam.quaternion.angleTo(camera.quaternion)).toBeCloseTo(0, 5);
      expect(mockControls.update).toHaveBeenCalled();
    });

    it('releases dual-camera orthographic lock cleanly restoring perspective camera and rotation', () => {
      const orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
      const aspect = 16 / 9;
      const initialDistance = camera.position.distanceTo(target);

      applyOrthographicLock(camera, orthoCam, target, aspect, mockControls);
      releaseOrthographicLock(orthoCam, camera, target, 45, mockControls);

      expect(mockControls.object).toBe(camera);
      expect(mockControls.enableRotate).toBe(true);
      expect(mockControls.mouseButtons.LEFT).toBe(THREE.MOUSE.ROTATE);
      expect(mockControls.touches.ONE).toBe(THREE.TOUCH.ROTATE);
      expect(camera.fov).toBe(45);
      expect(camera.zoom).toBe(1.0);
      expect(camera.position.distanceTo(target)).toBeCloseTo(initialDistance, 4);
    });

    it('supports legacy single-camera signature for backwards compatibility', () => {
      applyOrthographicLock(camera, mockControls, 45);

      expect(mockControls.enableRotate).toBe(false);
      expect(mockControls.mouseButtons.LEFT).toBe(THREE.MOUSE.PAN);
      expect(camera.fov).toBeCloseTo(3.6, 2);

      releaseOrthographicLock(camera, mockControls, 45);
      expect(mockControls.enableRotate).toBe(true);
      expect(mockControls.mouseButtons.LEFT).toBe(THREE.MOUSE.ROTATE);
      expect(camera.fov).toBe(45);
      expect(camera.zoom).toBe(1.0);
    });

    it('preserves camera orientation, up vector, and panned target when unlocking from top pole', () => {
      camera.position.set(0, 0, 50);
      camera.up.set(0, 1, 0);
      camera.lookAt(target);

      const orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
      applyOrthographicLock(camera, orthoCam, target, 16 / 9, mockControls);

      const panDelta = new THREE.Vector3(15, 25, 0);
      target.add(panDelta);
      orthoCam.position.add(panDelta);

      releaseOrthographicLock(orthoCam, camera, target, 45, mockControls);

      expect(camera.position.x).toBeCloseTo(15, 4);
      expect(camera.position.y).toBeCloseTo(25, 4);
      expect(camera.position.z).toBeCloseTo(50, 4);
      expect(camera.up).toEqual(new THREE.Vector3(0, 1, 0));
      expect(camera.quaternion.angleTo(orthoCam.quaternion)).toBeCloseTo(0, 5);
      expect(mockControls.target.x).toBe(15);
      expect(mockControls.target.y).toBe(25);
      expect(mockControls.target.z).toBe(0);
      expect(mockControls.update).toHaveBeenCalled();
    });

    it('preserves camera orientation and distance with legacy single-camera signature', () => {
      camera.position.set(0, 0, -50);
      camera.up.set(0, 1, 0);
      camera.lookAt(target);

      applyOrthographicLock(camera, mockControls, 45);
      releaseOrthographicLock(camera, mockControls, 45);

      expect(camera.position.distanceTo(target)).toBeCloseTo(50, 4);
      expect(mockControls.update).toHaveBeenCalled();
    });
  });

  describe('syncControlsDistance', () => {
    it('synchronises min and max distance on controls', () => {
      mockControls.minDistance = 1;
      mockControls.maxDistance = 100;
      syncControlsDistance(mockControls, 5, 250);
      expect(mockControls.minDistance).toBe(5);
      expect(mockControls.maxDistance).toBe(250);
    });

    it('handles undefined controls safely', () => {
      expect(() => syncControlsDistance(undefined, 5, 250)).not.toThrow();
    });
  });

  describe('resetPerspectiveCamera & orientRadialPerspectiveCamera', () => {
    it('resets perspective camera position, target, and FOV cleanly', () => {
      resetPerspectiveCamera(camera, [0, -35, 20], [0, 0, 0], 45, mockControls);
      expect(camera.position.x).toBe(0);
      expect(camera.position.y).toBe(-35);
      expect(camera.position.z).toBe(20);
      expect(camera.fov).toBe(45);
      expect(camera.zoom).toBe(1.0);
      expect(mockControls.update).toHaveBeenCalled();
    });

    it('positions perspective camera at radial isometric viewpoint', () => {
      orientRadialPerspectiveCamera(camera, target, 32, mockControls);
      expect(camera.position.distanceTo(target)).toBeCloseTo(32, 2);
      expect(camera.up.z).toBe(1);
      expect(mockControls.update).toHaveBeenCalled();
    });
  });
});
