/**
 * Lightweight module-level scalar controlling cross-scale fade-out and fade-in
 * of 3D cartographic instrument primitives during transitions.
 *
 * Intentionally lives outside Zustand / React state so `useFrame` loops read a
 * plain primitive number with zero allocations and zero re-renders.
 */

let crossScaleInstrumentFade = 1.0;

function clampInstrumentFade(value: number): number {
  if (Number.isNaN(value)) return 1.0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

export function getCrossScaleInstrumentFade(): number {
  return crossScaleInstrumentFade;
}

export function setCrossScaleInstrumentFade(value: number): void {
  crossScaleInstrumentFade = clampInstrumentFade(value);
}

export function resetCrossScaleInstrumentFade(): void {
  crossScaleInstrumentFade = 1.0;
}
