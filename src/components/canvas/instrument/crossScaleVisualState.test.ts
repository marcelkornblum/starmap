import { describe, it, expect, beforeEach, vi } from 'vitest';
import { easeOutCubic } from '../../../utils/cameraEasing';
import {
  clearCrossScalePlanePreview,
  getCrossScalePlanePreviewState,
  getCrossScaleSceneScale,
  resetCrossScaleSceneScale,
  setCrossScalePlanePreview,
  setCrossScalePlanePreviewRadius,
  setCrossScaleSceneScale,
  startCrossScalePlanePreviewContract,
  startCrossScalePlanePreviewExpand,
  stepCrossScalePlanePreview,
  updateCrossScalePlanePreviewProgress,
} from './crossScaleVisualState';

describe('crossScaleVisualState', () => {
  beforeEach(() => {
    resetCrossScaleSceneScale();
    clearCrossScalePlanePreview();
  });

  it('defaults scene scale to 1 and clamps values to [0.001, 1]', () => {
    expect(getCrossScaleSceneScale()).toBe(1);

    setCrossScaleSceneScale(0.25);
    expect(getCrossScaleSceneScale()).toBe(0.25);

    setCrossScaleSceneScale(0);
    expect(getCrossScaleSceneScale()).toBe(0.001);

    setCrossScaleSceneScale(-5);
    expect(getCrossScaleSceneScale()).toBe(0.001);

    setCrossScaleSceneScale(4);
    expect(getCrossScaleSceneScale()).toBe(1);

    setCrossScaleSceneScale(Number.NaN);
    expect(getCrossScaleSceneScale()).toBe(1);

    setCrossScaleSceneScale(0.1);
    resetCrossScaleSceneScale();
    expect(getCrossScaleSceneScale()).toBe(1);
  });

  it('manages the zero-allocation plane preview singleton in-place', () => {
    const refBefore = getCrossScalePlanePreviewState();
    const posRefBefore = refBefore.position;

    expect(refBefore.active).toBe(false);
    expect(refBefore.position).toEqual([0, 0, 0]);
    expect(refBefore.opacity).toBe(0);

    setCrossScalePlanePreview({
      position: [12, -3, 4],
      inclinationRad: 1.05,
      ascendingNodeRad: 0.5,
      maxRadius: 8,
      radiusProgress: 0.2,
      opacity: 0.9,
    });

    const refAfter = getCrossScalePlanePreviewState();
    expect(refAfter).toBe(refBefore);
    expect(refAfter.position).toBe(posRefBefore);
    expect(refAfter.active).toBe(true);
    expect(refAfter.position).toEqual([12, -3, 4]);
    expect(refAfter.inclinationRad).toBeCloseTo(1.05, 8);
    expect(refAfter.ascendingNodeRad).toBeCloseTo(0.5, 8);
    expect(refAfter.maxRadius).toBe(8);
    expect(refAfter.radiusProgress).toBeCloseTo(0.2, 8);
    expect(refAfter.opacity).toBeCloseTo(0.9, 8);

    updateCrossScalePlanePreviewProgress(1.4, -0.2);
    expect(refAfter.radiusProgress).toBe(1);
    expect(refAfter.opacity).toBe(0);

    updateCrossScalePlanePreviewProgress(0.6, 0.75);
    expect(refAfter.radiusProgress).toBeCloseTo(0.6, 8);
    expect(refAfter.opacity).toBeCloseTo(0.75, 8);

    setCrossScalePlanePreviewRadius(14.5);
    expect(refAfter.maxRadius).toBe(14.5);
    setCrossScalePlanePreviewRadius(-2);
    expect(refAfter.maxRadius).toBe(0.001);
    setCrossScalePlanePreviewRadius(Number.NaN);
    expect(refAfter.maxRadius).toBe(0.001);
    expect(getCrossScalePlanePreviewState()).toBe(refBefore);

    clearCrossScalePlanePreview();
    expect(refAfter).toBe(refBefore);
    expect(refAfter.active).toBe(false);
    expect(refAfter.mode).toBe('idle');
    expect(refAfter.durationSec).toBe(0);
    expect(refAfter.elapsedSec).toBe(0);
    expect(refAfter.position).toEqual([0, 0, 0]);
    expect(refAfter.radiusProgress).toBe(0);
    expect(refAfter.opacity).toBe(0);
  });

  it('animates self-driven expand to holding with onComplete, and contract to clear', () => {
    const onComplete = vi.fn();
    const state = getCrossScalePlanePreviewState();

    // Contract is a no-op when inactive
    startCrossScalePlanePreviewContract(0.4);
    expect(state.active).toBe(false);
    expect(state.mode).toBe('idle');
    expect(stepCrossScalePlanePreview(0.016)).toBe(false);

    startCrossScalePlanePreviewExpand({
      position: [1, 2, 3],
      inclinationRad: 0.75,
      ascendingNodeRad: 0.25,
      maxRadius: 10,
      durationSec: 0.2,
      onComplete,
    });

    expect(state.active).toBe(true);
    expect(state.mode).toBe('expanding');
    expect(state.durationSec).toBe(0.2);
    expect(state.elapsedSec).toBe(0);
    expect(state.radiusProgress).toBe(0);
    expect(state.opacity).toBe(1);

    // dt is clamped to 0.05
    expect(stepCrossScalePlanePreview(0.1)).toBe(true);
    expect(state.elapsedSec).toBeCloseTo(0.05, 8);
    expect(state.radiusProgress).toBeCloseTo(0.25, 8);
    expect(onComplete).not.toHaveBeenCalled();

    expect(stepCrossScalePlanePreview(0.05)).toBe(true);
    expect(stepCrossScalePlanePreview(0.05)).toBe(true);
    expect(state.elapsedSec).toBeCloseTo(0.15, 8);
    expect(state.radiusProgress).toBeCloseTo(0.75, 8);
    expect(onComplete).not.toHaveBeenCalled();

    // Completes expand -> switches to holding, invokes and clears callback
    expect(stepCrossScalePlanePreview(0.05)).toBe(true);
    expect(state.mode).toBe('holding');
    expect(state.radiusProgress).toBe(1);
    expect(state.opacity).toBe(1);
    expect(state.onPhaseComplete).toBeUndefined();
    expect(onComplete).toHaveBeenCalledTimes(1);

    // Holding does not request further invalidation
    expect(stepCrossScalePlanePreview(0.016)).toBe(false);
    expect(onComplete).toHaveBeenCalledTimes(1);

    // Contract from active holding state
    startCrossScalePlanePreviewContract(0.1);
    expect(state.active).toBe(true);
    expect(state.mode).toBe('contracting');
    expect(state.elapsedSec).toBe(0);
    expect(state.durationSec).toBe(0.1);

    expect(stepCrossScalePlanePreview(0.05)).toBe(true);
    expect(state.radiusProgress).toBe(1);
    expect(state.opacity).toBeCloseTo(1 - easeOutCubic(0.5), 8);
    expect(state.active).toBe(true);

    // Completes contract -> clears state
    expect(stepCrossScalePlanePreview(0.05)).toBe(true);
    expect(state.active).toBe(false);
    expect(state.mode).toBe('idle');
    expect(state.radiusProgress).toBe(0);
    expect(state.opacity).toBe(0);
  });
});
