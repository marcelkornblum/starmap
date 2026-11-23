import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { useUIStore } from '../../../stores/useUIStore';
import {
  DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG,
  computeCrossScaleDepartureFade,
  computeCrossScaleSceneScale,
  computeCrossScaleStageDurations,
  computePlanePreviewMaxRadius,
  getReferenceFrameRadius,
  resolveTargetReferencePlane,
} from '../../../utils/referenceFrameOrientation';
import { createSpatialEntityStore } from '../../canvas/entity/SpatialEntityStore';
import {
  clearPendingCrossScaleArrival,
  consumePendingCrossScaleArrival,
} from '../../canvas/instrument/crossScaleArrivalState';
import {
  getCrossScaleInstrumentFade,
  resetCrossScaleInstrumentFade,
} from '../../canvas/instrument/crossScaleFadeState';
import {
  clearCrossScalePlanePreview,
  getCrossScalePlanePreviewState,
  getCrossScaleSceneScale,
  resetCrossScaleSceneScale,
  stepCrossScalePlanePreview,
} from '../../canvas/instrument/crossScaleVisualState';
import type {
  CameraTransitionOptions,
  CameraTransitionPose,
} from '../../canvas/instrument/cameraTransitionPoseMath';
import { launchCrossScaleDeparture } from './crossScaleChoreography';

