import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import {
  CardinalTransitionController,
  applyOrthographicLock,
  releaseOrthographicLock,
  handleDiscreteSnapOnEnd,
} from '../src/components/canvas/instrument/cameraRigControls';
import { useCameraStore } from '../src/stores/useCameraStore';

describe('Camera Rig & Controls: CameraRig.tsx', () => {
  let camera: THREE.PerspectiveCamera;
  let target: THREE.Vector3;
  let mockControls: {
    object?: THREE.Camera;
    target: THREE.Vector3;
    enableRotate: boolean;
    mouseButtons: { LEFT: number; MIDDLE: number; RIGHT: number };
    update: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    useCameraStore.getState().resetCameraState();
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
      update: vi.fn(),
    };
  });

  describe('CardinalTransitionController', () => {
    it('smoothly glides camera to Top view with singular-free [0, 1, 0] up vector', () => {
      const controller = new CardinalTransitionController();
      const initialDistance = camera.position.distanceTo(target);

      controller.start(camera, target, 'top', 0.35, undefined, 0);
      expect(controller.isTransitioning()).toBe(true);
      expect(controller.getActiveCardinal()).toBe('top');

      // Mid-transition at 175ms
      controller.update(camera, mockControls, 175);
      expect(controller.isTransitioning()).toBe(true);

      // Complete at 350ms
      controller.update(camera, mockControls, 350);
      expect(controller.isTransitioning()).toBe(false);

      expect(camera.position.x).toBeCloseTo(0, 4);
      expect(camera.position.y).toBeCloseTo(0, 4);
      expect(camera.position.z).toBeCloseTo(initialDistance, 4);
      expect(camera.up.x).toBeCloseTo(0, 4);
      expect(camera.up.y).toBeCloseTo(1, 4);
      expect(camera.up.z).toBeCloseTo(0, 4);
    });

    it('smoothly glides camera to Front view with [0, 0, 1] up vector', () => {
      const controller = new CardinalTransitionController();
      const initialDistance = camera.position.distanceTo(target);

      controller.start(camera, target, 'front', 0.35, undefined, 0);
      controller.update(camera, mockControls, 350);

      expect(camera.position.x).toBeCloseTo(0, 4);
      expect(camera.position.y).toBeCloseTo(-initialDistance, 4);
      expect(camera.position.z).toBeCloseTo(0, 4);
      expect(camera.up.z).toBeCloseTo(1, 4);
    });

    it('maintains constant radial distance and points continuously at target throughout spherical arc strafe between opposite poles (TOP -> BOTTOM)', () => {
      const controller = new CardinalTransitionController();
      // Start directly at TOP (+Z)
      camera.position.set(0, 0, 32);
      camera.up.set(0, 1, 0);
      camera.lookAt(target);
      const initialDistance = camera.position.distanceTo(target);

      // Start transition to BOTTOM (-Z)
      controller.start(camera, target, 'bottom', 0.35, undefined, 0);

      // At 25%, 50%, and 75% through transition
      for (const t of [87.5, 175, 262.5]) {
        controller.update(camera, mockControls, t);
        // Distance must NEVER plunge towards 0 (remains at exactly initialDistance)
        expect(camera.position.distanceTo(target)).toBeCloseTo(initialDistance, 2);

        // Forward vector must point directly at target
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        const toTarget = new THREE.Vector3().copy(target).sub(camera.position).normalize();
        expect(forward.dot(toTarget)).toBeCloseTo(1.0, 3);
      }

      // Complete transition
      controller.update(camera, mockControls, 350);
      expect(camera.position.distanceTo(target)).toBeCloseTo(initialDistance, 2);
      expect(camera.position.z).toBeCloseTo(-32, 2);
    });

    it('preserves custom panned target registration point during cardinal transitions', () => {
      const controller = new CardinalTransitionController();
      const pannedTarget = new THREE.Vector3(15, -8, 4);
      camera.position.set(15, -8, 36); // 32 units above panned target
      camera.up.set(0, 1, 0);
      camera.lookAt(pannedTarget);

      controller.start(camera, pannedTarget, 'front', 0.35, undefined, 0);

      // Mid-transition at 175ms
      controller.update(camera, mockControls, 175);
      expect(camera.position.distanceTo(pannedTarget)).toBeCloseTo(32, 2);

      // End of transition
      controller.update(camera, mockControls, 350);
      expect(camera.position.distanceTo(pannedTarget)).toBeCloseTo(32, 2);
      // Front of panned target: [15, -8 - 32, 4] = [15, -40, 4]
      expect(camera.position.x).toBeCloseTo(15, 2);
      expect(camera.position.y).toBeCloseTo(-40, 2);
      expect(camera.position.z).toBeCloseTo(4, 2);
    });

    it('cancels transition cleanly when requested', () => {
      const controller = new CardinalTransitionController();
      controller.start(camera, target, 'right', 0.35, undefined, 0);
      expect(controller.isTransitioning()).toBe(true);

      controller.cancel();
      expect(controller.isTransitioning()).toBe(false);
    });

    it('suspends controls.enabled during transition to prevent damping interference and restores on completion', () => {
      const controller = new CardinalTransitionController();
      const controls = { ...mockControls, enabled: true };

      controller.start(camera, target, 'top', 0.35, undefined, 0, controls);
      expect(controls.enabled).toBe(false);

      controller.update(camera, controls, 350);
      expect(controls.enabled).toBe(true);
    });

    it('restores controls.enabled when transition is cancelled early', () => {
      const controller = new CardinalTransitionController();
      const controls = { ...mockControls, enabled: true };

      controller.start(camera, target, 'top', 0.35, undefined, 0, controls);
      expect(controls.enabled).toBe(false);

      controller.cancel();
      expect(controls.enabled).toBe(true);
    });
  });

  describe('applyOrthographicLock & releaseOrthographicLock', () => {
    it('swaps controls.object to orthoCam, disables orbit rotation, enables screenSpacePanning, and maps left-click to screen pan', () => {
      const orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
      const aspect = 16 / 9;

      applyOrthographicLock(camera, orthoCam, target, aspect, mockControls as any);

      expect(mockControls.object).toBe(orthoCam);
      expect(mockControls.enableRotate).toBe(false);
      expect(mockControls.mouseButtons.LEFT).toBe(THREE.MOUSE.PAN);
      expect((mockControls as any).screenSpacePanning).toBe(true);
      expect((mockControls as any).enablePan).toBe(true);
      expect(mockControls.update).toHaveBeenCalled();

      // Frustum boundaries are computed and non-zero
      expect(orthoCam.top).toBeGreaterThan(0);
      expect(orthoCam.bottom).toBeLessThan(0);
      expect(orthoCam.right).toBeGreaterThan(0);
      expect(orthoCam.left).toBeLessThan(0);
      expect(orthoCam.zoom).toBe(1.0);
    });

    it('restores controls.object to perspCam, re-enables rotate, and recovers perspective distance', () => {
      const orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
      const aspect = 16 / 9;
      const initialDistance = camera.position.distanceTo(target);

      applyOrthographicLock(camera, orthoCam, target, aspect, mockControls as any);
      releaseOrthographicLock(orthoCam, camera, target, 45, mockControls as any);

      expect(mockControls.object).toBe(camera);
      expect(mockControls.enableRotate).toBe(true);
      expect(mockControls.mouseButtons.LEFT).toBe(THREE.MOUSE.ROTATE);
      expect(camera.fov).toBe(45);
      expect(camera.zoom).toBe(1.0);
      expect(camera.position.distanceTo(target)).toBeCloseTo(initialDistance, 4);
    });

    it('supports legacy single-camera signature for backwards compatibility', () => {
      applyOrthographicLock(camera, mockControls as any, 45);

      expect(mockControls.enableRotate).toBe(false);
      expect(mockControls.mouseButtons.LEFT).toBe(THREE.MOUSE.PAN);
      expect(camera.fov).toBeCloseTo(3.6, 2);

      releaseOrthographicLock(camera, mockControls as any, 45);
      expect(mockControls.enableRotate).toBe(true);
      expect(mockControls.mouseButtons.LEFT).toBe(THREE.MOUSE.ROTATE);
      expect(camera.fov).toBe(45);
      expect(camera.zoom).toBe(1.0);
    });

    it('mitigates polar singularity when unlocking from top pole', () => {
      const orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
      // Place camera directly on the +Z pole
      camera.position.set(0, 0, 50);
      camera.up.set(0, 1, 0);
      camera.lookAt(target);

      applyOrthographicLock(camera, orthoCam, target, 16 / 9, mockControls as any);
      releaseOrthographicLock(orthoCam, camera, target, 45, mockControls as any);

      // Camera is slightly tilted off pure +Z pole (by ~1 degree) to avoid collinearity with [0, 0, 1] up vector
      expect(camera.up).toEqual(new THREE.Vector3(0, 0, 1));
      expect(camera.position.y).not.toBe(0);
      expect(camera.position.distanceTo(target)).toBeCloseTo(50, 1);
      expect(mockControls.update).toHaveBeenCalled();
    });

    it('mitigates polar singularity when unlocking from bottom pole with legacy fallback', () => {
      camera.position.set(0, 0, -50);
      camera.up.set(0, 1, 0);
      camera.lookAt(target);

      applyOrthographicLock(camera, mockControls as any, 45);
      releaseOrthographicLock(camera, mockControls as any, 45);

      expect(camera.up).toEqual(new THREE.Vector3(0, 0, 1));
      expect(camera.position.y).not.toBe(0);
      expect(camera.position.distanceTo(target)).toBeCloseTo(50, 1);
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

    it('triggers snap and lock when drag ends within 20 degrees of a cardinal axis (matching planar grid fade)', () => {
      // Position camera 18 degrees away from +Z axis (inside the 20-deg fade zone)
      const dist = 50;
      const angleRad = (18 * Math.PI) / 180;
      camera.position.set(0, dist * Math.sin(angleRad), dist * Math.cos(angleRad));

      const mockStartSnap = vi.fn();
      const snapped = handleDiscreteSnapOnEnd(
        camera,
        target,
        (20 * Math.PI) / 180,
        mockStartSnap,
      );

      expect(snapped).toBe(true);
      expect(mockStartSnap).toHaveBeenCalledWith('top');
    });

    it('does not trigger snap when drag ends further than 20 degrees from all cardinal axes', () => {
      // Position camera 35 degrees away from all axes
      camera.position.set(30, 30, 30);

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

        // Verify camera distance is preserved
        expect(camera.position.distanceTo(target)).toBeCloseTo(initialDist, 2);

        // Verify lock can be applied cleanly
        applyOrthographicLock(camera, orthoCam, target, 16 / 9, mockControls as any);
        expect(mockControls.enableRotate).toBe(false);
        expect(mockControls.mouseButtons.LEFT).toBe(THREE.MOUSE.PAN);
        expect(mockControls.object).toBe(orthoCam);
      });
    }
  });
});

