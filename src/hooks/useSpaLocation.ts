import { useEffect, useMemo, useState } from 'react';

export interface StarmapSearchParams {
  q?: string;
  searchCategory?: string;
  focus?: string;
  select?: string;
  layer?: string;
  route?: string;
  journeyOption?: string;
  center?: string;
}

export interface SpaRouterNavigateOptions {
  to?: string;
  href?: string;
  search?:
    | ((prev: StarmapSearchParams) => StarmapSearchParams)
    | ((prev: Record<string, unknown>) => Record<string, unknown>)
    | StarmapSearchParams
    | Record<string, unknown>
    | boolean;
  replace?: boolean;
  params?: Record<string, unknown>;
  resetScroll?: boolean;
  [key: string]: unknown;
}

export interface SpaRouterLike {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly navigate?: (options: SpaRouterNavigateOptions | any) => Promise<unknown>;
  readonly state?: unknown;
  readonly subscribe?: (
    event: 'onResolved' | string,
    callback: () => void,
  ) => (() => void) | undefined;
  readonly history?: {
    subscribe?: (callback: () => void) => (() => void) | undefined;
    push?: (path: string) => void;
    replace?: (path: string) => void;
  };
}

let registeredRouter: SpaRouterLike | null = null;

export function registerAppRouter(routerInstance: unknown): void {
  registeredRouter = (routerInstance ?? null) as SpaRouterLike | null;
}

export const appRouter: SpaRouterLike = {
  get navigate() {
    return registeredRouter?.navigate
      ? registeredRouter.navigate.bind(registeredRouter)
      : undefined;
  },
  get state() {
    return registeredRouter?.state;
  },
  get subscribe() {
    return registeredRouter?.subscribe
      ? registeredRouter.subscribe.bind(registeredRouter)
      : undefined;
  },
  get history() {
    return registeredRouter?.history;
  },
};

/**
 * Pure function normalizing a raw location pathname against the application's basepath.
 * Strips subpath base prefix (e.g. '/starmap/galaxy' -> '/galaxy', '/starmap/' -> '/').
 */
export function resolveSpaLocation(
  rawPathname: string,
  rawSearch: string,
  basepath = import.meta.env?.BASE_URL ?? '/',
): { readonly pathname: string; readonly search: string } {
  const base = basepath.replace(/\/+$/, '');
  const normalizedPathname =
    base && base !== '/' && rawPathname.startsWith(base)
      ? (rawPathname.slice(base.length) || '/')
      : rawPathname;

  return { pathname: normalizedPathname, search: rawSearch };
}

export function useSpaLocation(
  locationPathname?: string,
  locationSearch?: string,
  fallbackPathname = '/galaxy',
): { readonly pathname: string; readonly search: string } {
  const [, setLocationTick] = useState<number>(0);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      (locationPathname !== undefined && locationSearch !== undefined)
    ) {
      return;
    }
    const handleLocationChange = (): void => {
      setLocationTick((n) => n + 1);
    };

    const unsubRouter = appRouter.subscribe?.('onResolved', handleLocationChange);
    const unsubHistory = appRouter.history?.subscribe?.(handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);

    return () => {
      unsubRouter?.();
      unsubHistory?.();
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, [locationPathname, locationSearch]);

  const rawPathname =
    locationPathname ??
    (typeof window !== 'undefined' ? window.location.pathname : fallbackPathname);
  const rawSearch =
    locationSearch ??
    (typeof window !== 'undefined' ? window.location.search : '');

  return useMemo(
    () => resolveSpaLocation(rawPathname, rawSearch),
    [rawPathname, rawSearch],
  );
}
