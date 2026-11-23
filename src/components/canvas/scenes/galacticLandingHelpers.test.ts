import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import { GALACTIC_FRAME } from '../../../config/referenceFrames';
import { useCameraStore, type SavedGalaxyCameraPose } from '../../../stores/useCameraStore';
import { STANDARD_CAMERA_DISTANCES } from '../cartography';
import {
  applyDefaultInitialGalacticPose,
  resolveGalacticLandingPose,
  tryRestoreSavedGalaxyPose,
} from './galacticLandingHelpers';

describe('galacticLandingHelpers', () => {
  beforeEach(() => {
    useCameraStore.getState().reset();
  });

  it('resolves landing pose from pendingSearchFrame and clears the search frame', () => {
    useCameraStore.getState().requestSearchFrame([6, -4, 2], 40);

    const landing = resolveGalacticLandingPose(null, 0, 0, 0, undefined, false);

    expect(landing.target).toEqual([6, -4, 2]);
    expect(landing.fov).toBe(GALACTIC_FRAME.camera.baseFov);
    expect(landing.isTransientZero).toBe(false);
    expect(useCameraStore.getState().pendingSearchFrame).toBeNull();
    const dist = Math.hypot(
      landing.position[0] - 6,
      landing.position[1] + 4,
      landing.position[2] - 2,
    );
    expect(dist).toBeCloseTo(40, 4);
  });

  it('resolves landing pose from savedGalaxyCamera on target match or transient zero when distance is omitted', () => {
    const saved: SavedGalaxyCameraPose = {
      position: [10, -25, 15],
      target: [10, 5, 0],
      up: [0, 0, 1],
      zoom: 1.4,
      focalDistance: 30,
      centerKey: '10,5,0',
    };

    const matched = resolveGalacticLandingPose(saved, 10.01, 5, 0, undefined, true);
    expect(matched.position).toEqual(saved.position);
    expect(matched.zoom).toBe(1.4);
    expect(matched.isTransientZero).toBe(false);

    const transientZero = resolveGalacticLandingPose(saved, 0, 0, 0, undefined, false);
    expect(transientZero.target).toEqual(saved.target);
    expect(transientZero.isTransientZero).toBe(true);

    const explicitZero = resolveGalacticLandingPose(saved, 0, 0, 0, undefined, true);
    expect(explicitZero.target).toEqual([0, 0, 0]);
    expect(explicitZero.isTransientZero).toBe(false);
  });

  it('falls back to explicit or standard galactic distance when no saved pose matches', () => {
    const customDist = resolveGalacticLandingPose(null, 1, 2, 3, 50, true);
    expect(
      Math.hypot(
        customDist.position[0] - 1,
        customDist.position[1] - 2,
        customDist.position[2] - 3,
      ),
    ).toBeCloseTo(50, 4);

    const defaultDist = resolveGalacticLandingPose(null, 0, 0, 0, -5, true);
    expect(
      Math.hypot(
        defaultDist.position[0],
        defaultDist.position[1],
        defaultDist.position[2],
      ),
    ).toBeCloseTo(STANDARD_CAMERA_DISTANCES.galactic, 4);
  });

  it('restores saved galaxy pose immediately only when matching or transient zero', () => {
    const camera = new THREE.PerspectiveCamera(35, 16 / 9, 0.1, 1000);
    const controls = { target: new THREE.Vector3(), update: vi.fn() };
    const saveCurrentGalaxyPose = vi.fn();
    const saved: SavedGalaxyCameraPose = {
      position: [5, -20, 10],
      target: [5, 0, 0],
      up: [0, 0, 1],
      zoom: 1.2,
      focalDistance: 25,
      centerKey: '5,0,0',
    };

    const mismatch = tryRestoreSavedGalaxyPose({
      camera,
      controls,
      saved,
      targetX: 20,
      targetY: 0,
      targetZ: 0,
      hasExplicitCenter: true,
      saveCurrentGalaxyPose,
    });
    expect(mismatch).toBeNull();

    const transient = tryRestoreSavedGalaxyPose({
      camera,
      controls,
      saved,
      targetX: 0,
      targetY: 0,
      targetZ: 0,
      hasExplicitCenter: false,
      saveCurrentGalaxyPose,
    });
    expect(transient).toEqual({
      appliedControls: true,
      resolvedTarget: [5, 0, 0],
    });
    expect(camera.fov).toBe(GALACTIC_FRAME.camera.baseFov);
    expect(saveCurrentGalaxyPose).not.toHaveBeenCalled();

    const matched = tryRestoreSavedGalaxyPose({
      camera,
      controls,
      saved,
      targetX: 5,
      targetY: 0,
      targetZ: 0,
      hasExplicitCenter: true,
      saveCurrentGalaxyPose,
    });
    expect(matched).toEqual({
      appliedControls: true,
      resolvedTarget: [5, 0, 0],
    });
    expect(saveCurrentGalaxyPose).toHaveBeenCalledWith(true);
  });

  it('applies default initial galactic pose and persists when controls are present', () => {
    const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 1000);
    const controls = { target: new THREE.Vector3(), update: vi.fn() };
    const saveCurrentGalaxyPose = vi.fn();

    const applied = applyDefaultInitialGalacticPose({
      camera,
      controls,
      targetX: 2,
      targetY: 3,
      targetZ: 4,
      distance: 30,
      saveCurrentGalaxyPose,
    });

    expect(applied).toBe(true);
    expect(camera.fov).toBe(GALACTIC_FRAME.camera.baseFov);
    expect(controls.target.toArray()).toEqual([2, 3, 4]);
    expect(useCameraStore.getState().target).toEqual([2, 3, 4]);
    expect(useCameraStore.getState().focalDistance).toBeCloseTo(30, 4);
    expect(saveCurrentGalaxyPose).toHaveBeenCalledWith(true);
  });
});
