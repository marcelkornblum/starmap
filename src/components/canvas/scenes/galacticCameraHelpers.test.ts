import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { useCameraStore } from '../../../stores/useCameraStore';
import { useUIStore } from '../../../stores/useUIStore';
import {
  clearPendingCrossScaleArrival,
  setPendingCrossScaleArrival,
} from '../instrument/crossScaleArrivalState';
import {
  applyImmediateCameraPose,
  bindGalacticControlsListeners,
  computeCameraPoseSnapshot,
  dispatchPendingSearchFrame,
  formatCenterCoordString,
  navigatePanCenterToRouter,
  persistCameraPoseToStore,
  syncAndPersistGalacticPose,
  syncCameraPoseSnapshotToStore,
} from './galacticCameraHelpers';

describe('galacticCameraHelpers', () => {
  beforeEach(() => {
    useCameraStore.getState().reset();
    useUIStore.getState().resetUI();
    clearPendingCrossScaleArrival();
  });

  afterEach(() => {
    clearPendingCrossScaleArrival();
    vi.restoreAllMocks();
  });

  it('computes camera pose snapshot using controls target or fallback target', () => {
    const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 1000);
    camera.position.set(0, 0, 10);
    camera.up.set(0, 1, 0);
    camera.zoom = 1.5;
    const controls = { target: new THREE.Vector3(0, 0, 2) };

    const withControls = computeCameraPoseSnapshot(camera, controls, [9, 9, 9]);
    expect(withControls).toEqual({
      position: [0, 0, 10],
      target: [0, 0, 2],
      up: [0, 1, 0],
      zoom: 1.5,
      focalDistance: 8,
    });

    const withoutControls = computeCameraPoseSnapshot(camera, undefined, [0, 0, 4]);
    expect(withoutControls.target).toEqual([0, 0, 4]);
    expect(withoutControls.focalDistance).toBe(6);
  });

  it('persists camera pose only when enabled and delta exceeds threshold or force is true', () => {
    const baseSnapshot = {
      position: [0, -35, 20] as [number, number, number],
      target: [0, 0, 0] as [number, number, number],
      up: [0, 0, 1] as [number, number, number],
      zoom: 1,
      focalDistance: 40,
    };

    persistCameraPoseToStore(baseSnapshot, false, true);
    expect(useCameraStore.getState().savedGalaxyCamera).toBeNull();

    persistCameraPoseToStore(baseSnapshot, true, true);
    expect(useCameraStore.getState().savedGalaxyCamera?.centerKey).toBe('0,0,0');

    persistCameraPoseToStore(
      { ...baseSnapshot, position: [0.0001, -35, 20] },
      true,
      false,
    );
    expect(useCameraStore.getState().position).toEqual([0, -35, 20]);

    persistCameraPoseToStore(
      { ...baseSnapshot, position: [1, -35, 20] },
      true,
      false,
    );
    expect(useCameraStore.getState().position).toEqual([1, -35, 20]);
  });

  it('applies immediate camera pose with or without controls', () => {
    const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 1000);
    const controls = { target: new THREE.Vector3(), update: vi.fn() };

    const applied = applyImmediateCameraPose(
      camera,
      controls,
      [5, 6, 7],
      [1, 2, 3],
      [0, 0, 1],
      2,
      35,
    );
    expect(applied).toBe(true);
    expect(camera.position.toArray()).toEqual([5, 6, 7]);
    expect(camera.fov).toBe(35);
    expect(camera.zoom).toBe(2);
    expect(controls.target.toArray()).toEqual([1, 2, 3]);
    expect(controls.update).toHaveBeenCalledTimes(1);

    const lookAtSpy = vi.spyOn(camera, 'lookAt');
    const appliedNoControls = applyImmediateCameraPose(
      camera,
      undefined,
      [8, 9, 10],
      [0, 0, 0],
      [0, 1, 0],
    );
    expect(appliedNoControls).toBe(false);
    expect(lookAtSpy).toHaveBeenCalledWith(0, 0, 0);
  });

  it('formats centre coordinate strings and navigates router when panned beyond threshold', () => {
    expect(formatCenterCoordString(1.24, -3.56, 0.04)).toBe('1.2,-3.6,0.0');

    const navigate = vi.fn();
    const router = {
      navigate,
      state: { location: { pathname: '/galaxy', search: {} } },
    };
    const controls = { target: new THREE.Vector3(0.01, 0, 0) };
    const pendingPanTargetRef = { current: null as string | null };

    navigatePanCenterToRouter(
      router,
      controls,
      { x: 0, y: 0, z: 0 },
      pendingPanTargetRef,
    );
    expect(navigate).not.toHaveBeenCalled();

    controls.target.set(2.5, -1.5, 0.5);
    navigatePanCenterToRouter(
      router,
      controls,
      { x: 0, y: 0, z: 0 },
      pendingPanTargetRef,
    );
    expect(pendingPanTargetRef.current).toBe('2.5,-1.5,0.5');
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('syncs and optionally persists camera pose snapshot to store', () => {
    const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 1000);
    camera.position.set(1, 2, 3);
    const controls = { target: new THREE.Vector3(4, 5, 6) };

    syncCameraPoseSnapshotToStore(camera, controls, [0, 0, 0]);
    expect(useCameraStore.getState().target).toEqual([4, 5, 6]);
    expect(useCameraStore.getState().savedGalaxyCamera).toBeNull();

    syncAndPersistGalacticPose(camera, controls, [0, 0, 0], true);
    expect(useCameraStore.getState().savedGalaxyCamera?.target).toEqual([4, 5, 6]);
  });

  it('binds galactic controls listeners and skips unmount persist when cross-scale arrival is pending', () => {
    const listeners: Record<string, Array<(event: unknown) => void>> = {};
    const controls = {
      target: new THREE.Vector3(5, 0, 0),
      addEventListener: vi.fn((type: string, cb: (event: unknown) => void) => {
        (listeners[type] ??= []).push(cb);
      }),
      removeEventListener: vi.fn((type: string, cb: (event: unknown) => void) => {
        listeners[type] = (listeners[type] ?? []).filter((fn) => fn !== cb);
      }),
    };
    const saveCurrentGalaxyPose = vi.fn();
    const navigate = vi.fn();
    const cleanup = bindGalacticControlsListeners({
      controls,
      persistGalaxyPose: true,
      router: { navigate, state: { location: { pathname: '/galaxy', search: {} } } },
      targetPosRef: { current: { x: 0, y: 0, z: 0 } },
      pendingPanTargetRef: { current: null },
      saveCurrentGalaxyPose,
    });

    for (const cb of listeners['change'] ?? []) cb({});
    expect(saveCurrentGalaxyPose).toHaveBeenCalledWith(false);

    for (const cb of listeners['end'] ?? []) cb({});
    expect(saveCurrentGalaxyPose).toHaveBeenCalledWith(true);
    expect(navigate).toHaveBeenCalledTimes(1);

    saveCurrentGalaxyPose.mockClear();
    setPendingCrossScaleArrival({
      direction: 'in',
      targetScope: 'system',
      durationSec: 0.9,
    });
    cleanup?.();
    expect(saveCurrentGalaxyPose).not.toHaveBeenCalled();
  });

  it('dispatches pending search frame and settles store and callbacks on completion', () => {
    const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 1000);
    camera.position.set(0, -10, 5);
    const controls = { target: new THREE.Vector3(0, 0, 0) };
    const saveCurrentGalaxyPose = vi.fn();
    const invalidate = vi.fn();
    const onSettled = vi.fn();
    const prevTargetRef = { current: [0, 0, 0] as [number, number, number] };
    const prevDistanceRef = { current: 10 };
    const transitionTo = vi.fn(
      (_target: THREE.Vector3 | [number, number, number], opts?: { onComplete?: () => void }) => {
        controls.target.set(8, 9, 10);
        opts?.onComplete?.();
      },
    );

    dispatchPendingSearchFrame({
      request: { target: [8, 9, 10], distance: 25, tick: 1 },
      camera,
      controls,
      transitionTo,
      saveCurrentGalaxyPose,
      invalidate,
      onSettled,
      prevTargetRef,
      prevDistanceRef,
    });

    expect(prevTargetRef.current).toEqual([8, 9, 10]);
    expect(prevDistanceRef.current).toBe(25);
    expect(onSettled).toHaveBeenCalledTimes(1);
    expect(saveCurrentGalaxyPose).toHaveBeenCalledWith(true);
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(useCameraStore.getState().target).toEqual([8, 9, 10]);
  });
});
