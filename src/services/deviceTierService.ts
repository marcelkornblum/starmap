/**
 * Hardware tiering and client memory budgeting service.
 *
 * Implements strict Frontier-defined hardware classification and dynamic buffer sizing
 * based on device capabilities (CPU cores, memory, WebGL constraints, saveData).
 */

import {
  TIER_PROFILE_RECORDS,
  resolveApertureCutoffForViewportWidth,
  probeNavigatorHardwareCapabilities,
  classifyHardwareTier,
} from './deviceTierProfiles';

export type DevicePerformanceTier = 'tier1' | 'tier2' | 'tier3';

export interface DeviceCapabilitiesInput {
  readonly deviceMemory?: number;
  readonly hardwareConcurrency?: number;
  readonly maxVertexAttribs?: number;
  readonly maxTextureSize?: number;
  readonly saveData?: boolean;
}

export interface DeviceTierBudget {
  readonly tier: DevicePerformanceTier;
  readonly maxActivePoints: number;
  readonly maxActiveEntities: number;
  readonly maxBufferBytes: number;
  readonly maxActiveSectors: number;
  readonly lruCacheMaxSectors: number;
  readonly prefetchRingRadius: number;
  readonly maxCameraDistancePc: number;
  readonly maxGpuUploadsPerFrame: number;
}

export interface CameraDistanceBudgetOptions {
  readonly avgBytesPerSector?: number;
  readonly sectorSizePc?: number;
  readonly minDistancePc?: number;
}

export interface ClampCameraDistanceOptions extends CameraDistanceBudgetOptions {
  readonly currentAllocatedBytes?: number;
  readonly currentDistancePc?: number;
}

export interface CeilingCameraDistanceOptions {
  readonly ceilingApertureRadiusPc?: number | null;
  readonly referenceApertureRadiusPc?: number;
  readonly referenceCameraDistancePc?: number;
  readonly zoomOutMultiplier?: number;
  readonly minDistancePc?: number;
}

export const ACTIVE_CEILING_ZOOM_OUT_MULTIPLIER = 2.25;
export const MEAN_CATALOG_STARS_PER_CUBIC_PC = 751.5 / (25 * 25 * 25);

export const DEFAULT_REFERENCE_APERTURE_RADIUS_PC = 10;
export const DEFAULT_REFERENCE_CAMERA_DISTANCE_PC = 34.9;
export const DEFAULT_MIN_CAMERA_DISTANCE_PC = 1;

export const APERTURE_ACTIVE_CUTOFF_MOBILE = 40;
export const APERTURE_ACTIVE_CUTOFF_TABLET = 60;
export const APERTURE_ACTIVE_CUTOFF_DESKTOP = 96;

export function getApertureActiveCutoffForViewportWidth(widthPx?: number): number {
  return resolveApertureCutoffForViewportWidth(widthPx);
}

export const DEVICE_TIER_BUDGETS: Readonly<Record<DevicePerformanceTier, DeviceTierBudget>> = {
  tier1: { tier: 'tier1', ...TIER_PROFILE_RECORDS.tier1 },
  tier2: { tier: 'tier2', ...TIER_PROFILE_RECORDS.tier2 },
  tier3: { tier: 'tier3', ...TIER_PROFILE_RECORDS.tier3 },
} as const;

export function probeBrowserDeviceCapabilities(): DeviceCapabilitiesInput {
  return probeNavigatorHardwareCapabilities();
}

export function classifyDeviceTier(input?: DeviceCapabilitiesInput): DevicePerformanceTier {
  return classifyHardwareTier(input ?? probeBrowserDeviceCapabilities());
}

export function getDeviceTierBudget(
  inputOrTier?: DevicePerformanceTier | DeviceCapabilitiesInput,
): DeviceTierBudget {
  if (
    typeof inputOrTier === 'string' &&
    (inputOrTier === 'tier1' || inputOrTier === 'tier2' || inputOrTier === 'tier3')
  ) {
    return DEVICE_TIER_BUDGETS[inputOrTier];
  }
  return DEVICE_TIER_BUDGETS[classifyDeviceTier(inputOrTier)];
}

export function estimateRequiredSectorsForDistance(
  cameraDistancePc: number,
  sectorSizePc = 25,
): number {
  if (!Number.isFinite(cameraDistancePc) || cameraDistancePc <= 0) {
    return 1;
  }

  const effectiveSectorSize = Number.isFinite(sectorSizePc) && sectorSizePc > 0 ? sectorSizePc : 25;
  const sphericalVolume = (4 / 3) * Math.PI * cameraDistancePc ** 3;
  const sectorVolume = effectiveSectorSize ** 3;
  return Math.max(1, Math.ceil(sphericalVolume / sectorVolume));
}

export function computeMaxSafeCameraDistancePc(
  budget: DeviceTierBudget,
  options?: CameraDistanceBudgetOptions,
): number {
  const rawAvgBytes = options?.avgBytesPerSector;
  const avgBytesPerSector =
    rawAvgBytes !== undefined && Number.isFinite(rawAvgBytes) && rawAvgBytes > 0
      ? rawAvgBytes
      : 12_024;

  const rawSectorSize = options?.sectorSizePc;
  const sectorSizePc =
    rawSectorSize !== undefined && Number.isFinite(rawSectorSize) && rawSectorSize > 0
      ? rawSectorSize
      : 25;

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

export function computeCeilingMaxCameraDistancePc(
  budget: DeviceTierBudget,
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
  return Math.min(maxSafe, Math.max(minDistancePc, cappedDist));
}

export function clampCameraDistanceToMemoryBudget(
  requestedDistancePc: number,
  budget: DeviceTierBudget,
  options?: ClampCameraDistanceOptions,
): number {
  const rawMinDist = options?.minDistancePc;
  const minDistancePc =
    rawMinDist !== undefined && Number.isFinite(rawMinDist) && rawMinDist > 0
      ? rawMinDist
      : DEFAULT_MIN_CAMERA_DISTANCE_PC;
  const maxSafe = computeMaxSafeCameraDistancePc(budget, options);

  let sanitizedRequested = requestedDistancePc;
  if (!Number.isFinite(sanitizedRequested) || sanitizedRequested < minDistancePc) {
    sanitizedRequested = minDistancePc;
  }

  if (
    options?.currentAllocatedBytes !== undefined &&
    Number.isFinite(options.currentAllocatedBytes) &&
    options.currentAllocatedBytes >= budget.maxBufferBytes &&
    options.currentDistancePc !== undefined &&
    Number.isFinite(options.currentDistancePc)
  ) {
    const cappedMax = Math.min(maxSafe, Math.max(minDistancePc, options.currentDistancePc));
    return Math.min(cappedMax, Math.max(minDistancePc, sanitizedRequested));
  }

  return Math.min(maxSafe, Math.max(minDistancePc, sanitizedRequested));
}

export function canAllocateSector(
  budget: DeviceTierBudget,
  currentActiveSectors: number,
  currentAllocatedBytes: number,
  nextSectorBytes: number,
): boolean {
  if (
    !Number.isFinite(currentActiveSectors) || currentActiveSectors < 0 ||
    !Number.isFinite(currentAllocatedBytes) || currentAllocatedBytes < 0 ||
    !Number.isFinite(nextSectorBytes) || nextSectorBytes < 0
  ) {
    return false;
  }

  return (
    currentActiveSectors + 1 <= budget.maxActiveSectors &&
    currentAllocatedBytes + nextSectorBytes <= budget.maxBufferBytes
  );
}
