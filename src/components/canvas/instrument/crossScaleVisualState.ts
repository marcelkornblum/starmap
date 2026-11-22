/**
 * Mutable module-level visual state for cross-scale choreography.
 *
 * Read directly inside `useFrame` loops with zero heap allocations and zero React re-renders.
 */

export type CrossScalePlanePreviewMode = 'idle' | 'expanding' | 'holding' | 'contracting';

export interface CrossScalePlanePreviewState {
  active: boolean;
  mode: CrossScalePlanePreviewMode;
  position: [number, number, number];
  inclinationRad: number;
  ascendingNodeRad: number;
  maxRadius: number;
  radiusProgress: number;
  opacity: number;
  durationSec: number;
  elapsedSec: number;
  onPhaseComplete?: () => void;
}

export interface CrossScalePlanePreviewParams {
  readonly position: readonly [number, number, number];
  readonly inclinationRad: number;
  readonly ascendingNodeRad: number;
  readonly maxRadius: number;
  readonly radiusProgress?: number;
  readonly opacity?: number;
  readonly mode?: CrossScalePlanePreviewMode;
}

export interface CrossScalePlanePreviewExpandParams {
  readonly position: readonly [number, number, number];
  readonly inclinationRad: number;
  readonly ascendingNodeRad: number;
  readonly maxRadius: number;
  readonly durationSec: number;
  readonly onComplete?: () => void;
}

const MAX_PREVIEW_STEP_SEC = 0.05;
const MIN_DURATION_SEC = 1e-4;

let crossScaleSceneScale = 1.0;

const planePreviewState: CrossScalePlanePreviewState = {
  active: false,
  mode: 'idle',
  position: [0, 0, 0],
  inclinationRad: 0,
  ascendingNodeRad: 0,
  maxRadius: 1,
  radiusProgress: 0,
  opacity: 0,
  durationSec: 0,
  elapsedSec: 0,
  onPhaseComplete: undefined,
};

function clampSceneScale(value: number): number {
  if (Number.isNaN(value)) return 1.0;
  if (value <= 0.001) return 0.001;
  if (value >= 1) return 1.0;
  return value;
}

