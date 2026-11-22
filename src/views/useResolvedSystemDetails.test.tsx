import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useResolvedSystemDetails } from './useResolvedSystemDetails';

vi.mock('@tanstack/react-router', () => ({
  useParams: vi.fn(() => ({})),
  useSearch: vi.fn(() => ({})),
  useRouter: vi.fn(() => undefined),
}));
import { createSpatialEntityStore } from '../components/canvas/entity/SpatialEntityStore';
import { SpatialEntityStoreContext } from '../components/canvas/entity/SpatialEntityContext';
import {
  clearDetailsRepositoryCache,
  seedDetailRecord,
  seedSummaryNode,
} from '../data/detailsRepository';
import type { SystemManifest, SystemSummaryNode } from '../types/astro';
import type { CompactSearchEntry } from '../utils/compactDataTypes';

const TAU_CETI_FIXTURE: SystemManifest = {
  id: 'gaia-2452378776434477184',
  name: 'Tau Ceti',
  x: 3.156,
  y: 1.54,
  z: -1.003,
  dist: 3.65,
  sectorId: 'sector_+000_+000_-025',
  stars: [
    {
      id: '2452378776434477184-A',
      name: 'Tau Ceti',
      componentDesignation: 'A',
      spectralType: 'G8V',
      mag: 3.5,
      absmag: 5.68,
      massMsun: 0.783,
      radiusRsun: 0.793,
      luminosityLsun: 0.52,
      effectiveTempK: 5344,
    },
  ],
  planets: [
    {
      id: 'tau-ceti-e',
      name: 'Tau Ceti e',
      letter: 'e',
      massMearth: 3.93,
      radiusRearth: 1.81,
      equilibriumTempK: 282,
      surfaceGravityG: 1.2,
      composition: 'super-earth',
      isHabitableCandidate: true,
      orbit: {
        semiMajorAxis: 0.538,
        periodDays: 162.87,
        eccentricity: 0.18,
        inclination: 0,
        ascendingNode: 0,
        argumentOfPeriapsis: 22.3,
        meanAnomaly: 0,
      },
    },
  ],
};

const TAU_CETI_SUMMARY: SystemSummaryNode = {
  id: 'tau-ceti',
  name: 'Tau Ceti',
  x: 3.156,
  y: 1.54,
  z: -1.003,
  dist: 3.65,
  mag: 3.5,
  absmag: 5.68,
  spect: 'G8V',
  starCount: 1,
  planetCount: 1,
  hasHabitableCandidate: true,
  sectorId: 'sector_+000_+000_-025',
};

const corpus: CompactSearchEntry[] = [
  { i: 'tau-ceti', n: 'Tau Ceti', p: [3.156, 1.54, -1.003] },
  { i: 'tau-ceti-e', n: 'Tau Ceti e', s: 'tau-ceti' },
  { i: 'proxima-centauri', n: 'Proxima Centauri', p: [1.3, 0, 0] },
];

