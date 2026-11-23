import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  isOrbitControlsLike,
  applyCameraSavedZoom,
  getCameraZoom,
  resolveCenterCoords,
  resolvePositiveFiniteDistance,
  isControlsTargetWithinEpsilon,
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

  describe('resolveCenterCoords', () => {
    it('resolves coordinates from array, vector object, or undefined', () => {
      expect(resolveCenterCoords()).toEqual([0, 0, 0]);
      expect(resolveCenterCoords([1, 2, 3])).toEqual([1, 2, 3]);
      expect(resolveCenterCoords({ x: 4, y: 5, z: 6 })).toEqual([4, 5, 6]);
    });
  });

  describe('resolvePositiveFiniteDistance', () => {
    it('returns positive finite numbers and undefined otherwise', () => {
      expect(resolvePositiveFiniteDistance(12.5)).toBe(12.5);
      expect(resolvePositiveFiniteDistance(0)).toBeUndefined();
      expect(resolvePositiveFiniteDistance(-4)).toBeUndefined();
      expect(resolvePositiveFiniteDistance(Number.NaN)).toBeUndefined();
      expect(resolvePositiveFiniteDistance(Number.POSITIVE_INFINITY)).toBeUndefined();
      expect(resolvePositiveFiniteDistance(undefined)).toBeUndefined();
    });
  });

  describe('isControlsTargetWithinEpsilon', () => {
    it('returns true only when controls target is within epsilon of coordinates', () => {
      const controls = { target: new THREE.Vector3(1, 2, 3) };
      expect(isControlsTargetWithinEpsilon(controls, 1.0002, 2, 3)).toBe(true);
      expect(isControlsTargetWithinEpsilon(controls, 1.01, 2, 3)).toBe(false);
      expect(isControlsTargetWithinEpsilon(undefined, 1, 2, 3)).toBe(false);
    });
  });
});
