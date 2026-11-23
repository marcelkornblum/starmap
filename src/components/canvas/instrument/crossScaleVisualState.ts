import { easeOutCubic } from '../../../utils/cameraEasing';
import {
  getActiveChoreographyController,
  type CrossScaleChoreographyController,
} from './CrossScaleChoreographyContext';

/**
 * Mutable visual state for cross-scale choreography.
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

/** Returns the current cross-scale scene scale multiplier in `[0.001, 1]`. */
export function getCrossScaleSceneScale(
  controller: CrossScaleChoreographyController = getActiveChoreographyController(),
): number {
  return controller.sceneScale;
}

/** Sets the cross-scale scene scale multiplier, clamped to `[0.001, 1]`. */
export function setCrossScaleSceneScale(
  scale: number,
  controller: CrossScaleChoreographyController = getActiveChoreographyController(),
): void {
  controller.sceneScale = clampSceneScale(scale);
}

/** Resets the cross-scale scene scale multiplier back to `1`. */
export function resetCrossScaleSceneScale(
  controller: CrossScaleChoreographyController = getActiveChoreographyController(),
): void {
  controller.sceneScale = 1.0;
}

/** Returns the mutable plane preview state for zero-allocation reads inside `useFrame`. */
export function getCrossScalePlanePreviewState(
  controller: CrossScaleChoreographyController = getActiveChoreographyController(),
): Readonly<CrossScalePlanePreviewState> {
  return controller.planePreview;
}

function writePlanePreviewGeometry(
  preview: CrossScalePlanePreviewState,
  position: readonly [number, number, number],
  inclinationRad: number,
  ascendingNodeRad: number,
  maxRadius: number,
): void {
  preview.position[0] = position[0];
  preview.position[1] = position[1];
  preview.position[2] = position[2];
  preview.inclinationRad = Number.isFinite(inclinationRad) ? inclinationRad : 0;
  preview.ascendingNodeRad = Number.isFinite(ascendingNodeRad) ? ascendingNodeRad : 0;
  preview.maxRadius = Number.isFinite(maxRadius) && maxRadius > 0 ? maxRadius : 0.001;
}

/** Activates and updates the target reference plane preview state in-place. */
export function setCrossScalePlanePreview(
  params: CrossScalePlanePreviewParams,
  controller: CrossScaleChoreographyController = getActiveChoreographyController(),
): void {
  const preview = controller.planePreview;
  preview.active = true;
  preview.mode = params.mode ?? 'idle';
  writePlanePreviewGeometry(
    preview,
    params.position,
    params.inclinationRad,
    params.ascendingNodeRad,
    params.maxRadius,
  );
  preview.radiusProgress = clampUnit(params.radiusProgress ?? 0);
  preview.opacity = clampUnit(params.opacity ?? 1);
  preview.durationSec = 0;
  preview.elapsedSec = 0;
  preview.onPhaseComplete = undefined;
}

/** Starts a self-animating radial expand preview and invokes `onComplete` upon reaching holding state. */
export function startCrossScalePlanePreviewExpand(
  params: CrossScalePlanePreviewExpandParams,
  controller: CrossScaleChoreographyController = getActiveChoreographyController(),
): void {
  const preview = controller.planePreview;
  preview.active = true;
  preview.mode = 'expanding';
  writePlanePreviewGeometry(
    preview,
    params.position,
    params.inclinationRad,
    params.ascendingNodeRad,
    params.maxRadius,
  );
  preview.radiusProgress = 0;
  preview.opacity = 1;
  preview.durationSec =
    Number.isFinite(params.durationSec) && params.durationSec > 0 ? params.durationSec : 0;
  preview.elapsedSec = 0;
  preview.onPhaseComplete = params.onComplete;
}

/** Transitions an active plane preview into self-animating contraction and fade-out. */
export function startCrossScalePlanePreviewContract(
  durationSec: number,
  controller: CrossScaleChoreographyController = getActiveChoreographyController(),
): void {
  const preview = controller.planePreview;
  if (!preview.active) return;
  preview.mode = 'contracting';
  preview.elapsedSec = 0;
  preview.durationSec = Number.isFinite(durationSec) && durationSec > 0 ? durationSec : 0;
  preview.onPhaseComplete = undefined;
}

/**
 * Advances self-animating plane preview expand/contract modes in-place.
 * Returns `true` when the preview is actively animating and requires a canvas invalidation.
 */
export function stepCrossScalePlanePreview(
  deltaSec: number,
  controller: CrossScaleChoreographyController = getActiveChoreographyController(),
): boolean {
  const preview = controller.planePreview;
  if (!preview.active) return false;
  if (preview.mode !== 'expanding' && preview.mode !== 'contracting') {
    return false;
  }

  const dt = Number.isFinite(deltaSec) && deltaSec > 0 ? Math.min(deltaSec, MAX_PREVIEW_STEP_SEC) : 0;
  preview.elapsedSec += dt;
  const p = Math.min(
    1,
    preview.elapsedSec / Math.max(MIN_DURATION_SEC, preview.durationSec),
  );

  if (preview.mode === 'expanding') {
    preview.radiusProgress = p;
    if (p >= 1) {
      preview.mode = 'holding';
      const onComplete = preview.onPhaseComplete;
      preview.onPhaseComplete = undefined;
      onComplete?.();
    }
    return true;
  }

  preview.radiusProgress = 1;
  preview.opacity = 1 - easeOutCubic(p);
  if (p >= 1) {
    clearCrossScalePlanePreview(controller);
  }
  return true;
}

/** Updates only the animated radius progress and opacity of the plane preview in-place. */
export function updateCrossScalePlanePreviewProgress(
  radiusProgress: number,
  opacity: number,
  controller: CrossScaleChoreographyController = getActiveChoreographyController(),
): void {
  const preview = controller.planePreview;
  preview.radiusProgress = clampUnit(radiusProgress);
  preview.opacity = clampUnit(opacity);
}

/** Updates only `maxRadius` of the plane preview in-place with zero allocations. */
export function setCrossScalePlanePreviewRadius(
  radius: number,
  controller: CrossScaleChoreographyController = getActiveChoreographyController(),
): void {
  controller.planePreview.maxRadius = Number.isFinite(radius) && radius > 0 ? radius : 0.001;
}

/** Deactivates and resets the plane preview state in-place. */
export function clearCrossScalePlanePreview(
  controller: CrossScaleChoreographyController = getActiveChoreographyController(),
): void {
  const preview = controller.planePreview;
  preview.active = false;
  preview.mode = 'idle';
  preview.position[0] = 0;
  preview.position[1] = 0;
  preview.position[2] = 0;
  preview.inclinationRad = 0;
  preview.ascendingNodeRad = 0;
  preview.maxRadius = 1;
  preview.radiusProgress = 0;
  preview.opacity = 0;
  preview.durationSec = 0;
  preview.elapsedSec = 0;
  preview.onPhaseComplete = undefined;
}
