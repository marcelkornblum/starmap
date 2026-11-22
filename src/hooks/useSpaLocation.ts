import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, type RegisteredRouter } from '@tanstack/react-router';

export interface StarmapSearchParams {
  q?: string;
  searchCategory?: string;
  focus?: string;
  select?: string;
  layer?: string;
  route?: string;
  center?: string;
}

export interface AppRouterState {
  readonly location?: {
    readonly pathname?: string;
    readonly searchStr?: string;
    readonly search?: StarmapSearchParams;
  };
}

export interface AppRouterAdapter {
  readonly navigate?: RegisteredRouter['navigate'];
  readonly state?: AppRouterState;
  subscribe?(
    event: 'onResolved',
    callback: () => void,
  ): (() => void) | undefined;
  readonly history?: {
    subscribe?(callback: () => void): (() => void) | undefined;
    push?(path: string): void;
    replace?(path: string): void;
  };
}

/**
 * React context bridging the active TanStack Router instance across R3F's `<Canvas>` reconciler boundary.
 */
export const CanvasRouterBridgeContext = createContext<AppRouterAdapter | undefined>(undefined);

export function useOptionalRouter(): AppRouterAdapter | undefined {
  const bridgedRouter = useContext(CanvasRouterBridgeContext);
  const router: AppRouterAdapter | null | undefined = useRouter({ warn: false });
  return router ?? bridgedRouter;
}

/**
 * Pure function normalising a raw location pathname against the application's basepath.
 * Strips subpath base prefix (e.g. '/starmap/galaxy' -> '/galaxy', '/starmap/' -> '/').
 */
export function resolveSpaLocation(
  rawPathname?: string,
  rawSearch?: string,
  basepath = import.meta.env?.BASE_URL ?? '/',
  routerState?: AppRouterState,
): { readonly pathname: string; readonly search: string } {
  const effectivePathname =
    rawPathname ??
    routerState?.location?.pathname ??
    (typeof window !== 'undefined' ? window.location.pathname : '/');
  const effectiveSearch =
    rawSearch ??
    routerState?.location?.searchStr ??
    (typeof window !== 'undefined' ? window.location.search : '');

  const base = basepath.replace(/\/+$/, '');
  const normalizedPathname =
    base && base !== '/' && effectivePathname.startsWith(base)
      ? (effectivePathname.slice(base.length) || '/')
      : effectivePathname;

  return { pathname: normalizedPathname, search: effectiveSearch };
}

export function useSpaLocation(
  locationPathname?: string,
  locationSearch?: string,
  fallbackPathname = '/galaxy',
): { readonly pathname: string; readonly search: string } {
  const router = useOptionalRouter();
  const [, setLocationTick] = useState<number>(0);

  const rawPathname =
    locationPathname ??
    router?.state?.location?.pathname ??
    (typeof window !== 'undefined' ? window.location.pathname : fallbackPathname);
  const rawSearch =
    locationSearch ??
    router?.state?.location?.searchStr ??
    (typeof window !== 'undefined' ? window.location.search : '');
  const rawPendingPathname =
    (router?.state as { pendingLocation?: { pathname?: string } } | undefined)?.pendingLocation
      ?.pathname ?? '';

  const lastLocationRef = useRef<string>(`${rawPathname}${rawSearch}|${rawPendingPathname}`);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      (locationPathname !== undefined && locationSearch !== undefined)
    ) {
      return;
    }
    const handleLocationChange = (): void => {
      const nextPathname =
        locationPathname ??
        router?.state?.location?.pathname ??
        window.location.pathname;
      const nextSearch =
        locationSearch ??
        router?.state?.location?.searchStr ??
        window.location.search;
      const nextPendingPathname =
        (router?.state as { pendingLocation?: { pathname?: string } } | undefined)?.pendingLocation
          ?.pathname ?? '';
      const current = `${nextPathname}${nextSearch}|${nextPendingPathname}`;
      if (current !== lastLocationRef.current) {
        lastLocationRef.current = current;
        setLocationTick((n) => n + 1);
      }
    };

    const unsubRouter = router?.subscribe?.('onResolved', handleLocationChange);
    const unsubHistory = router?.history?.subscribe?.(handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('starmap:locationchange', handleLocationChange);

    return () => {
      unsubRouter?.();
      unsubHistory?.();
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('starmap:locationchange', handleLocationChange);
    };
  }, [locationPathname, locationSearch, router]);

  return useMemo(
    () => resolveSpaLocation(rawPathname, rawSearch),
    [rawPathname, rawSearch],
  );
}
