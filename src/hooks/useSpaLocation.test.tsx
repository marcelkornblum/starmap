import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRouter } from '@tanstack/react-router';
import {
  CanvasRouterBridgeContext,
  resolveSpaLocation,
  useOptionalRouter,
  useSpaLocation,
  type AppRouterAdapter,
} from './useSpaLocation';

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    useRouter: vi.fn(() => undefined),
  };
});

describe('useSpaLocation', () => {
  beforeEach(() => {
    vi.mocked(useRouter).mockReturnValue(undefined as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('resolveSpaLocation', () => {
    it('normalizes pathname by stripping basepath prefix', () => {
      const loc = resolveSpaLocation('/starmap/galaxy', '?q=sol', '/starmap');
      expect(loc.pathname).toBe('/galaxy');
      expect(loc.search).toBe('?q=sol');
    });

    it('handles root basepath correctly', () => {
      const loc = resolveSpaLocation('/galaxy', '?q=sol', '/');
      expect(loc.pathname).toBe('/galaxy');
      expect(loc.search).toBe('?q=sol');
    });

    it('defaults empty subpath to /', () => {
      const loc = resolveSpaLocation('/starmap', '', '/starmap');
      expect(loc.pathname).toBe('/');
    });

    it('falls back to routerState location when rawPathname and rawSearch are omitted', () => {
      const loc = resolveSpaLocation(undefined, undefined, '/', {
        location: { pathname: '/system/sol', searchStr: '?focus=earth' },
      });
      expect(loc.pathname).toBe('/system/sol');
      expect(loc.search).toBe('?focus=earth');
    });
  });

  describe('useSpaLocation hook', () => {
    it('returns provided locationPathname and locationSearch if given', () => {
      const { result } = renderHook(() =>
        useSpaLocation('/custom-path', '?select=sol', '/galaxy'),
      );
      expect(result.current.pathname).toBe('/custom-path');
      expect(result.current.search).toBe('?select=sol');
    });

    it('subscribes to TanStack router events and updates when router emits', () => {
      let routerListener: (() => void) | undefined;
      let historyListener: (() => void) | undefined;
      const unsubscribeRouter = vi.fn();
      const unsubscribeHistory = vi.fn();
      let currentLocation = { pathname: '/galaxy', searchStr: '?focus=sol' };

      const mockRouter: AppRouterAdapter = {
        get state() {
          return { location: currentLocation };
        },
        subscribe: vi.fn((_event, cb) => {
          routerListener = cb;
          return unsubscribeRouter;
        }),
        history: {
          subscribe: vi.fn((cb) => {
            historyListener = cb;
            return unsubscribeHistory;
          }),
        },
      };
      vi.mocked(useRouter).mockReturnValue(mockRouter as never);

      const { result, unmount } = renderHook(() => useSpaLocation());
      expect(mockRouter.subscribe).toHaveBeenCalledWith(
        'onResolved',
        expect.any(Function),
      );
      expect(mockRouter.history?.subscribe).toHaveBeenCalledWith(
        expect.any(Function),
      );
      expect(result.current).toEqual({ pathname: '/galaxy', search: '?focus=sol' });

      act(() => {
        currentLocation = { pathname: '/system/sol', searchStr: '?focus=earth' };
        routerListener?.();
      });

      expect(result.current).toEqual({ pathname: '/system/sol', search: '?focus=earth' });

      act(() => {
        currentLocation = { pathname: '/planet/earth', searchStr: '' };
        historyListener?.();
      });

      expect(result.current).toEqual({ pathname: '/planet/earth', search: '' });

      unmount();
      expect(unsubscribeRouter).toHaveBeenCalled();
      expect(unsubscribeHistory).toHaveBeenCalled();
    });

    it('re-renders when starmap:locationchange event is dispatched without a mounted router', () => {
      window.history.pushState({}, '', '/galaxy?focus=sol');
      const { result } = renderHook(() => useSpaLocation());
      expect(result.current.search).toBe('?focus=sol');

      act(() => {
        window.history.pushState({}, '', '/galaxy?focus=sirius');
        window.dispatchEvent(new Event('starmap:locationchange'));
      });

      expect(result.current.search).toBe('?focus=sirius');
    });
  });

  describe('useOptionalRouter & CanvasRouterBridgeContext', () => {
    it('falls back to CanvasRouterBridgeContext when useRouter returns undefined (e.g. inside R3F Canvas)', () => {
      const bridgedRouter: AppRouterAdapter = {
        state: { location: { pathname: '/galaxy', searchStr: '?center=sol' } },
      };
      const wrapper: React.FC<{ readonly children: React.ReactNode }> = ({ children }) => (
        <CanvasRouterBridgeContext.Provider value={bridgedRouter}>
          {children}
        </CanvasRouterBridgeContext.Provider>
      );

      const { result } = renderHook(() => useOptionalRouter(), { wrapper });
      expect(result.current).toBe(bridgedRouter);
    });

    it('prefers direct useRouter instance over CanvasRouterBridgeContext when both exist', () => {
      const bridgedRouter: AppRouterAdapter = {
        state: { location: { pathname: '/galaxy', searchStr: '?center=sol' } },
      };
      const directRouter: AppRouterAdapter = {
        state: { location: { pathname: '/system/sol', searchStr: '' } },
      };
      vi.mocked(useRouter).mockReturnValue(directRouter as never);
      const wrapper: React.FC<{ readonly children: React.ReactNode }> = ({ children }) => (
        <CanvasRouterBridgeContext.Provider value={bridgedRouter}>
          {children}
        </CanvasRouterBridgeContext.Provider>
      );

      const { result } = renderHook(() => useOptionalRouter(), { wrapper });
      expect(result.current).toBe(directRouter);
    });
  });
});
