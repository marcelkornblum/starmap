import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  applyOrientationTransitionValues,
  computeRigidBodyTiltAxis,
  createTransitionOrientationState,
  initOrientationTransitionState,
} from './cameraTransitionOrientationMath';

describe('cameraTransitionOrientationMath', () => {
  describe('computeRigidBodyTiltAxis', () => {
    it('returns normalised startUp x startDir when non-collinear', () => {
      const startUp = new THREE.Vector3(0, 1, 0);
      const startDir = new THREE.Vector3(0, 0, 1);
      const out = new THREE.Vector3();

      computeRigidBodyTiltAxis(startUp, startDir, out);

      expect(out.toArray()).toEqual([1, 0, 0]);
    });

    it('falls back to [1, 0, 0] (orthogonalised) when startUp and startDir are collinear', () => {
      const startUp = new THREE.Vector3(0, 0, 1);
      const startDir = new THREE.Vector3(0, 0, 1);
      const out = new THREE.Vector3();

      computeRigidBodyTiltAxis(startUp, startDir, out);

      expect(out.toArray()).toEqual([1, 0, 0]);
      expect(Math.abs(out.dot(startDir))).toBeCloseTo(0, 6);
    });

    it('remains strictly perpendicular when startDir is along [1, 0, 0] and collinear with startUp', () => {
      const startUp = new THREE.Vector3(1, 0, 0);
      const startDir = new THREE.Vector3(1, 0, 0);
      const out = new THREE.Vector3();

      computeRigidBodyTiltAxis(startUp, startDir, out);

      expect(out.length()).toBeCloseTo(1, 6);
      expect(Math.abs(out.dot(startDir))).toBeCloseTo(0, 6);
    });
  });

  describe('rigid-body frameTiltRad initialisation and evaluation', () => {
    it('rotates both dir and up around the shared tilt axis and updates endCamPos', () => {
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
      camera.up.set(0, 1, 0);

      const state = createTransitionOrientationState();
      state.startDir.set(0, 0, 1);
      state.endDir.set(0, 0, 1);

      const endTarget = new THREE.Vector3(10, 0, 0);
      const endCamPos = new THREE.Vector3(10, 0, 20);
      const tiltRad = Math.PI / 2;

      initOrientationTransitionState(
        camera,
        { target: [10, 0, 0], frameTiltRad: tiltRad },
        endTarget,
        20,
        endCamPos,
        state,
      );

      expect(state.frameTiltRad).toBeCloseTo(tiltRad, 6);
      expect(state.animateUp).toBe(true);
      expect(state.endDir.y).toBeCloseTo(-1, 5);
      expect(state.endDir.z).toBeCloseTo(0, 5);
      expect(state.endUp.z).toBeCloseTo(1, 5);
      expect(endCamPos.toArray()[1]).toBeCloseTo(-20, 4);

      const outDir = new THREE.Vector3();
      const outUp = new THREE.Vector3();
      applyOrientationTransitionValues(camera, 0.5, state, outDir, outUp);

      expect(Math.abs(outDir.dot(outUp))).toBeCloseTo(0, 6);
      expect(Math.abs(outDir.dot(camera.up))).toBeCloseTo(0, 6);
    });

    it('uses and normalises explicit non-zero frameTiltAxis when provided', () => {
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
      camera.up.set(0, 0, 1);

      const state = createTransitionOrientationState();
      state.startDir.set(0, -1, 0);
      state.endDir.set(0, -1, 0);

      const endTarget = new THREE.Vector3(0, 0, 0);
      const endCamPos = new THREE.Vector3(0, -20, 0);
      const tiltRad = Math.PI / 2;

      initOrientationTransitionState(
        camera,
        { target: [0, 0, 0], frameTiltRad: tiltRad, frameTiltAxis: [0, 3, 0] },
        endTarget,
        20,
        endCamPos,
        state,
      );

      expect(state.tiltAxis.x).toBeCloseTo(0, 6);
      expect(state.tiltAxis.y).toBeCloseTo(1, 6);
      expect(state.tiltAxis.z).toBeCloseTo(0, 6);
      expect(state.endUp.x).toBeCloseTo(1, 6);
      expect(state.endUp.z).toBeCloseTo(0, 6);
    });

    it('falls back to computeRigidBodyTiltAxis when frameTiltAxis is zero', () => {
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
      camera.up.set(0, 1, 0);

      const state = createTransitionOrientationState();
      state.startDir.set(0, 0, 1);
      state.endDir.set(0, 0, 1);

      const endTarget = new THREE.Vector3(0, 0, 0);
      const endCamPos = new THREE.Vector3(0, 0, 20);

      initOrientationTransitionState(
        camera,
        { target: [0, 0, 0], frameTiltRad: Math.PI / 2, frameTiltAxis: [0, 0, 0] },
        endTarget,
        20,
        endCamPos,
        state,
      );

      expect(state.tiltAxis.toArray()).toEqual([1, 0, 0]);
    });
  });
});
