import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  isOrbitControlsLike,
  applyCameraSavedZoom,
  getCameraZoom,
} from './cameraControllerUtils';

describe('cameraControllerUtils', () => {
  describe('isOrbitControlsLike', () => {
    it('returns true for object with THREE.Vector3 target', () => {
      const controls = { target: new THREE.Vector3(1, 2, 3) };
      expect(isOrbitControlsLike(controls)).toBe(true);
    });

    it('returns false for null, primitives, or objects without Vector3 target', () => {
      expect(isOrbitControlsLike(null)).toBe(false);
      expect(isOrbitControlsLike(undefined)).toBe(false);
      expect(isOrbitControlsLike({})).toBe(false);
      expect(isOrbitControlsLike({ target: [1, 2, 3] })).toBe(false);
    });
  });

  describe('applyCameraSavedZoom and getCameraZoom', () => {
    it('reads and updates camera zoom correctly', () => {
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
      expect(getCameraZoom(camera)).toBe(1);

      applyCameraSavedZoom(camera, 2.5);
      expect(getCameraZoom(camera)).toBe(2.5);
    });

    it('returns fallback 1 if camera lacks zoom property', () => {
      const mockCam = {} as unknown as THREE.Camera;
      expect(getCameraZoom(mockCam)).toBe(1);
    });
  });
});
