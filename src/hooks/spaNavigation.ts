import { useCallback } from 'react';
import type React from 'react';
import { useCameraStore } from '../stores/useCameraStore';
import { resolveAppHref } from '../utils/url';
import { useOptionalRouter, type AppRouterAdapter } from './useSpaLocation';

function hasCenterSearchParam(href: string): boolean {
  try {
    const parsedUrl = new URL(href, 'http://localhost');
    return parsedUrl.searchParams.has('center');
  } catch {
    const queryIndex = href.indexOf('?');
    if (queryIndex === -1) return false;
    return new URLSearchParams(href.slice(queryIndex + 1)).has('center');
  }
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
  if (hasCenterSearchParam(resolved)) {
    useCameraStore.getState().triggerRecenter();
  }
  if (router && typeof router.navigate === 'function') {
    void router.navigate({ href: resolved });
  } else if (router?.history?.push) {
    router.history.push(resolved);
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
