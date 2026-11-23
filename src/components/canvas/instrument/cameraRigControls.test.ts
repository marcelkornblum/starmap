import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import { handleDiscreteSnapOnEnd } from './cameraRigControls';
import { useCameraStore } from '../../../stores/useCameraStore';

describe('cameraRigControls', () => {
  let camera: THREE.PerspectiveCamera;
  let target: THREE.Vector3;

  beforeEach(() => {
    useCameraStore.getState().reset();
    camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 1000);
    camera.position.set(20, 20, 20);
    camera.up.set(0, 0, 1);
    camera.lookAt(0, 0, 0);
    target = new THREE.Vector3(0, 0, 0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
});
