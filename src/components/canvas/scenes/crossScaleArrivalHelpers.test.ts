import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import {
  DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG,
  computeCrossScaleArrivalFade,
  computeCrossScalePreviewHandoffOpacity,
  computeCrossScaleSceneScale,
  computeCrossScaleStageDurations,
  computePlanePreviewMaxRadius,
  getReferenceFrameRadius,
  type CrossScaleChoreographyConfig,
} from '../../../utils/referenceFrameOrientation';
import { createSpatialEntityStore } from '../entity/SpatialEntityStore';
import { computeTiltedArrivalEntryPose } from '../instrument/crossScaleArrivalState';
import {
  getCrossScaleInstrumentFade,
  resetCrossScaleInstrumentFade,
} from '../instrument/crossScaleFadeState';
import {
  clearCrossScalePlanePreview,
  getCrossScalePlanePreviewState,
  getCrossScaleSceneScale,
  resetCrossScaleSceneScale,
  setCrossScalePlanePreview,
} from '../instrument/crossScaleVisualState';
import type { CameraTransitionOptions, CameraTransitionPose } from '../instrument/useCameraTransition';
import { startCrossScaleArrivalGlide } from './crossScaleArrivalHelpers';

interface RecordedTransitionCall {
  readonly pose: CameraTransitionPose;
  readonly options?: CameraTransitionOptions;
}

