import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  checkIsFocusInPlanetScope,
  usePlanetOutOfScopeGuard,
} from './usePlanetOutOfScopeGuard';
import { registerAppRouter, type StarmapSearchParams } from '../hooks/useSpaLocation';
import type { DecodedDetailRecord } from '../data/detailsRepository';
import type { CompactSearchEntry } from '../utils/compactDataCodec';

describe('usePlanetOutOfScopeGuard', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let navigateSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    navigateSpy = vi.fn();
    registerAppRouter({ navigate: navigateSpy });
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
    it('warns and strips out-of-scope focus via TanStack Router navigate on planet route', () => {
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
      expect(navigateSpy).toHaveBeenCalledTimes(1);
      const navCall = navigateSpy.mock.calls[0][0];
      expect(navCall.replace).toBe(true);
      expect(typeof navCall.search).toBe('function');

      const searchUpdater = navCall.search as (prev: StarmapSearchParams) => StarmapSearchParams;
      expect(searchUpdater({ focus: 'mars', select: 'earth' })).toEqual({ select: 'earth' });
    });

    it('preserves valid in-scope focus without warning or router replacement', () => {
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
      expect(navigateSpy).not.toHaveBeenCalled();
    });

    it('strips out-of-scope center parameter via TanStack Router navigate', () => {
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

      expect(navigateSpy).toHaveBeenCalledTimes(1);
      const navCall = navigateSpy.mock.calls[0][0];
      expect(navCall.replace).toBe(true);
      expect(typeof navCall.search).toBe('function');

      const searchUpdater = navCall.search as (prev: StarmapSearchParams) => StarmapSearchParams;
      expect(searchUpdater({ center: 'jupiter', select: 'earth' })).toEqual({ select: 'earth' });
    });

    it('strips both out-of-scope focus and center in a single navigate call when both are invalid', () => {
      renderHook(() =>
        usePlanetOutOfScopeGuard({
          urlPlanetSlug: 'earth',
          activeCorpus: dummyCorpus,
          urlFocusSlug: 'mars',
          isFocusInPlanetScope: false,
          centerParam: 'jupiter',
          targetPlanetId: 'earth',
          orbitingBodyIds: ['moon'],
          systemDetail: dummySystemDetail,
        }),
      );

      expect(navigateSpy).toHaveBeenCalledTimes(1);
      const navCall = navigateSpy.mock.calls[0][0];
      expect(navCall.replace).toBe(true);

      const searchUpdater = navCall.search as (prev: StarmapSearchParams) => StarmapSearchParams;
      expect(searchUpdater({ focus: 'mars', center: 'jupiter', select: 'earth' })).toEqual({ select: 'earth' });
    });
  });
});
