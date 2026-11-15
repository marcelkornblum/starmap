import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import {
  CardinalTransitionController,
  handleDiscreteSnapOnEnd,
} from './cameraRigControls';
import { applyOrthographicLock, type OrbitControlsLike } from './cameraRigZoomAndPan';
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

    it('cancels an active transition and restores previous controls state', () => {
      const controller = new CardinalTransitionController();
      controller.start(camera, target, 'top', 0.35, undefined, 0, mockControls);
      expect(controller.isTransitioning()).toBe(true);
      expect(mockControls.enabled).toBe(false);

      controller.cancel();
      expect(controller.isTransitioning()).toBe(false);
      expect(mockControls.enabled).toBe(true);
    });
  });
});
