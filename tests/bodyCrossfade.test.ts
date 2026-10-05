import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  projectedPixelDiameter,
  bodyVisibility,
  nodeVisibility,
} from '../src/components/canvas/math/bodyCrossfade';

const VIEWPORT_HEIGHT = 1000;

function perspectiveAt(position: [number, number, number]): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 10000);
  camera.position.set(...position);
  camera.updateMatrixWorld();
  return camera;
}

describe('Body / node cross-fade maths', () => {
  describe('projectedPixelDiameter', () => {
    it('measures from the body world position, not the origin', () => {
      // Body far from origin; camera hovering 10 units above it
      const camera = perspectiveAt([100, 0, 10]);
      const worldPos = new THREE.Vector3(100, 0, 0);
      const near = projectedPixelDiameter(camera, worldPos, 1, VIEWPORT_HEIGHT);

      const farCamera = perspectiveAt([100, 0, 1000]);
      const far = projectedPixelDiameter(farCamera, worldPos, 1, VIEWPORT_HEIGHT);

      expect(near).toBeGreaterThan(100);
      expect(far).toBeLessThan(near / 50);
    });

    it('matches the perspective projection formula', () => {
      const camera = perspectiveAt([0, 0, 10]);
      const diameter = projectedPixelDiameter(camera, new THREE.Vector3(), 1, VIEWPORT_HEIGHT);
      const visibleHeight = 2 * Math.tan((45 * Math.PI) / 360) * 10;
      expect(diameter).toBeCloseTo((2 / visibleHeight) * VIEWPORT_HEIGHT, 6);
    });

    it('uses frustum height and zoom for orthographic cameras', () => {
      const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 100);
      camera.zoom = 2;
      const diameter = projectedPixelDiameter(camera, new THREE.Vector3(), 1, VIEWPORT_HEIGHT);
      expect(diameter).toBeCloseTo((2 / (20 / 2)) * VIEWPORT_HEIGHT, 6);
    });
  });

  describe('bodyVisibility / nodeVisibility', () => {
    it('shows only the body when the disc is larger than the marker band', () => {
      expect(bodyVisibility(100, 24, 16)).toBe(1);
      expect(nodeVisibility(100, 24, 16)).toBe(0);
    });

    it('shows only the node when the disc is smaller than the marker', () => {
      expect(bodyVisibility(10, 24, 16)).toBe(0);
      expect(nodeVisibility(10, 24, 16)).toBe(1);
    });

    it('cross-fades complementarily inside the fade band', () => {
      const d = 32; // midway through [24, 40]
      expect(bodyVisibility(d, 24, 16)).toBeCloseTo(0.5, 6);
      expect(bodyVisibility(d, 24, 16) + nodeVisibility(d, 24, 16)).toBeCloseTo(1, 6);
    });
  });
});
