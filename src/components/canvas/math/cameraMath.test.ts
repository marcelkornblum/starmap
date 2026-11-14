import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  calculateOrthographicFrustum,
  calculateEquivalentPerspectiveDistance,
  calculateAdaptiveProjectionFov,
  synchronizeOrthoWithPerspective,
  synchronizePerspectiveWithOrtho,
} from './cameraMath';

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

      const halfHeight = orthoFrustum.top;
      const halfWidth = orthoFrustum.right;

      const testPoints = [
        focalPoint.clone(),
        focalPoint.clone().add(new THREE.Vector3(halfWidth * 0.5, halfHeight * 0.5, 0)),
        focalPoint.clone().add(new THREE.Vector3(-halfWidth * 0.8, halfHeight * 0.2, 0)),
        focalPoint.clone().add(new THREE.Vector3(halfWidth, halfHeight, 0)),
        focalPoint.clone().add(new THREE.Vector3(-halfWidth, -halfHeight, 0)),
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
        2.0,
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
      expect(res.fov).toBe(3.6);
      const expectedZoom = Math.tan(((3.6 * Math.PI) / 360)) / Math.tan(((45 * Math.PI) / 360));
      expect(res.zoom).toBeCloseTo(expectedZoom, 6);
    });

    it('linearly interpolates FOV and calculates smooth tangent zoom ratio', () => {
      const res = calculateAdaptiveProjectionFov(45, 0.5, 5.0);
      expect(res.fov).toBeCloseTo(25.0, 6);
      const expectedZoom = Math.tan(((25 * Math.PI) / 360)) / Math.tan(((45 * Math.PI) / 360));
      expect(res.zoom).toBeCloseTo(expectedZoom, 6);
    });

    it('clamps alpha cleanly to [0, 1] range', () => {
      expect(calculateAdaptiveProjectionFov(45, -0.5).fov).toBe(45);
      expect(calculateAdaptiveProjectionFov(45, 1.5, 3.6).fov).toBe(3.6);
    });
  });

  describe('synchronizeOrthoWithPerspective & synchronizePerspectiveWithOrtho', () => {
    it('synchronizes ortho camera with perspective camera position, orientation, and focal frustum', () => {
      const distance = 50;
      const fov = 45;
      const aspect = 16 / 9;
      const target = new THREE.Vector3(10, 20, 30);
      const camPos = new THREE.Vector3(10, 20, 30 + distance);

      const perspCam = new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000);
      perspCam.position.copy(camPos);
      perspCam.lookAt(target);
      perspCam.updateMatrixWorld();

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
});
