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
  criticallyDamped,
  calculateLogarithmicZoomStep,
  interpolateLogarithmicDistance,
} from '../src/components/canvas/math/cameraMath';
import {
  GALACTIC_FRAME,
  SYSTEM_FRAME,
  PLANETARY_FRAME,
} from '../src/components/canvas/instrument/referenceFrame';

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
    it('detects proximity to cardinal axes within default 10 degrees', () => {
      // 5 degrees offset from +Z (cos(5 deg) ~ 0.996 > cos(10 deg) ~ 0.9848)
      const nearZ = new THREE.Vector3(0, Math.sin((5 * Math.PI) / 180), Math.cos((5 * Math.PI) / 180)).normalize();
      expect(isNearCardinalAxis(nearZ)).toBe(true);

      // 15 degrees offset from +Z (cos(15 deg) ~ 0.9659 < cos(10 deg) ~ 0.9848)
      const farZ = new THREE.Vector3(0, Math.sin((15 * Math.PI) / 180), Math.cos((15 * Math.PI) / 180)).normalize();
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

  describe('Critically Damped Glide Curves: cameraMath.ts', () => {
    it('evaluates boundary conditions at t=0 and t=1', () => {
      expect(criticallyDamped(0)).toBe(0);
      expect(criticallyDamped(1)).toBe(1);
      expect(criticallyDamped(-0.5)).toBe(0);
      expect(criticallyDamped(1.5)).toBe(1);
    });

    it('is strictly monotonic and non-decreasing over [0, 1]', () => {
      let prev = -1;
      for (let i = 0; i <= 50; i++) {
        const val = criticallyDamped(i / 50);
        expect(val).toBeGreaterThanOrEqual(prev);
        prev = val;
      }
    });

    it('guarantees zero overshoot across all progress intervals', () => {
      for (let i = 0; i <= 100; i++) {
        const val = criticallyDamped(i / 100);
        expect(val).toBeLessThanOrEqual(1.0);
        expect(val).toBeGreaterThanOrEqual(0.0);
      }
    });

    it('exhibits smooth critically damped deceleration in the final quarter', () => {
      // Rate of progress in the second half [0.75 -> 1.0] should be much smaller than [0.25 -> 0.50]
      const earlyDelta = criticallyDamped(0.5) - criticallyDamped(0.25);
      const lateDelta = criticallyDamped(1.0) - criticallyDamped(0.75);
      expect(earlyDelta).toBeGreaterThan(lateDelta);
    });
  });

  describe('Logarithmic Zoom Stepping & Interpolation: cameraMath.ts', () => {
    it('scales distance geometrically on positive and negative step deltas', () => {
      const initial = 100;
      const factor = 1.15;
      const zoomedIn = calculateLogarithmicZoomStep(initial, 1, 1, 1000, factor);
      expect(zoomedIn).toBeCloseTo(initial / factor, 4);

      const zoomedOut = calculateLogarithmicZoomStep(initial, -1, 1, 1000, factor);
      expect(zoomedOut).toBeCloseTo(initial * factor, 4);
    });

    it('is strictly reversible: N zoom-in steps followed by N zoom-out steps returns to initial distance', () => {
      let dist = 50;
      for (let i = 0; i < 5; i++) {
        dist = calculateLogarithmicZoomStep(dist, 1, 1, 1000, 1.2);
      }
      for (let i = 0; i < 5; i++) {
        dist = calculateLogarithmicZoomStep(dist, -1, 1, 1000, 1.2);
      }
      expect(dist).toBeCloseTo(50, 3);
    });

    it('enforces min and max distance constraints without NaN or singularity', () => {
      const min = 5;
      const max = 500;

      // Extreme zoom in
      const clampedMin = calculateLogarithmicZoomStep(6, 100, min, max);
      expect(clampedMin).toBe(min);

      // Extreme zoom out
      const clampedMax = calculateLogarithmicZoomStep(400, -100, min, max);
      expect(clampedMax).toBe(max);
    });

    it('logarithmically interpolates distance returning exact geometric mean at t=0.5', () => {
      const start = 1;
      const end = 100;
      expect(interpolateLogarithmicDistance(start, end, 0)).toBe(1);
      expect(interpolateLogarithmicDistance(start, end, 1)).toBe(100);

      // Geometric mean of 1 and 100 is 10
      expect(interpolateLogarithmicDistance(start, end, 0.5)).toBeCloseTo(10, 4);
    });

    it('respects reference frame zoom constraints for Galactic, System, and Planetary frames', () => {
      // GALACTIC_FRAME: [minDistance: 5 pc, maxDistance: 500 pc]
      const galMin = GALACTIC_FRAME.camera.minDistance!;
      const galMax = GALACTIC_FRAME.camera.maxDistance!;
      expect(calculateLogarithmicZoomStep(10, 50, galMin, galMax)).toBe(galMin);
      expect(calculateLogarithmicZoomStep(100, -50, galMin, galMax)).toBe(galMax);

      // SYSTEM_FRAME: [minDistance: 2 AU, maxDistance: 150 AU]
      const sysMin = SYSTEM_FRAME.camera.minDistance!;
      const sysMax = SYSTEM_FRAME.camera.maxDistance!;
      expect(calculateLogarithmicZoomStep(5, 50, sysMin, sysMax)).toBe(sysMin);
      expect(calculateLogarithmicZoomStep(50, -50, sysMin, sysMax)).toBe(sysMax);

      // PLANETARY_FRAME: [minDistance: 1.5 km, maxDistance: 350 km]
      const planMin = PLANETARY_FRAME.camera.minDistance!;
      const planMax = PLANETARY_FRAME.camera.maxDistance!;
      expect(calculateLogarithmicZoomStep(3, 50, planMin, planMax)).toBe(planMin);
      expect(calculateLogarithmicZoomStep(200, -50, planMin, planMax)).toBe(planMax);
    });
  });
});

