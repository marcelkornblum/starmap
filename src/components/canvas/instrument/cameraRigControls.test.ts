import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import {
  CardinalTransitionController,
  applyOrthographicLock,
  releaseOrthographicLock,
  handleDiscreteSnapOnEnd,
  type OrbitControlsLike,
} from './cameraRigControls';
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

describe('cameraRigControls', () => {
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

  describe('handleDiscreteSnapOnEnd', () => {
    it('returns false when camera is at target (zero distance)', () => {
      camera.position.copy(target);
      const mockStartSnap = vi.fn();
      const snapped = handleDiscreteSnapOnEnd(
        camera,
        target,
        (20 * Math.PI) / 180,
        mockStartSnap,
      );

      expect(snapped).toBe(false);
      expect(mockStartSnap).not.toHaveBeenCalled();
    });

    it('triggers snap and lock when drag ends within capture threshold of a cardinal axis', () => {
      const dist = 50;
      const angleRad = (8 * Math.PI) / 180;
      camera.position.set(0, dist * Math.sin(angleRad), dist * Math.cos(angleRad));

      const mockStartSnap = vi.fn();
      const snapped = handleDiscreteSnapOnEnd(
        camera,
        target,
        (10 * Math.PI) / 180,
        mockStartSnap,
      );

      expect(snapped).toBe(true);
      expect(mockStartSnap).toHaveBeenCalledWith('top');
    });

    it('does not trigger snap when drag ends further than 10 degrees from all cardinal axes', () => {
      const dist = 50;
      const angleRad = (15 * Math.PI) / 180;
      camera.position.set(0, dist * Math.sin(angleRad), dist * Math.cos(angleRad));

      const mockStartSnap = vi.fn();
      const snapped = handleDiscreteSnapOnEnd(
        camera,
        target,
        (10 * Math.PI) / 180,
        mockStartSnap,
      );

      expect(snapped).toBe(false);
      expect(mockStartSnap).not.toHaveBeenCalled();
    });
  });

  describe('Direct Cardinal Axis Navigation (All 6 Directions)', () => {
    const directions = ['top', 'bottom', 'front', 'back', 'right', 'left'] as const;

    for (const dir of directions) {
      it(`navigates cleanly to ${dir} view and sets correct orientation`, () => {
        const controller = new CardinalTransitionController();
        const orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
        camera.position.set(20, 20, 20);
        const initialDist = camera.position.distanceTo(target);

        controller.start(camera, target, dir, 0.35, undefined, 0);
        controller.update(camera, mockControls, 350);

        expect(controller.isTransitioning()).toBe(false);
        expect(camera.position.distanceTo(target)).toBeCloseTo(initialDist, 2);

        applyOrthographicLock(camera, orthoCam, target, 16 / 9, mockControls);
        expect(mockControls.enableRotate).toBe(false);
        expect(mockControls.mouseButtons.LEFT).toBe(THREE.MOUSE.PAN);
        expect(mockControls.object).toBe(orthoCam);
      });
    }
  });
});
