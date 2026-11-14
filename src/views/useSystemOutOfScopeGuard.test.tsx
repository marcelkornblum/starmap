import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSystemOutOfScopeGuard } from './useSystemOutOfScopeGuard';
import { registerAppRouter } from '../hooks/useSpaLocation';
import type { DecodedDetailRecord } from '../data/detailsRepository';
import type { CompactSearchEntry } from '../utils/compactDataCodec';

describe('useSystemOutOfScopeGuard', () => {
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
    expect(replaceSpy).not.toHaveBeenCalled();
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
    expect(replaceSpy).not.toHaveBeenCalled();
  });

  it('warns and strips out-of-scope focus parameter when focus is not in this system', () => {
    window.history.pushState({}, '', '/system/sol?focus=alpha-centauri');

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
    expect(replaceSpy).toHaveBeenCalledWith('/system/sol');
  });

  it('preserves valid in-scope focus without warning or router replacement', () => {
    window.history.pushState({}, '', '/system/sol?focus=earth');

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
    expect(replaceSpy).not.toHaveBeenCalled();
  });

  it('strips out-of-scope center parameter when center is not in this system', () => {
    window.history.pushState({}, '', '/system/sol?center=sirius');

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

    expect(replaceSpy).toHaveBeenCalledWith('/system/sol');
  });
});
