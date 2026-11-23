import {
  getActiveChoreographyController,
  type CrossScaleChoreographyController,
} from './CrossScaleChoreographyContext';

/**
 * Lightweight scalar accessor controlling cross-scale fade-out and fade-in
 * of 3D cartographic instrument primitives during transitions.
 *
 * Reads from the active `CrossScaleChoreographyController` with zero allocations
 * and zero React re-renders.
 */
function clampInstrumentFade(value: number): number {
  if (Number.isNaN(value)) return 1.0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

/** Returns the current instrument fade opacity in `[0, 1]`. */
export function getCrossScaleInstrumentFade(
  controller: CrossScaleChoreographyController = getActiveChoreographyController(),
): number {
  return controller.instrumentFade;
}

/** Sets the instrument fade opacity, clamped to `[0, 1]`. */
export function setCrossScaleInstrumentFade(
  value: number,
  controller: CrossScaleChoreographyController = getActiveChoreographyController(),
): void {
  controller.instrumentFade = clampInstrumentFade(value);
}

/** Resets the instrument fade opacity back to `1.0`. */
export function resetCrossScaleInstrumentFade(
  controller: CrossScaleChoreographyController = getActiveChoreographyController(),
): void {
  controller.instrumentFade = 1.0;
}
