import { GALACTIC_FRAME, PLANETARY_FRAME, SYSTEM_FRAME } from '../config/referenceFrames';
import { DEG_TO_RADIANS, EARTH_OBLIQUITY_DEG } from './astroCoordinates';
import { easeOutCubic } from './cameraEasing';

/** Hierarchical spatial reference frame scale. */
export type SpatialScale = 'galaxy' | 'system' | 'planet';

/** J2000 inclination between the Galactic Plane and the Solar System Ecliptic, in degrees. */
export const GALACTIC_TO_ECLIPTIC_TILT_DEG = SYSTEM_FRAME.planeInclinationDeg ?? 60.19;

/** Default planetary axial obliquity in degrees (Earth's J2000 obliquity). */
export const DEFAULT_PLANETARY_OBLIQUITY_DEG =
  PLANETARY_FRAME.planeInclinationDeg ?? EARTH_OBLIQUITY_DEG;

/** Parameterised timing, windowing, scale, and distance config for cross-scale choreography. */
export interface CrossScaleChoreographyConfig {
  readonly totalDurationSec: number;
  readonly planePreviewFraction: number;
  readonly departureFraction: number;
  readonly arrivalFraction: number;
  readonly zoomInTiltWindow: readonly [number, number];
  readonly zoomInMoveWindow: readonly [number, number];
  readonly zoomOutMoveWindow: readonly [number, number];
  readonly zoomOutTiltWindow: readonly [number, number];
  readonly departureFadeWindow: readonly [number, number];
  readonly arrivalFadeWindow: readonly [number, number];
  readonly arrivalPreviewFadeWindow: readonly [number, number];
  readonly minSceneScale: number;
  readonly orbitSquashFullScale: number;
  readonly departureInDistanceMultiplier: number;
  readonly departureOutDistanceMultiplier: number;
  readonly arrivalInDistanceMultiplier: number;
  readonly arrivalOutDistanceMultiplier: number;
  readonly preloadHoldThreshold: number;
  readonly preloadHoldCeiling: number;
  readonly preloadCreepTimeConstantSec: number;
  readonly preloadMaxHoldSec: number;
  readonly previewRadiusFactor: number;
  readonly minPreviewRadius: number;
}

/** Default cross-scale choreography configuration (2.4s total: 0.4s preview + 1.0s out + 1.0s in). */
export const DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG: CrossScaleChoreographyConfig = {
  totalDurationSec: 2.4,
  planePreviewFraction: 0.4 / 2.4,
  departureFraction: 1.0 / 2.4,
  arrivalFraction: 1.0 / 2.4,
  zoomInTiltWindow: [0.0, 0.75],
  zoomInMoveWindow: [0.15, 1.0],
  zoomOutMoveWindow: [0.0, 0.85],
  zoomOutTiltWindow: [0.35, 1.0],
  departureFadeWindow: [0.15, 0.95],
  arrivalFadeWindow: [0.18, 0.75],
  arrivalPreviewFadeWindow: [0.15, 0.85],
  minSceneScale: 0.04,
  orbitSquashFullScale: 0.35,
  departureInDistanceMultiplier: 0.22,
  departureOutDistanceMultiplier: 2.2,
  arrivalInDistanceMultiplier: 1.85,
  arrivalOutDistanceMultiplier: 0.45,
  preloadHoldThreshold: 0.78,
  preloadHoldCeiling: 0.94,
  preloadCreepTimeConstantSec: 1.8,
  preloadMaxHoldSec: 4.0,
  previewRadiusFactor: 0.16,
  minPreviewRadius: 0.6,
};

/** Resolved stage durations in seconds for a cross-scale transition. */
export interface CrossScaleStageDurations {
  readonly totalSec: number;
  readonly previewSec: number;
  readonly departureSec: number;
  readonly arrivalSec: number;
}

/** Optional per-target orbital or axial plane orientation metadata in degrees. */
export interface TargetPlaneMetadata {
  readonly inclinationDeg?: number;
  readonly ascendingNodeDeg?: number;
  readonly axialTiltDeg?: number;
  readonly obliquityDeg?: number;
}

