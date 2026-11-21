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

export interface WebGLGpuTelemetry {
  readonly gpuRenderer?: string;
  readonly maxTextureSize?: number;
  readonly maxVertexAttribs?: number;
}

export interface HardwareCapabilities {
  deviceMemory?: number;
  hardwareConcurrency?: number;
  maxVertexAttribs?: number;
  maxTextureSize?: number;
  gpuRenderer?: string;
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

/**
 * Safely extracts WebGL GPU renderer and capability limits from a rendering context.
 */
export function extractWebGLGpuTelemetry(
  gl: WebGLRenderingContext | WebGL2RenderingContext | null | undefined,
): WebGLGpuTelemetry {
  if (!gl || typeof gl.getParameter !== 'function') {
    return {};
  }

  let maxTextureSize: number | undefined;
  let maxVertexAttribs: number | undefined;
  let gpuRenderer: string | undefined;

  try {
    const rawTexSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    if (typeof rawTexSize === 'number' && Number.isFinite(rawTexSize) && rawTexSize > 0) {
      maxTextureSize = rawTexSize;
    }
  } catch {
    // Ignore WebGL parameter probe errors
  }

  try {
    const rawAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
    if (typeof rawAttribs === 'number' && Number.isFinite(rawAttribs) && rawAttribs > 0) {
      maxVertexAttribs = rawAttribs;
    }
  } catch {
    // Ignore WebGL parameter probe errors
  }

  try {
    let rawRenderer: unknown;
    if (typeof gl.getExtension === 'function') {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo && typeof debugInfo.UNMASKED_RENDERER_WEBGL === 'number') {
        rawRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      }
    }
    if (typeof rawRenderer !== 'string' || rawRenderer.trim().length === 0) {
      rawRenderer = gl.getParameter(gl.RENDERER);
    }
    if (typeof rawRenderer === 'string' && rawRenderer.trim().length > 0) {
      gpuRenderer = rawRenderer.trim();
    }
  } catch {
    // Ignore WebGL renderer probe errors
  }

  return {
    ...(gpuRenderer !== undefined ? { gpuRenderer } : {}),
    ...(maxTextureSize !== undefined ? { maxTextureSize } : {}),
    ...(maxVertexAttribs !== undefined ? { maxVertexAttribs } : {}),
  };
}

export function classifyHardwareTier(
  caps?: HardwareCapabilities,
  gpuRenderer?: string,
): 'tier1' | 'tier2' | 'tier3' {
  const resolved: HardwareCapabilities = caps ?? probeNavigatorHardwareCapabilities();
  const resolvedGpuRenderer = gpuRenderer ?? resolved.gpuRenderer;

  if (
    resolved.saveData === true ||
    (resolved.deviceMemory !== undefined && resolved.deviceMemory <= 4) ||
    (resolved.hardwareConcurrency !== undefined && resolved.hardwareConcurrency <= 4) ||
    (resolved.maxTextureSize !== undefined && resolved.maxTextureSize < 4096) ||
    (resolved.maxVertexAttribs !== undefined && resolved.maxVertexAttribs < 16) ||
    isConstrainedGpuRenderer(resolvedGpuRenderer)
  ) {
    return 'tier1';
  }

  const hasAdequateTexture =
    resolved.maxTextureSize === undefined || resolved.maxTextureSize >= 8192;
  const isHighPerfGpu = isHighPerformanceGpuRenderer(resolvedGpuRenderer);

  if (isHighPerfGpu && hasAdequateTexture) {
    return 'tier3';
  }

  const hasAdequateCores =
    resolved.hardwareConcurrency !== undefined && resolved.hardwareConcurrency >= 8;

  if (resolved.deviceMemory !== undefined) {
    if (resolved.deviceMemory >= 8 && hasAdequateCores && hasAdequateTexture) {
      return 'tier3';
    }
  } else {
    const hasPositiveGpuEvidence =
      isHighPerfGpu ||
      (resolved.maxTextureSize !== undefined && resolved.maxTextureSize >= 16384);
    if (hasAdequateCores && hasPositiveGpuEvidence && hasAdequateTexture) {
      return 'tier3';
    }
  }

  return 'tier2';
}

/**
 * Resolves capped initial canvas DPR for the classified device tier.
 */
export function resolveInitialDprForTier(
  tier: 'tier1' | 'tier2' | 'tier3',
  gpuRenderer?: string,
  nativeDpr?: number,
): number {
  const rawDpr =
    nativeDpr !== undefined && Number.isFinite(nativeDpr) && nativeDpr > 0
      ? nativeDpr
      : typeof globalThis !== 'undefined' &&
          typeof (globalThis as { devicePixelRatio?: number }).devicePixelRatio === 'number' &&
          Number.isFinite((globalThis as { devicePixelRatio: number }).devicePixelRatio) &&
          (globalThis as { devicePixelRatio: number }).devicePixelRatio > 0
        ? (globalThis as { devicePixelRatio: number }).devicePixelRatio
        : 1;

  const clampedNative = Math.max(1, rawDpr);

  if (tier === 'tier1' || isConstrainedGpuRenderer(gpuRenderer)) {
    return 1;
  }
  if (tier === 'tier2') {
    return Math.min(clampedNative, 1.5);
  }
  return Math.min(clampedNative, 2);
}
