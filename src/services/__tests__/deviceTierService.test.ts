import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  DEVICE_TIER_BUDGETS,
  probeBrowserDeviceCapabilities,
  classifyDeviceTier,
  getDeviceTierBudget,
  estimateRequiredSectorsForDistance,
  computeMaxSafeCameraDistancePc,
  computeCeilingMaxCameraDistancePc,
  clampCameraDistanceToMemoryBudget,
  canAllocateSector,
  ACTIVE_CEILING_ZOOM_OUT_MULTIPLIER,
  MEAN_CATALOG_STARS_PER_CUBIC_PC,
  APERTURE_ACTIVE_CUTOFF_MOBILE,
  APERTURE_ACTIVE_CUTOFF_TABLET,
  APERTURE_ACTIVE_CUTOFF_DESKTOP,
  getApertureActiveCutoffForViewportWidth,
  type DevicePerformanceTier,
  type DeviceTierBudget,
} from '../deviceTierService';

describe('deviceTierService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('DEVICE_TIER_BUDGETS Matrix', () => {
    it('defines exact Frontier budgets for tier1, tier2, tier3', () => {
      expect(DEVICE_TIER_BUDGETS.tier1).toEqual({
        tier: 'tier1',
        maxActivePoints: 75_000,
        maxActiveEntities: 450,
        maxBufferBytes: 1_572_864,
        maxActiveSectors: 12,
        lruCacheMaxSectors: 16,
        prefetchRingRadius: 1,
        maxCameraDistancePc: 75,
        maxGpuUploadsPerFrame: 1,
      });

      expect(DEVICE_TIER_BUDGETS.tier2).toEqual({
        tier: 'tier2',
        maxActivePoints: 200_000,
        maxActiveEntities: 750,
        maxBufferBytes: 5_242_880,
        maxActiveSectors: 27,
        lruCacheMaxSectors: 40,
        prefetchRingRadius: 2,
        maxCameraDistancePc: 150,
        maxGpuUploadsPerFrame: 2,
      });

      expect(DEVICE_TIER_BUDGETS.tier3).toEqual({
        tier: 'tier3',
        maxActivePoints: 350_000,
        maxActiveEntities: 1200,
        maxBufferBytes: 15_728_640,
        maxActiveSectors: 64,
        lruCacheMaxSectors: 80,
        prefetchRingRadius: 2,
        maxCameraDistancePc: 375,
        maxGpuUploadsPerFrame: 2,
      });
    });

    it('exhibits strictly monotonic budget progression across tiers', () => {
      const tiers: DevicePerformanceTier[] = ['tier1', 'tier2', 'tier3'];
      const budgets: DeviceTierBudget[] = tiers.map((t) => DEVICE_TIER_BUDGETS[t]);

      for (let i = 0; i < budgets.length - 1; i++) {
        const current = budgets[i]!;
        const next = budgets[i + 1]!;
        expect(next.maxActivePoints).toBeGreaterThan(current.maxActivePoints);
        expect(next.maxActiveEntities).toBeGreaterThan(current.maxActiveEntities);
        expect(next.maxBufferBytes).toBeGreaterThan(current.maxBufferBytes);
        expect(next.maxActiveSectors).toBeGreaterThan(current.maxActiveSectors);
        expect(next.lruCacheMaxSectors).toBeGreaterThan(current.lruCacheMaxSectors);
        expect(next.prefetchRingRadius).toBeGreaterThanOrEqual(current.prefetchRingRadius);
        expect(next.maxCameraDistancePc).toBeGreaterThan(current.maxCameraDistancePc);
        expect(next.maxGpuUploadsPerFrame).toBeGreaterThanOrEqual(current.maxGpuUploadsPerFrame);
      }
    });
  });

  describe('probeBrowserDeviceCapabilities', () => {
    it('handles SSR / environments where navigator is undefined', () => {
      vi.stubGlobal('navigator', undefined);
      const caps = probeBrowserDeviceCapabilities();
      expect(caps).toEqual({});
    });

    it('extracts deviceMemory, hardwareConcurrency, and connection.saveData from global navigator', () => {
      vi.stubGlobal('navigator', {
        deviceMemory: 8,
        hardwareConcurrency: 12,
        connection: { saveData: false },
      });
      const caps = probeBrowserDeviceCapabilities();
      expect(caps.deviceMemory).toBe(8);
      expect(caps.hardwareConcurrency).toBe(12);
      expect(caps.saveData).toBe(false);
    });

    it('handles missing navigator.connection gracefully', () => {
      vi.stubGlobal('navigator', {
        deviceMemory: 4,
        hardwareConcurrency: 4,
      });
      const caps = probeBrowserDeviceCapabilities();
      expect(caps.deviceMemory).toBe(4);
      expect(caps.hardwareConcurrency).toBe(4);
      expect(caps.saveData).toBeUndefined();
    });
  });

  describe('classifyDeviceTier', () => {
    describe('W3C deviceMemory quantized values', () => {
      const lowMemoryValues = [0.25, 0.5, 1, 2, 4];
      for (const mem of lowMemoryValues) {
        it(`classifies deviceMemory=${mem} as tier1 even with high core counts`, () => {
          expect(classifyDeviceTier({ deviceMemory: mem, hardwareConcurrency: 16 })).toBe('tier1');
        });
      }

      it('classifies deviceMemory=8 with 8+ cores and adequate WebGL as tier3', () => {
        expect(
          classifyDeviceTier({
            deviceMemory: 8,
            hardwareConcurrency: 8,
            maxTextureSize: 8192,
            maxVertexAttribs: 16,
          }),
        ).toBe('tier3');
      });

      it('classifies deviceMemory=8 with 6 cores as tier2', () => {
        expect(
          classifyDeviceTier({
            deviceMemory: 8,
            hardwareConcurrency: 6,
          }),
        ).toBe('tier2');
      });
    });

    describe('Safari / Firefox privacy fallback (deviceMemory: undefined)', () => {
      it('classifies undefined deviceMemory with 4 cores as tier1', () => {
        expect(
          classifyDeviceTier({
            deviceMemory: undefined,
            hardwareConcurrency: 4,
          }),
        ).toBe('tier1');
      });

      it('classifies undefined deviceMemory with 2 cores as tier1', () => {
        expect(
          classifyDeviceTier({
            deviceMemory: undefined,
            hardwareConcurrency: 2,
          }),
        ).toBe('tier1');
      });

      it('classifies undefined deviceMemory with 6 cores as tier2', () => {
        expect(
          classifyDeviceTier({
            deviceMemory: undefined,
            hardwareConcurrency: 6,
          }),
        ).toBe('tier2');
      });

      it('classifies undefined deviceMemory with 8 cores as tier3', () => {
        expect(
          classifyDeviceTier({
            deviceMemory: undefined,
            hardwareConcurrency: 8,
          }),
        ).toBe('tier3');
      });

      it('classifies undefined deviceMemory with 16 cores as tier3', () => {
        expect(
          classifyDeviceTier({
            deviceMemory: undefined,
            hardwareConcurrency: 16,
          }),
        ).toBe('tier3');
      });
    });

    describe('saveData: true override', () => {
      it('forces tier1 regardless of high specs', () => {
        expect(
          classifyDeviceTier({
            saveData: true,
            deviceMemory: 32,
            hardwareConcurrency: 32,
            maxTextureSize: 16384,
            maxVertexAttribs: 32,
          }),
        ).toBe('tier1');
      });
    });

    describe('WebGL constraints downgrading to tier1', () => {
      it('downgrades to tier1 if maxTextureSize < 4096', () => {
        expect(
          classifyDeviceTier({
            deviceMemory: 8,
            hardwareConcurrency: 8,
            maxTextureSize: 2048,
          }),
        ).toBe('tier1');
      });

      it('downgrades to tier1 if maxVertexAttribs < 16', () => {
        expect(
          classifyDeviceTier({
            deviceMemory: 8,
            hardwareConcurrency: 8,
            maxVertexAttribs: 15,
          }),
        ).toBe('tier1');
      });

      it('classifies as tier2 if maxTextureSize is 4096 on high-spec CPU/RAM', () => {
        expect(
          classifyDeviceTier({
            deviceMemory: 8,
            hardwareConcurrency: 8,
            maxTextureSize: 4096,
            maxVertexAttribs: 16,
          }),
        ).toBe('tier2');
      });
    });

    describe('Fallback when input is omitted', () => {
      it('probes browser capabilities when called with no arguments', () => {
        vi.stubGlobal('navigator', {
          deviceMemory: 2,
          hardwareConcurrency: 4,
        });
        expect(classifyDeviceTier()).toBe('tier1');
      });
    });
  });

  describe('getDeviceTierBudget', () => {
    it('returns exact budget for a string tier', () => {
      expect(getDeviceTierBudget('tier1')).toBe(DEVICE_TIER_BUDGETS.tier1);
      expect(getDeviceTierBudget('tier2')).toBe(DEVICE_TIER_BUDGETS.tier2);
      expect(getDeviceTierBudget('tier3')).toBe(DEVICE_TIER_BUDGETS.tier3);
    });

    it('classifies capabilities input and returns corresponding budget', () => {
      expect(getDeviceTierBudget({ deviceMemory: 2, hardwareConcurrency: 2 })).toBe(
        DEVICE_TIER_BUDGETS.tier1,
      );
      expect(getDeviceTierBudget({ deviceMemory: 8, hardwareConcurrency: 6 })).toBe(
        DEVICE_TIER_BUDGETS.tier2,
      );
      expect(getDeviceTierBudget({ deviceMemory: 8, hardwareConcurrency: 8 })).toBe(
        DEVICE_TIER_BUDGETS.tier3,
      );
    });
  });

  describe('estimateRequiredSectorsForDistance', () => {
    it('returns 1 for zero or negative camera distance', () => {
      expect(estimateRequiredSectorsForDistance(0)).toBe(1);
      expect(estimateRequiredSectorsForDistance(-10)).toBe(1);
    });

    it('scales cubically with distance (V proportional to d^3)', () => {
      const d1 = 25;
      const d2 = 50;
      const s1 = estimateRequiredSectorsForDistance(d1, 25);
      const s2 = estimateRequiredSectorsForDistance(d2, 25);

      // Sphere volume: (4/3) * pi * 25^3 / 25^3 = (4/3) * pi = ~4.189 -> ceil = 5
      expect(s1).toBe(5);
      // Sphere volume: (4/3) * pi * 50^3 / 25^3 = (4/3) * pi * 8 = ~33.51 -> ceil = 34
      expect(s2).toBe(34);
      // Verify cubic scaling roughly 8x (34 / 5 is ~6.8 due to ceiling rounding)
      expect(s2).toBeGreaterThanOrEqual(s1 * 6);
    });

    it('respects custom sectorSizePc', () => {
      const sDefault = estimateRequiredSectorsForDistance(50, 25);
      const sLargerSector = estimateRequiredSectorsForDistance(50, 50);
      expect(sLargerSector).toBeLessThan(sDefault);
    });
  });

  describe('computeMaxSafeCameraDistancePc', () => {
    it('clamps to budget.maxCameraDistancePc for standard tier budgets', () => {
      const distTier1 = computeMaxSafeCameraDistancePc(DEVICE_TIER_BUDGETS.tier1);
      const distTier2 = computeMaxSafeCameraDistancePc(DEVICE_TIER_BUDGETS.tier2);
      expect(distTier1).toBe(75);
      expect(distTier2).toBe(150);
    });

    it('scales down if buffer memory is constrained below maxActiveSectors', () => {
      const constrainedBudget: DeviceTierBudget = {
        ...DEVICE_TIER_BUDGETS.tier1,
        // Only enough memory for 1 sector (12_024 bytes)
        maxBufferBytes: 12_024,
      };
      const dist = computeMaxSafeCameraDistancePc(constrainedBudget);
      expect(dist).toBeLessThan(75);
      expect(dist).toBeGreaterThanOrEqual(1);
    });

    it('clamps to minDistancePc if derived distance is below minimum', () => {
      const extremeBudget: DeviceTierBudget = {
        ...DEVICE_TIER_BUDGETS.tier1,
        maxBufferBytes: 100,
      };
      // For maxSectors = 1, rawDist is ~51.2 pc. Setting minDistancePc to 60 tests floor clamping.
      const dist = computeMaxSafeCameraDistancePc(extremeBudget, { minDistancePc: 60 });
      expect(dist).toBe(60);
    });
  });

  describe('clampCameraDistanceToMemoryBudget', () => {
    it('clamps non-finite and negative values to minDistancePc', () => {
      const budget = DEVICE_TIER_BUDGETS.tier2;
      expect(clampCameraDistanceToMemoryBudget(NaN, budget)).toBe(1);
      expect(clampCameraDistanceToMemoryBudget(-50, budget)).toBe(1);
      expect(clampCameraDistanceToMemoryBudget(-Infinity, budget)).toBe(1);
    });

    it('clamps normal values within [minDistancePc, maxSafe]', () => {
      const budget = DEVICE_TIER_BUDGETS.tier2; // max 150 pc
      expect(clampCameraDistanceToMemoryBudget(50, budget)).toBe(50);
      expect(clampCameraDistanceToMemoryBudget(0.5, budget)).toBe(1);
      expect(clampCameraDistanceToMemoryBudget(200, budget)).toBe(150);
    });

    describe('Memory saturation lockout', () => {
      it('caps zoom-out at currentDistancePc when currentAllocatedBytes >= maxBufferBytes', () => {
        const budget = DEVICE_TIER_BUDGETS.tier2; // maxBufferBytes = 5_242_880, maxDist = 150
        const options = {
          currentAllocatedBytes: 5_242_880,
          currentDistancePc: 45,
        };

        // User attempts to zoom out to 80 pc
        const clampedZoomOut = clampCameraDistanceToMemoryBudget(80, budget, options);
        expect(clampedZoomOut).toBe(45);

        // User zooms in to 30 pc -> allowed!
        const clampedZoomIn = clampCameraDistanceToMemoryBudget(30, budget, options);
        expect(clampedZoomIn).toBe(30);
      });

      it('allows zoom-out when memory is below budget limit', () => {
        const budget = DEVICE_TIER_BUDGETS.tier2;
        const options = {
          currentAllocatedBytes: 2_000_000,
          currentDistancePc: 45,
        };

        const clamped = clampCameraDistanceToMemoryBudget(80, budget, options);
        expect(clamped).toBe(80);
      });
    });
  });

  describe('canAllocateSector', () => {
    const budget = DEVICE_TIER_BUDGETS.tier1; // maxActiveSectors: 12, maxBufferBytes: 1_572_864

    it('returns true when both sector count and buffer bytes are within limits', () => {
      expect(canAllocateSector(budget, 5, 500_000, 100_000)).toBe(true);
    });

    it('returns false when next sector would exceed maxActiveSectors', () => {
      expect(canAllocateSector(budget, 12, 500_000, 100_000)).toBe(false);
    });

    it('returns false when next sector would exceed maxBufferBytes', () => {
      expect(canAllocateSector(budget, 5, 1_500_000, 100_000)).toBe(false);
    });

    it('handles exact boundary conditions', () => {
      // 11 + 1 = 12 (exact match) and bytes exact match
      expect(canAllocateSector(budget, 11, 1_500_000, 72_864)).toBe(true);

      // 11 + 1 = 12, but 1 byte over budget
      expect(canAllocateSector(budget, 11, 1_500_000, 72_865)).toBe(false);
    });

    it('rejects NaN or negative allocation inputs defensively', () => {
      expect(canAllocateSector(budget, NaN, 0, 1000)).toBe(false);
      expect(canAllocateSector(budget, 0, -1, 1000)).toBe(false);
      expect(canAllocateSector(budget, 0, 0, -500)).toBe(false);
      expect(canAllocateSector(budget, 0, 0, NaN)).toBe(false);
    });
  });

  describe('computeCeilingMaxCameraDistancePc & Active Item Ceiling', () => {
    it('exports expected constants', () => {
      expect(ACTIVE_CEILING_ZOOM_OUT_MULTIPLIER).toBe(2.25);
      expect(MEAN_CATALOG_STARS_PER_CUBIC_PC).toBeCloseTo(751.5 / (25 * 25 * 25), 6);
    });

    it('estimates ceiling distance from catalog density when live aperture radius is omitted', () => {
      const budgetTier1 = DEVICE_TIER_BUDGETS.tier1;
      // Derived dist capped by tier1 maxSafe (75 pc)
      expect(computeCeilingMaxCameraDistancePc(budgetTier1)).toBe(75);

      const budgetTier2 = DEVICE_TIER_BUDGETS.tier2;
      // Derived capped dist is ~121.7 pc (< tier2 maxSafe of 150 pc)
      const distTier2 = computeCeilingMaxCameraDistancePc(budgetTier2);
      expect(distTier2).toBeGreaterThan(115);
      expect(distTier2).toBeLessThan(130);
    });

    it('uses live ceilingApertureRadiusPc with 2.25x zoom out multiplier', () => {
      const budgetTier2 = DEVICE_TIER_BUDGETS.tier2; // maxSafe = 150 pc
      // ceilingApertureRadiusPc = 15 -> ceilingCamDist = 15 * (34.9 / 10) = 52.35 -> * 2.25 = 117.7875 pc
      const dist = computeCeilingMaxCameraDistancePc(budgetTier2, {
        ceilingApertureRadiusPc: 15,
      });
      expect(dist).toBeCloseTo(117.7875, 2);
    });

    it('caps live ceiling distance at budget.maxCameraDistancePc (maxSafe)', () => {
      const budgetTier1 = DEVICE_TIER_BUDGETS.tier1; // maxSafe = 75 pc
      // ceilingApertureRadiusPc = 20 -> ceilingCamDist = 20 * 3.49 = 69.8 -> * 2.25 = 157.05 -> clamped to 75
      const dist = computeCeilingMaxCameraDistancePc(budgetTier1, {
        ceilingApertureRadiusPc: 20,
      });
      expect(dist).toBe(75);
    });

    it('clamps to minDistancePc for negative or zero live ceiling aperture', () => {
      const budgetTier2 = DEVICE_TIER_BUDGETS.tier2;
      const dist = computeCeilingMaxCameraDistancePc(budgetTier2, {
        ceilingApertureRadiusPc: -5,
        minDistancePc: 2,
      });
      // Should fall back to density estimate, which is > 2
      expect(dist).toBeGreaterThan(2);
    });
  });

  describe('Defensive numerical safety for option parameters', () => {
    it('falls back safely when avgBytesPerSector, sectorSizePc, or minDistancePc are 0 or NaN', () => {
      const budget = DEVICE_TIER_BUDGETS.tier1;
      expect(
        computeMaxSafeCameraDistancePc(budget, {
          avgBytesPerSector: 0,
          sectorSizePc: NaN,
          minDistancePc: -5,
        }),
      ).toBe(75);
      expect(
        clampCameraDistanceToMemoryBudget(25, budget, {
          avgBytesPerSector: NaN,
          sectorSizePc: 0,
          minDistancePc: NaN,
        }),
      ).toBe(25);
    });
  });

  describe('getApertureActiveCutoffForViewportWidth', () => {
    it('exports expected cutoff constants', () => {
      expect(APERTURE_ACTIVE_CUTOFF_MOBILE).toBe(40);
      expect(APERTURE_ACTIVE_CUTOFF_TABLET).toBe(60);
      expect(APERTURE_ACTIVE_CUTOFF_DESKTOP).toBe(96);
    });

    it('returns mobile cutoff (40) for width <= 767px', () => {
      expect(getApertureActiveCutoffForViewportWidth(390)).toBe(40);
      expect(getApertureActiveCutoffForViewportWidth(767)).toBe(40);
    });

    it('returns tablet cutoff (60) for 768px <= width < 1024px', () => {
      expect(getApertureActiveCutoffForViewportWidth(768)).toBe(60);
      expect(getApertureActiveCutoffForViewportWidth(1023)).toBe(60);
    });

    it('returns desktop cutoff (96) for width >= 1024px', () => {
      expect(getApertureActiveCutoffForViewportWidth(1024)).toBe(96);
      expect(getApertureActiveCutoffForViewportWidth(1440)).toBe(96);
      expect(getApertureActiveCutoffForViewportWidth(2560)).toBe(96);
    });

    it('falls back to window.innerWidth when width argument is omitted or non-positive', () => {
      vi.stubGlobal('innerWidth', 390);
      expect(getApertureActiveCutoffForViewportWidth()).toBe(40);
      expect(getApertureActiveCutoffForViewportWidth(0)).toBe(40);
      expect(getApertureActiveCutoffForViewportWidth(-10)).toBe(40);

      vi.stubGlobal('innerWidth', 800);
      expect(getApertureActiveCutoffForViewportWidth()).toBe(60);

      vi.stubGlobal('innerWidth', 1440);
      expect(getApertureActiveCutoffForViewportWidth()).toBe(96);
    });

    it('defaults to desktop (1440px -> 96) if window.innerWidth is unavailable', () => {
      vi.stubGlobal('innerWidth', undefined);
      expect(getApertureActiveCutoffForViewportWidth()).toBe(96);
    });
  });
});
