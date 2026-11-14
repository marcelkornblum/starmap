import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  checkIsFocusInPlanetScope,
  usePlanetOutOfScopeGuard,
} from './usePlanetOutOfScopeGuard';
import { registerAppRouter } from '../hooks/useSpaLocation';
import type { DecodedDetailRecord } from '../data/detailsRepository';
import type { CompactSearchEntry } from '../utils/compactDataCodec';

describe('usePlanetOutOfScopeGuard', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let replaceSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    replaceSpy = vi.fn();
    registerAppRouter({ history: { replace: replaceSpy } });
  });

  afterEach(() => {
    warnSpy.mockRestore();
    registerAppRouter(null);
  });

  const dummySystemDetail: DecodedDetailRecord = {
    kind: 'system',
    record: {
      id: 'sol',
      name: 'Sol',
      x: 0,
      y: 0,
      z: 0,
      dist: 0,
      sectorId: 'sector_0_0_0',
      stars: [],
      planets: [
        {
          id: 'earth',
          name: 'Earth',
          letter: 'd',
          composition: 'terrestrial',
          satellites: [
            {
              id: 'moon',
              name: 'Moon',
              parentId: 'earth',
              radiusEarth: 0.27,
              massEarth: 0.012,
              orbit: {
                semiMajorAxis: 0.00257,
                eccentricity: 0.0549,
                inclination: 5.145,
                ascendingNode: 125.08,
                argumentOfPeriapsis: 318.15,
                meanAnomaly: 115.36,
                periodDays: 27.32,
              },
            },
          ],
        },
      ],
    },
  };

  const dummyCorpus: CompactSearchEntry[] = [
    { i: 'earth', n: 'Earth', s: 'sol', p: [0, 0, 0] },
    { i: 'moon', n: 'Moon', s: 'earth', p: [0, 0, 0] },
  ];

  describe('checkIsFocusInPlanetScope', () => {
    it('returns false when urlFocusSlug is null', () => {
      expect(
        checkIsFocusInPlanetScope(null, 'earth', 'earth', dummySystemDetail, [], 2),
      ).toBe(false);
    });

    it('returns true when focus is the planet itself', () => {
      expect(
        checkIsFocusInPlanetScope('earth', 'earth', 'earth', dummySystemDetail, [], 2),
      ).toBe(true);
    });

    it('returns true when focus is a satellite of the planet', () => {
      expect(
        checkIsFocusInPlanetScope('moon', 'earth', 'earth', dummySystemDetail, [], 2),
      ).toBe(true);
    });

    it('returns true when focus is in orbitingBodyIds', () => {
      expect(
        checkIsFocusInPlanetScope('custom-satellite', 'earth', 'earth', dummySystemDetail, ['custom-satellite'], 2),
      ).toBe(true);
    });

    it('returns false when focus belongs elsewhere', () => {
      expect(
        checkIsFocusInPlanetScope('mars', 'earth', 'earth', dummySystemDetail, [], 2),
      ).toBe(false);
    });
  });

  describe('usePlanetOutOfScopeGuard hook', () => {
    it('warns and strips out-of-scope focus on planet route', () => {
      window.history.pushState({}, '', '/planet/earth?focus=mars');

      renderHook(() =>
        usePlanetOutOfScopeGuard({
          urlPlanetSlug: 'earth',
          activeCorpus: dummyCorpus,
          urlFocusSlug: 'mars',
          isFocusInPlanetScope: false,
          targetPlanetId: 'earth',
          orbitingBodyIds: ['moon'],
          systemDetail: dummySystemDetail,
        }),
      );

      expect(warnSpy).toHaveBeenCalledWith(
        "[router] Out-of-scope focus 'mars' stripped on /planet/earth",
      );
      expect(replaceSpy).toHaveBeenCalledWith('/planet/earth');
    });

    it('preserves valid in-scope focus without warning or router replacement', () => {
      window.history.pushState({}, '', '/planet/earth?focus=moon');

      renderHook(() =>
        usePlanetOutOfScopeGuard({
          urlPlanetSlug: 'earth',
          activeCorpus: dummyCorpus,
          urlFocusSlug: 'moon',
          isFocusInPlanetScope: true,
          targetPlanetId: 'earth',
          orbitingBodyIds: ['moon'],
          systemDetail: dummySystemDetail,
        }),
      );

      expect(warnSpy).not.toHaveBeenCalled();
      expect(replaceSpy).not.toHaveBeenCalled();
    });

    it('strips out-of-scope center parameter when center is not in planet scope', () => {
      window.history.pushState({}, '', '/planet/earth?center=jupiter');

      renderHook(() =>
        usePlanetOutOfScopeGuard({
          urlPlanetSlug: 'earth',
          activeCorpus: dummyCorpus,
          urlFocusSlug: null,
          isFocusInPlanetScope: true,
          centerParam: 'jupiter',
          targetPlanetId: 'earth',
          orbitingBodyIds: ['moon'],
          systemDetail: dummySystemDetail,
        }),
      );

      expect(replaceSpy).toHaveBeenCalledWith('/planet/earth');
    });
  });
});
