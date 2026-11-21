import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSystemViewModel } from './useSystemViewModel';

vi.mock('@tanstack/react-router', () => ({
  useParams: vi.fn(() => ({})),
  useSearch: vi.fn(() => ({})),
  useRouter: vi.fn(() => undefined),
}));
import { useRouter } from '@tanstack/react-router';
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

describe('useSystemViewModel', () => {
  let navigateSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    clearDetailsRepositoryCache();
    seedDetailRecord('sol', { kind: 'system', record: SOL_FIXTURE });
    seedSummaryNode('sol', SOL_SUMMARY);
    useUIStore.setState({ detailsDetent: 'collapsed' });
    useCameraStore.setState({ lastGalaxySearch: '' });
    navigateSpy = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useRouter).mockReturnValue({ navigate: navigateSpy } as never);
  });

  afterEach(() => {
    vi.mocked(useRouter).mockReturnValue(undefined as never);
  });

  const createWrapper = (store: ReturnType<typeof createSpatialEntityStore>) => {
    return ({ children }: { children: React.ReactNode }) => (
      <SpatialEntityStoreContext.Provider value={store}>
        {children}
      </SpatialEntityStoreContext.Provider>
    );
  };

  it('initializes system view model and resolves breadcrumbs', async () => {
    const store = createSpatialEntityStore();
    let hookResult!: ReturnType<typeof renderHook<ReturnType<typeof useSystemViewModel>, unknown>>;
    await act(async () => {
      hookResult = renderHook(
        () =>
          useSystemViewModel({
            systemId: 'sol',
            locationPathname: '/system/sol',
            locationSearch: '',
          }),
        { wrapper: createWrapper(store) },
      );
    });

    expect(hookResult.result.current.targetId).toBe('sol');
    expect(hookResult.result.current.pathname).toBe('/system/sol');
    expect(hookResult.result.current.resolvedBreadcrumbs.length).toBeGreaterThan(0);
    expect(hookResult.result.current.resolvedBreadcrumbs[0]?.label).toBe('Galaxy');
  });

  it('updates galaxy breadcrumb link when lastGalaxySearch is in camera store', async () => {
    useCameraStore.setState({ lastGalaxySearch: '?focus=proxima-centauri' });
    const store = createSpatialEntityStore();
    let hookResult!: ReturnType<typeof renderHook<ReturnType<typeof useSystemViewModel>, unknown>>;
    await act(async () => {
      hookResult = renderHook(
        () =>
          useSystemViewModel({
            systemId: 'sol',
            locationPathname: '/system/sol',
            locationSearch: '',
          }),
        { wrapper: createWrapper(store) },
      );
    });

    const galaxyCrumb = hookResult.result.current.resolvedBreadcrumbs.find((b) => b.label === 'Galaxy');
    expect(galaxyCrumb?.href).toBe('/galaxy?focus=proxima-centauri');
  });

  it('handles handleSelectEntity by navigating with new focus', async () => {
    const store = createSpatialEntityStore();
    let hookResult!: ReturnType<typeof renderHook<ReturnType<typeof useSystemViewModel>, unknown>>;
    await act(async () => {
      hookResult = renderHook(
        () =>
          useSystemViewModel({
            systemId: 'sol',
            locationPathname: '/system/sol',
            locationSearch: '',
          }),
        { wrapper: createWrapper(store) },
      );
    });

    act(() => {
      hookResult.result.current.handleSelectEntity('earth');
    });

    expect(navigateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/system/$systemId',
        params: { systemId: 'sol' },
      }),
    );
  });

  it('preserves reference stability for memoised view properties across renders when state is unchanged', async () => {
    const store = createSpatialEntityStore();
    let hookResult!: ReturnType<typeof renderHook<ReturnType<typeof useSystemViewModel>, { search: string }>>;
    await act(async () => {
      hookResult = renderHook(
        ({ search }) =>
          useSystemViewModel({
            systemId: 'sol',
            locationPathname: '/system/sol',
            locationSearch: search,
          }),
        {
          wrapper: createWrapper(store),
          initialProps: { search: '' },
        },
      );
    });

    const initialCameraState = hookResult.result.current.cameraState;
    const initialSystemBodies = hookResult.result.current.systemBodies;
    const initialSchematic = hookResult.result.current.orbitalSchematic;
    const initialPreview = hookResult.result.current.focusedPreview;
    const initialMinimap = hookResult.result.current.minimapOrientation;

    await act(async () => {
      hookResult.rerender({ search: '' });
    });

    expect(hookResult.result.current.cameraState).toBe(initialCameraState);
    expect(hookResult.result.current.systemBodies).toBe(initialSystemBodies);
    expect(hookResult.result.current.orbitalSchematic).toBe(initialSchematic);
    expect(hookResult.result.current.focusedPreview).toBe(initialPreview);
    expect(hookResult.result.current.minimapOrientation).toBe(initialMinimap);
  });
});
