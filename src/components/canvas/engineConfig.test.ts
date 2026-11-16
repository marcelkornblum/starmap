import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  calculateScreenInvariantScale,
  reticleSizeToScreenPx,
  resolveEntityScreenInvariantScale,
  REFERENCE_INSTRUMENT_FOOTPRINT,
  REFERENCE_FOV_DEG,
  SCREEN_HEIGHT_REFERENCE_SCALE,
  FRAME_PRIORITY,
  CONTROLS_DAMPING_FACTOR,
  NOOP_RAYCAST,
} from './engineConfig';

describe('engineConfig & Screen Invariant Scaling', () => {
  it('exports valid constants and frame priorities', () => {
    expect(REFERENCE_FOV_DEG).toBe(45);
    expect(REFERENCE_INSTRUMENT_FOOTPRINT).toBeCloseTo(16.47, 2);
    expect(SCREEN_HEIGHT_REFERENCE_SCALE).toBeCloseTo(13.644, 2);
    expect(CONTROLS_DAMPING_FACTOR).toBe(0.14);
    expect(FRAME_PRIORITY.cameraTransition).toBeLessThan(FRAME_PRIORITY.spatialFrame);
    expect(FRAME_PRIORITY.spatialFrame).toBeLessThan(FRAME_PRIORITY.cameraRig);
    expect(FRAME_PRIORITY.cameraRig).toBeLessThan(0);
    expect(typeof NOOP_RAYCAST).toBe('function');
    expect(NOOP_RAYCAST()).toBeUndefined();
  });

  describe('calculateScreenInvariantScale', () => {
    it('calculates scale directly given camera distance and camera', () => {
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
      const scale = calculateScreenInvariantScale(10, camera);
      expect(scale).toBeCloseTo(10 / 16.47, 4);
    });
  });

  describe('resolveEntityScreenInvariantScale helper', () => {
    it('scales linearly with distance under PerspectiveCamera with frameState', () => {
      const frameState = {
        referenceFootprint: 16.47,
        fovFactor: 1.0,
        screenScale: 10 / 16.47,
      };
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
      const nearScale = resolveEntityScreenInvariantScale(10, camera, frameState);
      const farScale = resolveEntityScreenInvariantScale(30, camera, frameState);

      expect(nearScale).toBeCloseTo(10 / 16.47, 4);
      expect(farScale).toBeCloseTo(30 / 16.47, 4);
      expect(farScale / nearScale).toBeCloseTo(3.0, 4);
    });

    it('returns constant frameState.screenScale under OrthographicCamera with frameState', () => {
      const frameState = {
        referenceFootprint: 16.47,
        fovFactor: 1.0,
        screenScale: 2.5,
      };
      const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 1000);
      const nearScale = resolveEntityScreenInvariantScale(10, camera, frameState);
      const farScale = resolveEntityScreenInvariantScale(30, camera, frameState);

      expect(nearScale).toBe(2.5);
      expect(farScale).toBe(2.5);
      expect(farScale / nearScale).toBe(1.0);
    });

    it('falls back to calculateScreenInvariantScale when frameState is null or undefined', () => {
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
      const nearScale = resolveEntityScreenInvariantScale(10, camera, null);
      const farScale = resolveEntityScreenInvariantScale(30, camera, undefined);

      expect(nearScale).toBeCloseTo(10 / 16.47, 4);
      expect(farScale).toBeCloseTo(30 / 16.47, 4);
      expect(farScale / nearScale).toBeCloseTo(3.0, 4);
    });
  });

  describe('reticleSizeToScreenPx', () => {
    it('converts world reticle size to screen pixels given viewport height', () => {
      const px = reticleSizeToScreenPx(0.45, 1080);
      expect(px).toBeCloseTo((0.45 / 13.644) * 1080, 4);
    });
  });
});
