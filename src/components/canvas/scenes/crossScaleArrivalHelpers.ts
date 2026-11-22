import * as THREE from 'three';
import {
  DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG,
  computeCrossScaleArrivalFade,
  computeCrossScaleSceneScale,
  computeCrossScaleStageDurations,
} from '../../../utils/referenceFrameOrientation';
import type { SpatialEntityStore } from '../entity/SpatialEntityStore';
import {
  computeTiltedArrivalEntryPose,
  type CrossScaleArrivalDescriptor,
} from '../instrument/crossScaleArrivalState';
import {
  resetCrossScaleInstrumentFade,
  setCrossScaleInstrumentFade,
} from '../instrument/crossScaleFadeState';
import {
  clearCrossScalePlanePreview,
  resetCrossScaleSceneScale,
  setCrossScalePlanePreview,
  setCrossScaleSceneScale,
  startCrossScalePlanePreviewContract,
} from '../instrument/crossScaleVisualState';
import type { CameraTransitionApi } from '../instrument/useCameraTransition';
import type { OrbitControlsLike } from './cameraControllerUtils';
import { applyImmediateCameraPose } from './galacticCameraHelpers';

export {
  applyDefaultInitialGalacticPose,
  resolveGalacticLandingPose,
  tryRestoreSavedGalaxyPose,
  type GalacticLandingPose,
} from './galacticLandingHelpers';

export interface CrossScaleArrivalGlideParams {
  readonly camera: THREE.Camera;
  readonly controls: OrbitControlsLike | undefined;
  readonly landingPosition: readonly [number, number, number];
  readonly landingTarget: readonly [number, number, number];
  readonly landingUp: readonly [number, number, number];
  readonly landingZoom: number;
  readonly landingFov?: number;
  readonly arrival: CrossScaleArrivalDescriptor;
  readonly outerStore?: SpatialEntityStore | null;
  readonly transitionToPose: CameraTransitionApi['transitionToPose'];
  readonly invalidate?: () => void;
  readonly onComplete: () => void;
  readonly onCancel?: () => void;
}

function resolveArrivalPreviewPosition(
  arrival: CrossScaleArrivalDescriptor,
  outerStore: SpatialEntityStore | null | undefined,
  fallbackTarget: readonly [number, number, number],
): readonly [number, number, number] {
  if (arrival.planePreviewPosition) return arrival.planePreviewPosition;
  if (outerStore && arrival.planePreviewTargetId) {
    const state = outerStore.getState();
    const resolvedId =
      state.resolveEntityId(arrival.planePreviewTargetId) ?? arrival.planePreviewTargetId;
    const entity = state.entities[resolvedId];
    if (entity?.position) {
      return entity.position instanceof THREE.Vector3
        ? [entity.position.x, entity.position.y, entity.position.z]
        : [entity.position[0], entity.position[1], entity.position[2]];
    }
  }
  return fallbackTarget;
}

/**
 * Places the camera at the Stage 2 entry pose (pre-tilted on zoom-out, tiny scene scale on zoom-in),
 * coordinates instrument fade and preview disc contraction, and glides to the landing pose.
 */
export function startCrossScaleArrivalGlide(params: CrossScaleArrivalGlideParams): void {
  const {
    camera,
    controls,
    landingPosition,
    landingTarget,
    landingUp,
    landingZoom,
    landingFov,
    arrival,
    outerStore,
    transitionToPose,
    invalidate,
    onComplete,
    onCancel,
  } = params;

  const config = arrival.config ?? DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG;
  const durations = computeCrossScaleStageDurations(config);
  const landingPose = {
    position: landingPosition,
    target: landingTarget,
    up: landingUp,
    orthoZoom: landingZoom,
    ...(landingFov !== undefined ? { fov: landingFov } : {}),
  };

  if (arrival.direction === 'in') {
    const entryPose = computeTiltedArrivalEntryPose(
      landingPosition,
      landingTarget,
      landingUp,
      'in',
      0,
      arrival.tiltAxis,
      config,
    );
    applyImmediateCameraPose(
      camera,
      controls,
      entryPose.position,
      landingTarget,
      entryPose.up,
      landingZoom,
      landingFov,
    );
    setCrossScaleInstrumentFade(0);
    setCrossScaleSceneScale(config.minSceneScale);

    transitionToPose(landingPose, {
      duration: arrival.durationSec,
      onProgress: (p) => {
        setCrossScaleSceneScale(computeCrossScaleSceneScale(p, 'in', config.minSceneScale));
        setCrossScaleInstrumentFade(computeCrossScaleArrivalFade(p, config));
        invalidate?.();
      },
      onComplete: () => {
        resetCrossScaleSceneScale();
        resetCrossScaleInstrumentFade();
        onComplete();
        invalidate?.();
      },
      onCancel: () => {
        resetCrossScaleSceneScale();
        resetCrossScaleInstrumentFade();
        onCancel?.();
        invalidate?.();
      },
    });
    return;
  }

  const entryTiltRad = -(arrival.frameTiltRad ?? 0);
  const entryPose = computeTiltedArrivalEntryPose(
    landingPosition,
    landingTarget,
    landingUp,
    'out',
    entryTiltRad,
    arrival.tiltAxis,
    config,
  );
  applyImmediateCameraPose(
    camera,
    controls,
    entryPose.position,
    landingTarget,
    entryPose.up,
    landingZoom,
    landingFov,
  );
  setCrossScaleInstrumentFade(0);
  resetCrossScaleSceneScale();

  if (
    typeof arrival.planePreviewInclinationRad === 'number' &&
    Number.isFinite(arrival.planePreviewInclinationRad) &&
    arrival.planePreviewInclinationRad > 1e-4
  ) {
    const landingDist = Math.hypot(
      landingPosition[0] - landingTarget[0],
      landingPosition[1] - landingTarget[1],
      landingPosition[2] - landingTarget[2],
    );
    const previewMaxRadius =
      typeof arrival.planePreviewMaxRadius === 'number' &&
      Number.isFinite(arrival.planePreviewMaxRadius) &&
      arrival.planePreviewMaxRadius > 0
        ? arrival.planePreviewMaxRadius
        : Math.max(0.6, landingDist * 0.16);
    setCrossScalePlanePreview({
      position: resolveArrivalPreviewPosition(arrival, outerStore, landingTarget),
      inclinationRad: arrival.planePreviewInclinationRad,
      ascendingNodeRad: arrival.planePreviewAscendingNodeRad ?? 0,
      maxRadius: previewMaxRadius,
      radiusProgress: 1,
      opacity: 1,
      mode: 'holding',
    });
  }

  transitionToPose(landingPose, {
    duration: arrival.durationSec,
    translationWindow: config.zoomOutMoveWindow,
    orientationWindow: config.zoomOutTiltWindow,
    onProgress: (p) => {
      setCrossScaleInstrumentFade(computeCrossScaleArrivalFade(p, config));
      invalidate?.();
    },
    onComplete: () => {
      resetCrossScaleInstrumentFade();
      startCrossScalePlanePreviewContract(durations.previewSec);
      onComplete();
      invalidate?.();
    },
    onCancel: () => {
      resetCrossScaleInstrumentFade();
      clearCrossScalePlanePreview();
      onCancel?.();
      invalidate?.();
    },
  });
}