describe('useResolvedSystemDetails', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    clearDetailsRepositoryCache();
    seedDetailRecord('tau-ceti', { kind: 'system', record: TAU_CETI_FIXTURE });
    seedSummaryNode('tau-ceti', TAU_CETI_SUMMARY);
    seedDetailRecord('tau-ceti-e', { kind: 'system', record: TAU_CETI_FIXTURE });
    seedSummaryNode('tau-ceti-e', TAU_CETI_SUMMARY);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  const createWrapper = (store: ReturnType<typeof createSpatialEntityStore>) => {
    return ({ children }: { children: React.ReactNode }) => (
      <SpatialEntityStoreContext.Provider value={store}>
        {children}
      </SpatialEntityStoreContext.Provider>
    );
  };

  it('resolves system details and in-scope focus correctly', async () => {
    const store = createSpatialEntityStore();
    let hookResult!: ReturnType<typeof renderHook<ReturnType<typeof useResolvedSystemDetails>, unknown>>;
    await act(async () => {
      hookResult = renderHook(
        () =>
          useResolvedSystemDetails({
            systemId: 'tau-ceti',
            initialCorpus: corpus,
            locationPathname: '/system/tau-ceti',
            locationSearch: '?focus=tau-ceti-e',
          }),
        { wrapper: createWrapper(store) },
      );
    });

    expect(hookResult.result.current.urlSystemSlug).toBe('tau-ceti');
    expect(hookResult.result.current.isFocusInThisSystem).toBe(true);
    expect(hookResult.result.current.hasExplicitFocus).toBe(true);
    expect(hookResult.result.current.systemContextDetails).toBeTruthy();
  });

  it('flags out-of-scope focus when focused entity belongs to another system', async () => {
    const store = createSpatialEntityStore();
    let hookResult!: ReturnType<typeof renderHook<ReturnType<typeof useResolvedSystemDetails>, unknown>>;
    await act(async () => {
      hookResult = renderHook(
        () =>
          useResolvedSystemDetails({
            systemId: 'tau-ceti',
            initialCorpus: corpus,
            locationPathname: '/system/tau-ceti',
            locationSearch: '?focus=proxima-centauri',
          }),
        { wrapper: createWrapper(store) },
      );
    });

    expect(hookResult.result.current.urlSystemSlug).toBe('tau-ceti');
    expect(hookResult.result.current.isFocusInThisSystem).toBe(false);
    expect(hookResult.result.current.focusedDetails).toBeNull();
  });

  it('preserves systemContextDetails reference stability when unrelated entities register in store', async () => {
    const store = createSpatialEntityStore();
    let hookResult!: ReturnType<typeof renderHook<ReturnType<typeof useResolvedSystemDetails>, unknown>>;
    await act(async () => {
      hookResult = renderHook(
        () =>
          useResolvedSystemDetails({
            systemId: 'tau-ceti',
            initialCorpus: corpus,
            locationPathname: '/system/tau-ceti',
            locationSearch: '?focus=tau-ceti-e',
          }),
        { wrapper: createWrapper(store) },
      );
    });

    const initialContextDetails = hookResult.result.current.systemContextDetails;

    // Register unrelated entities in store
    act(() => {
      store.getState().registerEntities([
        {
          id: 'unrelated-star',
          name: 'Unrelated Star',
          classification: 'star',
          position: [100, 200, 300],
        },
      ]);
    });

    expect(hookResult.result.current.systemContextDetails).toBe(initialContextDetails);
  });

  it('resolves focusedDetails from store-driven focusedEntity even before URL sync (when urlFocusSlug is absent)', async () => {
    const store = createSpatialEntityStore();
    store.getState().registerEntities([
      {
        id: 'tau-ceti-e',
        name: 'Tau Ceti e',
        classification: 'terrestrial',
        parentBodyId: 'tau-ceti',
        position: [3.156, 1.54, -1.003],
      },
    ]);

    let hookResult!: ReturnType<typeof renderHook<ReturnType<typeof useResolvedSystemDetails>, unknown>>;
    await act(async () => {
      hookResult = renderHook(
        () =>
          useResolvedSystemDetails({
            systemId: 'tau-ceti',
            initialCorpus: corpus,
            locationPathname: '/system/tau-ceti',
            locationSearch: '',
          }),
        { wrapper: createWrapper(store) },
      );
    });

    await act(async () => {
      store.getState().setFocused('tau-ceti-e');
    });

    expect(hookResult.result.current.focusedEntity?.id).toBe('tau-ceti-e');
    expect(hookResult.result.current.focusedDetails).not.toBeNull();
  });

  it('preserves systemContextDetails and focusedDetails reference stability when ?center= changes', async () => {
    const store = createSpatialEntityStore();
    let hookResult!: ReturnType<
      typeof renderHook<
        ReturnType<typeof useResolvedSystemDetails>,
        { locationSearch: string }
      >
    >;
    await act(async () => {
      hookResult = renderHook(
        ({ locationSearch }) =>
          useResolvedSystemDetails({
            systemId: 'tau-ceti',
            initialCorpus: corpus,
            locationPathname: '/system/tau-ceti',
            locationSearch,
          }),
        {
          initialProps: { locationSearch: '?focus=tau-ceti-e' },
          wrapper: createWrapper(store),
        },
      );
    });

    const initialContextDetails = hookResult.result.current.systemContextDetails;
    const initialFocusedDetails = hookResult.result.current.focusedDetails;

    await act(async () => {
      hookResult.rerender({ locationSearch: '?focus=tau-ceti-e&center=tau-ceti-e' });
    });

    expect(hookResult.result.current.systemContextDetails).toBe(initialContextDetails);
    expect(hookResult.result.current.focusedDetails).toBe(initialFocusedDetails);
  });
});
