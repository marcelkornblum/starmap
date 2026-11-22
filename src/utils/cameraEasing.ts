export type CameraEasingCurveId = 'easeOutCubic';

export const DEFAULT_CAMERA_EASING_CURVE: CameraEasingCurveId = 'easeOutCubic';

export const DEFAULT_CAMERA_TRANSITION_DURATION_SEC = 0.8;

/**
 * Computes a smooth, distance-dependent camera transition duration in seconds.
 * Pure rotations/presets (`travelDistance <= 1e-4`) use 0.8s; target translations
 * scale logarithmically with `travelDistance / referenceScale` within `[0.75, 1.5]`.
 */
export function computeCameraTransitionDuration(
  travelDistance: number,
  referenceScale: number,
): number {
  if (!Number.isFinite(travelDistance) || travelDistance <= 1e-4) {
    return DEFAULT_CAMERA_TRANSITION_DURATION_SEC;
  }
  const safeScale = Number.isFinite(referenceScale)
    ? Math.max(referenceScale, 1e-3)
    : 1;
  const ratio = Math.max(0, travelDistance) / safeScale;
  const raw =
    0.72 + 0.78 * Math.min(1, Math.log1p(ratio * 1.4) / Math.log1p(3.5));
  return Math.min(1.5, Math.max(0.75, raw));
}

const LOG_DISTANCE_THRESHOLD_DECADES = 0.05;

function clampUnit(t: number): number {
  if (Number.isNaN(t) || t <= 0) {
    return 0;
  }
  if (t >= 1) {
    return 1;
  }
  return t;
}

export function easeOutCubic(t: number): number {
  const clamped = clampUnit(t);
  return 1 - Math.pow(1 - clamped, 3);
}

export function evaluateCameraEasing(_curve: CameraEasingCurveId, t: number): number {
  return easeOutCubic(t);
}

export function interpolateCameraDistance(
  startDist: number,
  endDist: number,
  easedT: number,
  useLogarithmic: boolean,
): number {
  const t = clampUnit(easedT);
  if (t === 0) {
    return startDist;
  }
  if (t === 1) {
    return endDist;
  }
  if (
    useLogarithmic &&
    startDist > 0 &&
    endDist > 0 &&
    Math.abs(Math.log10(endDist / startDist)) > LOG_DISTANCE_THRESHOLD_DECADES
  ) {
    return startDist * Math.pow(endDist / startDist, t);
  }
  return startDist + (endDist - startDist) * t;
}
