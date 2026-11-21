import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useResolvedPlanetDetails } from './useResolvedPlanetDetails';

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

const SOL_FIXTURE: SystemManifest = {
  id: 'sol',
  name: 'Sol',
  x: 0,
  y: 0,
  z: 0,
  dist: 0,
  sectorId: 'sector_0_0_0',
  stars: [
    {
      id: 'sol-star',
      name: 'Sol',
      componentDesignation: 'A',
      spectralType: 'G2V',
      mag: -26.7,
      absmag: 4.83,
    },
  ],
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
};

const SOL_SUMMARY: SystemSummaryNode = {
  id: 'sol',
  name: 'Sol',
  x: 0,
  y: 0,
  z: 0,
  dist: 0,
  mag: -26.7,
  absmag: 4.83,
  spect: 'G2V',
  starCount: 1,
  planetCount: 1,
  hasHabitableCandidate: true,
  sectorId: 'sector_0_0_0',
};

const corpus: CompactSearchEntry[] = [
  { i: 'earth', n: 'Earth', s: 'sol', p: [0, 0, 0] },
  { i: 'moon', n: 'Moon', s: 'sol', o: 'earth', p: [0, 0, 0] },
  { i: 'mars', n: 'Mars', s: 'sol', p: [1.5, 0, 0] },
];

describe('useResolvedPlanetDetails', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    clearDetailsRepositoryCache();
    seedDetailRecord('sol', { kind: 'system', record: SOL_FIXTURE });
    seedSummaryNode('sol', SOL_SUMMARY);
    seedDetailRecord('earth', { kind: 'system', record: SOL_FIXTURE });
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

  it('resolves planet slug and systemContextDetails for earth', async () => {
    const store = createSpatialEntityStore();
    let hookResult!: ReturnType<typeof renderHook<ReturnType<typeof useResolvedPlanetDetails>, unknown>>;
    await act(async () => {
      hookResult = renderHook(
        () =>
          useResolvedPlanetDetails({
            planetId: 'earth',
            initialCorpus: corpus,
            locationPathname: '/planet/earth',
            locationSearch: '',
          }),
        { wrapper: createWrapper(store) },
      );
    });

    expect(hookResult.result.current.urlPlanetSlug).toBe('earth');
    expect(hookResult.result.current.systemContextDetails).toBeTruthy();
  });

  it('resolves focusedDetails when focus is on valid satellite moon', async () => {
    const store = createSpatialEntityStore();
    let hookResult!: ReturnType<typeof renderHook<ReturnType<typeof useResolvedPlanetDetails>, unknown>>;
    await act(async () => {
      hookResult = renderHook(
        () =>
          useResolvedPlanetDetails({
            planetId: 'earth',
            initialCorpus: corpus,
            locationPathname: '/planet/earth',
            locationSearch: '?focus=moon',
          }),
        { wrapper: createWrapper(store) },
      );
    });

    expect(hookResult.result.current.urlPlanetSlug).toBe('earth');
    expect(hookResult.result.current.hasExplicitFocus).toBe(true);
    expect(hookResult.result.current.focusedDetails).toBeTruthy();
  });

  it('returns null for focusedDetails when focus is out of planet scope (mars)', async () => {
    const store = createSpatialEntityStore();
    let hookResult!: ReturnType<typeof renderHook<ReturnType<typeof useResolvedPlanetDetails>, unknown>>;
    await act(async () => {
      hookResult = renderHook(
        () =>
          useResolvedPlanetDetails({
            planetId: 'earth',
            initialCorpus: corpus,
            locationPathname: '/planet/earth',
            locationSearch: '?focus=mars',
          }),
        { wrapper: createWrapper(store) },
      );
    });

    expect(hookResult.result.current.urlPlanetSlug).toBe('earth');
    expect(hookResult.result.current.focusedDetails).toBeNull();
  });

  it('resolves focusedDetails from store-driven focusedEntity even before URL sync (when urlFocusSlug is absent)', async () => {
    const store = createSpatialEntityStore();
    store.getState().registerEntities([
      {
        id: 'moon',
        name: 'Moon',
        classification: 'terrestrial',
        parentBodyId: 'earth',
        position: [0.00257, 0, 0],
      },
    ]);
    store.getState().setFocused('moon');

    let hookResult!: ReturnType<typeof renderHook<ReturnType<typeof useResolvedPlanetDetails>, unknown>>;
    await act(async () => {
      hookResult = renderHook(
        () =>
          useResolvedPlanetDetails({
            planetId: 'earth',
            initialCorpus: corpus,
            locationPathname: '/planet/earth',
            locationSearch: '',
          }),
        { wrapper: createWrapper(store) },
      );
    });

    expect(hookResult.result.current.focusedEntity?.id).toBe('moon');
    expect(hookResult.result.current.focusedDetails).not.toBeNull();
  });

  it('ignores and clears stale out-of-scope store focusedId (mars) on /planet/earth', async () => {
    const store = createSpatialEntityStore();
    store.getState().registerEntities([
      {
        id: 'mars',
        name: 'Mars',
        classification: 'terrestrial',
        parentBodyId: 'sol',
        position: [1.5, 0, 0],
      },
    ]);
    store.getState().setFocused('mars');

    let hookResult!: ReturnType<typeof renderHook<ReturnType<typeof useResolvedPlanetDetails>, unknown>>;
    await act(async () => {
      hookResult = renderHook(
        () =>
          useResolvedPlanetDetails({
            planetId: 'earth',
            initialCorpus: corpus,
            locationPathname: '/planet/earth',
            locationSearch: '',
          }),
        { wrapper: createWrapper(store) },
      );
    });

    expect(hookResult.result.current.focusedEntity).toBeNull();
    expect(hookResult.result.current.focusedDetails).toBeNull();
    expect(store.getState().focusedId).toBeNull();
  });
});
