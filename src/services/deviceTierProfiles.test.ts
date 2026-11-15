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
  });
});
