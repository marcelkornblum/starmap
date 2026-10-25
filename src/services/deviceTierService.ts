/**
 * Hardware tiering and client memory budgeting service.
 *
 * Implements strict Frontier-defined hardware classification and dynamic buffer sizing
 * based on device capabilities (CPU cores, memory, WebGL constraints, saveData).
 */

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

export const DEVICE_TIER_BUDGETS: Readonly<Record<DevicePerformanceTier, DeviceTierBudget>> = {
  tier1: {
    tier: 'tier1',
    maxActivePoints: 75_000,
    maxBufferBytes: 1_572_864, // 1.5 MB
    maxActiveSectors: 12,
    lruCacheMaxSectors: 16,
    prefetchRingRadius: 1,
    maxCameraDistancePc: 50,
    maxGpuUploadsPerFrame: 1,
  },
  tier2: {
    tier: 'tier2',
    maxActivePoints: 200_000,
    maxBufferBytes: 5_242_880, // 5.0 MB
    maxActiveSectors: 27,
    lruCacheMaxSectors: 40,
    prefetchRingRadius: 2,
    maxCameraDistancePc: 100,
    maxGpuUploadsPerFrame: 2,
  },
  tier3: {
    tier: 'tier3',
    maxActivePoints: 350_000,
    maxBufferBytes: 15_728_640, // 15.0 MB
    maxActiveSectors: 64,
    lruCacheMaxSectors: 80,
    prefetchRingRadius: 2,
    maxCameraDistancePc: 250,
    maxGpuUploadsPerFrame: 2,
  },
} as const;

interface NetworkInformationLike {
  readonly saveData?: boolean;
}

interface NavigatorCapabilitiesLike {
  readonly deviceMemory?: number;
  readonly hardwareConcurrency?: number;
  readonly connection?: NetworkInformationLike;
}

/**
 * Safely probes browser hardware capabilities, handling SSR and missing APIs cleanly.
 */
export function probeBrowserDeviceCapabilities(): DeviceCapabilitiesInput {
  if (
    typeof globalThis === 'undefined' ||
    typeof globalThis.navigator === 'undefined' ||
    globalThis.navigator === null
  ) {
    return {};
  }

  try {
    const nav = globalThis.navigator as unknown as NavigatorCapabilitiesLike;
    return {
      ...(typeof nav.deviceMemory === 'number' ? { deviceMemory: nav.deviceMemory } : {}),
      ...(typeof nav.hardwareConcurrency === 'number'
        ? { hardwareConcurrency: nav.hardwareConcurrency }
        : {}),
      ...(typeof nav.connection?.saveData === 'boolean'
        ? { saveData: nav.connection.saveData }
        : {}),
    };
  } catch {
    return {};
  }
}

/**
 * Classifies device performance tier based on hardware capabilities and WebGL constraints.
 */
export function classifyDeviceTier(input?: DeviceCapabilitiesInput): DevicePerformanceTier {
  const caps = input ?? probeBrowserDeviceCapabilities();

  // Low-resource or constrained environment downgrades immediately to tier1
  if (
    caps.saveData === true ||
    (caps.deviceMemory !== undefined && caps.deviceMemory <= 4) ||
    (caps.hardwareConcurrency !== undefined && caps.hardwareConcurrency <= 4) ||
    (caps.maxTextureSize !== undefined && caps.maxTextureSize < 4096) ||
    (caps.maxVertexAttribs !== undefined && caps.maxVertexAttribs < 16)
  ) {
    return 'tier1';
  }

  // Tier 3 requires 8+ GB RAM (or unknown in privacy-preserving browsers), 8+ cores, and adequate WebGL
  const hasAdequateMemory = caps.deviceMemory === undefined || caps.deviceMemory >= 8;
  const hasAdequateCores = caps.hardwareConcurrency !== undefined && caps.hardwareConcurrency >= 8;
  const hasAdequateTexture = caps.maxTextureSize === undefined || caps.maxTextureSize >= 8192;

  if (hasAdequateMemory && hasAdequateCores && hasAdequateTexture) {
    return 'tier3';
  }

  return 'tier2';
}

/**
 * Returns the exact memory and point budget for a given tier or capabilities input.
 */
export function getDeviceTierBudget(
  inputOrTier?: DevicePerformanceTier | DeviceCapabilitiesInput,
): DeviceTierBudget {
  if (
    typeof inputOrTier === 'string' &&
    (inputOrTier === 'tier1' || inputOrTier === 'tier2' || inputOrTier === 'tier3')
  ) {
    return DEVICE_TIER_BUDGETS[inputOrTier];
  }

  const tier = classifyDeviceTier(inputOrTier);
  return DEVICE_TIER_BUDGETS[tier];
}

/**
 * Estimates the minimum number of cubic sectors required to encompass a sphere of cameraDistancePc.
 */
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

/**
 * Derives the maximum safe camera distance (in parsecs) based on the tier's memory and sector budgets.
 */
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
      : 1;

  const maxSectorsFromMemory = Math.floor(budget.maxBufferBytes / avgBytesPerSector);
  const maxSectors = Math.max(1, Math.min(budget.maxActiveSectors, maxSectorsFromMemory));

  const rawDist = sectorSizePc * Math.cbrt((3 * maxSectors) / (4 * Math.PI)) * 2.2;
  return Math.min(budget.maxCameraDistancePc, Math.max(minDistancePc, rawDist));
}

/**
 * Clamps a requested camera distance to the safe memory budget range, locking out zoom-out
 * if memory is currently saturated.
 */
export function clampCameraDistanceToMemoryBudget(
  requestedDistancePc: number,
  budget: DeviceTierBudget,
  options?: ClampCameraDistanceOptions,
): number {
  const rawMinDist = options?.minDistancePc;
  const minDistancePc =
    rawMinDist !== undefined && Number.isFinite(rawMinDist) && rawMinDist > 0
      ? rawMinDist
      : 1;
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

/**
 * Returns true if an additional sector can be allocated without exceeding sector or byte limits.
 */
export function canAllocateSector(
  budget: DeviceTierBudget,
  currentActiveSectors: number,
  currentAllocatedBytes: number,
  nextSectorBytes: number,
): boolean {
  if (
    !Number.isFinite(currentActiveSectors) ||
    currentActiveSectors < 0 ||
    !Number.isFinite(currentAllocatedBytes) ||
    currentAllocatedBytes < 0 ||
    !Number.isFinite(nextSectorBytes) ||
    nextSectorBytes < 0
  ) {
    return false;
  }

  return (
    currentActiveSectors + 1 <= budget.maxActiveSectors &&
    currentAllocatedBytes + nextSectorBytes <= budget.maxBufferBytes
  );
}