describe('crossScaleChoreography', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearPendingCrossScaleArrival();
    resetCrossScaleInstrumentFade();
    clearCrossScalePlanePreview();
    resetCrossScaleSceneScale();
    useUIStore.getState().resetUI();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearPendingCrossScaleArrival();
    resetCrossScaleInstrumentFade();
    clearCrossScalePlanePreview();
    resetCrossScaleSceneScale();
  });

  it('runs Beat 1 preview expand with computePlanePreviewMaxRadius, Beat 2 transitionToPose with settleControlsOnComplete=false, and commits zoom-in swap', async () => {
    const config = DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG;
    const durations = computeCrossScaleStageDurations(config);
    const outerStore = createSpatialEntityStore();
    outerStore.getState().registerEntity({
      id: 'target-star',
      name: 'Target Star',
      position: [2, 3, -1],
    });

    const activeCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    activeCamera.position.set(0, -30, 18);

    const transitionToPose = vi.fn<
      (pose: CameraTransitionPose, options?: CameraTransitionOptions) => void
    >();
    const onBeforeSwap = vi.fn();
    const onCommitFinal = vi.fn();
    const onAbortAndCommit = vi.fn();
    const detachBeat1Listener = vi.fn();
    const setBeat1Cleanup = vi.fn();
    const invalidate = vi.fn();

    launchCrossScaleDeparture({
      committedScope: 'galaxy',
      committedCenterCoordinates: [0, 0, 0],
      requestedScope: 'system',
      requestedTargetId: 'target-star',
      activeCamera,
      outerStore,
      preloadPromise: Promise.resolve(),
      transitionToPose,
      invalidate,
      isTokenCurrent: () => true,
      detachBeat1Listener,
      setBeat1Cleanup,
      resolveFinalScope: () => 'system',
      onBeforeSwap,
      onCommitFinal,
      onAbortAndCommit,
    });

    await Promise.resolve();

    const currentDist = Math.hypot(0 - 2, -30 - 3, 18 + 1);
    const previewState = getCrossScalePlanePreviewState();
    expect(previewState.active).toBe(true);
    expect(previewState.mode).toBe('expanding');
    expect(previewState.position).toEqual([2, 3, -1]);
    expect(previewState.maxRadius).toBeCloseTo(
      computePlanePreviewMaxRadius(currentDist, config),
      6,
    );
    expect(useUIStore.getState().isCameraTransitioning).toBe(true);

    for (let elapsed = 0; elapsed <= durations.previewSec + 0.05; elapsed += 0.05) {
      stepCrossScalePlanePreview(0.05);
    }
    expect(detachBeat1Listener).toHaveBeenCalledTimes(1);
    expect(transitionToPose).toHaveBeenCalledTimes(1);

    const [pose, options] = transitionToPose.mock.calls[0];
    const plane = resolveTargetReferencePlane('galaxy', 'system');
    expect(pose.target).toEqual([2, 3, -1]);
    expect(pose.frameTiltRad).toBeCloseTo(plane.inclinationRad, 6);
    expect(options?.settleControlsOnComplete).toBe(false);
    expect(options?.isReadyToComplete?.()).toBe(true);

    options?.onProgress?.(0.5);
    expect(getCrossScaleInstrumentFade()).toBeCloseTo(
      computeCrossScaleDepartureFade(0.5, config),
      6,
    );

    options?.onComplete?.();
    expect(onBeforeSwap).toHaveBeenCalledTimes(1);
    expect(onCommitFinal).toHaveBeenCalledWith(config.minSceneScale);
    expect(getCrossScaleInstrumentFade()).toBe(0);

    const handoffPreview = getCrossScalePlanePreviewState();
    expect(handoffPreview.mode).toBe('holding');
    expect(handoffPreview.maxRadius).toBeCloseTo(
      getReferenceFrameRadius('system') * config.minSceneScale,
      6,
    );
    expect(consumePendingCrossScaleArrival('system')).toEqual({
      direction: 'in',
      targetScope: 'system',
      durationSec: durations.arrivalSec,
      frameTiltRad: plane.inclinationRad,
      tiltAxis: plane.tiltAxis,
      config,
    });
  });

  it('shrinks sceneScale and passes settleControlsOnComplete=false on zoom-out departure', async () => {
    const config = DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG;
    const durations = computeCrossScaleStageDurations(config);
    const activeCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    activeCamera.position.set(0, -10, 6);

    const transitionToPose = vi.fn<
      (pose: CameraTransitionPose, options?: CameraTransitionOptions) => void
    >();
    const onBeforeSwap = vi.fn();
    const onCommitFinal = vi.fn();

    launchCrossScaleDeparture({
      committedScope: 'system',
      committedTargetId: 'target-star',
      requestedScope: 'galaxy',
      activeCamera,
      outerStore: null,
      preloadPromise: Promise.resolve(),
      transitionToPose,
      isTokenCurrent: () => true,
      detachBeat1Listener: vi.fn(),
      setBeat1Cleanup: vi.fn(),
      resolveFinalScope: () => 'galaxy',
      onBeforeSwap,
      onCommitFinal,
      onAbortAndCommit: vi.fn(),
    });

    await Promise.resolve();

    expect(transitionToPose).toHaveBeenCalledTimes(1);
    const [, options] = transitionToPose.mock.calls[0];
    expect(options?.settleControlsOnComplete).toBe(false);

    options?.onProgress?.(0.5);
    expect(getCrossScaleSceneScale()).toBeCloseTo(
      computeCrossScaleSceneScale(0.5, 'out', config.minSceneScale),
      6,
    );
    expect(getCrossScaleInstrumentFade()).toBeCloseTo(
      computeCrossScaleDepartureFade(0.5, config),
      6,
    );

    options?.onComplete?.();
    expect(onBeforeSwap).toHaveBeenCalledTimes(1);
    expect(onCommitFinal).toHaveBeenCalledWith(1);
    const plane = resolveTargetReferencePlane('system', 'galaxy');
    expect(consumePendingCrossScaleArrival('galaxy')).toEqual({
      direction: 'out',
      targetScope: 'galaxy',
      durationSec: durations.arrivalSec,
      frameTiltRad: plane.inclinationRad,
      tiltAxis: plane.tiltAxis,
      planePreviewTargetId: 'target-star',
      planePreviewInclinationRad: Math.abs(plane.inclinationRad),
      planePreviewAscendingNodeRad: plane.ascendingNodeRad,
      config,
    });
  });

  it('holds isReadyToComplete false while preload is pending until preloadMaxHoldSec elapses', () => {
    const config = DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG;
    const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(1000);
    const activeCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    activeCamera.position.set(0, -10, 6);

    const transitionToPose = vi.fn<
      (pose: CameraTransitionPose, options?: CameraTransitionOptions) => void
    >();

    launchCrossScaleDeparture({
      committedScope: 'system',
      committedTargetId: 'target-star',
      requestedScope: 'galaxy',
      activeCamera,
      outerStore: null,
      preloadPromise: new Promise(() => {}),
      transitionToPose,
      isTokenCurrent: () => true,
      detachBeat1Listener: vi.fn(),
      setBeat1Cleanup: vi.fn(),
      resolveFinalScope: () => 'galaxy',
      onBeforeSwap: vi.fn(),
      onCommitFinal: vi.fn(),
      onAbortAndCommit: vi.fn(),
    });

    const [, options] = transitionToPose.mock.calls[0];
    expect(options?.isReadyToComplete?.()).toBe(false);

    nowSpy.mockReturnValue(1000 + (config.preloadMaxHoldSec - 0.1) * 1000);
    expect(options?.isReadyToComplete?.()).toBe(false);

    nowSpy.mockReturnValue(1000 + config.preloadMaxHoldSec * 1000);
    expect(options?.isReadyToComplete?.()).toBe(true);
  });
});
