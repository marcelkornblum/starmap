/**
 * Device tier profiles, hardware capability probing, and GPU heuristics.
 *
 * Defines raw tier resource profiles, viewport aperture cutoffs, and device
 * capabilities classification logic extracted from deviceTierService.
 */

export interface DeviceTierProfileRecord {
  readonly maxActivePoints: number;
  readonly maxActiveEntities: number;
  readonly maxBufferBytes: number;
  readonly maxActiveSectors: number;
  readonly lruCacheMaxSectors: number;
  readonly prefetchRingRadius: number;
  readonly maxCameraDistancePc: number;
  readonly maxGpuUploadsPerFrame: number;
}

export const TIER_PROFILE_RECORDS: Readonly<Record<'tier1' | 'tier2' | 'tier3', DeviceTierProfileRecord>> = {
  tier1: {
    maxActivePoints: 75_000,
    maxActiveEntities: 450,
    maxBufferBytes: 1_572_864, // 1.5 MB
    maxActiveSectors: 12,
    lruCacheMaxSectors: 16,
    prefetchRingRadius: 1,
    maxCameraDistancePc: 75,
    maxGpuUploadsPerFrame: 1,
  },
  tier2: {
    maxActivePoints: 200_000,
    maxActiveEntities: 750,
    maxBufferBytes: 5_242_880, // 5.0 MB
    maxActiveSectors: 27,
    lruCacheMaxSectors: 40,
    prefetchRingRadius: 2,
    maxCameraDistancePc: 150,
    maxGpuUploadsPerFrame: 2,
  },
  tier3: {
    maxActivePoints: 350_000,
    maxActiveEntities: 1200,
    maxBufferBytes: 15_728_640, // 15.0 MB
    maxActiveSectors: 64,
    lruCacheMaxSectors: 80,
    prefetchRingRadius: 2,
    maxCameraDistancePc: 375,
    maxGpuUploadsPerFrame: 2,
  },
} as const;

export const APERTURE_ACTIVE_CUTOFF_MOBILE = 40;
export const APERTURE_ACTIVE_CUTOFF_TABLET = 60;
export const APERTURE_ACTIVE_CUTOFF_DESKTOP = 96;

export function resolveApertureCutoffForViewportWidth(widthPx?: number): number {
  const resolvedWidth =
    widthPx !== undefined && Number.isFinite(widthPx) && widthPx > 0
      ? widthPx
      : typeof globalThis !== 'undefined' &&
          typeof (globalThis as { innerWidth?: number }).innerWidth === 'number' &&
          (globalThis as { innerWidth: number }).innerWidth > 0
        ? (globalThis as { innerWidth: number }).innerWidth
        : 1440;

  if (resolvedWidth <= 767) {
    return APERTURE_ACTIVE_CUTOFF_MOBILE;
  }
  if (resolvedWidth < 1024) {
    return APERTURE_ACTIVE_CUTOFF_TABLET;
  }
  return APERTURE_ACTIVE_CUTOFF_DESKTOP;
}

interface NetworkInformationLike {
  readonly saveData?: boolean;
}

interface NavigatorCapabilitiesLike {
  readonly deviceMemory?: number;
  readonly hardwareConcurrency?: number;
  readonly connection?: NetworkInformationLike;
}

export interface HardwareCapabilities {
  deviceMemory?: number;
  hardwareConcurrency?: number;
  maxVertexAttribs?: number;
  maxTextureSize?: number;
  saveData?: boolean;
}

export function probeNavigatorHardwareCapabilities(): HardwareCapabilities {
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
 * Recognises software rasterizers and low-resource virtualized WebGL renderers.
 */
export function isConstrainedGpuRenderer(rendererString?: string): boolean {
  if (!rendererString) return false;
  const lower = rendererString.toLowerCase();
  return (
    lower.includes('swiftshader') ||
    lower.includes('llvmpipe') ||
    lower.includes('software rasterizer') ||
    lower.includes('lavapipe') ||
    lower.includes('virgl') ||
    lower.includes('virtualbox') ||
    lower.includes('basic render driver')
  );
}

/**
 * Recognises high-performance discrete GPUs and Apple Silicon M-series chips.
 */
export function isHighPerformanceGpuRenderer(rendererString?: string): boolean {
  if (!rendererString) return false;
  const lower = rendererString.toLowerCase();
  return (
    lower.includes('apple m') ||
    lower.includes('rtx') ||
    lower.includes('radeon pro') ||
    lower.includes('geforce gtx') ||
    lower.includes('quadro')
  );
}

export function classifyHardwareTier(
  caps?: HardwareCapabilities,
  gpuRenderer?: string,
): 'tier1' | 'tier2' | 'tier3' {
  const resolved: HardwareCapabilities = caps ?? probeNavigatorHardwareCapabilities();

  if (
    resolved.saveData === true ||
    (resolved.deviceMemory !== undefined && resolved.deviceMemory <= 4) ||
    (resolved.hardwareConcurrency !== undefined && resolved.hardwareConcurrency <= 4) ||
    (resolved.maxTextureSize !== undefined && resolved.maxTextureSize < 4096) ||
    (resolved.maxVertexAttribs !== undefined && resolved.maxVertexAttribs < 16) ||
    isConstrainedGpuRenderer(gpuRenderer)
  ) {
    return 'tier1';
  }

  const hasAdequateMemory = resolved.deviceMemory === undefined || resolved.deviceMemory >= 8;
  const hasAdequateCores =
    resolved.hardwareConcurrency !== undefined && resolved.hardwareConcurrency >= 8;
  const hasAdequateTexture =
    resolved.maxTextureSize === undefined || resolved.maxTextureSize >= 8192;

  if (hasAdequateMemory && hasAdequateCores && hasAdequateTexture) {
    return 'tier3';
  }

  return 'tier2';
}
