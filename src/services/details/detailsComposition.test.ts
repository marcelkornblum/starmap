import { describe, expect, it } from 'vitest';
import {
  classifyExoplanetComposition,
  isExoplanetHabitableCandidate,
  buildPlanetCompositionBreakdown,
  buildPlanetCompositionSummary,
  resolveCorpusEntryComposition,
} from './detailsComposition';
import type { FocusedPlanetDetail } from './detailsEntityTypes';

describe('detailsComposition', () => {
  describe('classifyExoplanetComposition', () => {
    it('respects precalculated composition when present', () => {
      expect(
        classifyExoplanetComposition({ composition: 'super-earth' }),
      ).toBe('super-earth');
    });

    it('derives composition physically when absent', () => {
      expect(
        classifyExoplanetComposition({ massMearth: 1.0, radiusRearth: 1.0 }),
      ).toBe('terrestrial');
      expect(
        classifyExoplanetComposition({ massMearth: 300, radiusRearth: 11.2 }),
      ).toBe('gas-giant');
    });
  });

  describe('isExoplanetHabitableCandidate', () => {
    it('checks optimistic habitable envelope', () => {
      expect(
        isExoplanetHabitableCandidate({
          equilibriumTempK: 255,
          esi: 0.8,
          isHabitableCandidate: true,
        }),
      ).toBe(true);
      expect(
        isExoplanetHabitableCandidate({
          equilibriumTempK: 500,
          esi: 0.2,
          isHabitableCandidate: false,
        }),
      ).toBe(false);
    });
  });

  describe('buildPlanetCompositionBreakdown', () => {
    it('handles precalculated counts', () => {
      const breakdown = buildPlanetCompositionBreakdown([], 4, undefined, [1, 1, 1, 1]);
      expect(breakdown).toEqual([
        { composition: 'terrestrial', count: 1 },
        { composition: 'super-earth', count: 1 },
        { composition: 'ice-giant', count: 1 },
        { composition: 'gas-giant', count: 1 },
      ]);
    });

    it('computes breakdown from planet list', () => {
      const planets: FocusedPlanetDetail[] = [
        { id: 'p1', name: 'P1', composition: 'terrestrial', isHabitableCandidate: false },
        { id: 'p2', name: 'P2', composition: 'super-earth', isHabitableCandidate: true },
      ];
      const breakdown = buildPlanetCompositionBreakdown(planets, 2);
      expect(breakdown).toEqual([
        { composition: 'terrestrial', count: 1 },
        { composition: 'super-earth', count: 1 },
      ]);
    });
  });

  describe('buildPlanetCompositionSummary', () => {
    it('formats summary prose', () => {
      const planets: FocusedPlanetDetail[] = [
        { id: 'p1', name: 'P1', composition: 'terrestrial', isHabitableCandidate: true },
      ];
      const summary = buildPlanetCompositionSummary(planets, 1, true, undefined, [1, 0, 0, 0]);
      expect(summary).toBe('1 planet (1 terrestrial · Habitable zone candidate)');
    });
  });

  describe('resolveCorpusEntryComposition', () => {
    it('resolves composition enum from compact entry', () => {
      expect(resolveCorpusEntryComposition({ i: 'a', n: 'A', p: [0, 0, 0], u: 'gas-giant' })).toBe('gas-giant');
      expect(resolveCorpusEntryComposition(undefined)).toBe('terrestrial');
    });
  });
});
