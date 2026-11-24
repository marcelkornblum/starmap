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
    const tier3Budget = DEVICE_TIER_BUDGETS.tier3; // maxActiveSectors: 64, lruCacheMaxSectors: 80, prefetchRingRadius: 2
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

    it('keeps tier3 at 27 active 1-ring sectors and 53 prefetch sectors sorted nearest-first with disjoint sets', () => {
      for (const pos of [
        [0, 0, 0],
        [12.5, 12.5, 12.5],
      ] as const) {
        const plan = computeSectorRings(pos, tier3Budget);
        expect(plan.activeSectorIds.length).toBe(27);
        expect(plan.prefetchSectorIds.length).toBe(53);
        expect(plan.activeSectorIds.length + plan.prefetchSectorIds.length).toBe(80);
        expect(plan.activeSectorIds[0]).toBe(plan.centerSectorId);

        const activeSet = new Set(plan.activeSectorIds);
        expect(activeSet.size).toBe(27);
        for (const pref of plan.prefetchSectorIds) {
          expect(activeSet.has(pref)).toBe(false);
        }

        const getDistSq = (sectorId: string) => {
          const [scx, scy, scz] = getSectorCenterFromId(sectorId, 25);
          return (pos[0] - scx) ** 2 + (pos[1] - scy) ** 2 + (pos[2] - scz) ** 2;
        };

        const activeDistances = plan.activeSectorIds.map(getDistSq);
        for (let i = 1; i < activeDistances.length; i++) {
          const curr = activeDistances[i];
          const prev = activeDistances[i - 1];
          if (curr === undefined || prev === undefined) {
            throw new Error('Expected active distance entry');
          }
          expect(curr).toBeGreaterThanOrEqual(prev - 1e-6);
        }

        const prefetchDistances = plan.prefetchSectorIds.map(getDistSq);
        for (let i = 1; i < prefetchDistances.length; i++) {
          const curr = prefetchDistances[i];
          const prev = prefetchDistances[i - 1];
          if (curr === undefined || prev === undefined) {
            throw new Error('Expected prefetch distance entry');
          }
          expect(curr).toBeGreaterThanOrEqual(prev - 1e-6);
        }

        const [cx, cy, cz] = plan.centerOrigin;
        for (const activeId of plan.activeSectorIds) {
          const [scx, scy, scz] = getSectorCenterFromId(activeId, 25);
          const dx = Math.round((scx - 12.5 - cx) / 25);
          const dy = Math.round((scy - 12.5 - cy) / 25);
          const dz = Math.round((scz - 12.5 - cz) / 25);
          expect(Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz))).toBeLessThanOrEqual(1);
        }
        for (const prefId of plan.prefetchSectorIds) {
          const [scx, scy, scz] = getSectorCenterFromId(prefId, 25);
          const dx = Math.round((scx - 12.5 - cx) / 25);
          const dy = Math.round((scy - 12.5 - cy) / 25);
          const dz = Math.round((scz - 12.5 - cz) / 25);
          expect(Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz))).toBeGreaterThan(1);
        }
      }
    });

    it('maintains tier1 (12 active, 4 prefetch) and tier2 (27 active, 13 prefetch) caps with disjoint sets', () => {
      const plan1 = computeSectorRings([0, 0, 0], tier1Budget);
      expect(plan1.activeSectorIds.length).toBe(12);
      expect(plan1.prefetchSectorIds.length).toBe(4);
      expect(plan1.activeSectorIds.length + plan1.prefetchSectorIds.length).toBe(16);
      const activeSet1 = new Set(plan1.activeSectorIds);
      for (const pref of plan1.prefetchSectorIds) {
        expect(activeSet1.has(pref)).toBe(false);
      }

      const plan2 = computeSectorRings([0, 0, 0], tier2Budget);
      expect(plan2.activeSectorIds.length).toBe(27);
      expect(plan2.prefetchSectorIds.length).toBe(13);
      expect(plan2.activeSectorIds.length + plan2.prefetchSectorIds.length).toBe(40);
      const activeSet2 = new Set(plan2.activeSectorIds);
      for (const pref of plan2.prefetchSectorIds) {
        expect(activeSet2.has(pref)).toBe(false);
      }
    });

    it('bypasses origin radius clip when camera is outside maxCatalogRadiusPc and preserves it inside', () => {
      const distantPlan = computeSectorRings([250, 0, 0], tier3Budget);
      expect(distantPlan.centerSectorId).toBe('sector_+250_+000_+000');
      expect(distantPlan.activeSectorIds[0]).toBe('sector_+250_+000_+000');
      expect(distantPlan.activeSectorIds.length).toBe(27);
      expect(distantPlan.prefetchSectorIds.length).toBe(53);

      const boundaryPlan = computeSectorRings([95, 0, 0], tier3Budget);
      expect(boundaryPlan.centerSectorId).toBe('sector_+075_+000_+000');
      // sector_+125_+050_+050 has center (137.5, 62.5, 62.5), dist ~ 163.46 > 125 + 25*0.87 = 146.75
      expect(boundaryPlan.activeSectorIds).not.toContain('sector_+125_+050_+050');
      expect(boundaryPlan.prefetchSectorIds).not.toContain('sector_+125_+050_+050');
    });
  });
});
