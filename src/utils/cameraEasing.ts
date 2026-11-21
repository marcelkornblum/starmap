export type CameraEasingCurveId =
  | 'easeInOutQuad'
  | 'easeOutQuad'
  | 'easeInOutCubic'
  | 'easeOutCubic'
  | 'linear';

export const DEFAULT_CAMERA_EASING_CURVE: CameraEasingCurveId = 'easeInOutQuad';

export const DEFAULT_CAMERA_TRANSITION_DURATION_SEC = 0.8;

export const CAMERA_EASING_CURVES: readonly {
  readonly id: CameraEasingCurveId;
  readonly label: string;
}[] = [
  { id: 'easeInOutQuad', label: 'Quadratic Ease In-Out' },
  { id: 'easeOutQuad', label: 'Quadratic Ease Out' },
  { id: 'easeInOutCubic', label: 'Cubic Ease In-Out' },
  { id: 'easeOutCubic', label: 'Cubic Ease Out' },
  { id: 'linear', label: 'Linear' },
] as const;

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

export function linear(t: number): number {
  return clampUnit(t);
}

export function easeInOutQuad(t: number): number {
  const clamped = clampUnit(t);
  return clamped < 0.5
    ? 2 * clamped * clamped
    : 1 - Math.pow(-2 * clamped + 2, 2) / 2;
}

export function easeOutQuad(t: number): number {
  const clamped = clampUnit(t);
  const inv = 1 - clamped;
  return 1 - inv * inv;
}

export function easeInOutCubic(t: number): number {
  const clamped = clampUnit(t);
  return clamped < 0.5
    ? 4 * clamped * clamped * clamped
    : 1 - Math.pow(-2 * clamped + 2, 3) / 2;
}

export function easeOutCubic(t: number): number {
  const clamped = clampUnit(t);
  return 1 - Math.pow(1 - clamped, 3);
}

const CURVE_EVALUATORS: Readonly<Record<CameraEasingCurveId, (t: number) => number>> = {
  easeInOutQuad,
  easeOutQuad,
  easeInOutCubic,
  easeOutCubic,
  linear,
};

export function evaluateCameraEasing(curve: CameraEasingCurveId, t: number): number {
  return CURVE_EVALUATORS[curve](clampUnit(t));
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
