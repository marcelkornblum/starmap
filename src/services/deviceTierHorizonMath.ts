/**
 * Pure zero-allocation horizon and frustum geometry helpers for camera ceiling clamping.
 *
 * Keeps starfield horizon radius and perspective frustum corners inside the loaded dense
 * catalog boundary and active sector coverage while permitting distant-target bypass.
 */

import { DEFAULT_SECTOR_SIZE_PC } from '../utils/sectorMath';
import type { DeviceTierProfileRecord } from './deviceTierProfiles';

export const DEFAULT_REFERENCE_APERTURE_RADIUS_PC = 10;
export const DEFAULT_REFERENCE_CAMERA_DISTANCE_PC = 34.9;
export const DEFAULT_DENSE_CATALOG_RADIUS_PC = 100;
export const DEFAULT_DENSE_EDGE_MARGIN_PC = 8;
export const DEFAULT_HORIZON_APERTURE_RATIO = 2.4;
export const DEFAULT_GALACTIC_FOV_DEG = 45;
export const DEFAULT_AVG_BYTES_PER_SECTOR = 12_024;

export const ACTIVE_CEILING_ZOOM_OUT_MULTIPLIER = 2.25;
export const MEAN_CATALOG_STARS_PER_CUBIC_PC =
  751.5 / (DEFAULT_SECTOR_SIZE_PC * DEFAULT_SECTOR_SIZE_PC * DEFAULT_SECTOR_SIZE_PC);
export const DEFAULT_MIN_CAMERA_DISTANCE_PC = 1;

export interface HorizonReachOptions {
  readonly referenceApertureRadiusPc?: number;
  readonly referenceCameraDistancePc?: number;
  readonly horizonApertureRatio?: number;
  readonly fovDeg?: number;
  readonly viewportAspect?: number;
}

export interface ActiveSectorHorizonCoverOptions {
  readonly avgBytesPerSector?: number;
  readonly sectorSizePc?: number;
}

export interface DenseHorizonCeilingClampOptions extends HorizonReachOptions {
  readonly denseCatalogRadiusPc?: number;
  readonly targetDistFromSolPc?: number;
  readonly edgeMarginPc?: number;
  readonly enforceActiveSectorCoverage?: boolean;
}

export interface CameraDistanceBudgetOptions {
  readonly avgBytesPerSector?: number;
  readonly sectorSizePc?: number;
  readonly minDistancePc?: number;
}

export interface CeilingCameraDistanceOptions extends DenseHorizonCeilingClampOptions {
  readonly ceilingApertureRadiusPc?: number | null;
  readonly zoomOutMultiplier?: number;
  readonly minDistancePc?: number;
}

/**
 * Computes world-space radial reach per parsec of camera distance, taking the maximum of
 * the starfield horizon sphere ratio and the perspective frustum corner reach when an
 * aspect ratio is provided.
 */
export function computeHorizonReachPerCameraDist(options?: HorizonReachOptions): number {
  const rawRefAperture = options?.referenceApertureRadiusPc;
  const safeRefAperture =
    rawRefAperture !== undefined && Number.isFinite(rawRefAperture) && rawRefAperture > 0
      ? rawRefAperture
      : DEFAULT_REFERENCE_APERTURE_RADIUS_PC;

  const rawRefCamDist = options?.referenceCameraDistancePc;
  const safeRefCamDist =
    rawRefCamDist !== undefined && Number.isFinite(rawRefCamDist) && rawRefCamDist > 0
      ? rawRefCamDist
      : DEFAULT_REFERENCE_CAMERA_DISTANCE_PC;

  const rawHorizonRatio = options?.horizonApertureRatio;
  const safeHorizonRatio =
    rawHorizonRatio !== undefined && Number.isFinite(rawHorizonRatio) && rawHorizonRatio > 0
      ? rawHorizonRatio
      : DEFAULT_HORIZON_APERTURE_RATIO;

  const rawFovDeg = options?.fovDeg;
  const safeFovDeg =
    rawFovDeg !== undefined && Number.isFinite(rawFovDeg) && rawFovDeg > 0 && rawFovDeg < 180
      ? rawFovDeg
      : DEFAULT_GALACTIC_FOV_DEG;

  const horizonRatio = (safeHorizonRatio * safeRefAperture) / safeRefCamDist;
  const viewportAspect = options?.viewportAspect;

  if (viewportAspect !== undefined && Number.isFinite(viewportAspect) && viewportAspect > 0) {
    const frustumCornerRatio =
      Math.tan((safeFovDeg * Math.PI) / 360) * Math.hypot(1, viewportAspect);
    return Math.max(horizonRatio, frustumCornerRatio);
  }

  return horizonRatio;
}