/** Resolved cross-scale plane orientation descriptor in radians with unit tilt axis. */
export interface ReferencePlaneDescriptor {
  readonly inclinationRad: number;
  readonly ascendingNodeRad: number;
  readonly tiltAxis: readonly [number, number, number];
}

const SCALE_RANK: Readonly<Record<SpatialScale, number>> = {
  galaxy: 0,
  system: 1,
  planet: 2,
};

const FRAME_BY_SCALE = {
  galaxy: GALACTIC_FRAME,
  system: SYSTEM_FRAME,
  planet: PLANETARY_FRAME,
} as const;

const CUMULATIVE_TILT_DEG: Readonly<Record<SpatialScale, number>> = {
  galaxy: GALACTIC_FRAME.planeInclinationDeg ?? 0,
  system: GALACTIC_TO_ECLIPTIC_TILT_DEG,
  planet: GALACTIC_TO_ECLIPTIC_TILT_DEG + DEFAULT_PLANETARY_OBLIQUITY_DEG,
};

/**
 * Computes concrete stage durations in seconds from a `CrossScaleChoreographyConfig`.
 */
export function computeCrossScaleStageDurations(
  config: CrossScaleChoreographyConfig = DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG,
): CrossScaleStageDurations {
  const totalSec = Math.max(0, config.totalDurationSec);
  return {
    totalSec,
    previewSec: totalSec * Math.max(0, config.planePreviewFraction),
    departureSec: totalSec * Math.max(0, config.departureFraction),
    arrivalSec: totalSec * Math.max(0, config.arrivalFraction),
  };
}

/** Returns the authoritative reference frame radius for `scope` from `ReferenceFrame` configs. */
export function getReferenceFrameRadius(scope: SpatialScale): number {
  return FRAME_BY_SCALE[scope].radius;
}

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

function pickNonZeroOverrideDeg(targetMetadata?: TargetPlaneMetadata): number | undefined {
  if (!targetMetadata) return undefined;
  const candidates = [
    targetMetadata.axialTiltDeg,
    targetMetadata.obliquityDeg,
    targetMetadata.inclinationDeg,
  ];
  for (let i = 0; i < candidates.length; i++) {
    const val = candidates[i];
    if (typeof val === 'number' && Number.isFinite(val) && val !== 0) {
      return val;
    }
  }
  return undefined;
}

/**
 * Resolves the signed cross-scale reference plane tilt, ascending node, and unit tilt axis
 * from frame defaults and optional target-specific orientation metadata.
 */
export function resolveTargetReferencePlane(
  fromScope: SpatialScale,
  toScope: SpatialScale,
  targetMetadata?: TargetPlaneMetadata,
): ReferencePlaneDescriptor {
  if (fromScope === toScope) {
    return { inclinationRad: 0, ascendingNodeRad: 0, tiltAxis: [1, 0, 0] };
  }

  const overrideDeg = pickNonZeroOverrideDeg(targetMetadata);
  const galaxyDeg = FRAME_BY_SCALE.galaxy.planeInclinationDeg ?? 0;
  let systemStepDeg = FRAME_BY_SCALE.system.planeInclinationDeg ?? GALACTIC_TO_ECLIPTIC_TILT_DEG;
  let planetStepDeg = FRAME_BY_SCALE.planet.planeInclinationDeg ?? DEFAULT_PLANETARY_OBLIQUITY_DEG;

  if (overrideDeg !== undefined) {
    if (fromScope === 'planet' || toScope === 'planet') {
      planetStepDeg = overrideDeg;
    } else if (fromScope === 'system' || toScope === 'system') {
      systemStepDeg = overrideDeg;
    }
  }

  const cumulativeDeg = (scope: SpatialScale): number => {
    if (scope === 'galaxy') return galaxyDeg;
    if (scope === 'system') return galaxyDeg + systemStepDeg;
    return galaxyDeg + systemStepDeg + planetStepDeg;
  };

  const childScale = getScaleRank(toScope) > getScaleRank(fromScope) ? toScope : fromScope;
  const defaultNodeDeg = FRAME_BY_SCALE[childScale].planeAscendingNodeDeg ?? 0;
  const nodeDeg =
    typeof targetMetadata?.ascendingNodeDeg === 'number' &&
    Number.isFinite(targetMetadata.ascendingNodeDeg)
      ? targetMetadata.ascendingNodeDeg
      : defaultNodeDeg;
  const ascendingNodeRad = nodeDeg * DEG_TO_RADIANS;

  return {
    inclinationRad: (cumulativeDeg(toScope) - cumulativeDeg(fromScope)) * DEG_TO_RADIANS,
    ascendingNodeRad,
    tiltAxis: [Math.cos(ascendingNodeRad), Math.sin(ascendingNodeRad), 0],
  };
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
    if (Number.isNaN(progress) || progress <= 0) return 0;
    return progress >= 1 ? 1 : progress;
  }
  const [start, end] = window;
  if (Number.isNaN(progress) || progress <= start) return 0;
  if (progress >= end || end <= start) return 1;
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
 * Computes the world scene scale multiplier for expand-in (`'in'`) and shrink-out (`'out'`) transitions.
 */
