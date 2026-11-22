import { DEG_TO_RADIANS, EARTH_OBLIQUITY_DEG } from './astroCoordinates';
import { easeOutCubic } from './cameraEasing';

/** Hierarchical spatial reference frame scale. */
export type SpatialScale = 'galaxy' | 'system' | 'planet';

/** J2000 inclination between the Galactic Plane and the Solar System Ecliptic, in degrees. */
export const GALACTIC_TO_ECLIPTIC_TILT_DEG = 60.19;

/** Default planetary axial obliquity in degrees (Earth's J2000 obliquity). */
export const DEFAULT_PLANETARY_OBLIQUITY_DEG = EARTH_OBLIQUITY_DEG;

/** Duration of a single stage in a cross-scale transition, in seconds. */
export const CROSS_SCALE_STAGE_DURATION_SEC = 0.9;

/** Total cross-scale camera transition duration (1.5× medium intra-view duration), in seconds. */
export const CROSS_SCALE_TOTAL_DURATION_SEC = 1.8;

/** Normalised transition window during which orbital-plane orientation tilts. */
export const CROSS_SCALE_ORIENTATION_WINDOW: readonly [number, number] = [0, 0.5];

/** Normalised transition window during which target translation and distance zoom occur. */
export const CROSS_SCALE_TRANSLATION_WINDOW: readonly [number, number] = [0.2, 1.0];

const SCALE_RANK: Readonly<Record<SpatialScale, number>> = {
  galaxy: 0,
  system: 1,
  planet: 2,
};

const CUMULATIVE_TILT_DEG: Readonly<Record<SpatialScale, number>> = {
  galaxy: 0,
  system: GALACTIC_TO_ECLIPTIC_TILT_DEG,
  planet: GALACTIC_TO_ECLIPTIC_TILT_DEG + DEFAULT_PLANETARY_OBLIQUITY_DEG,
};

const DEPARTURE_FADE_WINDOW: readonly [number, number] = [0.3, 1.0];
const ARRIVAL_FADE_WINDOW: readonly [number, number] = [0.0, 0.7];

/**
 * Returns the hierarchical numeric rank of a spatial scale (`galaxy: 0`, `system: 1`, `planet: 2`).
 */
export function getScaleRank(scope: SpatialScale): number {
  return SCALE_RANK[scope];
}

/**
 * Computes the signed orbital-plane tilt angle in radians when transitioning from
 * `fromScope` to `toScope`.
 */
export function getCrossScaleTiltRad(
  fromScope: SpatialScale,
  toScope: SpatialScale,
): number {
  if (fromScope === toScope) {
    return 0;
  }
  return (CUMULATIVE_TILT_DEG[toScope] - CUMULATIVE_TILT_DEG[fromScope]) * DEG_TO_RADIANS;
}

/**
 * Normalises `progress` into `[0, 1]` over `[start, end]`.
 * When `window` is omitted, clamps `progress` directly to `[0, 1]`.
 */
export function normaliseWindowProgress(
  progress: number,
  window?: readonly [number, number],
): number {
  if (!window) {
    if (Number.isNaN(progress) || progress <= 0) {
      return 0;
    }
    return progress >= 1 ? 1 : progress;
  }
  const [start, end] = window;
  if (Number.isNaN(progress) || progress <= start) {
    return 0;
  }
  if (progress >= end || end <= start) {
    return 1;
  }
  return (progress - start) / (end - start);
}

/**
 * Normalises `progress` over `[start, end]` and evaluates `easeOutCubic`.
 */
export function evaluateWindowedProgress(
  progress: number,
  window: readonly [number, number],
): number {
  return easeOutCubic(normaliseWindowProgress(progress, window));
}

/**
 * Computes the departure layer opacity across a stage progress `[0, 1]`.
 * Holds at `1.0` for `stageProgress <= 0.3`, then dissolves `1 -> 0` over `[0.3, 1.0]`.
 */
export function computeCrossScaleDepartureFade(stageProgress: number): number {
  return 1 - evaluateWindowedProgress(stageProgress, DEPARTURE_FADE_WINDOW);
}

/**
 * Computes the arrival layer opacity across a stage progress `[0, 1]`.
 * Materialises `0 -> 1` over `[0.0, 0.7]` using `easeOutCubic`, clamped to `1.0` thereafter.
 */
export function computeCrossScaleArrivalFade(stageProgress: number): number {
  return evaluateWindowedProgress(stageProgress, ARRIVAL_FADE_WINDOW);
}
