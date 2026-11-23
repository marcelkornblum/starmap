import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import {
  applyOpticalTransitionValues,
  computeAngleAndAxis,
  computePerpAxis,
  copyVec3Input,
  evaluateTransitionEasing,
  evaluateWindowedTransitionEasing,
  initOpticalTransitionState,
  resolveEndPoseDirectionAndPos,
  resolveStartDirection,
  resolveStartTarget,
  resolveTransitionDuration,
  type TransitionOpticsState,
} from './cameraTransitionPoseMath';

describe('cameraTransitionPoseMath', () => {
  describe('copyVec3Input', () => {
    it('copies from THREE.Vector3 and tuple inputs', () => {
      const dest = new THREE.Vector3();
      copyVec3Input(dest, new THREE.Vector3(1, 2, 3));
      expect(dest.toArray()).toEqual([1, 2, 3]);

      copyVec3Input(dest, [4, 5, 6]);
      expect(dest.toArray()).toEqual([4, 5, 6]);
    });
  });

  describe('computePerpAxis', () => {
    it('normalises hintA before checking collinearity with dir', () => {
      const dir = new THREE.Vector3(0, 0, 1);
      // Non-unit parallel hintA (dot = 0.5 < 0.9 if unnormalised, which would yield zero cross product)
      const hintA = new THREE.Vector3(0, 0, 0.5);
      const hintB = new THREE.Vector3(0, 1, 0);
      const out = new THREE.Vector3();

      computePerpAxis(dir, hintA, hintB, out);

      expect(out.length()).toBeCloseTo(1, 5);
      expect(Math.abs(out.dot(dir))).toBeCloseTo(0, 5);
      expect(Number.isNaN(out.x)).toBe(false);
    });

    it('normalises large non-unit hintA and does not mutate caller vectors', () => {
      const dir = new THREE.Vector3(0, 0, 1);
      const hintA = new THREE.Vector3(0, 10, 0);
      const hintB = new THREE.Vector3(1, 0, 0);
      const out = new THREE.Vector3();

      computePerpAxis(dir, hintA, hintB, out);

      expect(out.length()).toBeCloseTo(1, 5);
      expect(Math.abs(out.dot(dir))).toBeCloseTo(0, 5);
      expect(hintA.toArray()).toEqual([0, 10, 0]);
    });

    it('normalises hintB and falls back to Cartesian basis when both hints are collinear', () => {
      const dir = new THREE.Vector3(0, 0, 1);
      const hintA = new THREE.Vector3(0, 0, 0.3);
      const hintB = new THREE.Vector3(0, 0, -0.4);
      const out = new THREE.Vector3();

      computePerpAxis(dir, hintA, hintB, out);

      expect(out.length()).toBeCloseTo(1, 5);
      expect(Math.abs(out.dot(dir))).toBeCloseTo(0, 5);
      expect(Number.isNaN(out.x)).toBe(false);
    });
  });

  describe('computeAngleAndAxis', () => {
    it('computes a valid perpendicular unit axis for 180-degree opposite vectors even with unnormalised hints', () => {
      const from = new THREE.Vector3(0, 0, 1);
      const to = new THREE.Vector3(0, 0, -1);
      const hintA = new THREE.Vector3(0, 0, 0.5);
      const hintB = new THREE.Vector3(0, 0, -0.5);
      const axis = new THREE.Vector3();

      const angle = computeAngleAndAxis(from, to, hintA, hintB, axis);

      expect(angle).toBeCloseTo(Math.PI, 5);
      expect(axis.length()).toBeCloseTo(1, 5);
      expect(Math.abs(axis.dot(from))).toBeCloseTo(0, 5);
      expect(Number.isNaN(axis.x)).toBe(false);
    });

    it('computes cross-product axis for orthogonal vectors', () => {
      const from = new THREE.Vector3(1, 0, 0);
      const to = new THREE.Vector3(0, 1, 0);
      const hint = new THREE.Vector3(0, 0, 1);
      const axis = new THREE.Vector3();

      const angle = computeAngleAndAxis(from, to, hint, hint, axis);

      expect(angle).toBeCloseTo(Math.PI / 2, 5);
      expect(axis.toArray()).toEqual([0, 0, 1]);
    });
  });

  describe('evaluateTransitionEasing', () => {
    it('defaults to easeOutCubic, supports easeInQuad and criticallyDamped, and invokes custom functions', () => {
      expect(evaluateTransitionEasing(undefined, 0.5)).toBeCloseTo(0.875, 5);
      expect(evaluateTransitionEasing('easeInQuad', 0.5)).toBeCloseTo(0.25, 5);
      expect(evaluateTransitionEasing('criticallyDamped', 0)).toBe(0);
      expect(evaluateTransitionEasing('criticallyDamped', 1)).toBe(1);
      const custom = vi.fn((t: number) => t * t);
      expect(evaluateTransitionEasing(custom, 0.5)).toBe(0.25);
      expect(custom).toHaveBeenCalledWith(0.5);
    });

    it('evaluates windowed transition easing over optional [start, end] windows', () => {
      const linear = (t: number) => t;
      expect(evaluateWindowedTransitionEasing(linear, 0.1, [0.2, 1.0])).toBe(0);
      expect(evaluateWindowedTransitionEasing(linear, 0.6, [0.2, 1.0])).toBeCloseTo(0.5, 6);
      expect(evaluateWindowedTransitionEasing(undefined, 0.25, [0, 0.5])).toBeCloseTo(0.875, 5);
      expect(evaluateWindowedTransitionEasing(linear, 0.4, undefined)).toBeCloseTo(0.4, 6);
    });
  });

  describe('pose resolution & optics', () => {
    it('resolves start target from controlsTarget or camera world direction', () => {
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
      camera.position.set(0, 0, 10);
      camera.lookAt(0, 0, 0);
      const out = new THREE.Vector3();
      const scratch = new THREE.Vector3();

      resolveStartTarget(camera, new THREE.Vector3(1, 2, 3), out, scratch);
      expect(out.toArray()).toEqual([1, 2, 3]);

      resolveStartTarget(camera, undefined, out, scratch);
      expect(out.z).toBeCloseTo(0, 4);
    });

    it('resolves start direction and handles zero-distance camera/target fallback', () => {
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
      camera.position.set(0, 0, 0);
      const outDir = new THREE.Vector3();
      const scratch = new THREE.Vector3();

      const zero = resolveStartDirection(camera, new THREE.Vector3(0, 0, 0), outDir, scratch);
      expect(zero.hasStartDir).toBe(false);
      expect(zero.startDist).toBe(0);
      expect(outDir.toArray()).toEqual([0, 0, 1]);
    });

    it('resolves end pose from position or direction and distance', () => {
      const startDir = new THREE.Vector3(0, 0, 1);
      const endTarget = new THREE.Vector3(10, 0, 0);
      const endDir = new THREE.Vector3();
      const endCamPos = new THREE.Vector3();
      const scratch = new THREE.Vector3();

      const dist = resolveEndPoseDirectionAndPos(
        { target: [10, 0, 0], direction: [0, -1, 0], distance: 25 },
        undefined,
        startDir,
        20,
        true,
        endTarget,
        endDir,
        endCamPos,
        scratch,
      );
      expect(dist).toBe(25);
      expect(endDir.toArray()).toEqual([0, -1, 0]);
      expect(endCamPos.toArray()).toEqual([10, -25, 0]);
    });

    it('respects explicit duration and computes dynamic duration when omitted', () => {
      const a = new THREE.Vector3(0, 0, 0);
      const b = new THREE.Vector3(10, 0, 0);
      expect(resolveTransitionDuration(0.4, a, b, 10, 10)).toBe(0.4);
      expect(resolveTransitionDuration(undefined, a, a, 10, 10)).toBe(0.8);
    });

    it('initializes and applies PerspectiveCamera fov and OrthographicCamera zoom', () => {
      const persp = new THREE.PerspectiveCamera(40, 1, 0.1, 1000);
      const ortho = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 1000);
      ortho.zoom = 1;
      const optics: TransitionOpticsState = {
        animateFov: false,
        startFov: 45,
        endFov: 45,
        animateOrthoZoom: false,
        startOrthoZoom: 1,
        endOrthoZoom: 1,
      };

      initOpticalTransitionState(persp, { target: [0, 0, 0], fov: 60 }, optics);
      applyOpticalTransitionValues(persp, 0.5, optics);
      expect(persp.fov).toBeCloseTo(50, 5);

      initOpticalTransitionState(ortho, { target: [0, 0, 0], orthoZoom: 3 }, optics);
      applyOpticalTransitionValues(ortho, 0.5, optics);
      expect(ortho.zoom).toBeCloseTo(2, 5);
    });
  });
});
