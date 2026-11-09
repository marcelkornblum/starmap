import type React from 'react';
import { useCameraStore } from '../stores/useCameraStore';
import { resolveAppHref } from '../utils/url';
import { appRouter } from './useSpaLocation';

/**
 * Handles client-side SPA navigation for anchor clicks, preventing full page HTTP reloads
 * while respecting external URLs, modified clicks (meta/ctrl/shift), and non-standard targets.
 */
export function handleSpaNavigation(
  event: React.MouseEvent<HTMLElement> | MouseEvent,
  href?: string | null,
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
  if (resolved.includes('center=')) {
    useCameraStore.getState().triggerRecenter();
  }
  if (appRouter.navigate) {
    void appRouter.navigate({ href: resolved });
  } else if (appRouter.history?.push) {
    appRouter.history.push(resolved);
  }
  return true;
}
