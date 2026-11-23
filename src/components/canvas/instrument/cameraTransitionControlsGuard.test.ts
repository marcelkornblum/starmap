import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { createControlsFlightGuard } from './cameraTransitionControlsGuard';
import type { TransitionControlsLike } from './cameraTransitionPoseMath';

describe('cameraTransitionControlsGuard', () => {
  it('pauses damping, suppresses controls.update() while transitioning, and restores on settle', () => {
    let transitioning = false;
    const guard = createControlsFlightGuard(() => transitioning);
    const rawUpdate = vi.fn<() => void>();
    const controls: TransitionControlsLike = {
      target: new THREE.Vector3(),
      enableDamping: true,
      update: rawUpdate,
    };

    guard.pauseForFlight(controls);
    expect(controls.enableDamping).toBe(false);
    controls.update?.();
    expect(rawUpdate).toHaveBeenCalledTimes(1);

    transitioning = true;
    controls.update?.();
    expect(rawUpdate).toHaveBeenCalledTimes(1);

    transitioning = false;
    guard.restoreAndSettle(undefined, true);
    expect(controls.update).toBe(rawUpdate);
    expect(controls.enableDamping).toBe(true);
    expect(rawUpdate).toHaveBeenCalledTimes(2);
    expect(guard.getActiveControls()).toBeUndefined();
  });

  it('restores previous controls cleanly when active controls instance swaps mid-flight', () => {
    let transitioning = true;
    const guard = createControlsFlightGuard(() => transitioning);
    const updateA = vi.fn<() => void>();
    const updateB = vi.fn<() => void>();
    const controlsA: TransitionControlsLike = {
      target: new THREE.Vector3(),
      enableDamping: true,
      update: updateA,
    };
    const controlsB: TransitionControlsLike = {
      target: new THREE.Vector3(),
      enableDamping: true,
      update: updateB,
    };

    guard.pauseForFlight(controlsA);
    guard.syncActiveControls(controlsB);

    expect(controlsA.enableDamping).toBe(true);
    expect(controlsA.update).toBe(updateA);
    expect(controlsB.enableDamping).toBe(false);
    expect(guard.getActiveControls()).toBe(controlsB);

    controlsB.update?.();
    expect(updateB).not.toHaveBeenCalled();

    transitioning = false;
    guard.restoreAndSettle(controlsB, false);
    expect(controlsB.update).toBe(updateB);
    expect(controlsB.enableDamping).toBe(true);
    expect(updateB).not.toHaveBeenCalled();
  });
});
