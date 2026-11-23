import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRouter } from '@tanstack/react-router';
import { useSystemOutOfScopeGuard } from './useSystemOutOfScopeGuard';
import type { StarmapSearchParams } from '../hooks/useSpaLocation';
import type { DecodedDetailRecord } from '../data/detailsRepository';
import type { CompactSearchEntry } from '../utils/compactDataTypes';

vi.mock('@tanstack/react-router', () => ({
  useRouter: vi.fn(() => undefined),
}));

describe('useSystemOutOfScopeGuard', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let navigateSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    navigateSpy = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ navigate: navigateSpy } as never);
  });

  afterEach(() => {
    warnSpy.mockRestore();
    vi.mocked(useRouter).mockReturnValue(undefined as never);
  });

  const dummyCorpus: CompactSearchEntry[] = [
    { i: 'sol', n: 'Sol', p: [0, 0, 0] },
    { i: 'earth', n: 'Earth', s: 'sol', p: [0, 0, 0] },
  ];

  it('does nothing when urlSystemSlug is missing', () => {
    renderHook(() =>
      useSystemOutOfScopeGuard({
        urlSystemSlug: null,
        activeCorpus: dummyCorpus,
        urlFocusSlug: 'alpha-centauri',
        isFocusInThisSystem: false,
        targetSystemId: 'sol',
      }),
    );

    expect(warnSpy).not.toHaveBeenCalled();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('does nothing when activeCorpus is empty and systemDetail is undefined', () => {
    renderHook(() =>
      useSystemOutOfScopeGuard({
        urlSystemSlug: 'sol',
        activeCorpus: [],
        urlFocusSlug: 'alpha-centauri',
        isFocusInThisSystem: false,
        targetSystemId: 'sol',
      }),
    );

    expect(warnSpy).not.toHaveBeenCalled();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('warns and strips out-of-scope focus parameter via TanStack Router navigate', () => {
    renderHook(() =>
      useSystemOutOfScopeGuard({
        urlSystemSlug: 'sol',
        activeCorpus: dummyCorpus,
        urlFocusSlug: 'alpha-centauri',
        isFocusInThisSystem: false,
        targetSystemId: 'sol',
      }),
    );

    expect(warnSpy).toHaveBeenCalledWith(
      "[router] Out-of-scope focus 'alpha-centauri' stripped on /system/sol",
    );
    expect(navigateSpy).toHaveBeenCalledTimes(1);
    const navCall = navigateSpy.mock.calls[0][0];
    expect(navCall.to).toBe('/system/$systemId');
    expect(navCall.params).toEqual({ systemId: 'sol' });
    expect(navCall.replace).toBe(true);
    expect(typeof navCall.search).toBe('function');

    const searchUpdater = navCall.search as (prev: StarmapSearchParams) => StarmapSearchParams;
    expect(searchUpdater({ focus: 'alpha-centauri', select: 'sol' })).toEqual({ select: 'sol' });
  });

  it('preserves valid in-scope focus without warning or router replacement', () => {
    renderHook(() =>
      useSystemOutOfScopeGuard({
        urlSystemSlug: 'sol',
        activeCorpus: dummyCorpus,
        urlFocusSlug: 'earth',
        isFocusInThisSystem: true,
        targetSystemId: 'sol',
      }),
    );

    expect(warnSpy).not.toHaveBeenCalled();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('strips out-of-scope center parameter via TanStack Router navigate', () => {
    const systemDetail: DecodedDetailRecord = {
      kind: 'system',
      record: {
        id: 'sol',
        name: 'Sol',
        x: 0,
        y: 0,
        z: 0,
        dist: 0,
        sectorId: 'sector_0_0_0',
        stars: [{ id: 'sol-star', name: 'Sol', componentDesignation: 'A', spectralType: 'G2V', mag: -26.7, absmag: 4.83 }],
        planets: [{ id: 'earth', name: 'Earth', letter: 'd', composition: 'terrestrial' }],
      },
    };

    renderHook(() =>
      useSystemOutOfScopeGuard({
        urlSystemSlug: 'sol',
        activeCorpus: dummyCorpus,
        urlFocusSlug: null,
        isFocusInThisSystem: true,
        center: 'sirius',
        targetSystemId: 'sol',
        systemDetail,
      }),
    );

    expect(navigateSpy).toHaveBeenCalledTimes(1);
    const navCall = navigateSpy.mock.calls[0][0];
    expect(navCall.to).toBe('/system/$systemId');
    expect(navCall.params).toEqual({ systemId: 'sol' });
    expect(navCall.replace).toBe(true);
    expect(typeof navCall.search).toBe('function');

    const searchUpdater = navCall.search as (prev: StarmapSearchParams) => StarmapSearchParams;
    expect(searchUpdater({ center: 'sirius', select: 'sol' })).toEqual({ select: 'sol' });
  });

  it('strips both out-of-scope focus and center in a single navigate call when both are invalid', () => {
    renderHook(() =>
      useSystemOutOfScopeGuard({
        urlSystemSlug: 'sol',
        activeCorpus: dummyCorpus,
        urlFocusSlug: 'alpha-centauri',
        isFocusInThisSystem: false,
        center: 'sirius',
        targetSystemId: 'sol',
      }),
    );

    expect(navigateSpy).toHaveBeenCalledTimes(1);
    const navCall = navigateSpy.mock.calls[0][0];
    expect(navCall.to).toBe('/system/$systemId');
    expect(navCall.params).toEqual({ systemId: 'sol' });
    expect(navCall.replace).toBe(true);

    const searchUpdater = navCall.search as (prev: StarmapSearchParams) => StarmapSearchParams;
    expect(searchUpdater({ focus: 'alpha-centauri', center: 'sirius', select: 'sol' })).toEqual({ select: 'sol' });
  });

  it('preserves coordinate-string center and strips malformed comma center', () => {
    renderHook(() =>
      useSystemOutOfScopeGuard({
        urlSystemSlug: 'sol',
        activeCorpus: dummyCorpus,
        urlFocusSlug: null,
        isFocusInThisSystem: true,
        center: '1.5,-2,3.25',
        targetSystemId: 'sol',
      }),
    );
    expect(navigateSpy).not.toHaveBeenCalled();

    renderHook(() =>
      useSystemOutOfScopeGuard({
        urlSystemSlug: 'sol',
        activeCorpus: dummyCorpus,
        urlFocusSlug: null,
        isFocusInThisSystem: true,
        center: '1.5,not-a-coord',
        targetSystemId: 'sol',
      }),
    );
    expect(navigateSpy).toHaveBeenCalledTimes(1);
  });

  it('preserves center matching name slug, satellite, or disk within systemDetail', () => {
    const systemDetail: DecodedDetailRecord = {
      kind: 'system',
      record: {
        id: 'sol',
        name: 'Sol',
        x: 0,
        y: 0,
        z: 0,
        dist: 0,
        sectorId: 'sector_0_0_0',
        stars: [{ id: 'sol-star', name: 'Sol Primary', componentDesignation: 'A', spectralType: 'G2V', mag: -26.7, absmag: 4.83 }],
        planets: [
          {
            id: 'earth',
            name: 'Terra Prime',
            letter: 'd',
            composition: 'terrestrial',
            satellites: [
              {
                id: 'luna-id',
                name: 'The Moon',
                parentId: 'earth',
                orbit: { semiMajorAxis: 0.00257, eccentricity: 0.0549, inclination: 5.14, ascendingNode: 0, argumentOfPeriapsis: 0, meanAnomaly: 0, periodDays: 27.3 },
              },
            ],
          },
        ],
        disks: [
          {
            id: 'sol-belt',
            name: 'Asteroid Belt',
            kind: 'asteroid-belt',
            innerRadiusAu: 2.2,
            outerRadiusAu: 3.2,
            semiMajorAxisAu: 2.7,
            composition: 'silicate',
          },
        ],
      },
    };

    for (const validCenter of ['Terra Prime', 'the-moon', 'luna-id', 'asteroid-belt', 'sol-belt']) {
      renderHook(() =>
        useSystemOutOfScopeGuard({
          urlSystemSlug: 'sol',
          activeCorpus: dummyCorpus,
          urlFocusSlug: null,
          isFocusInThisSystem: true,
          center: validCenter,
          targetSystemId: 'sol',
          systemDetail,
        }),
      );
    }
    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
