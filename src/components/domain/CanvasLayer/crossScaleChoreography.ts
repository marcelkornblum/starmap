import type * as THREE from 'three';
import { useUIStore } from '../../../stores/useUIStore';
import { easeInQuad } from '../../../utils/cameraEasing';
import {
  DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG,
  computeCrossScaleDepartureFade,
  computeCrossScaleSceneScale,
  computeCrossScaleStageDurations,
  getReferenceFrameRadius,
  getScaleRank,
  resolveTargetReferencePlane,
  type SpatialScale,
} from '../../../utils/referenceFrameOrientation';
import type { SpatialEntityStore } from '../../canvas/entity/SpatialEntityStore';
import { setPendingCrossScaleArrival } from '../../canvas/instrument/crossScaleArrivalState';
import { setCrossScaleInstrumentFade } from '../../canvas/instrument/crossScaleFadeState';
import {
  resetCrossScaleSceneScale,
  setCrossScalePlanePreview,
  setCrossScaleSceneScale,
  startCrossScalePlanePreviewExpand,
} from '../../canvas/instrument/crossScaleVisualState';
import type { CameraTransitionApi } from '../../canvas/instrument/useCameraTransition';
import type { OrbitControlsLike } from '../../canvas/scenes/cameraControllerUtils';
import {
  resolveDepartureTarget,
  resolveTargetPlaneMetadata,
} from './crossScaleStageHelpers';

export interface LaunchCrossScaleDepartureParams {
  readonly committedScope: SpatialScale;
  readonly committedTargetId?: string;
  readonly committedCenterCoordinates?: readonly [number, number, number];
  readonly requestedScope: SpatialScale;
  readonly requestedTargetId?: string;
  readonly activeCamera: THREE.Camera;
  readonly activeControls?: OrbitControlsLike;
  readonly outerStore: SpatialEntityStore | null;
  readonly preloadPromise: Promise<unknown>;
  readonly transitionToPose: CameraTransitionApi['transitionToPose'];
  readonly invalidate?: () => void;
  readonly isTokenCurrent: () => boolean;
  readonly detachBeat1Listener: () => void;
  readonly setBeat1Cleanup: (cleanup: (() => void) | null) => void;
  readonly resolveFinalScope: () => SpatialScale;
  readonly onBeforeSwap: () => void;
  readonly onCommitFinal: () => void;
  readonly onAbortAndCommit: () => void;
  readonly isTargetPropsReady?: () => boolean;
  readonly scheduleReadySwap?: (commitSwap: () => void) => void;
}

const MS_PER_SECOND = 1000;

/**
 * Launches symmetrical Stage 1 cross-scale choreography (3-beat zoom-in with preview disc expand
 * + tilted approach, or reverse zoom-out with scene shrink and no tilt until arrival).
 */