function clampUnit(value: number): number {
  if (Number.isNaN(value) || value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

/** Returns the current global cross-scale scene scale multiplier in `[0.001, 1]`. */
export function getCrossScaleSceneScale(): number {
  return crossScaleSceneScale;
}

/** Sets the global cross-scale scene scale multiplier, clamped to `[0.001, 1]`. */
export function setCrossScaleSceneScale(scale: number): void {
  crossScaleSceneScale = clampSceneScale(scale);
}

/** Resets the global cross-scale scene scale multiplier back to `1`. */
export function resetCrossScaleSceneScale(): void {
  crossScaleSceneScale = 1.0;
}

/** Returns the mutable singleton plane preview state for zero-allocation reads inside `useFrame`. */
export function getCrossScalePlanePreviewState(): Readonly<CrossScalePlanePreviewState> {
  return planePreviewState;
}

function writePlanePreviewGeometry(
  position: readonly [number, number, number],
  inclinationRad: number,
  ascendingNodeRad: number,
  maxRadius: number,
): void {
  planePreviewState.position[0] = position[0];
  planePreviewState.position[1] = position[1];
  planePreviewState.position[2] = position[2];
  planePreviewState.inclinationRad = Number.isFinite(inclinationRad) ? inclinationRad : 0;
  planePreviewState.ascendingNodeRad = Number.isFinite(ascendingNodeRad) ? ascendingNodeRad : 0;
  planePreviewState.maxRadius =
    Number.isFinite(maxRadius) && maxRadius > 0 ? maxRadius : 0.001;
}

/** Activates and updates the target reference plane preview state in-place. */
export function setCrossScalePlanePreview(params: CrossScalePlanePreviewParams): void {
  planePreviewState.active = true;
  planePreviewState.mode = params.mode ?? 'idle';
  writePlanePreviewGeometry(
    params.position,
    params.inclinationRad,
    params.ascendingNodeRad,
    params.maxRadius,
  );
  planePreviewState.radiusProgress = clampUnit(params.radiusProgress ?? 0);
  planePreviewState.opacity = clampUnit(params.opacity ?? 1);
  planePreviewState.durationSec = 0;
  planePreviewState.elapsedSec = 0;
  planePreviewState.onPhaseComplete = undefined;
}

/** Starts a self-animating radial expand preview and invokes `onComplete` upon reaching holding state. */
export function startCrossScalePlanePreviewExpand(
  params: CrossScalePlanePreviewExpandParams,
): void {
  planePreviewState.active = true;
  planePreviewState.mode = 'expanding';
  writePlanePreviewGeometry(
    params.position,
    params.inclinationRad,
    params.ascendingNodeRad,
    params.maxRadius,
  );
  planePreviewState.radiusProgress = 0;
  planePreviewState.opacity = 1;
  planePreviewState.durationSec =
    Number.isFinite(params.durationSec) && params.durationSec > 0 ? params.durationSec : 0;
  planePreviewState.elapsedSec = 0;
  planePreviewState.onPhaseComplete = params.onComplete;
}

/** Transitions an active plane preview into self-animating contraction and fade-out. */
export function startCrossScalePlanePreviewContract(durationSec: number): void {
  if (!planePreviewState.active) return;
  planePreviewState.mode = 'contracting';
  planePreviewState.elapsedSec = 0;
  planePreviewState.durationSec =
    Number.isFinite(durationSec) && durationSec > 0 ? durationSec : 0;
  planePreviewState.onPhaseComplete = undefined;
}

/**
 * Advances self-animating plane preview expand/contract modes in-place.
 * Returns `true` when the preview is actively animating and requires a canvas invalidation.
 */
export function stepCrossScalePlanePreview(deltaSec: number): boolean {
  if (!planePreviewState.active) return false;
  if (planePreviewState.mode !== 'expanding' && planePreviewState.mode !== 'contracting') {
    return false;
  }

  const dt = Number.isFinite(deltaSec) && deltaSec > 0 ? Math.min(deltaSec, MAX_PREVIEW_STEP_SEC) : 0;
  planePreviewState.elapsedSec += dt;
  const p = Math.min(
    1,
    planePreviewState.elapsedSec / Math.max(MIN_DURATION_SEC, planePreviewState.durationSec),
  );

  if (planePreviewState.mode === 'expanding') {
    planePreviewState.radiusProgress = p;
    if (p >= 1) {
      planePreviewState.mode = 'holding';
      const onComplete = planePreviewState.onPhaseComplete;
      planePreviewState.onPhaseComplete = undefined;
      onComplete?.();
    }
    return true;
  }

  planePreviewState.radiusProgress = 1 - p;
  planePreviewState.opacity = 1 - p;
  if (p >= 1) {
    clearCrossScalePlanePreview();
  }
  return true;
}

/** Updates only the animated radius progress and opacity of the plane preview in-place. */
export function updateCrossScalePlanePreviewProgress(
  radiusProgress: number,
  opacity: number,
): void {
  planePreviewState.radiusProgress = clampUnit(radiusProgress);
  planePreviewState.opacity = clampUnit(opacity);
}

/** Updates only `maxRadius` of the plane preview in-place with zero allocations. */
export function setCrossScalePlanePreviewRadius(radius: number): void {
  planePreviewState.maxRadius = Number.isFinite(radius) && radius > 0 ? radius : 0.001;
}

/** Deactivates and resets the plane preview state in-place. */
export function clearCrossScalePlanePreview(): void {
  planePreviewState.active = false;
  planePreviewState.mode = 'idle';
  planePreviewState.position[0] = 0;
  planePreviewState.position[1] = 0;
  planePreviewState.position[2] = 0;
  planePreviewState.inclinationRad = 0;
  planePreviewState.ascendingNodeRad = 0;
  planePreviewState.maxRadius = 1;
  planePreviewState.radiusProgress = 0;
  planePreviewState.opacity = 0;
  planePreviewState.durationSec = 0;
  planePreviewState.elapsedSec = 0;
  planePreviewState.onPhaseComplete = undefined;
}
