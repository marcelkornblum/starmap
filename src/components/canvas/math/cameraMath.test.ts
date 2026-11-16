import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  getClosestCardinalAxis,
  isNearCardinalAxis,
  getCardinalDirectionFromVector,
  getCardinalNormal,
  getCardinalUp,
} from './cameraMath';

describe('cameraMath - Cardinal Directions & Snapping', () => {
  describe('getClosestCardinalAxis', () => {
    it('identifies positive and negative Z cardinal normals', () => {
      const dirZPlus = new THREE.Vector3(0.1, 0.2, 0.95).normalize();
      const dirZMinus = new THREE.Vector3(-0.1, -0.2, -0.95).normalize();

      expect(getClosestCardinalAxis(dirZPlus)).toEqual(new THREE.Vector3(0, 0, 1));
      expect(getClosestCardinalAxis(dirZMinus)).toEqual(new THREE.Vector3(0, 0, -1));
    });

    it('identifies positive and negative Y cardinal normals', () => {
      const dirYPlus = new THREE.Vector3(0.1, 0.95, 0.2).normalize();
      const dirYMinus = new THREE.Vector3(-0.1, -0.95, -0.2).normalize();

      expect(getClosestCardinalAxis(dirYPlus)).toEqual(new THREE.Vector3(0, 1, 0));
      expect(getClosestCardinalAxis(dirYMinus)).toEqual(new THREE.Vector3(0, -1, 0));
    });

    it('identifies positive and negative X cardinal normals', () => {
      const dirXPlus = new THREE.Vector3(0.95, 0.1, 0.2).normalize();
      const dirXMinus = new THREE.Vector3(-0.95, -0.1, -0.2).normalize();

      expect(getClosestCardinalAxis(dirXPlus)).toEqual(new THREE.Vector3(1, 0, 0));
      expect(getClosestCardinalAxis(dirXMinus)).toEqual(new THREE.Vector3(-1, 0, 0));
    });

    it('handles exact zeros and edge cases consistently', () => {
      expect(getClosestCardinalAxis(new THREE.Vector3(0, 0, 0))).toEqual(new THREE.Vector3(0, 0, 1));
      expect(getClosestCardinalAxis(new THREE.Vector3(-0.5, 0, 0))).toEqual(new THREE.Vector3(-1, 0, 0));
      expect(getClosestCardinalAxis(new THREE.Vector3(0, -0.5, 0))).toEqual(new THREE.Vector3(0, -1, 0));
      expect(getClosestCardinalAxis(new THREE.Vector3(0, 0, -0.5))).toEqual(new THREE.Vector3(0, 0, -1));
    });
  });

  describe('Cardinal Direction & Snap Detection', () => {
    it('detects proximity to cardinal axes within default 10 degrees', () => {
      const nearZ = new THREE.Vector3(0, Math.sin((5 * Math.PI) / 180), Math.cos((5 * Math.PI) / 180)).normalize();
      expect(isNearCardinalAxis(nearZ)).toBe(true);

      const farZ = new THREE.Vector3(0, Math.sin((15 * Math.PI) / 180), Math.cos((15 * Math.PI) / 180)).normalize();
      expect(isNearCardinalAxis(farZ)).toBe(false);

      expect(isNearCardinalAxis(new THREE.Vector3(1, 0, 0))).toBe(true);
    });

    it('maps unit vectors to correct CardinalDirection names', () => {
      expect(getCardinalDirectionFromVector(new THREE.Vector3(0, 0, 1))).toBe('top');
      expect(getCardinalDirectionFromVector(new THREE.Vector3(0, 0, -1))).toBe('bottom');
      expect(getCardinalDirectionFromVector(new THREE.Vector3(0, -1, 0))).toBe('front');
      expect(getCardinalDirectionFromVector(new THREE.Vector3(0, 1, 0))).toBe('back');
      expect(getCardinalDirectionFromVector(new THREE.Vector3(1, 0, 0))).toBe('right');
      expect(getCardinalDirectionFromVector(new THREE.Vector3(-1, 0, 0))).toBe('left');
    });

    it('returns singular-free up vectors avoiding polar gimbal lock', () => {
      expect(getCardinalUp('top')).toEqual(new THREE.Vector3(0, 1, 0));
      expect(getCardinalUp('bottom')).toEqual(new THREE.Vector3(0, 1, 0));
      expect(getCardinalUp('front')).toEqual(new THREE.Vector3(0, 0, 1));
      expect(getCardinalUp('back')).toEqual(new THREE.Vector3(0, 0, 1));
      expect(getCardinalUp('right')).toEqual(new THREE.Vector3(0, 0, 1));
      expect(getCardinalUp('left')).toEqual(new THREE.Vector3(0, 0, 1));
    });

    it('returns exact cardinal normals for each direction', () => {
      expect(getCardinalNormal('top')).toEqual(new THREE.Vector3(0, 0, 1));
      expect(getCardinalNormal('bottom')).toEqual(new THREE.Vector3(0, 0, -1));
      expect(getCardinalNormal('front')).toEqual(new THREE.Vector3(0, -1, 0));
      expect(getCardinalNormal('back')).toEqual(new THREE.Vector3(0, 1, 0));
      expect(getCardinalNormal('right')).toEqual(new THREE.Vector3(1, 0, 0));
      expect(getCardinalNormal('left')).toEqual(new THREE.Vector3(-1, 0, 0));
    });
  });
});
