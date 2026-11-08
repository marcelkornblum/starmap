import { toCanonicalLayerSlug, toUrlSlug } from './datasetLayerCodec';

export const STAR_TYPES_GUIDE_PATH = '/guide/star-types' as const;
export const PLANET_TYPES_GUIDE_PATH = '/guide/planet-types' as const;
export const METRICS_GUIDE_PATH = '/guide/metrics' as const;
export const HAZARDS_GUIDE_PATH = '/guide/hazards' as const;

/**
 * Resolves a public asset path against the application's base URL (import.meta.env.BASE_URL).
 */
export const resolveDataUrl = (path: string): string => {
  const base = import.meta.env?.BASE_URL ?? '/';
  return `${base}${path.replace(/^\//, '')}`;
};

/**
 * Resolves an application route path against the application's base URL (import.meta.env.BASE_URL).
 */
export const resolveAppHref = (href?: string | null): string | undefined => {
  if (href === undefined || href === null) {
    return undefined;
  }
  if (!href) {
    return href;
  }
  if (
    href.startsWith('#') ||
    href.startsWith('http://') ||
    href.startsWith('https://') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:')
  ) {
    return href;
  }
  const base = (import.meta.env?.BASE_URL ?? '/').replace(/\/+$/, '');
  if (!base || base === '/') {
    return href.startsWith('/') ? href : `/${href}`;
  }
  const cleanHref = href.startsWith('/') ? href : `/${href}`;
  if (cleanHref === base || cleanHref.startsWith(`${base}/`) || cleanHref.startsWith(`${base}?`)) {
    return cleanHref;
  }
  return `${base}${cleanHref}`;
};

/**
 * Builds the URL to the Star Type Guide view for a given spectral class.
 */
export const buildStarTypeGuideHref = (spectralType: string): string => {
  const trimmed = spectralType.trim();
  if (!trimmed || trimmed === 'Unknown') {
    return STAR_TYPES_GUIDE_PATH;
  }
  return `${STAR_TYPES_GUIDE_PATH}/${encodeURIComponent(trimmed)}`;
};

/**
 * Builds the URL to the Planet Type Guide view for a given planetary composition class.
 */
export const buildPlanetTypeGuideHref = (planetType?: string): string => {
  if (!planetType) {
    return PLANET_TYPES_GUIDE_PATH;
  }
  const trimmed = planetType.trim();
  if (!trimmed || trimmed === 'Unknown') {
    return PLANET_TYPES_GUIDE_PATH;
  }
  return `${PLANET_TYPES_GUIDE_PATH}/${encodeURIComponent(trimmed)}`;
};

/**
 * Builds the URL to the Telemetry Metrics Guide view for a given metric.
 */
export const buildMetricGuideHref = (
  metricId?: string,
  focusId?: string,
): string => {
  if (!metricId) {
    return METRICS_GUIDE_PATH;
  }
  const trimmed = metricId.trim();
  if (!trimmed || trimmed === 'Unknown') {
    return METRICS_GUIDE_PATH;
  }
  const baseHref = `${METRICS_GUIDE_PATH}/${encodeURIComponent(trimmed)}`;
  const trimmedFocus = focusId?.trim();
  if (trimmedFocus) {
    return `${baseHref}?focus=${encodeURIComponent(trimmedFocus)}`;
  }
  return baseHref;
};

/**
 * Builds the URL to the Environmental Hazards Guide view.
 */
export const buildHazardGuideHref = (hazardCode?: string): string => {
  if (!hazardCode) {
    return HAZARDS_GUIDE_PATH;
  }
  const trimmed = hazardCode.trim().toLowerCase();
  if (!trimmed || trimmed === 'unknown') {
    return HAZARDS_GUIDE_PATH;
  }
  return `${HAZARDS_GUIDE_PATH}/${encodeURIComponent(trimmed)}`;
};

/**
 * Pure parser extracting `{ layerSlug, itemSlug? }` from a URL `?layer=` query parameter.
 */
export function parseLayerQueryParam(
  rawLayerParam?: string | null,
): { layerSlug: string; itemSlug?: string } | null {
  if (!rawLayerParam || typeof rawLayerParam !== 'string') {
    return null;
  }
  const trimmed = rawLayerParam.trim();
  if (!trimmed) {
    return null;
  }

  const withoutPrefix = trimmed.replace(/^(?:layer|overlay):/i, '');
  const colonIndex = withoutPrefix.indexOf(':');

  if (colonIndex === -1) {
    const layerSlug = toCanonicalLayerSlug(withoutPrefix);
    return layerSlug ? { layerSlug } : null;
  }

  const layerPart = withoutPrefix.slice(0, colonIndex);
  const itemPart = withoutPrefix.slice(colonIndex + 1);

  const layerSlug = toCanonicalLayerSlug(layerPart);
  if (!layerSlug) {
    return null;
  }

  const itemSlug = toUrlSlug(itemPart);
  return itemSlug ? { layerSlug, itemSlug } : { layerSlug };
}

/**
 * Pure parser extracting the primary target slug from the URL.
 */
export const extractUrlFocusSlug = (
  pathname: string,
  searchString: string,
): string | null => {
  const params = new URLSearchParams(searchString);
  const focusParam = params.get('focus');
  if (focusParam) {
    const slug = toUrlSlug(focusParam);
    if (slug.length > 0) {
      return slug;
    }
  }

  const routeMatch = /^\/galaxy\/([^/?#]+)/i.exec(pathname.trim());
  if (routeMatch?.[1]) {
    const slug = toUrlSlug(decodeURIComponent(routeMatch[1]));
    if (slug.length > 0) {
      return slug;
    }
  }

  return null;
};

/**
 * Pure parser extracting the host system slug from a `/galaxy/$systemId` or `/system/$systemId` route path.
 */
export const extractUrlSystemSlug = (pathname: string): string | null => {
  const routeMatch = /^\/(?:galaxy|system)\/([^/?#]+)/i.exec(pathname.trim());
  if (routeMatch?.[1]) {
    const slug = toUrlSlug(decodeURIComponent(routeMatch[1]));
    if (slug.length > 0) {
      return slug;
    }
  }
  return null;
};

/**
 * Pure parser extracting the host planet slug from a `/planet/$planetId` route path.
 */
export const extractUrlPlanetSlug = (pathname: string): string | null => {
  const routeMatch = /^\/planet\/([^/?#]+)/i.exec(pathname.trim());
  if (routeMatch?.[1]) {
    const slug = toUrlSlug(decodeURIComponent(routeMatch[1]));
    if (slug.length > 0) {
      return slug;
    }
  }
  return null;
};

/**
 * Pure predicate checking whether a URL search string contains an explicit single-entity `?focus=<slug>` parameter.
 */
export const hasExplicitFocusParam = (searchString: string): boolean => {
  const params = new URLSearchParams(searchString);
  const focusParam = params.get('focus');
  if (!focusParam) {
    return false;
  }
  return toUrlSlug(focusParam).length > 0;
};
