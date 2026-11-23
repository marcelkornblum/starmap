import type { SpatialScale } from './referenceFrameOrientation';

/** Parsed spatial navigation target extracted from a route pathname. */
export type SpatialRouteTarget = {
  readonly scope: SpatialScale;
  readonly targetId?: string;
};

function safeDecodeSlug(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/**
 * Parses a SPA pathname into a spatial scale and optional target slug.
 * Returns `null` for non-spatial routes (e.g. `/guide`, `/search`) or incomplete paths.
 */
export function parseSpatialRouteTarget(pathname: string): SpatialRouteTarget | null {
  const withoutQueryOrHash = (pathname.split('?')[0] ?? '').split('#')[0] ?? '';
  if (!withoutQueryOrHash) {
    return null;
  }

  const segments = withoutQueryOrHash.split('/').filter((segment) => segment.length > 0);
  if (segments.length === 0) {
    return { scope: 'galaxy' };
  }

  const [rootSegment, slug] = segments;

  if (rootSegment === 'galaxy') {
    return { scope: 'galaxy' };
  }

  if (rootSegment === 'system' && slug) {
    return { scope: 'system', targetId: safeDecodeSlug(slug) };
  }

  if (rootSegment === 'planet' && slug) {
    return { scope: 'planet', targetId: safeDecodeSlug(slug) };
  }

  return null;
}

/**
 * Returns `true` when `pathname` corresponds to a spatial 3D route
 * (`/`, `/galaxy`, `/galaxy/...`, `/system/...`, `/planet/...`), ignoring
 * trailing slashes, query strings, and hash fragments.
 */
export function isSpatialRoutePathname(pathname: string): boolean {
  return parseSpatialRouteTarget(pathname) !== null;
}

let pendingSpatialRouteTarget: SpatialRouteTarget | null = null;
const pendingRouteListeners = new Set<() => void>();

function stripBasePath(pathname: string): string {
  const base = (import.meta.env?.BASE_URL ?? '/').replace(/\/+$/, '');
  if (base && base !== '/' && pathname.startsWith(base)) {
    return pathname.slice(base.length) || '/';
  }
  return pathname;
}

/**
 * Publishes an immediate pending spatial route target from an anchor href prior to
 * async router chunk loading, or clears it when given `null` or a non-spatial href.
 */
export function setPendingSpatialNavigationHref(href: string | null): void {
  const next = href === null ? null : parseSpatialRouteTarget(stripBasePath(href));
  if (
    pendingSpatialRouteTarget?.scope === next?.scope &&
    pendingSpatialRouteTarget?.targetId === next?.targetId
  ) {
    return;
  }
  pendingSpatialRouteTarget = next;
  for (const listener of pendingRouteListeners) {
    listener();
  }
}

/**
 * Returns the latest pending spatial navigation target, or `null` when idle.
 */
export function getPendingSpatialRouteTarget(): SpatialRouteTarget | null {
  return pendingSpatialRouteTarget;
}

/**
 * Subscribes to changes in the pending spatial navigation target.
 */
export function subscribePendingSpatialRoute(listener: () => void): () => void {
  pendingRouteListeners.add(listener);
  return () => {
    pendingRouteListeners.delete(listener);
  };
}