export function launchCrossScaleDeparture(params: LaunchCrossScaleDepartureParams): void {
  const {
    committedScope,
    committedTargetId,
    committedCenterCoordinates,
    requestedScope,
    requestedTargetId,
    activeCamera,
    activeControls,
    outerStore,
    preloadPromise,
    transitionToPose,
    invalidate,
    isTokenCurrent,
    detachBeat1Listener,
    setBeat1Cleanup,
    resolveFinalScope,
    onBeforeSwap,
    onCommitFinal,
    onAbortAndCommit,
    isTargetPropsReady,
    scheduleReadySwap,
  } = params;

  let preloadDone = false;
  let holdStartedAt: number | null = null;
  const markPreloadDone = () => {
    preloadDone = true;
    invalidate?.();
  };
  void preloadPromise.then(markPreloadDone, markPreloadDone);

  const config = DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG;
  const durations = computeCrossScaleStageDurations(config);
  const direction: 'in' | 'out' =
    getScaleRank(requestedScope) > getScaleRank(committedScope) ? 'in' : 'out';
  const metadataTargetId = direction === 'in' ? requestedTargetId : committedTargetId;
  const plane = resolveTargetReferencePlane(
    committedScope,
    requestedScope,
    resolveTargetPlaneMetadata(outerStore, metadataTargetId),
  );
  const departureTarget = resolveDepartureTarget(
    direction,
    outerStore,
    requestedTargetId,
    committedCenterCoordinates,
    activeControls,
  );
  const currentDist = Math.hypot(
    activeCamera.position.x - departureTarget[0],
    activeCamera.position.y - departureTarget[1],
    activeCamera.position.z - departureTarget[2],
  );
  const targetDistance =
    direction === 'in'
      ? Math.max(0.8, currentDist * config.departureInDistanceMultiplier)
      : Math.max(4, currentDist * config.departureOutDistanceMultiplier);

  const commitSwap = () => {
    if (!isTokenCurrent()) return;
    const finalScope = resolveFinalScope();
    onBeforeSwap();
    if (direction === 'in') {
      // Hand off the preview plane directly into the incoming scene's aligned local datum plane.
      setCrossScalePlanePreview({
        position: [0, 0, 0],
        inclinationRad: 0,
        ascendingNodeRad: 0,
        maxRadius: getReferenceFrameRadius(finalScope) * config.minSceneScale,
        radiusProgress: 1,
        opacity: 1,
        mode: 'holding',
      });
      setCrossScaleInstrumentFade(0);
      setCrossScaleSceneScale(config.minSceneScale);
      setPendingCrossScaleArrival({
        direction: 'in',
        targetScope: finalScope,
        durationSec: durations.arrivalSec,
        frameTiltRad: plane.inclinationRad,
        tiltAxis: plane.tiltAxis,
        config,
      });
    } else {
      resetCrossScaleSceneScale();
      setCrossScaleInstrumentFade(0);
      setPendingCrossScaleArrival({
        direction: 'out',
        targetScope: finalScope,
        durationSec: durations.arrivalSec,
        frameTiltRad: plane.inclinationRad,
        tiltAxis: plane.tiltAxis,
        planePreviewTargetId: committedTargetId,
        planePreviewInclinationRad: Math.abs(plane.inclinationRad),
        planePreviewAscendingNodeRad: plane.ascendingNodeRad,
        config,
      });
    }
    onCommitFinal();
    invalidate?.();
  };

  const propsReady = isTargetPropsReady ?? (() => true);
  const isReadyToComplete = (): boolean => {
    if (preloadDone && propsReady()) {
      return true;
    }
    const now = performance.now();
    if (holdStartedAt === null) {
      holdStartedAt = now;
    }
    return (now - holdStartedAt) / MS_PER_SECOND >= config.preloadMaxHoldSec;
  };

  const finishSwap = () => {
    if (!isTokenCurrent()) return;
    if (scheduleReadySwap) {
      scheduleReadySwap(commitSwap);
    } else {
      commitSwap();
    }
  };

  if (direction === 'in') {
    const startBeat2 = () => {
      detachBeat1Listener();
      if (!isTokenCurrent()) return;
      transitionToPose(
        {
          target: departureTarget,
          distance: targetDistance,
          frameTiltRad: plane.inclinationRad,
          frameTiltAxis: plane.tiltAxis,
        },
        {
          duration: durations.departureSec,
          easing: easeInQuad,
          orientationWindow: config.zoomInTiltWindow,
          translationWindow: config.zoomInMoveWindow,
          isReadyToComplete,
          holdThreshold: config.preloadHoldThreshold,
          holdCeiling: config.preloadHoldCeiling,
          holdCreepTimeConstantSec: config.preloadCreepTimeConstantSec,
          onProgress: (p) => {
            if (!isTokenCurrent()) return;
            setCrossScaleInstrumentFade(computeCrossScaleDepartureFade(p, config));
            invalidate?.();
          },
          onComplete: finishSwap,
          onCancel: onAbortAndCommit,
        },
      );
    };

    if (activeControls?.addEventListener) {
      const handleBeat1Start = () => onAbortAndCommit();
      activeControls.addEventListener('start', handleBeat1Start);
      setBeat1Cleanup(() => {
        activeControls.removeEventListener?.('start', handleBeat1Start);
      });
    }

    useUIStore.getState().setCameraTransitioning(true);
    startCrossScalePlanePreviewExpand({
      position: departureTarget,
      inclinationRad: plane.inclinationRad,
      ascendingNodeRad: plane.ascendingNodeRad,
      maxRadius: Math.max(0.6, currentDist * 0.16),
      durationSec: durations.previewSec,
      onComplete: startBeat2,
    });
    invalidate?.();
    return;
  }

  transitionToPose(
    { target: departureTarget, distance: targetDistance },
    {
      duration: durations.departureSec,
      easing: easeInQuad,
      isReadyToComplete,
      holdThreshold: config.preloadHoldThreshold,
      holdCeiling: config.preloadHoldCeiling,
      holdCreepTimeConstantSec: config.preloadCreepTimeConstantSec,
      onProgress: (p) => {
        if (!isTokenCurrent()) return;
        setCrossScaleSceneScale(computeCrossScaleSceneScale(p, 'out', config.minSceneScale));
        setCrossScaleInstrumentFade(computeCrossScaleDepartureFade(p, config));
        invalidate?.();
      },
      onComplete: finishSwap,
      onCancel: onAbortAndCommit,
    },
  );
}
