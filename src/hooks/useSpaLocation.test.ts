// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  resolveSpaLocation,
  registerAppRouter,
  appRouter,
  useSpaLocation,
  type SpaRouterLike,
} from './useSpaLocation';

describe('useSpaLocation and router proxy', () => {
  afterEach(() => {
    registerAppRouter(null);
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
  });

  describe('registerAppRouter and appRouter proxy', () => {
    it('proxies navigate, state, subscribe, and history to registered instance', () => {
      const mockNavigate = vi.fn();
      const mockSubscribe = vi.fn();
      const mockHistorySub = vi.fn();
      const mockRouter: SpaRouterLike = {
        navigate: mockNavigate,
        state: { currentPath: '/galaxy' },
        subscribe: mockSubscribe,
        history: { subscribe: mockHistorySub },
      };

      expect(appRouter.navigate).toBeUndefined();
      expect(appRouter.state).toBeUndefined();

      registerAppRouter(mockRouter);

      expect(appRouter.state).toEqual({ currentPath: '/galaxy' });
      appRouter.navigate?.({ to: '/system' });
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/system' });

      appRouter.subscribe?.('onResolved', vi.fn());
      expect(mockSubscribe).toHaveBeenCalled();
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

    it('subscribes to registered router events and updates when router emits', () => {
      let routerListener: (() => void) | undefined;
      const unsubscribeMock = vi.fn();
      const mockRouter: SpaRouterLike = {
        subscribe: vi.fn((_event, cb) => {
          routerListener = cb;
          return unsubscribeMock;
        }),
      };
      registerAppRouter(mockRouter);

      const { unmount } = renderHook(() => useSpaLocation());
      expect(mockRouter.subscribe).toHaveBeenCalledWith(
        'onResolved',
        expect.any(Function),
      );

      act(() => {
        routerListener?.();
      });

      unmount();
      expect(unsubscribeMock).toHaveBeenCalled();
    });
  });
});
