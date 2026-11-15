import { describe, it, expect } from 'vitest';
import {
  computeSectorRings,
  getSectorCenterFromId,
  DEFAULT_MAX_CATALOG_RADIUS_PC,
} from './sectorSelection';
import { DEVICE_TIER_BUDGETS } from './deviceTierService';

describe('sectorSelection', () => {
  describe('DEFAULT_MAX_CATALOG_RADIUS_PC', () => {
    it('exports default max catalog radius of 125 pc', () => {
      expect(DEFAULT_MAX_CATALOG_RADIUS_PC).toBe(125);
    });
  });

  describe('getSectorCenterFromId', () => {
    it('computes center of sector accurately', () => {
      const center = getSectorCenterFromId('sector_+000_+000_+000', 25);
      expect(center).toEqual([12.5, 12.5, 12.5]);
    });

    it('returns [0, 0, 0] for invalid sectorId', () => {
      const center = getSectorCenterFromId('invalid-sector', 25);
      expect(center).toEqual([0, 0, 0]);
    });
  });

  describe('computeSectorRings', () => {
    const tier2Budget = DEVICE_TIER_BUDGETS.tier2; // maxActiveSectors: 27, lruCacheMaxSectors: 40, prefetchRingRadius: 2
    const tier1Budget = DEVICE_TIER_BUDGETS.tier1; // maxActiveSectors: 12, lruCacheMaxSectors: 16, prefetchRingRadius: 1

    it('resolves centerSectorId and nearest-first 1-ring at origin [0, 0, 0]', () => {
      const plan = computeSectorRings([0, 0, 0], tier2Budget);
      expect(plan.centerSectorId).toBe('sector_+000_+000_+000');
      expect(plan.centerOrigin).toEqual([0, 0, 0]);

      // At [0, 0, 0], sector_+000_+000_+000 is one of the closest sectors (corner at origin)
      // Due to '+' tie-breaker, it is first in the list
      expect(plan.activeSectorIds[0]).toBe('sector_+000_+000_+000');

      // Tier 2 allows up to 27 active sectors; 1-ring has 27 sectors
      expect(plan.activeSectorIds.length).toBe(27);
    });

    it('caps activeSectorIds to budget.maxActiveSectors on Tier 1 and overflows rest to prefetch', () => {
      const plan = computeSectorRings([0, 0, 0], tier1Budget);
      expect(plan.activeSectorIds.length).toBe(12);

      // Remaining 1-ring sectors overflow into prefetch
      // Total active + prefetch is capped to lruCacheMaxSectors (16 on Tier 1)
      expect(plan.prefetchSectorIds.length).toBe(4);
      expect(plan.activeSectorIds.length + plan.prefetchSectorIds.length).toBe(16);

      // Prefetch sectors must not overlap active sectors
      const activeSet = new Set(plan.activeSectorIds);
      for (const pref of plan.prefetchSectorIds) {
        expect(activeSet.has(pref)).toBe(false);
      }
    });

    it('handles negative and fractional coordinates accurately', () => {
      // [-12.6, 30.2, -5.0]
      // x: floor(-12.6 / 25) * 25 = -25
      // y: floor(30.2 / 25) * 25 = 25
      // z: floor(-5.0 / 25) * 25 = -25
      const plan = computeSectorRings([-12.6, 30.2, -5.0], tier2Budget);
      expect(plan.centerSectorId).toBe('sector_-025_+025_-025');
      expect(plan.centerOrigin).toEqual([-25, 25, -25]);
      expect(plan.activeSectorIds).toContain('sector_-025_+025_-025');
    });

    it('sanitises non-finite coordinates with fallback to [0, 0, 0]', () => {
      const plan = computeSectorRings([NaN, Infinity, -Infinity], tier2Budget);
      expect(plan.centerSectorId).toBe('sector_+000_+000_+000');
      expect(plan.centerOrigin).toEqual([0, 0, 0]);
    });

    it('strictly enforces activeSectorIds.length + prefetchSectorIds.length <= budget.lruCacheMaxSectors', () => {
      const plan = computeSectorRings([0, 0, 0], tier2Budget);
      expect(plan.activeSectorIds.length + plan.prefetchSectorIds.length).toBeLessThanOrEqual(
        tier2Budget.lruCacheMaxSectors,
      );
    });
  });
});
