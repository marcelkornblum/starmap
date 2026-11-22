import { useCallback } from 'react';
import type React from 'react';
import { useCameraStore } from '../stores/useCameraStore';
import { toUrlSlug } from '../utils/datasetLayerSlugs';
import { setPendingSpatialNavigationHref } from '../utils/spatialRoute';
import { parseCenterCoordinatesString, resolveAppHref } from '../utils/url';
import { useOptionalRouter, type AppRouterAdapter } from './useSpaLocation';

function normalizeCenterValue(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim() ?? '';
  if (!trimmed) return null;
  return parseCenterCoordinatesString(trimmed) ? trimmed : toUrlSlug(trimmed) || trimmed;
}

function getCenterSearchParam(href: string): string | null {
  let rawCenter: string | null = null;
  try {
    const parsedUrl = new URL(href, 'http://localhost');
    rawCenter = parsedUrl.searchParams.get('center');
  } catch {
    const queryIndex = href.indexOf('?');
    if (queryIndex === -1) return null;
    rawCenter = new URLSearchParams(href.slice(queryIndex + 1)).get('center');
  }
  return normalizeCenterValue(rawCenter);
}

function getCurrentCenterParam(router?: AppRouterAdapter | null): string | null {
  const routerCenter = router?.state?.location?.search?.center;
  if (typeof routerCenter === 'string') {
    return normalizeCenterValue(routerCenter);
  }
  const searchStr =
    router?.state?.location?.searchStr ??
    (typeof window !== 'undefined' ? window.location.search : '');
  if (!searchStr) return null;
  return normalizeCenterValue(new URLSearchParams(searchStr).get('center'));
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    value !== null &&
    (typeof value === 'object' || typeof value === 'function') &&
    typeof (value as PromiseLike<unknown>).then === 'function'
  );
}

/**
 * Handles client-side SPA navigation for anchor clicks, preventing full page HTTP reloads
 * while respecting external URLs, modified clicks (meta/ctrl/shift), and non-standard targets.
 */
export function handleSpaNavigation(
  event: React.MouseEvent<HTMLElement> | MouseEvent,
  href?: string | null,
  router?: AppRouterAdapter | null,
): boolean {
  if (
    !href ||
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return false;
  }

  const rawHref = href.trim();
  if (
    rawHref.startsWith('#') ||
    rawHref.startsWith('mailto:') ||
    rawHref.startsWith('tel:') ||
    rawHref.startsWith('http://') ||
    rawHref.startsWith('https://') ||
    rawHref.startsWith('//')
  ) {
    return false;
  }

  event.preventDefault();
  const resolved = resolveAppHref(rawHref) ?? rawHref;
  const targetCenter = getCenterSearchParam(resolved);
  const currentCenter = targetCenter !== null ? getCurrentCenterParam(router) : null;
  const isSameCenter = targetCenter !== null && currentCenter === targetCenter;

  let navResult: unknown;
  if (router && typeof router.navigate === 'function') {
    setPendingSpatialNavigationHref(resolved);
    navResult = router.navigate({ href: resolved });
  } else if (router?.history?.push) {
    setPendingSpatialNavigationHref(resolved);
    router.history.push(resolved);
  }

  if (targetCenter !== null) {
    if (isSameCenter || !isThenable(navResult)) {
      useCameraStore.getState().triggerRecenter();
    } else {
      void navResult.then(
        () => {
          useCameraStore.getState().triggerRecenter();
        },
        () => {},
      );
    }
  }
  return true;
}

export function useSpaLinkClick(): (
  event: React.MouseEvent<HTMLElement> | MouseEvent,
  href?: string | null,
) => boolean {
  const router = useOptionalRouter();
  return useCallback(
    (event: React.MouseEvent<HTMLElement> | MouseEvent, href?: string | null) =>
      handleSpaNavigation(event, href, router),
    [router],
  );
}
