import type {
  MinimapOrientationSummary,
  MinimapScope,
} from '../../../services/details/detailsNavigationTypes';
import type { CameraProjectionMode } from '../../../stores/useCameraStore';
import {
  isInitialUntouchedPose,
  type EffectiveCameraOrientation,
  type Vec3Tuple,
} from '../../../utils/orientationProjectionMath';
import { STANDARD_CAMERA_DISTANCES } from '../../canvas/cartography/cartographyCamera';

export type VisorPillAction = 'reorient' | 'reset-zoom' | 'reset-position' | 'all-ready';

export interface VisorPillPoseInput {
  readonly position: Vec3Tuple;
  readonly target: Vec3Tuple;
  readonly up: Vec3Tuple;
  readonly zoom?: number;
}

const ORIGIN_TUPLE: Vec3Tuple = [0, 0, 0];
const CANONICAL_ELEVATION_DEG = 32;
const CANONICAL_AZIMUTH_DEG = 14;
const ELEVATION_TOLERANCE_DEG = 1.5;
const AZIMUTH_TOLERANCE_DEG = 2.0;
const RELATIVE_DISTANCE_TOLERANCE = 0.03;
const ZOOM_TOLERANCE = 0.02;
const ORIGIN_TOLERANCE = 0.05;

function resolveStandardDistanceForScope(scope: MinimapScope): number {
  switch (scope) {
    case 'galaxy':
      return STANDARD_CAMERA_DISTANCES.galactic;
    case 'system':
      return STANDARD_CAMERA_DISTANCES.system;
    case 'planet':
      return STANDARD_CAMERA_DISTANCES.planetary;
  }
}

export function resolveEffectiveTargetCoords(
  orientation: MinimapOrientationSummary,
  livePose: Pick<VisorPillPoseInput, 'position' | 'target' | 'up'>,
): Vec3Tuple {
  if (!isInitialUntouchedPose(livePose.position, livePose.target, livePose.up)) {
    return livePose.target;
  }
  if (orientation.scope === 'galaxy') {
    return orientation.coordinatesPc ?? ORIGIN_TUPLE;
  }
  return ORIGIN_TUPLE;
}

function formatCompactCoord(value: number): string {
  if (!Number.isFinite(value) || Math.abs(value) < 0.05) {
    return '0';
  }
  if (Math.abs(value) >= 100) {
    const rounded = Math.round(value);
    return rounded === 0 ? '0' : String(rounded);
  }
  const fixed = value.toFixed(1);
  const trimmed = fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed;
  return trimmed === '-0' ? '0' : trimmed;
}

export function formatCompactTargetCoords(target: Vec3Tuple): string {
  return `${formatCompactCoord(target[0])},${formatCompactCoord(target[1])},${formatCompactCoord(target[2])}`;
}

export function resolveVisorPillNextAction(params: {
  readonly orientation: MinimapOrientationSummary;
  readonly effectiveCamera: EffectiveCameraOrientation;
  readonly livePose: VisorPillPoseInput;
  readonly isLocked: boolean;
  readonly mode: CameraProjectionMode;
  readonly inFlightStep?: 'reorient' | 'reset-zoom' | 'reset-position' | null;
}): VisorPillAction {
  const { orientation, effectiveCamera, livePose, isLocked, mode, inFlightStep } = params;
  const isUntouchedFallback = isInitialUntouchedPose(
    livePose.position,
    livePose.target,
    livePose.up,
  );

  let isCanonicalOrientation: boolean;
  if (isLocked || mode === 'orthographic') {
    isCanonicalOrientation = false;
  } else if (
    isUntouchedFallback &&
    orientation.cameraAzimuthDeg === undefined &&
    orientation.cameraElevationDeg === undefined
  ) {
    isCanonicalOrientation = true;
  } else {
    const elevOk =
      Math.abs(effectiveCamera.basis.elevationDeg - CANONICAL_ELEVATION_DEG) <=
      ELEVATION_TOLERANCE_DEG;
    const azDiff = Math.abs(
      ((((effectiveCamera.basis.azimuthDeg - CANONICAL_AZIMUTH_DEG) % 360) + 540) % 360) - 180,
    );
    const azOk = azDiff <= AZIMUTH_TOLERANCE_DEG;
    const upOk =
      effectiveCamera.basis.up[2] > 0.75 &&
      (isUntouchedFallback || livePose.up[2] >= 0.98);
    isCanonicalOrientation = elevOk && azOk && upOk;
  }

  let isCanonicalZoom: boolean;
  if (isUntouchedFallback && orientation.cameraDistance === undefined) {
    isCanonicalZoom = true;
  } else {
    const defaultDist = resolveStandardDistanceForScope(orientation.scope);
    const distOk =
      Math.abs(effectiveCamera.distance - defaultDist) / defaultDist <=
      RELATIVE_DISTANCE_TOLERANCE;
    const zoomOk = Math.abs((livePose.zoom ?? 1) - 1) <= ZOOM_TOLERANCE;
    isCanonicalZoom = distOk && zoomOk;
  }

  const effectiveTarget = resolveEffectiveTargetCoords(orientation, livePose);
  let isCanonicalPosition =
    Math.hypot(effectiveTarget[0], effectiveTarget[1], effectiveTarget[2]) <=
    ORIGIN_TOLERANCE;

  if (inFlightStep === 'reorient') {
    isCanonicalOrientation = true;
  } else if (inFlightStep === 'reset-zoom') {
    isCanonicalOrientation = true;
    isCanonicalZoom = true;
  } else if (inFlightStep === 'reset-position') {
    isCanonicalOrientation = true;
    isCanonicalZoom = true;
    isCanonicalPosition = true;
  }

  if (!isCanonicalOrientation) return 'reorient';
  if (!isCanonicalZoom) return 'reset-zoom';
  if (!isCanonicalPosition) return 'reset-position';
  return 'all-ready';
}

export function resolveVisorPillAriaLabel(action: VisorPillAction): string {
  switch (action) {
    case 'reorient':
      return 'Reset camera orientation to North';
    case 'reset-zoom':
      return 'Reset camera zoom';
    case 'reset-position':
      return 'Reset camera position to origin';
    case 'all-ready':
      return 'Camera at default orientation, zoom, and position';
  }
}
