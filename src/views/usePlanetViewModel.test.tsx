import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePlanetViewModel } from './usePlanetViewModel';

vi.mock('@tanstack/react-router', () => ({
  useParams: vi.fn(() => ({})),
  useSearch: vi.fn(() => ({})),
  useRouter: vi.fn(() => undefined),
}));
import { useParams, useRouter, useSearch } from '@tanstack/react-router';
import { createSpatialEntityStore } from '../components/canvas/entity/SpatialEntityStore';
import { SpatialEntityStoreContext } from '../components/canvas/entity/SpatialEntityContext';
import {
  clearDetailsRepositoryCache,
  seedDetailRecord,
  seedSummaryNode,
} from '../data/detailsRepository';
import { useCameraStore } from '../stores/useCameraStore';
import { useUIStore } from '../stores/useUIStore';
import type { SystemManifest, SystemSummaryNode } from '../types/astro';

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

describe('usePlanetViewModel', () => {
  beforeEach(() => {
    clearDetailsRepositoryCache();
    seedDetailRecord('sol', { kind: 'system', record: SOL_FIXTURE });
    seedSummaryNode('sol', SOL_SUMMARY);
    seedDetailRecord('earth', { kind: 'system', record: SOL_FIXTURE });
    useUIStore.setState({ detailsDetent: 'collapsed' });
    useCameraStore.getState().reset();
  });

  const createWrapper = (store: ReturnType<typeof createSpatialEntityStore>) => {
    return ({ children }: { children: React.ReactNode }) => (
      <SpatialEntityStoreContext.Provider value={store}>
        {children}
      </SpatialEntityStoreContext.Provider>
    );
  };

  it('initializes planet view model and resolves breadcrumbs', async () => {
    const store = createSpatialEntityStore();
    let hookResult!: ReturnType<typeof renderHook<ReturnType<typeof usePlanetViewModel>, unknown>>;
    await act(async () => {
      hookResult = renderHook(
        () =>
          usePlanetViewModel({
            planetId: 'earth',
            locationPathname: '/planet/earth',
            locationSearch: '',
          }),
        { wrapper: createWrapper(store) },
      );
    });

    expect(hookResult.result.current.targetId).toBe('earth');
    expect(hookResult.result.current.pathname).toBe('/planet/earth');
    expect(hookResult.result.current.resolvedBreadcrumbs.length).toBeGreaterThan(0);
    expect(hookResult.result.current.resolvedBreadcrumbs[0]?.label).toBe('Galaxy');
  });

  it('updates galaxy breadcrumb link when lastGalaxySearch is in camera store', async () => {
    useCameraStore.setState({ lastGalaxySearch: '?focus=earth' });
    const store = createSpatialEntityStore();
    let hookResult!: ReturnType<typeof renderHook<ReturnType<typeof usePlanetViewModel>, unknown>>;
    await act(async () => {
      hookResult = renderHook(
        () =>
          usePlanetViewModel({
            planetId: 'earth',
            locationPathname: '/planet/earth',
            locationSearch: '',
          }),
        { wrapper: createWrapper(store) },
      );
    });

    const galaxyCrumb = hookResult.result.current.resolvedBreadcrumbs.find((b) => b.label === 'Galaxy');
    expect(galaxyCrumb?.href).toBe('/galaxy?focus=earth');
  });

  it('builds activeJourney when route query is present', async () => {
    const store = createSpatialEntityStore();
    let hookResult!: ReturnType<typeof renderHook<ReturnType<typeof usePlanetViewModel>, unknown>>;
    await act(async () => {
      hookResult = renderHook(
        () =>
          usePlanetViewModel({
            planetId: 'earth',
            locationPathname: '/planet/earth',
            locationSearch: '?route=sol,earth',
          }),
        { wrapper: createWrapper(store) },
      );
    });

    expect(hookResult.result.current.routeStops).toEqual(['sol', 'earth']);
    expect(hookResult.result.current.activeJourney).toBeTruthy();
  });

  it('provides handleSelectEntity that navigates and elevates UI detent when selecting an entity', async () => {
    const navigateSpy = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useRouter).mockReturnValue({ navigate: navigateSpy } as never);

    try {
      const store = createSpatialEntityStore();
      let hookResult!: ReturnType<typeof renderHook<ReturnType<typeof usePlanetViewModel>, unknown>>;
      await act(async () => {
        hookResult = renderHook(
          () =>
            usePlanetViewModel({
              planetId: 'earth',
              locationPathname: '/planet/earth',
              locationSearch: '',
            }),
          { wrapper: createWrapper(store) },
        );
      });

      expect(useUIStore.getState().detailsDetent).toBe('collapsed');
      expect(typeof (hookResult.result.current as unknown as { handleSelectEntity: unknown }).handleSelectEntity).toBe('function');

      await act(async () => {
        (hookResult.result.current as unknown as { handleSelectEntity: (id: string | null) => void }).handleSelectEntity('moon');
      });

      expect(useUIStore.getState().detailsDetent).toBe('peek');
      expect(navigateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '/planet/$planetId',
          params: { planetId: 'earth' },
          replace: true,
        }),
      );

      navigateSpy.mockClear();

      await act(async () => {
        (hookResult.result.current as unknown as { handleSelectEntity: (id: string | null) => void }).handleSelectEntity(null);
      });

      expect(navigateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '/planet/$planetId',
          params: { planetId: 'earth' },
          replace: true,
        }),
      );
    } finally {
      vi.mocked(useRouter).mockReturnValue(undefined as never);
    }
  });

  it('centres on ?focus= on cold load, but clears effectiveCenterId when ?focus= changes subsequently without ?center=', async () => {
    const store = createSpatialEntityStore();
    let hookResult!: ReturnType<typeof renderHook<ReturnType<typeof usePlanetViewModel>, { search: string }>>;
    await act(async () => {
      hookResult = renderHook(
        ({ search }) =>
          usePlanetViewModel({
            planetId: 'earth',
            locationPathname: '/planet/earth',
            locationSearch: search,
          }),
        {
          wrapper: createWrapper(store),
          initialProps: { search: '?focus=moon' },
        },
      );
    });

    expect(hookResult.result.current.effectiveCenterId).toBe('moon');

    await act(async () => {
      hookResult.rerender({ search: '?focus=earth' });
    });

    expect(hookResult.result.current.effectiveCenterId).toBeUndefined();
  });

  it('sets effectiveCenterId on intra-view focusFromSearch and records canvas focus without setting effectiveCenterId on handleSelectEntity', async () => {
    useCameraStore.getState().reset();
    const store = createSpatialEntityStore();
    let hookResult!: ReturnType<typeof renderHook<ReturnType<typeof usePlanetViewModel>, unknown>>;
    await act(async () => {
      hookResult = renderHook(
        () =>
          usePlanetViewModel({
            planetId: 'saturn',
            locationPathname: '/planet/saturn',
            locationSearch: '',
          }),
        { wrapper: createWrapper(store) },
      );
    });

    expect(hookResult.result.current.effectiveCenterId).toBeUndefined();

    act(() => {
      useCameraStore.getState().focusFromSearch('titan');
    });
    expect(hookResult.result.current.effectiveCenterId).toBe('titan');

    act(() => {
      hookResult.result.current.handleSelectEntity('mars');
    });
    expect(useCameraStore.getState().canvasFocusedSlugs.has('mars')).toBe(true);
    expect(useCameraStore.getState().pendingCenterSlug).toBeNull();
    expect(hookResult.result.current.effectiveCenterId).toBeUndefined();
  });

  it('does not allow live router state to override explicit locationPathname and locationSearch props', async () => {
    vi.mocked(useParams).mockReturnValue({ planetId: 'jupiter' });
    vi.mocked(useSearch).mockReturnValue({ focus: 'europa', center: 'europa', route: 'earth,jupiter' });
    const store = createSpatialEntityStore();
    try {
      let hookResult!: ReturnType<typeof renderHook<ReturnType<typeof usePlanetViewModel>, unknown>>;
      await act(async () => {
        hookResult = renderHook(
          () =>
            usePlanetViewModel({
              planetId: 'earth',
              locationPathname: '/planet/earth',
              locationSearch: '?focus=moon&center=moon',
            }),
          { wrapper: createWrapper(store) },
        );
      });

      expect(hookResult.result.current.targetId).toBe('earth');
      expect(hookResult.result.current.effectiveCenterId).toBe('moon');
      expect(hookResult.result.current.routeStops).toBeNull();
    } finally {
      vi.mocked(useParams).mockReturnValue({});
      vi.mocked(useSearch).mockReturnValue({});
    }
  });
});
