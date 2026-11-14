import { describe, it, expect, beforeEach } from 'vitest';
import { useCameraStore, INITIAL_CAMERA_STATE } from './useCameraStore';

describe('Camera Store: useCameraStore.ts', () => {
  beforeEach(() => {
    useCameraStore.getState().reset();
  });

  it('initializes with default perspective state', () => {
    const state = useCameraStore.getState();
    expect(state.mode).toBe('perspective');
    expect(state.isLocked).toBe(false);
    expect(state.activeCardinal).toBeNull();
    expect(state.pendingAxisRequest).toBeNull();
    expect(state.zoom).toBe(1.0);
    expect(state.recenterTick).toBe(0);
    expect(state.savedGalaxyCamera).toBeNull();
    expect(state.lastGalaxySearch).toBe('');
    expect(state.pendingCenterSlug).toBeNull();
    expect(state.canvasFocusedSlugs.size).toBe(0);
  });

  it('updates projection mode with setMode', () => {
    useCameraStore.getState().setMode('orthographic');
    expect(useCameraStore.getState().mode).toBe('orthographic');

    useCameraStore.getState().setMode('perspective');
    expect(useCameraStore.getState().mode).toBe('perspective');
  });

  it('locks into orthographic projection when setLocked(true) is invoked', () => {
    useCameraStore.getState().setLocked(true);
    const state = useCameraStore.getState();
    expect(state.isLocked).toBe(true);
    expect(state.mode).toBe('orthographic');
  });

  it('restores perspective projection and clears cardinal when setLocked(false) is invoked', () => {
    useCameraStore.getState().setLocked(true);
    useCameraStore.getState().setActiveCardinal('top');

    useCameraStore.getState().setLocked(false);
    const state = useCameraStore.getState();
    expect(state.isLocked).toBe(false);
    expect(state.mode).toBe('perspective');
    expect(state.activeCardinal).toBeNull();
  });

  it('toggles lock state and projection mode cleanly', () => {
    useCameraStore.getState().toggleLock();
    expect(useCameraStore.getState().isLocked).toBe(true);
    expect(useCameraStore.getState().mode).toBe('orthographic');

    useCameraStore.getState().toggleLock();
    expect(useCameraStore.getState().isLocked).toBe(false);
    expect(useCameraStore.getState().mode).toBe('perspective');
  });

  it('queues and clears axis view requests', () => {
    useCameraStore.getState().requestAxisView('top');
    expect(useCameraStore.getState().pendingAxisRequest).toBe('top');

    useCameraStore.getState().clearAxisRequest();
    expect(useCameraStore.getState().pendingAxisRequest).toBeNull();
  });

  it('updates camera transform and derives focal distance correctly', () => {
    useCameraStore.getState().setCameraTransform([0, 0, 50], [0, 0, 0], 2.0);
    const state = useCameraStore.getState();
    expect(state.position).toEqual([0, 0, 50]);
    expect(state.target).toEqual([0, 0, 0]);
    expect(state.focalDistance).toBeCloseTo(50, 5);
    expect(state.zoom).toBe(2.0);
  });

  it('updates camera pose with setCameraPose', () => {
    useCameraStore.getState().setCameraPose({
      position: [10, 20, 30],
      target: [0, 0, 0],
      zoom: 1.5,
    });
    const state = useCameraStore.getState();
    expect(state.position).toEqual([10, 20, 30]);
    expect(state.target).toEqual([0, 0, 0]);
    expect(state.zoom).toBe(1.5);
  });

  it('increments recenterTick via triggerRecenter', () => {
    expect(useCameraStore.getState().recenterTick).toBe(0);
    useCameraStore.getState().triggerRecenter();
    expect(useCameraStore.getState().recenterTick).toBe(1);
    useCameraStore.getState().triggerRecenter();
    expect(useCameraStore.getState().recenterTick).toBe(2);
  });

  it('tracks savedGalaxyCamera, lastGalaxySearch, and pendingCenterSlug', () => {
    const savedPose = {
      position: [1, 2, 3] as [number, number, number],
      target: [0, 0, 0] as [number, number, number],
      up: [0, 1, 0] as [number, number, number],
      zoom: 1,
      focalDistance: 3,
      centerKey: 'sol',
    };
    useCameraStore.getState().setSavedGalaxyCamera(savedPose);
    expect(useCameraStore.getState().savedGalaxyCamera).toEqual(savedPose);

    useCameraStore.getState().setLastGalaxySearch('?q=sol');
    expect(useCameraStore.getState().lastGalaxySearch).toBe('?q=sol');

    useCameraStore.getState().setPendingCenterSlug('tau-ceti');
    expect(useCameraStore.getState().pendingCenterSlug).toBe('tau-ceti');

    useCameraStore.getState().recordCanvasFocus('tau-ceti');
    expect(useCameraStore.getState().canvasFocusedSlugs.has('tau-ceti')).toBe(true);

    useCameraStore.getState().clearCanvasFocus();
    expect(useCameraStore.getState().canvasFocusedSlugs.size).toBe(0);
  });

  it('resets to initial state with reset', () => {
    useCameraStore.getState().setLocked(true);
    useCameraStore.getState().requestAxisView('front');
    useCameraStore.getState().triggerRecenter();
    useCameraStore.getState().reset();

    expect(useCameraStore.getState()).toEqual(expect.objectContaining(INITIAL_CAMERA_STATE));
  });

  describe('Camera Presets & Action Dispatchers', () => {
    it('queues preset requests via applyPreset', () => {
      useCameraStore.getState().applyPreset('top-down');
      expect(useCameraStore.getState().pendingPresetRequest).toBe('top-down');

      useCameraStore.getState().clearPresetRequest();
      expect(useCameraStore.getState().pendingPresetRequest).toBeNull();

      useCameraStore.getState().applyPreset('reset');
      expect(useCameraStore.getState().pendingPresetRequest).toBe('reset');

      useCameraStore.getState().applyPreset('orbital-lock');
      expect(useCameraStore.getState().pendingPresetRequest).toBe('orbital-lock');

      useCameraStore.getState().applyPreset('radial');
      expect(useCameraStore.getState().pendingPresetRequest).toBe('radial');
    });

    it('exposes dedicated convenience action dispatchers for presets', () => {
      useCameraStore.getState().setTopDownView();
      expect(useCameraStore.getState().pendingPresetRequest).toBe('top-down');

      useCameraStore.getState().resetView();
      expect(useCameraStore.getState().pendingPresetRequest).toBe('reset');

      useCameraStore.getState().setOrbitalLockView();
      expect(useCameraStore.getState().pendingPresetRequest).toBe('orbital-lock');

      useCameraStore.getState().setRadialView();
      expect(useCameraStore.getState().pendingPresetRequest).toBe('radial');
    });
  });
});