export function computeCrossScaleSceneScale(
  progress: number,
  direction: 'in' | 'out',
  minScale: number = DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG.minSceneScale,
): number {
  const eased = easeOutCubic(normaliseWindowProgress(progress));
  if (direction === 'in') {
    return minScale + (1 - minScale) * eased;
  }
  return 1 - (1 - minScale) * eased;
}

/**
 * Computes the departure layer opacity across a stage progress `[0, 1]`.
 * Holds at `1.0` until `config.departureFadeWindow[0]`, then dissolves `1 -> 0`.
 */
export function computeCrossScaleDepartureFade(
  stageProgress: number,
  config: CrossScaleChoreographyConfig = DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG,
): number {
  return 1 - evaluateWindowedProgress(stageProgress, config.departureFadeWindow);
}

/**
 * Computes the arrival layer opacity across a stage progress `[0, 1]`.
 * Materialises `0 -> 1` over `config.arrivalFadeWindow` using `easeOutCubic`.
 */
export function computeCrossScaleArrivalFade(
  stageProgress: number,
  config: CrossScaleChoreographyConfig = DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG,
): number {
  return evaluateWindowedProgress(stageProgress, config.arrivalFadeWindow);
}

/**
 * Computes the handed-off preview plane opacity across Stage 2 arrival progress `[0, 1]`.
 * Cross-dissolves `1 -> 0` over `config.arrivalPreviewFadeWindow`.
 */
export function computeCrossScalePreviewHandoffOpacity(
  stageProgress: number,
  config: CrossScaleChoreographyConfig = DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG,
): number {
  return 1 - evaluateWindowedProgress(stageProgress, config.arrivalPreviewFadeWindow);
}

/**
 * Computes the clamped maximum radius of the target reference-plane preview disc
 * from the active viewing distance and choreography config.
 */
export function computePlanePreviewMaxRadius(
  distance: number,
  config: CrossScaleChoreographyConfig = DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG,
): number {
  const safeDistance = Number.isFinite(distance) && distance > 0 ? distance : 0;
  return Math.max(config.minPreviewRadius, safeDistance * config.previewRadiusFactor);
}

/**
 * Computes the smoothstep opacity attenuation `[0, 1]` preventing screen-space `OrbitPath`
 * strokes from stacking into an opaque cluster while `sceneScale` is squashed near `minSceneScale`.
 */
export function computeCrossScaleOrbitAttenuation(
  sceneScale: number,
  config: CrossScaleChoreographyConfig = DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG,
): number {
  const fullScale = config.orbitSquashFullScale;
  const minScale = config.minSceneScale;
  if (!Number.isFinite(sceneScale) || sceneScale >= fullScale || fullScale <= minScale) {
    return 1;
  }
  if (sceneScale <= minScale) {
    return 0;
  }
  const t = (sceneScale - minScale) / (fullScale - minScale);
  return t * t * (3 - 2 * t);
}
