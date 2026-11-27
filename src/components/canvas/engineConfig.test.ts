import { describe, it, expect, vi, afterEach } from 'vitest';
import * as THREE from 'three';
import {
  calculateScreenInvariantScale,
  reticleSizeToScreenPx,
  resolveEntityScreenInvariantScale,
  resolveEffectiveHitRadiusPx,
  screenRadiusPxToReticleWorldUnits,
  isCoarsePointerDevice,
  getCoarsePointerSnapshot,
  promoteCoarseTouch,
  subscribeCoarsePointer,
  resetCoarsePointerForTesting,
  REFERENCE_INSTRUMENT_FOOTPRINT,
  REFERENCE_FOV_DEG,
  SCREEN_HEIGHT_REFERENCE_SCALE,
  DEFAULT_RETICLE_SIZE,
  MIN_HIT_DIAMETER_TOUCH_PX,
  MIN_HIT_RADIUS_TOUCH_PX,
  MIN_HIT_DIAMETER_MOUSE_PX,
  MIN_HIT_RADIUS_MOUSE_PX,
  POINTER_TAP_SLOP_TOUCH_PX,
  POINTER_TAP_SLOP_MOUSE_PX,
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

  describe('hit diameter floors and tap slop helpers', () => {
    afterEach(() => {
      resetCoarsePointerForTesting();
      vi.unstubAllGlobals();
    });

    it('exports authoritative touch/mouse hit diameter floors and tap slop constants', () => {
      expect(MIN_HIT_DIAMETER_TOUCH_PX).toBe(44);
      expect(MIN_HIT_RADIUS_TOUCH_PX).toBe(22);
      expect(MIN_HIT_DIAMETER_MOUSE_PX).toBe(28);
      expect(MIN_HIT_RADIUS_MOUSE_PX).toBe(14);
      expect(POINTER_TAP_SLOP_TOUCH_PX).toBe(14);
      expect(POINTER_TAP_SLOP_MOUSE_PX).toBe(8);
    });

    it('floors hit radius on 390x844 portrait and 844x390 landscape for touch and mouse', () => {
      const portraitVisualRadiusPx = reticleSizeToScreenPx(DEFAULT_RETICLE_SIZE, 844);
      const landscapeVisualRadiusPx = reticleSizeToScreenPx(DEFAULT_RETICLE_SIZE, 390);

      expect(portraitVisualRadiusPx).toBeCloseTo(13.61, 1);
      expect(landscapeVisualRadiusPx).toBeCloseTo(6.29, 1);

      expect(resolveEffectiveHitRadiusPx(portraitVisualRadiusPx, true)).toBe(22);
      expect(resolveEffectiveHitRadiusPx(landscapeVisualRadiusPx, true)).toBe(22);
      expect(resolveEffectiveHitRadiusPx(portraitVisualRadiusPx, false)).toBe(14);
      expect(resolveEffectiveHitRadiusPx(landscapeVisualRadiusPx, false)).toBe(14);
    });

    it('allows visual reticle or projected body radius to exceed floor', () => {
      expect(resolveEffectiveHitRadiusPx(30, true)).toBe(30);
      expect(resolveEffectiveHitRadiusPx(13.6, true, 120)).toBe(120);
      expect(resolveEffectiveHitRadiusPx(13.6, false, 80)).toBe(80);
    });

    it('inverts reticleSizeToScreenPx across portrait and landscape viewports and guards <= 0 height', () => {
      const portraitWorld = screenRadiusPxToReticleWorldUnits(22, 844);
      expect(reticleSizeToScreenPx(portraitWorld, 844)).toBeCloseTo(22, 4);

      const landscapeWorld = screenRadiusPxToReticleWorldUnits(22, 390);
      expect(reticleSizeToScreenPx(landscapeWorld, 390)).toBeCloseTo(22, 4);

      const mouseLandscapeWorld = screenRadiusPxToReticleWorldUnits(14, 390);
      expect(reticleSizeToScreenPx(mouseLandscapeWorld, 390)).toBeCloseTo(14, 4);

      expect(screenRadiusPxToReticleWorldUnits(22, 0)).toBe(0);
      expect(screenRadiusPxToReticleWorldUnits(22, -100)).toBe(0);
    });

    it('detects coarse pointer devices safely via matchMedia', () => {
      expect(isCoarsePointerDevice()).toBe(false);

      vi.stubGlobal('window', {
        matchMedia: vi.fn((query: string) => ({
          matches: query === '(pointer: coarse)',
        })),
      });
      expect(isCoarsePointerDevice()).toBe(true);

      vi.stubGlobal('window', {
        matchMedia: vi.fn((query: string) => ({
          matches: query === '(any-pointer: coarse)',
        })),
      });
      expect(isCoarsePointerDevice()).toBe(true);

      vi.stubGlobal('window', {
        matchMedia: vi.fn(() => ({ matches: false })),
      });
      expect(isCoarsePointerDevice()).toBe(false);
    });

    it('shares a singleton lazy media-query subscriber and supports promoteCoarseTouch', () => {
      const matchMediaMock = vi.fn((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));
      vi.stubGlobal('window', { matchMedia: matchMediaMock });

      const cbA = vi.fn();
      const cbB = vi.fn();
      const unsubA = subscribeCoarsePointer(cbA);
      const unsubB = subscribeCoarsePointer(cbB);

      expect(getCoarsePointerSnapshot()).toBe(false);
      expect(getCoarsePointerSnapshot()).toBe(false);
      // Queries (pointer: coarse) and (any-pointer: coarse) once at module level
      expect(matchMediaMock).toHaveBeenCalledTimes(2);

      promoteCoarseTouch();
      expect(getCoarsePointerSnapshot()).toBe(true);
      expect(cbA).toHaveBeenCalledTimes(1);
      expect(cbB).toHaveBeenCalledTimes(1);

      unsubA();
      unsubB();
    });
  });
});
