import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  calculateOrthographicFrustum,
  calculateEquivalentPerspectiveDistance,
  calculateAdaptiveProjectionFov,
  synchronizeOrthoWithPerspective,
  synchronizePerspectiveWithOrtho,
  getClosestCardinalAxis,
  isNearCardinalAxis,
  getCardinalDirectionFromVector,
  getCardinalNormal,
  getCardinalUp,
} from '../src/components/canvas/math/cameraMath';

describe('Camera Math: cameraMath.ts', () => {
  describe('calculateOrthographicFrustum & Screen Space Equivalence', () => {
    it('computes symmetric bounds matching vertical FOV and aspect ratio', () => {
      const distance = 50;
      const fov = 45;
      const aspect = 16 / 9;

      const frustum = calculateOrthographicFrustum(distance, fov, aspect);

      const expectedHalfHeight = distance * Math.tan(((fov * Math.PI) / 360));
      const expectedHalfWidth = expectedHalfHeight * aspect;

      expect(frustum.top).toBeCloseTo(expectedHalfHeight, 6);
      expect(frustum.bottom).toBeCloseTo(-expectedHalfHeight, 6);
      expect(frustum.right).toBeCloseTo(expectedHalfWidth, 6);
      expect(frustum.left).toBeCloseTo(-expectedHalfWidth, 6);
      expect(frustum.zoom).toBe(1.0);
    });

    it('guarantees identical NDC projection coordinates for points on the focal plane', () => {
      const distance = 40;
      const fov = 45;
      const aspect = 1920 / 1080;
      const focalPoint = new THREE.Vector3(10, 5, -20);
      const camPos = new THREE.Vector3(10, 5, focalPoint.z + distance);

      const perspCam = new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000);
      perspCam.position.copy(camPos);
      perspCam.lookAt(focalPoint);
      perspCam.updateMatrixWorld();
      perspCam.updateProjectionMatrix();

      const orthoFrustum = calculateOrthographicFrustum(distance, fov, aspect);
      const orthoCam = new THREE.OrthographicCamera(
        orthoFrustum.left,
        orthoFrustum.right,
        orthoFrustum.top,
        orthoFrustum.bottom,
        0.1,
        1000,
      );
      orthoCam.position.copy(camPos);
      orthoCam.lookAt(focalPoint);
      orthoCam.updateMatrixWorld();
      orthoCam.updateProjectionMatrix();

      // Test points on the focal plane: center, off-center, corners
      const halfHeight = orthoFrustum.top;
      const halfWidth = orthoFrustum.right;

      const testPoints = [
        focalPoint.clone(), // Center
        focalPoint.clone().add(new THREE.Vector3(halfWidth * 0.5, halfHeight * 0.5, 0)),
        focalPoint.clone().add(new THREE.Vector3(-halfWidth * 0.8, halfHeight * 0.2, 0)),
        focalPoint.clone().add(new THREE.Vector3(halfWidth, halfHeight, 0)), // Top-right corner
        focalPoint.clone().add(new THREE.Vector3(-halfWidth, -halfHeight, 0)), // Bottom-left corner
      ];

      for (const pt of testPoints) {
        const pPersp = pt.clone().project(perspCam);
        const pOrtho = pt.clone().project(orthoCam);

        expect(pPersp.x).toBeCloseTo(pOrtho.x, 5);
        expect(pPersp.y).toBeCloseTo(pOrtho.y, 5);
      }
    });
  });

  describe('calculateEquivalentPerspectiveDistance', () => {
    it('inverts orthographic frustum height to recover original distance at 1x zoom', () => {
      const initialDistance = 35;
      const fov = 45;
      const aspect = 1.6;

      const frustum = calculateOrthographicFrustum(initialDistance, fov, aspect);
      const recoveredDistance = calculateEquivalentPerspectiveDistance(
        frustum.top,
        1.0,
        fov,
      );

      expect(recoveredDistance).toBeCloseTo(initialDistance, 6);
    });

    it('halves equivalent distance when orthographic zoom is doubled (2x zoom)', () => {
      const initialDistance = 40;
      const fov = 45;
      const aspect = 1.0;

      const frustum = calculateOrthographicFrustum(initialDistance, fov, aspect);
      const recoveredDistance = calculateEquivalentPerspectiveDistance(
        frustum.top,
        2.0, // 2x zoom
        fov,
      );

      expect(recoveredDistance).toBeCloseTo(initialDistance / 2, 6);
    });
  });

  describe('calculateAdaptiveProjectionFov', () => {
    it('returns baseFov and 1.0 zoom at alpha = 0', () => {
      const res = calculateAdaptiveProjectionFov(45, 0);
      expect(res.fov).toBe(45);
      expect(res.zoom).toBeCloseTo(1.0, 6);
    });

    it('returns minFov and compensated zoom at alpha = 1', () => {
      const res = calculateAdaptiveProjectionFov(45, 1, 3.6);
      expect(res.fov).toBeCloseTo(3.6, 6);
      const expectedZoom =
        Math.tan((3.6 * Math.PI) / 360) / Math.tan((45 * Math.PI) / 360);
      expect(res.zoom).toBeCloseTo(expectedZoom, 6);
    });

    it('maintains focal plane screen scale across intermediate alpha values', () => {
      const baseFov = 45;
      const distance = 30;
      const aspect = 16 / 9;
      const testPoint = new THREE.Vector3(5, 5, 0);

      const baseCam = new THREE.PerspectiveCamera(baseFov, aspect, 0.1, 1000);
      baseCam.position.set(0, 0, distance);
      baseCam.lookAt(0, 0, 0);
      baseCam.updateMatrixWorld();
      baseCam.updateProjectionMatrix();

      const baseNdc = testPoint.clone().project(baseCam);

      for (let a = 0; a <= 1.0; a += 0.2) {
        const { fov, zoom } = calculateAdaptiveProjectionFov(baseFov, a, 3.6);
        const testCam = new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000);
        testCam.zoom = zoom;
        testCam.position.set(0, 0, distance);
        testCam.lookAt(0, 0, 0);
        testCam.updateMatrixWorld();
        testCam.updateProjectionMatrix();

        const testNdc = testPoint.clone().project(testCam);
        expect(testNdc.x).toBeCloseTo(baseNdc.x, 5);
        expect(testNdc.y).toBeCloseTo(baseNdc.y, 5);
      }
    });
  });

  describe('synchronizeOrthoWithPerspective & synchronizePerspectiveWithOrtho', () => {
    it('performs clean round-trip synchronization between camera instances', () => {
      const focalPoint = new THREE.Vector3(0, 0, 0);
      const initialDistance = 50;
      const baseFov = 45;
      const aspect = 16 / 9;

      const perspCam = new THREE.PerspectiveCamera(baseFov, aspect, 0.1, 1000);
      perspCam.position.set(0, initialDistance, 0); // top-down orientation
      perspCam.up.set(0, 0, -1);
      perspCam.lookAt(focalPoint);
      perspCam.updateMatrixWorld();
      perspCam.updateProjectionMatrix();

      const orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);

      // 1. Sync Ortho to Persp
      synchronizeOrthoWithPerspective(perspCam, orthoCam, focalPoint, aspect);

      expect(orthoCam.position.distanceTo(perspCam.position)).toBeCloseTo(0, 5);
      expect(orthoCam.quaternion.angleTo(perspCam.quaternion)).toBeCloseTo(0, 5);
      expect(orthoCam.top).toBeCloseTo(initialDistance * Math.tan((baseFov * Math.PI) / 360), 5);

      // 2. Simulate user zooming in Ortho (1.5x zoom)
      orthoCam.zoom = 1.5;
      orthoCam.updateProjectionMatrix();

      // 3. Sync Persp back from Ortho
      synchronizePerspectiveWithOrtho(orthoCam, perspCam, focalPoint, baseFov);

      const expectedDollyDistance = initialDistance / 1.5;
      expect(perspCam.position.distanceTo(focalPoint)).toBeCloseTo(expectedDollyDistance, 5);
      expect(perspCam.fov).toBe(baseFov);
      expect(perspCam.zoom).toBe(1.0);
    });

    it('preserves exact frustum dimensions when synchronizing from adaptive telephoto camera', () => {
      const focalPoint = new THREE.Vector3(0, 0, 0);
      const distance = 40;
      const baseFov = 45;
      const aspect = 16 / 9;

      // Simulate adaptive telephoto camera (fov = 3.6, zoom = 0.0759)
      const { fov, zoom } = calculateAdaptiveProjectionFov(baseFov, 1.0, 3.6);
      const perspCam = new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000);
      perspCam.zoom = zoom;
      perspCam.position.set(0, 0, distance);
      perspCam.lookAt(focalPoint);
      perspCam.updateProjectionMatrix();

      const orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
      synchronizeOrthoWithPerspective(perspCam, orthoCam, focalPoint, aspect);

      // Frustum top must match baseFov equivalent (distance * tan(22.5 deg)), NOT the 13.5x shrunken 3.6 deg value
      const expectedTop = distance * Math.tan((baseFov * Math.PI) / 360);
      expect(orthoCam.top).toBeCloseTo(expectedTop, 4);
      expect(orthoCam.bottom).toBeCloseTo(-expectedTop, 4);
    });
  });

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
  });

  describe('Cardinal Direction & Snap Detection: cameraMath.ts', () => {
    it('detects proximity to cardinal axes within 15 degrees', () => {
      // 10 degrees offset from +Z (cos(10 deg) ~ 0.9848 > cos(15 deg) ~ 0.9659)
      const nearZ = new THREE.Vector3(0, Math.sin((10 * Math.PI) / 180), Math.cos((10 * Math.PI) / 180)).normalize();
      expect(isNearCardinalAxis(nearZ)).toBe(true);

      // 25 degrees offset from +Z (cos(25 deg) ~ 0.9063 < cos(15 deg) ~ 0.9659)
      const farZ = new THREE.Vector3(0, Math.sin((25 * Math.PI) / 180), Math.cos((25 * Math.PI) / 180)).normalize();
      expect(isNearCardinalAxis(farZ)).toBe(false);

      // Exactly on +X axis
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
      // Top and bottom must NOT use Z-up to prevent parallel look/up singularity
      expect(getCardinalUp('top')).toEqual(new THREE.Vector3(0, 1, 0));
      expect(getCardinalUp('bottom')).toEqual(new THREE.Vector3(0, 1, 0));

      // Side views (front, back, right, left) use standard Z-up
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

