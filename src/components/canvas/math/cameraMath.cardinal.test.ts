import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  getClosestCardinalAxis,
  isNearCardinalAxis,
  getCardinalDirectionFromVector,
  getCardinalNormal,
  getCardinalUp,
  criticallyDamped,
  calculateLogarithmicZoomStep,
  interpolateLogarithmicDistance,
} from './cameraMath';
import {
  GALACTIC_FRAME,
  SYSTEM_FRAME,
  PLANETARY_FRAME,
} from '../instrument/referenceFrame';

describe('cameraMath - Cardinal Directions, Damping & Zoom', () => {
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
