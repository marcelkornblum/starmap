import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRouter } from '@tanstack/react-router';
import { handleSpaNavigation, useSpaLinkClick } from './spaNavigation';
import type { AppRouterAdapter } from './useSpaLocation';
import { useCameraStore } from '../stores/useCameraStore';
import {
  getPendingSpatialRouteTarget,
  setPendingSpatialNavigationHref,
} from '../utils/spatialRoute';

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    useRouter: vi.fn(() => undefined),
  };
});

describe('handleSpaNavigation', () => {
  const mockNavigate = vi.fn();
  const mockRouter: AppRouterAdapter = {
    navigate: mockNavigate,
    history: { push: mockNavigate },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setPendingSpatialNavigationHref(null);
    vi.mocked(useRouter).mockReturnValue(mockRouter as never);
  });

  afterEach(() => {
    setPendingSpatialNavigationHref(null);
  });

  const createMockEvent = (overrides: Partial<MouseEvent> = {}): MouseEvent => {
    return {
      defaultPrevented: false,
      button: 0,
      metaKey: false,
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      preventDefault: vi.fn(),
      ...overrides,
    } as unknown as MouseEvent;
  };

  it('navigates via passed router for relative internal href', () => {
    const event = createMockEvent();
    const result = handleSpaNavigation(event, '/galaxy?focus=tau-ceti', mockRouter);

    expect(result).toBe(true);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith({ href: '/galaxy?focus=tau-ceti' });
  });

  it('publishes pending spatial route target synchronously before calling router.navigate', () => {
    let targetDuringNavigate: ReturnType<typeof getPendingSpatialRouteTarget> = null;
    const asyncRouter: AppRouterAdapter = {
      navigate: vi.fn(() => {
        targetDuringNavigate = getPendingSpatialRouteTarget();
        return new Promise<void>(() => {});
      }) as unknown as AppRouterAdapter['navigate'],
    };

    handleSpaNavigation(createMockEvent(), '/system/alpha-centauri?focus=proxima', asyncRouter);
    expect(targetDuringNavigate).toEqual({
      scope: 'system',
      targetId: 'alpha-centauri',
    });
  });

  it('triggers camera recenter only when URLSearchParams includes center parameter', () => {
    const recenterSpy = vi.spyOn(useCameraStore.getState(), 'triggerRecenter');

    handleSpaNavigation(createMockEvent(), '/galaxy?notcenter=sol', mockRouter);
    expect(recenterSpy).not.toHaveBeenCalled();

    handleSpaNavigation(createMockEvent(), '/galaxy?center=sol&focus=sol', mockRouter);
    expect(recenterSpy).toHaveBeenCalledTimes(1);
  });

  it('ignores empty or whitespace-only center query params when triggering recenter', () => {
    const recenterSpy = vi.spyOn(useCameraStore.getState(), 'triggerRecenter');

    handleSpaNavigation(createMockEvent(), '/galaxy?center=&focus=sol', mockRouter);
    handleSpaNavigation(createMockEvent(), '/galaxy?center=%20%20&focus=sol', mockRouter);
    expect(recenterSpy).not.toHaveBeenCalled();
  });

  it('defers triggerRecenter until async router.navigate resolves when navigating to a different center', async () => {
    const recenterSpy = vi.spyOn(useCameraStore.getState(), 'triggerRecenter');
    let resolveNav!: () => void;
    const asyncNavigate = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveNav = resolve;
        }),
    );
    const asyncRouter: AppRouterAdapter = {
      navigate: asyncNavigate as unknown as AppRouterAdapter['navigate'],
      state: { location: { pathname: '/galaxy', searchStr: '?center=sol', search: { center: 'sol' } } },
    };

    handleSpaNavigation(createMockEvent(), '/galaxy?center=alpha-centauri', asyncRouter);
    expect(asyncNavigate).toHaveBeenCalledWith({ href: '/galaxy?center=alpha-centauri' });
    expect(recenterSpy).not.toHaveBeenCalled();

    await act(async () => {
      resolveNav();
      await Promise.resolve();
    });
    expect(recenterSpy).toHaveBeenCalledTimes(1);
  });

  it('triggers recenter synchronously when async router.navigate targets the same center', () => {
    const recenterSpy = vi.spyOn(useCameraStore.getState(), 'triggerRecenter');
    const asyncNavigate = vi.fn(() => new Promise<void>(() => {}));
    const asyncRouter: AppRouterAdapter = {
      navigate: asyncNavigate as unknown as AppRouterAdapter['navigate'],
      state: { location: { pathname: '/galaxy', searchStr: '?center=sol', search: { center: 'sol' } } },
    };

    handleSpaNavigation(createMockEvent(), '/galaxy?center=sol', asyncRouter);
    expect(recenterSpy).toHaveBeenCalledTimes(1);
  });

  it('triggers recenter on System Centre CTA click even when URL already has the same ?center=<slug>', () => {
    const recenterSpy = vi.spyOn(useCameraStore.getState(), 'triggerRecenter');
    const asyncRouter: AppRouterAdapter = {
      navigate: vi.fn().mockResolvedValue(undefined) as unknown as AppRouterAdapter['navigate'],
      state: {
        location: {
          pathname: '/system/sol',
          searchStr: '?center=earth&focus=earth',
          search: { center: 'earth', focus: 'earth' },
        },
      },
    };

    handleSpaNavigation(createMockEvent(), '/system/sol?center=earth&focus=earth', asyncRouter);
    expect(recenterSpy).toHaveBeenCalledTimes(1);
  });

  it('clears pendingSpatialNavigationHref when router.navigate rejects, throws, or returns non-thenable', async () => {
    const rejectingRouter: AppRouterAdapter = {
      navigate: vi.fn().mockRejectedValue(new Error('Navigation aborted')) as unknown as AppRouterAdapter['navigate'],
    };

    handleSpaNavigation(createMockEvent(), '/system/sol', rejectingRouter);
    expect(getPendingSpatialRouteTarget()).toEqual({ scope: 'system', targetId: 'sol' });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(getPendingSpatialRouteTarget()).toBeNull();

    const throwingRouter: AppRouterAdapter = {
      navigate: vi.fn(() => {
        throw new Error('Sync failure');
      }) as unknown as AppRouterAdapter['navigate'],
    };
    expect(() => handleSpaNavigation(createMockEvent(), '/planet/earth', throwingRouter)).toThrow('Sync failure');
    expect(getPendingSpatialRouteTarget()).toBeNull();

    const syncRouter: AppRouterAdapter = {
      navigate: vi.fn(() => undefined) as unknown as AppRouterAdapter['navigate'],
    };
    handleSpaNavigation(createMockEvent(), '/system/tau-ceti', syncRouter);
    await act(async () => {
      await Promise.resolve();
    });
    expect(getPendingSpatialRouteTarget()).toBeNull();
  });

  it('ignores external URLs, anchors, mailto, and tel', () => {
    const event = createMockEvent();

    expect(handleSpaNavigation(event, 'https://example.com', mockRouter)).toBe(false);
    expect(handleSpaNavigation(event, 'http://example.com', mockRouter)).toBe(false);
    expect(handleSpaNavigation(event, '#section', mockRouter)).toBe(false);
    expect(handleSpaNavigation(event, 'mailto:test@example.com', mockRouter)).toBe(false);
    expect(handleSpaNavigation(event, 'tel:123456', mockRouter)).toBe(false);
    expect(handleSpaNavigation(event, '//cdn.example.com', mockRouter)).toBe(false);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('ignores modified clicks (meta, ctrl, shift, alt, right button)', () => {
    const metaEvent = createMockEvent({ metaKey: true });
    expect(handleSpaNavigation(metaEvent, '/galaxy', mockRouter)).toBe(false);

    const ctrlEvent = createMockEvent({ ctrlKey: true });
    expect(handleSpaNavigation(ctrlEvent, '/galaxy', mockRouter)).toBe(false);

    const shiftEvent = createMockEvent({ shiftKey: true });
    expect(handleSpaNavigation(shiftEvent, '/galaxy', mockRouter)).toBe(false);

    const altEvent = createMockEvent({ altKey: true });
    expect(handleSpaNavigation(altEvent, '/galaxy', mockRouter)).toBe(false);

    const rightClickEvent = createMockEvent({ button: 2 });
    expect(handleSpaNavigation(rightClickEvent, '/galaxy', mockRouter)).toBe(false);

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('ignores already default-prevented events or empty href', () => {
    const preventedEvent = createMockEvent({ defaultPrevented: true });
    expect(handleSpaNavigation(preventedEvent, '/galaxy', mockRouter)).toBe(false);
    expect(handleSpaNavigation(createMockEvent(), '', mockRouter)).toBe(false);
    expect(handleSpaNavigation(createMockEvent(), undefined, mockRouter)).toBe(false);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('useSpaLinkClick binds current router from useRouter({ warn: false })', () => {
    const { result } = renderHook(() => useSpaLinkClick());
    const event = createMockEvent();

    act(() => {
      result.current(event, '/system/sol');
    });

    expect(event.preventDefault).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith({ href: '/system/sol' });
  });

  it('navigates with actual router instance', async () => {
    const { router } = await import('../router');

    // Step 1: navigate to /galaxy?focus=tau-ceti
    const event1 = createMockEvent();
    handleSpaNavigation(event1, '/galaxy?focus=tau-ceti', router);
    await new Promise((r) => setTimeout(r, 50));
    expect(router.state.location.pathname).toBe('/galaxy');
    expect(router.state.location.search).toEqual({ focus: 'tau-ceti' });

    // Step 2: navigate to /galaxy?focus=tau-ceti&route=sol,gaia-2452378776434477184
    const event2 = createMockEvent();
    handleSpaNavigation(event2, '/galaxy?focus=tau-ceti&route=sol,gaia-2452378776434477184', router);
    await new Promise((r) => setTimeout(r, 50));
    expect(router.state.location.pathname).toBe('/galaxy');
    expect(router.state.location.search).toEqual({
      focus: 'tau-ceti',
      route: 'sol,gaia-2452378776434477184',
    });
  }, 20000);
});