/**
 * Computes the half-side radius (pc) of the cubic volume covered by the tier's active
 * sector budget, bounded by both `maxActiveSectors` and `maxBufferBytes`.
 */
export function computeActiveSectorHorizonCoverPc(
  budget: Pick<DeviceTierProfileRecord, 'maxBufferBytes' | 'maxActiveSectors'>,
  options?: ActiveSectorHorizonCoverOptions,
): number {
  const rawAvgBytes = options?.avgBytesPerSector;
  const safeAvgBytes =
    rawAvgBytes !== undefined && Number.isFinite(rawAvgBytes) && rawAvgBytes > 0
      ? rawAvgBytes
      : DEFAULT_AVG_BYTES_PER_SECTOR;

  const rawSectorSize = options?.sectorSizePc;
  const safeSectorSizePc =
    rawSectorSize !== undefined && Number.isFinite(rawSectorSize) && rawSectorSize > 0
      ? rawSectorSize
      : DEFAULT_SECTOR_SIZE_PC;

  const maxSectorsFromMemory = Math.floor(budget.maxBufferBytes / safeAvgBytes);
  const maxSectors = Math.max(1, Math.min(budget.maxActiveSectors, maxSectorsFromMemory));

  return 0.5 * Math.cbrt(maxSectors) * safeSectorSizePc;
}

/**
 * Applies horizon-aware dense-catalogue edge clamping to a hardware ceiling distance,
 * bypassing the clamp for distant targets near or outside the dense volume boundary.
 */
export function clampDenseVolumeCeilingDistancePc(
  budget: Pick<DeviceTierProfileRecord, 'maxBufferBytes' | 'maxActiveSectors'>,
  hardwareCeilingDistPc: number,
  minDistancePc: number,
  options?: DenseHorizonCeilingClampOptions,
): number {
  const denseRadius = options?.denseCatalogRadiusPc;
  if (denseRadius === undefined || !Number.isFinite(denseRadius) || denseRadius <= 0) {
    return hardwareCeilingDistPc;
  }

  const edgeMargin =
    options?.edgeMarginPc !== undefined &&
    Number.isFinite(options.edgeMarginPc) &&
    options.edgeMarginPc >= 0
      ? options.edgeMarginPc
      : DEFAULT_DENSE_EDGE_MARGIN_PC;

  const targetDist =
    options?.targetDistFromSolPc !== undefined &&
    Number.isFinite(options.targetDistFromSolPc) &&
    options.targetDistFromSolPc >= 0
      ? options.targetDistFromSolPc
      : 0;

  const denseInnerLimitPc = Math.max(0, denseRadius - edgeMargin);
  if (targetDist >= denseInnerLimitPc) {
    return hardwareCeilingDistPc;
  }

  const availableDenseRadiusPc = denseInnerLimitPc - targetDist;
  const shouldBoundSectorCover = options?.enforceActiveSectorCoverage ?? true;
  const effectiveRadiusLimitPc = shouldBoundSectorCover
    ? Math.min(availableDenseRadiusPc, computeActiveSectorHorizonCoverPc(budget))
    : availableDenseRadiusPc;

  const reachPerCamDist = computeHorizonReachPerCameraDist(options);
  const horizonClampedDistPc = effectiveRadiusLimitPc / Math.max(1e-4, reachPerCamDist);

  return Math.min(hardwareCeilingDistPc, Math.max(minDistancePc, horizonClampedDistPc));
}