describe('crossScaleArrivalHelpers', () => {
  let camera: THREE.PerspectiveCamera;
  let controls: { target: THREE.Vector3; update: ReturnType<typeof vi.fn<() => void>> };
  let invalidate: ReturnType<typeof vi.fn<() => void>>;
  let recordedCalls: RecordedTransitionCall[];

  const createTransitionToPose = () => {
    return (pose: CameraTransitionPose, options?: CameraTransitionOptions) => {
      recordedCalls.push({ pose, options });
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    recordedCalls = [];
    resetCrossScaleInstrumentFade();
    clearCrossScalePlanePreview();
    resetCrossScaleSceneScale();
    camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 1000);
    controls = {
      target: new THREE.Vector3(),
      update: vi.fn<() => void>(),
    };
    invalidate = vi.fn<() => void>();
  });

  afterEach(() => {
    resetCrossScaleInstrumentFade();
    clearCrossScalePlanePreview();
    resetCrossScaleSceneScale();
  });

  it('orchestrates zoom-in arrival glide with sceneScale progression, instrumentFade, preview handoff, and onComplete cleanup', () => {
    const config = DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG;
    const onComplete = vi.fn();
    const landingPosition: [number, number, number] = [0, -20, 10];
    const landingTarget: [number, number, number] = [1, 2, 3];
    const landingUp: [number, number, number] = [0, 0, 1];

    setCrossScalePlanePreview({
      position: [1, 2, 3],
      inclinationRad: 0.5,
      ascendingNodeRad: 0.2,
      maxRadius: getReferenceFrameRadius('system') * config.minSceneScale,
      radiusProgress: 1,
      opacity: 1,
      mode: 'holding',
    });

    startCrossScaleArrivalGlide({
      camera,
      controls,
      landingPosition,
      landingTarget,
      landingUp,
      landingZoom: 1,
      landingFov: 35,
      arrival: {
        direction: 'in',
        targetScope: 'system',
        durationSec: 0.9,
        config,
      },
      transitionToPose: createTransitionToPose(),
      invalidate,
      onComplete,
    });

    const expectedEntry = computeTiltedArrivalEntryPose(
      landingPosition,
      landingTarget,
      landingUp,
      'in',
      0,
      undefined,
      config,
    );
    expect(camera.position.x).toBeCloseTo(expectedEntry.position[0], 5);
    expect(camera.position.y).toBeCloseTo(expectedEntry.position[1], 5);
    expect(camera.position.z).toBeCloseTo(expectedEntry.position[2], 5);
    expect(camera.fov).toBe(35);
    expect(getCrossScaleInstrumentFade()).toBe(0);
    expect(getCrossScaleSceneScale()).toBeCloseTo(config.minSceneScale, 6);
    expect(recordedCalls).toHaveLength(1);

    const call = recordedCalls[0]!;
    expect(call.pose.position).toEqual(landingPosition);
    expect(call.pose.target).toEqual(landingTarget);
    expect(call.pose.up).toEqual(landingUp);
    expect(call.pose.fov).toBe(35);
    expect(call.options?.duration).toBe(0.9);

    call.options?.onProgress?.(0.4);
    const expectedScale = computeCrossScaleSceneScale(0.4, 'in', config.minSceneScale);
    expect(getCrossScaleSceneScale()).toBeCloseTo(expectedScale, 5);
    expect(getCrossScaleInstrumentFade()).toBeCloseTo(
      computeCrossScaleArrivalFade(0.4, config),
      5,
    );
    expect(getCrossScalePlanePreviewState().maxRadius).toBeCloseTo(
      getReferenceFrameRadius('system') * expectedScale,
      5,
    );
    expect(getCrossScalePlanePreviewState().opacity).toBeCloseTo(
      computeCrossScalePreviewHandoffOpacity(0.4, config),
      5,
    );

    call.options?.onComplete?.();
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(getCrossScalePlanePreviewState().active).toBe(false);
    expect(getCrossScaleSceneScale()).toBe(1);
    expect(getCrossScaleInstrumentFade()).toBe(1);
  });

  it('resets sceneScale, instrumentFade, and plane preview when zoom-in glide is cancelled', () => {
    const config = DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG;
    const onCancel = vi.fn();

    setCrossScalePlanePreview({
      position: [0, 0, 0],
      inclinationRad: 0.4,
      ascendingNodeRad: 0,
      maxRadius: 1,
      radiusProgress: 1,
      opacity: 1,
      mode: 'holding',
    });

    startCrossScaleArrivalGlide({
      camera,
      controls,
      landingPosition: [0, -20, 10],
      landingTarget: [0, 0, 0],
      landingUp: [0, 0, 1],
      landingZoom: 1,
      arrival: {
        direction: 'in',
        targetScope: 'system',
        durationSec: 0.9,
        config,
      },
      transitionToPose: createTransitionToPose(),
      invalidate,
      onComplete: vi.fn(),
      onCancel,
    });

    const call = recordedCalls[0]!;
    call.options?.onProgress?.(0.5);
    expect(getCrossScaleSceneScale()).toBeGreaterThan(config.minSceneScale);
    expect(getCrossScaleInstrumentFade()).toBeGreaterThan(0);

    call.options?.onCancel?.();
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(getCrossScalePlanePreviewState().active).toBe(false);
    expect(getCrossScaleSceneScale()).toBe(1);
    expect(getCrossScaleInstrumentFade()).toBe(1);
  });

  it('orchestrates zoom-out arrival glide using computePlanePreviewMaxRadius, outerStore target lookup, and contraction on complete', () => {
    const customConfig: CrossScaleChoreographyConfig = {
      ...DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG,
      previewRadiusFactor: 0.25,
      minPreviewRadius: 2.5,
    };
    const durations = computeCrossScaleStageDurations(customConfig);
    const outerStore = createSpatialEntityStore();
    outerStore.getState().registerEntity({
      id: 'sol',
      name: 'Sol',
      position: [4, -2, 1],
      classification: 'star',
    });
    const onComplete = vi.fn();
    const landingPosition: [number, number, number] = [0, -4, 3];
    const landingTarget: [number, number, number] = [0, 0, 0];
    const landingDist = Math.hypot(0, -4, 3);

    startCrossScaleArrivalGlide({
      camera,
      controls,
      landingPosition,
      landingTarget,
      landingUp: [0, 0, 1],
      landingZoom: 1,
      landingFov: 45,
      arrival: {
        direction: 'out',
        targetScope: 'galaxy',
        durationSec: durations.arrivalSec,
        frameTiltRad: -Math.PI / 3,
        tiltAxis: [1, 0, 0],
        planePreviewTargetId: 'sol',
        planePreviewInclinationRad: Math.PI / 3,
        planePreviewAscendingNodeRad: 0.3,
        config: customConfig,
      },
      outerStore,
      transitionToPose: createTransitionToPose(),
      invalidate,
      onComplete,
    });

    const preview = getCrossScalePlanePreviewState();
    expect(preview.active).toBe(true);
    expect(preview.mode).toBe('holding');
    expect(preview.position).toEqual([4, -2, 1]);
    expect(preview.maxRadius).toBeCloseTo(
      computePlanePreviewMaxRadius(landingDist, customConfig),
      6,
    );
    expect(getCrossScaleSceneScale()).toBe(1);
    expect(getCrossScaleInstrumentFade()).toBe(0);

    const call = recordedCalls[0]!;
    expect(call.options?.translationWindow).toEqual(customConfig.zoomOutMoveWindow);
    expect(call.options?.orientationWindow).toEqual(customConfig.zoomOutTiltWindow);

    call.options?.onProgress?.(0.5);
    expect(getCrossScaleInstrumentFade()).toBeCloseTo(
      computeCrossScaleArrivalFade(0.5, customConfig),
      5,
    );

    call.options?.onComplete?.();
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(getCrossScaleInstrumentFade()).toBe(1);
    expect(getCrossScalePlanePreviewState().mode).toBe('contracting');
    expect(getCrossScalePlanePreviewState().durationSec).toBeCloseTo(durations.previewSec, 6);
  });

  it('clears preview and resets fade when zoom-out glide is cancelled', () => {
    const onCancel = vi.fn();

    startCrossScaleArrivalGlide({
      camera,
      controls,
      landingPosition: [0, -35, 20],
      landingTarget: [0, 0, 0],
      landingUp: [0, 0, 1],
      landingZoom: 1,
      arrival: {
        direction: 'out',
        targetScope: 'galaxy',
        durationSec: 1.0,
        frameTiltRad: -Math.PI / 3,
        tiltAxis: [1, 0, 0],
        planePreviewInclinationRad: Math.PI / 3,
      },
      transitionToPose: createTransitionToPose(),
      invalidate,
      onComplete: vi.fn(),
      onCancel,
    });

    expect(getCrossScalePlanePreviewState().active).toBe(true);
    const call = recordedCalls[0]!;
    call.options?.onCancel?.();

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(getCrossScalePlanePreviewState().active).toBe(false);
    expect(getCrossScaleInstrumentFade()).toBe(1);
  });
});
