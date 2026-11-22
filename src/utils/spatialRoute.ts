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
