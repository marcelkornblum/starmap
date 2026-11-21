import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  TIER_PROFILE_RECORDS,
  APERTURE_ACTIVE_CUTOFF_MOBILE,
  APERTURE_ACTIVE_CUTOFF_TABLET,
  APERTURE_ACTIVE_CUTOFF_DESKTOP,
  resolveApertureCutoffForViewportWidth,
  probeNavigatorHardwareCapabilities,
  isConstrainedGpuRenderer,
  isHighPerformanceGpuRenderer,
  classifyHardwareTier,
  extractWebGLGpuTelemetry,
  resolveInitialDprForTier,
} from './deviceTierProfiles';

describe('deviceTierProfiles', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('TIER_PROFILE_RECORDS', () => {
    it('defines monotonic budget progression across tier1, tier2, and tier3', () => {
      expect(TIER_PROFILE_RECORDS.tier1.maxActivePoints).toBeLessThan(
        TIER_PROFILE_RECORDS.tier2.maxActivePoints,
      );
      expect(TIER_PROFILE_RECORDS.tier2.maxActivePoints).toBeLessThan(
        TIER_PROFILE_RECORDS.tier3.maxActivePoints,
      );
      expect(TIER_PROFILE_RECORDS.tier1.maxBufferBytes).toBe(1_572_864);
      expect(TIER_PROFILE_RECORDS.tier2.maxBufferBytes).toBe(5_242_880);
      expect(TIER_PROFILE_RECORDS.tier3.maxBufferBytes).toBe(15_728_640);
    });
  });

  describe('resolveApertureCutoffForViewportWidth', () => {
    it('returns mobile cutoff for width <= 767', () => {
      expect(resolveApertureCutoffForViewportWidth(390)).toBe(APERTURE_ACTIVE_CUTOFF_MOBILE);
      expect(resolveApertureCutoffForViewportWidth(767)).toBe(APERTURE_ACTIVE_CUTOFF_MOBILE);
    });

    it('returns tablet cutoff for 768 <= width < 1024', () => {
      expect(resolveApertureCutoffForViewportWidth(768)).toBe(APERTURE_ACTIVE_CUTOFF_TABLET);
      expect(resolveApertureCutoffForViewportWidth(1023)).toBe(APERTURE_ACTIVE_CUTOFF_TABLET);
    });

    it('returns desktop cutoff for width >= 1024', () => {
      expect(resolveApertureCutoffForViewportWidth(1024)).toBe(APERTURE_ACTIVE_CUTOFF_DESKTOP);
      expect(resolveApertureCutoffForViewportWidth(1920)).toBe(APERTURE_ACTIVE_CUTOFF_DESKTOP);
    });

    it('falls back to window.innerWidth or default 1440 when width is undefined', () => {
      vi.stubGlobal('innerWidth', 800);
      expect(resolveApertureCutoffForViewportWidth()).toBe(APERTURE_ACTIVE_CUTOFF_TABLET);
    });
  });

  describe('probeNavigatorHardwareCapabilities', () => {
    it('returns empty object when navigator is undefined', () => {
      vi.stubGlobal('navigator', undefined);
      expect(probeNavigatorHardwareCapabilities()).toEqual({});
    });

    it('reads memory, concurrency, and saveData from navigator', () => {
      vi.stubGlobal('navigator', {
        deviceMemory: 16,
        hardwareConcurrency: 8,
        connection: { saveData: true },
      });
      expect(probeNavigatorHardwareCapabilities()).toEqual({
        deviceMemory: 16,
        hardwareConcurrency: 8,
        saveData: true,
      });
    });
  });

  describe('GPU Renderer Heuristics', () => {
    it('identifies constrained software renderers', () => {
      expect(isConstrainedGpuRenderer('Google SwiftShader')).toBe(true);
      expect(isConstrainedGpuRenderer('llvmpipe (LLVM 12.0.0, 256 bits)')).toBe(true);
      expect(isConstrainedGpuRenderer('Software Rasterizer')).toBe(true);
      expect(isConstrainedGpuRenderer('Microsoft Basic Render Driver')).toBe(true);
      expect(isConstrainedGpuRenderer('NVIDIA GeForce RTX 4090')).toBe(false);
      expect(isConstrainedGpuRenderer(undefined)).toBe(false);
    });

    it('identifies high performance GPUs', () => {
      expect(isHighPerformanceGpuRenderer('Apple M2 Max')).toBe(true);
      expect(isHighPerformanceGpuRenderer('NVIDIA GeForce RTX 3080')).toBe(true);
      expect(isHighPerformanceGpuRenderer('AMD Radeon Pro 5500M')).toBe(true);
      expect(isHighPerformanceGpuRenderer('Intel UHD Graphics 620')).toBe(false);
      expect(isHighPerformanceGpuRenderer(undefined)).toBe(false);
    });
  });

  describe('classifyHardwareTier', () => {
    it('downgrades to tier1 if constrained GPU renderer is detected', () => {
      const tier = classifyHardwareTier(
        { deviceMemory: 16, hardwareConcurrency: 16 },
        'Google SwiftShader',
      );
      expect(tier).toBe('tier1');
    });

    it('classifies tier3 for high spec hardware', () => {
      const tier = classifyHardwareTier({
        deviceMemory: 16,
        hardwareConcurrency: 8,
        maxTextureSize: 16384,
      });
      expect(tier).toBe('tier3');
    });

    it('classifies tier2 for balanced mid-range hardware', () => {
      const tier = classifyHardwareTier({
        deviceMemory: 6,
        hardwareConcurrency: 6,
        maxTextureSize: 4096,
      });
      expect(tier).toBe('tier2');
    });

    it('keeps undefined deviceMemory with >= 8 cores at tier2 without positive GPU evidence', () => {
      expect(
        classifyHardwareTier({
          deviceMemory: undefined,
          hardwareConcurrency: 8,
        }),
      ).toBe('tier2');
      expect(
        classifyHardwareTier({
          deviceMemory: undefined,
          hardwareConcurrency: 16,
          maxTextureSize: 8192,
        }),
      ).toBe('tier2');
    });

    it('promotes undefined deviceMemory with >= 8 cores to tier3 when maxTextureSize >= 16384 or high-performance GPU is detected', () => {
      expect(
        classifyHardwareTier({
          deviceMemory: undefined,
          hardwareConcurrency: 8,
          maxTextureSize: 16384,
        }),
      ).toBe('tier3');
      expect(
        classifyHardwareTier(
          {
            deviceMemory: undefined,
            hardwareConcurrency: 8,
          },
          'Apple M2 Max',
        ),
      ).toBe('tier3');
    });

    it('promotes high-performance GPU renderer to tier3 unless tier1 disqualifier or maxTextureSize < 8192 applies', () => {
      expect(
        classifyHardwareTier(
          { deviceMemory: 8, hardwareConcurrency: 6 },
          'NVIDIA GeForce RTX 4090',
        ),
      ).toBe('tier3');
      expect(
        classifyHardwareTier(
          { deviceMemory: 8, hardwareConcurrency: 6, maxTextureSize: 4096 },
          'NVIDIA GeForce RTX 4090',
        ),
      ).toBe('tier2');
      expect(
        classifyHardwareTier(
          { deviceMemory: 4, hardwareConcurrency: 16 },
          'NVIDIA GeForce RTX 4090',
        ),
      ).toBe('tier1');
    });
  });

  describe('extractWebGLGpuTelemetry', () => {
    it('returns empty telemetry for null/undefined or minimal mock contexts', () => {
      expect(extractWebGLGpuTelemetry(null)).toEqual({});
      expect(extractWebGLGpuTelemetry(undefined)).toEqual({});
      expect(extractWebGLGpuTelemetry({} as WebGLRenderingContext)).toEqual({});
    });

    it('extracts UNMASKED_RENDERER_WEBGL, MAX_TEXTURE_SIZE, and MAX_VERTEX_ATTRIBS safely', () => {
      const UNMASKED_RENDERER_WEBGL = 0x9246;
      const mockGl = {
        MAX_TEXTURE_SIZE: 0x0d33,
        MAX_VERTEX_ATTRIBS: 0x8869,
        RENDERER: 0x1f01,
        getExtension: vi.fn((name: string) =>
          name === 'WEBGL_debug_renderer_info' ? { UNMASKED_RENDERER_WEBGL } : null,
        ),
        getParameter: vi.fn((param: number) => {
          if (param === 0x0d33) return 16384;
          if (param === 0x8869) return 16;
          if (param === UNMASKED_RENDERER_WEBGL) return 'ANGLE (Apple, Apple M2 Max, OpenGL 4.1)';
          return 'WebKit WebGL';
        }),
      } as unknown as WebGLRenderingContext;

      expect(extractWebGLGpuTelemetry(mockGl)).toEqual({
        gpuRenderer: 'ANGLE (Apple, Apple M2 Max, OpenGL 4.1)',
        maxTextureSize: 16384,
        maxVertexAttribs: 16,
      });
    });

    it('falls back to gl.RENDERER when WEBGL_debug_renderer_info is unavailable', () => {
      const mockGl = {
        MAX_TEXTURE_SIZE: 0x0d33,
        MAX_VERTEX_ATTRIBS: 0x8869,
        RENDERER: 0x1f01,
        getExtension: vi.fn(() => null),
        getParameter: vi.fn((param: number) => {
          if (param === 0x0d33) return 8192;
          if (param === 0x8869) return 16;
          if (param === 0x1f01) return 'Google SwiftShader';
          return null;
        }),
      } as unknown as WebGLRenderingContext;

      expect(extractWebGLGpuTelemetry(mockGl)).toEqual({
        gpuRenderer: 'Google SwiftShader',
        maxTextureSize: 8192,
        maxVertexAttribs: 16,
      });
    });

    it('swallows WebGL probe errors safely via try/catch', () => {
      const throwingGl = {
        MAX_TEXTURE_SIZE: 0x0d33,
        MAX_VERTEX_ATTRIBS: 0x8869,
        RENDERER: 0x1f01,
        getExtension: vi.fn(() => {
          throw new Error('extension blocked');
        }),
        getParameter: vi.fn(() => {
          throw new Error('context lost');
        }),
      } as unknown as WebGLRenderingContext;

      expect(extractWebGLGpuTelemetry(throwingGl)).toEqual({});
    });
  });

  describe('resolveInitialDprForTier', () => {
    it('forces DPR 1 for tier1 or constrained GPU renderers', () => {
      expect(resolveInitialDprForTier('tier1', undefined, 3)).toBe(1);
      expect(resolveInitialDprForTier('tier3', 'Google SwiftShader', 2)).toBe(1);
    });

    it('caps tier2 DPR to [1, 1.5]', () => {
      expect(resolveInitialDprForTier('tier2', undefined, 1)).toBe(1);
      expect(resolveInitialDprForTier('tier2', undefined, 1.25)).toBe(1.25);
      expect(resolveInitialDprForTier('tier2', undefined, 2)).toBe(1.5);
    });

    it('caps tier3 DPR to [1, 2]', () => {
      expect(resolveInitialDprForTier('tier3', 'Apple M2 Max', 1)).toBe(1);
      expect(resolveInitialDprForTier('tier3', 'Apple M2 Max', 2)).toBe(2);
      expect(resolveInitialDprForTier('tier3', 'Apple M2 Max', 3)).toBe(2);
    });
  });
});