/**
 * Computes the maximum safe camera distance (pc) permitted by the tier's active sector
 * and memory budget.
 */
export function computeMaxSafeCameraDistancePc(
  budget: Pick<DeviceTierProfileRecord, 'maxBufferBytes' | 'maxActiveSectors' | 'maxCameraDistancePc'>,
  options?: CameraDistanceBudgetOptions,
): number {
  const rawAvgBytes = options?.avgBytesPerSector;
  const avgBytesPerSector =
    rawAvgBytes !== undefined && Number.isFinite(rawAvgBytes) && rawAvgBytes > 0
      ? rawAvgBytes
      : DEFAULT_AVG_BYTES_PER_SECTOR;

  const rawSectorSize = options?.sectorSizePc;
  const sectorSizePc =
    rawSectorSize !== undefined && Number.isFinite(rawSectorSize) && rawSectorSize > 0
      ? rawSectorSize
      : DEFAULT_SECTOR_SIZE_PC;

  const rawMinDist = options?.minDistancePc;
  const minDistancePc =
    rawMinDist !== undefined && Number.isFinite(rawMinDist) && rawMinDist > 0
      ? rawMinDist
      : DEFAULT_MIN_CAMERA_DISTANCE_PC;

  const maxSectorsFromMemory = Math.floor(budget.maxBufferBytes / avgBytesPerSector);
  const maxSectors = Math.max(1, Math.min(budget.maxActiveSectors, maxSectorsFromMemory));

  const rawDist = sectorSizePc * Math.cbrt((3 * maxSectors) / (4 * Math.PI)) * 3.3;
  return Math.min(budget.maxCameraDistancePc, Math.max(minDistancePc, rawDist));
}

/**
 * Computes the ceiling camera distance (pc) bounded by hardware active-item limits and
 * optional dense-volume horizon clamping.
 */
export function computeCeilingMaxCameraDistancePc(
  budget: Pick<
    DeviceTierProfileRecord,
    'maxBufferBytes' | 'maxActiveSectors' | 'maxCameraDistancePc' | 'maxActiveEntities'
  >,
  options?: CeilingCameraDistanceOptions,
): number {
  const refApertureRadius = options?.referenceApertureRadiusPc ?? DEFAULT_REFERENCE_APERTURE_RADIUS_PC;
  const refCameraDist = options?.referenceCameraDistancePc ?? DEFAULT_REFERENCE_CAMERA_DISTANCE_PC;
  const zoomMultiplier = options?.zoomOutMultiplier ?? ACTIVE_CEILING_ZOOM_OUT_MULTIPLIER;
  const minDistancePc = options?.minDistancePc ?? DEFAULT_MIN_CAMERA_DISTANCE_PC;

  const maxSafe = computeMaxSafeCameraDistancePc(budget, { minDistancePc: options?.minDistancePc });

  let effectiveCeilingRadiusPc: number;
  if (
    options?.ceilingApertureRadiusPc !== undefined &&
    options.ceilingApertureRadiusPc !== null &&
    Number.isFinite(options.ceilingApertureRadiusPc) &&
    options.ceilingApertureRadiusPc > 0
  ) {
    effectiveCeilingRadiusPc = options.ceilingApertureRadiusPc;
  } else {
    effectiveCeilingRadiusPc = Math.cbrt(
      (3 * budget.maxActiveEntities) / (4 * Math.PI * MEAN_CATALOG_STARS_PER_CUBIC_PC),
    );
  }

  const ceilingCameraDist = effectiveCeilingRadiusPc * (refCameraDist / refApertureRadius);
  const cappedDist = ceilingCameraDist * zoomMultiplier;
  const hardwareCeilingDistPc = Math.min(maxSafe, Math.max(minDistancePc, cappedDist));

  return clampDenseVolumeCeilingDistancePc(budget, hardwareCeilingDistPc, minDistancePc, options);
}
