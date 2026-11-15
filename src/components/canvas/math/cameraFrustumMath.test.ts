import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  calculateOrthographicFrustum,
  calculateEquivalentPerspectiveDistance,
  calculateAdaptiveProjectionFov,
  synchronizeOrthoWithPerspective,
  synchronizePerspectiveWithOrtho,
  criticallyDamped,
  calculateLogarithmicZoomStep,
  interpolateLogarithmicDistance,
} from './cameraFrustumMath';
import {
  GALACTIC_FRAME,
  SYSTEM_FRAME,
  PLANETARY_FRAME,
} from '../instrument/referenceFrame';

describe('Camera Frustum Math: cameraFrustumMath.ts', () => {
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

      const testPoints = [
        focalPoint.clone(),
        focalPoint.clone().add(new THREE.Vector3(5, 5, 0)),
        focalPoint.clone().add(new THREE.Vector3(-12, 8, 0)),
        focalPoint.clone().add(new THREE.Vector3(7, -6, 0)),
      ];

      for (const pt of testPoints) {
        const ndcPersp = pt.clone().project(perspCam);
        const ndcOrtho = pt.clone().project(orthoCam);

        expect(ndcOrtho.x).toBeCloseTo(ndcPersp.x, 5);
        expect(ndcOrtho.y).toBeCloseTo(ndcPersp.y, 5);
      }
    });
  });

  describe('calculateEquivalentPerspectiveDistance', () => {
    it('inverts frustum top to restore identical perspective camera distance', () => {
      const baseDistance = 60;
      const baseFov = 45;
      const halfHeight = baseDistance * Math.tan(((baseFov * Math.PI) / 360));

      const equivDistance = calculateEquivalentPerspectiveDistance(halfHeight, 1.0, baseFov);
      expect(equivDistance).toBeCloseTo(baseDistance, 6);
    });

    it('accounts for orthographic zoom level correctly', () => {
      const baseDistance = 100;
      const baseFov = 60;
      const halfHeight = baseDistance * Math.tan(((baseFov * Math.PI) / 360));

      const equivDistance2x = calculateEquivalentPerspectiveDistance(halfHeight, 2.0, baseFov);
      expect(equivDistance2x).toBeCloseTo(baseDistance / 2, 6);
    });
  });

  describe('calculateAdaptiveProjectionFov', () => {
    it('returns base FOV and zoom 1.0 at alpha = 0', () => {
      const res = calculateAdaptiveProjectionFov(45, 0);
      expect(res.fov).toBe(45);
      expect(res.zoom).toBeCloseTo(1.0, 6);
    });

    it('returns min FOV and compensated zoom at alpha = 1', () => {
      const baseFov = 45;
      const minFov = 3.6;
      const res = calculateAdaptiveProjectionFov(baseFov, 1.0, minFov);

      expect(res.fov).toBe(minFov);

      const expectedZoom =
        Math.tan((minFov * Math.PI) / 360) / Math.tan((baseFov * Math.PI) / 360);
      expect(res.zoom).toBeCloseTo(expectedZoom, 6);
    });

    it('preserves visible focal-plane scale across alpha sweep [0, 1]', () => {
      const baseFov = 45;
      const minFov = 3.6;
      const distance = 100;
      const baseHalfHeight = distance * Math.tan((baseFov * Math.PI) / 360);

      const alphas = [0.0, 0.2, 0.5, 0.8, 1.0];
      for (const a of alphas) {
        const { fov, zoom } = calculateAdaptiveProjectionFov(baseFov, a, minFov);
        const apparentHalfHeight = (distance * Math.tan((fov * Math.PI) / 360)) / zoom;
        expect(apparentHalfHeight).toBeCloseTo(baseHalfHeight, 5);
      }
    });
  });

  describe('synchronizeOrthoWithPerspective & synchronizePerspectiveWithOrtho', () => {
    it('synchronizes ortho camera parameters directly from perspective camera', () => {
      const distance = 80;
      const fov = 45;
      const aspect = 16 / 9;
      const target = new THREE.Vector3(0, 0, 0);

      const perspCam = new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000);
      perspCam.position.set(0, 0, distance);
      perspCam.lookAt(target);
      perspCam.updateProjectionMatrix();

      const orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
      synchronizeOrthoWithPerspective(perspCam, orthoCam, target, aspect);

      expect(orthoCam.position).toEqual(perspCam.position);
      expect(orthoCam.quaternion.angleTo(perspCam.quaternion)).toBeCloseTo(0, 5);

      const expectedHalfHeight = distance * Math.tan(((fov * Math.PI) / 360));
      expect(orthoCam.top).toBeCloseTo(expectedHalfHeight, 5);
      expect(orthoCam.bottom).toBeCloseTo(-expectedHalfHeight, 5);
      expect(orthoCam.right).toBeCloseTo(expectedHalfHeight * aspect, 5);
      expect(orthoCam.left).toBeCloseTo(-expectedHalfHeight * aspect, 5);
    });

    it('synchronizes perspective camera with ortho camera via dolly distance matching focal plane scale', () => {
      const target = new THREE.Vector3(0, 0, 0);
      const orthoHalfHeight = 25;
      const aspect = 16 / 9;
      const baseFov = 45;

      const orthoCam = new THREE.OrthographicCamera(
        -orthoHalfHeight * aspect,
        orthoHalfHeight * aspect,
        orthoHalfHeight,
        -orthoHalfHeight,
        0.1,
        1000,
      );
      orthoCam.position.set(0, 50, 0);
      orthoCam.lookAt(target);

      const perspCam = new THREE.PerspectiveCamera(baseFov, aspect, 0.1, 1000);
      synchronizePerspectiveWithOrtho(orthoCam, perspCam, target, baseFov);

      const expectedDollyDistance = orthoHalfHeight / Math.tan(((baseFov * Math.PI) / 360));
      expect(perspCam.position.distanceTo(target)).toBeCloseTo(expectedDollyDistance, 5);
      expect(perspCam.fov).toBe(baseFov);
      expect(perspCam.zoom).toBe(1.0);
    });

    it('preserves exact frustum dimensions when synchronizing from adaptive telephoto camera', () => {
      const focalPoint = new THREE.Vector3(0, 0, 0);
      const distance = 40;
      const baseFov = 45;
      const aspect = 16 / 9;

      const { fov, zoom } = calculateAdaptiveProjectionFov(baseFov, 1.0, 3.6);
      const perspCam = new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000);
      perspCam.zoom = zoom;
      perspCam.position.set(0, 0, distance);
      perspCam.lookAt(focalPoint);
      perspCam.updateProjectionMatrix();

      const orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
      synchronizeOrthoWithPerspective(perspCam, orthoCam, focalPoint, aspect);

      const expectedTop = distance * Math.tan((baseFov * Math.PI) / 360);
      expect(orthoCam.top).toBeCloseTo(expectedTop, 4);
      expect(orthoCam.bottom).toBeCloseTo(-expectedTop, 4);
    });

    it('preserves camera orientation, focal plane scale, and panned target when synchronizing back from panned ortho view', () => {
      const focalPoint = new THREE.Vector3(0, 0, 0);
      const initialDistance = 50;
      const baseFov = 45;
      const aspect = 16 / 9;

      const perspCam = new THREE.PerspectiveCamera(baseFov, aspect, 0.1, 1000);
      perspCam.position.set(0, 0, initialDistance);
      perspCam.up.set(0, 1, 0);
      perspCam.lookAt(focalPoint);

      const orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
      synchronizeOrthoWithPerspective(perspCam, orthoCam, focalPoint, aspect);

      const panDelta = new THREE.Vector3(20, 15, 0);
      orthoCam.position.add(panDelta);
      focalPoint.add(panDelta);

      synchronizePerspectiveWithOrtho(orthoCam, perspCam, focalPoint, baseFov);

      expect(perspCam.position.x).toBeCloseTo(20, 4);
      expect(perspCam.position.y).toBeCloseTo(15, 4);
      expect(perspCam.position.z).toBeCloseTo(initialDistance, 4);
      expect(perspCam.quaternion.angleTo(orthoCam.quaternion)).toBeCloseTo(0, 5);
      expect(perspCam.position.distanceTo(focalPoint)).toBeCloseTo(initialDistance, 4);
    });
  });

  describe('Critically Damped Glide Curves', () => {
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
      const earlyDelta = criticallyDamped(0.5) - criticallyDamped(0.25);
      const lateDelta = criticallyDamped(1.0) - criticallyDamped(0.75);
      expect(earlyDelta).toBeGreaterThan(lateDelta);
    });
  });

  describe('Logarithmic Zoom Stepping & Interpolation', () => {
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

      const clampedMin = calculateLogarithmicZoomStep(6, 100, min, max);
      expect(clampedMin).toBe(min);

      const clampedMax = calculateLogarithmicZoomStep(400, -100, min, max);
      expect(clampedMax).toBe(max);
    });

    it('logarithmically interpolates distance returning exact geometric mean at t=0.5', () => {
      const start = 1;
      const end = 100;
      expect(interpolateLogarithmicDistance(start, end, 0)).toBe(1);
      expect(interpolateLogarithmicDistance(start, end, 1)).toBe(100);

      expect(interpolateLogarithmicDistance(start, end, 0.5)).toBeCloseTo(10, 4);
    });

    it('respects reference frame zoom constraints for Galactic, System, and Planetary frames', () => {
      const galMin = GALACTIC_FRAME.camera.minDistance!;
      const galMax = GALACTIC_FRAME.camera.maxDistance!;
      expect(calculateLogarithmicZoomStep(10, 50, galMin, galMax)).toBe(galMin);
      expect(calculateLogarithmicZoomStep(100, -50, galMin, galMax)).toBe(galMax);

      const sysMin = SYSTEM_FRAME.camera.minDistance!;
      const sysMax = SYSTEM_FRAME.camera.maxDistance!;
      expect(calculateLogarithmicZoomStep(5, 50, sysMin, sysMax)).toBe(sysMin);
      expect(calculateLogarithmicZoomStep(50, -50, sysMin, sysMax)).toBe(sysMax);

      const planMin = PLANETARY_FRAME.camera.minDistance!;
      const planMax = PLANETARY_FRAME.camera.maxDistance!;
      expect(calculateLogarithmicZoomStep(3, 50, planMin, planMax)).toBe(planMin);
      expect(calculateLogarithmicZoomStep(200, -50, planMin, planMax)).toBe(planMax);
    });
  });
});
