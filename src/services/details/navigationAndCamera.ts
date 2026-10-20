import {
  extractUrlPlanetSlug,
  extractUrlSystemSlug,
  formatSlugFallbackTitle,
  hasExplicitFocusParam,
  toUrlSlug,
} from '../searchService';
import type {
  BreadcrumbRouteLink,
  FocusedEntityDetails,
  PlanetaryBodiesSummary,
  SceneCameraUrlState,
} from './types';

export { extractUrlPlanetSlug, extractUrlSystemSlug, hasExplicitFocusParam };

/**
 * Pure unit function building the URL to the System View for a given star system
 * (`/system/<systemSlug>`, e.g. `/system/tau-ceti`).
 */
export const buildSystemDetailsHref = (systemNameOrId: string): string => {
  const slug = toUrlSlug(systemNameOrId);
  return `/system/${encodeURIComponent(slug || systemNameOrId.trim() || 'sol')}`;
};

/**
 * Pure unit function building the URL to the System View with a specific child star or planet
 * set to focus (`/system/<systemSlug>?focus=<elementSlug>`, e.g. `/system/tau-ceti?focus=tau-ceti-e`).
 */
export const buildSystemElementFocusHref = (
  systemNameOrId: string,
  elementNameOrId: string,
): string => {
  const baseHref = buildSystemDetailsHref(systemNameOrId);
  const focusSlug = toUrlSlug(elementNameOrId) || elementNameOrId.trim();
  if (!focusSlug) {
    return baseHref;
  }
  const params = new URLSearchParams({ focus: focusSlug });
  return `${baseHref}?${params.toString()}`;
};

/**
 * Pure unit function building the URL to the Planetary View for a given planet
 * (`/planet/<planetSlug>`, e.g. `/planet/jupiter` or `/planet/tau-ceti-e`).
 */
export const buildPlanetDetailsHref = (planetNameOrId: string): string => {
  const slug = toUrlSlug(planetNameOrId);
  return `/planet/${encodeURIComponent(slug || planetNameOrId.trim() || 'earth')}`;
};

/**
 * Pure unit function building the URL to the Planetary View with a specific orbiting body
 * set to focus (`/planet/<planetSlug>?focus=<elementSlug>`, e.g. `/planet/jupiter?focus=europa`).
 */
export const buildPlanetElementFocusHref = (
  planetNameOrId: string,
  elementNameOrId: string,
): string => {
  const baseHref = buildPlanetDetailsHref(planetNameOrId);
  const focusSlug = toUrlSlug(elementNameOrId) || elementNameOrId.trim();
  if (!focusSlug) {
    return baseHref;
  }
  const params = new URLSearchParams({ focus: focusSlug });
  return `${baseHref}?${params.toString()}`;
};

/**
 * Pure unit function building the URL to center and focus a target entity
 * across Galaxy, System, and Planet view scopes (DEC-021).
 */
export const buildCenterEntityHref = (
  viewScope: 'galaxy' | 'system' | 'planet',
  scopeTargetId?: string,
  focusId?: string,
): string | undefined => {
  if (!focusId) {
    return undefined;
  }
  const encFocus = encodeURIComponent(focusId);
  if (viewScope === 'galaxy' || !scopeTargetId) {
    return `/galaxy?center=${encFocus}&focus=${encFocus}`;
  }
  const encTarget = encodeURIComponent(scopeTargetId);
  if (viewScope === 'system') {
    return `/system/${encTarget}?center=${encFocus}&focus=${encFocus}`;
  }
  return `/planet/${encTarget}?center=${encFocus}&focus=${encFocus}`;
};

/**
 * Pure parser extracting 3D scene camera state and reference point (`center`, `x`, `y`, `z`,
 * `az`, `el`, `dist`, `zoom`) from a URL search string (DEC-021).
 */
export const extractUrlSceneCameraState = (
  searchString: string,
): SceneCameraUrlState => {
  const params = new URLSearchParams(searchString);
  const centerRaw = params.get('center');
  const center =
    centerRaw !== null && centerRaw.trim().length > 0
      ? toUrlSlug(centerRaw)
      : undefined;

  const parseNum = (key: string): number | undefined => {
    const raw = params.get(key);
    if (raw === null || raw.trim() === '') return undefined;
    const num = Number(raw);
    return Number.isFinite(num) ? num : undefined;
  };

  const x = parseNum('x');
  const y = parseNum('y');
  const z = parseNum('z');
  const az = parseNum('az');
  const el = parseNum('el');
  const dist = parseNum('dist');
  const zoom = parseNum('zoom');

  return {
    ...(center !== undefined ? { center } : {}),
    ...(x !== undefined ? { x } : {}),
    ...(y !== undefined ? { y } : {}),
    ...(z !== undefined ? { z } : {}),
    ...(az !== undefined ? { az } : {}),
    ...(el !== undefined ? { el } : {}),
    ...(dist !== undefined ? { dist } : {}),
    ...(zoom !== undefined ? { zoom } : {}),
  };
};

const GALAXY_NAV_PRESERVED_PARAMS = new Set([
  'q',
  'searchCategory',
  'select',
  'canon',
  'center',
  'x',
  'y',
  'z',
  'az',
  'el',
  'dist',
  'zoom',
  'route',
  'journeyOption',
]);

/**
 * Pure helper building system navigation URLs on GalaxyView preserving active
 * cartographic and journey state parameters while dropping `focus` (DEC-034).
 */
export function buildGalaxySystemNavigationHref(
  systemId: string,
  currentSearch = '',
): string {
  const slug = toUrlSlug(systemId) || systemId.trim();
  const baseHref = `/galaxy/${slug}`;
  if (!currentSearch) {
    return baseHref;
  }
  const cleanSearch = currentSearch.startsWith('?')
    ? currentSearch.slice(1)
    : currentSearch;
  if (!cleanSearch) {
    return baseHref;
  }
  const inParams = new URLSearchParams(cleanSearch);
  const outParams = new URLSearchParams();

  for (const [key, val] of inParams.entries()) {
    if (GALAXY_NAV_PRESERVED_PARAMS.has(key)) {
      outParams.append(key, val);
    }
  }

  const qs = outParams.toString().replace(/%3A/gi, ':').replace(/%2C/gi, ',');
  return qs.length > 0 ? `${baseHref}?${qs}` : baseHref;
}

/**
 * Pure builder producing the breadcrumb trail for the active System or Galaxy view.
 */
export const buildSystemViewBreadcrumbs = (
  details: FocusedEntityDetails | null,
  urlSystemSlug: string | null,
  _hasExplicitFocus?: boolean,
): readonly BreadcrumbRouteLink[] => {
  const sysName =
    details?.systemName ??
    (urlSystemSlug ? formatSlugFallbackTitle(urlSystemSlug) : 'System');

  return [
    { label: 'Galaxy', href: '/galaxy' },
    { label: sysName },
  ];
};

/**
 * Pure builder producing the breadcrumb trail for the active Planetary view (`/planet/$planetId`).
 */
export const buildPlanetViewBreadcrumbs = (
  details: FocusedEntityDetails | null,
  planetaryElements: PlanetaryBodiesSummary | null,
  urlPlanetSlug: string | null,
  _hasExplicitFocus?: boolean,
): readonly BreadcrumbRouteLink[] => {
  const sysName =
    planetaryElements?.systemName ?? details?.systemName ?? 'System';
  const sysHref =
    planetaryElements?.systemHref ?? buildSystemDetailsHref(sysName);

  const planetName =
    planetaryElements?.planetName ??
    (details?.focusedKind === 'planet' ? details.name : undefined) ??
    (urlPlanetSlug ? formatSlugFallbackTitle(urlPlanetSlug) : 'Planet');

  return [
    { label: 'Galaxy', href: '/galaxy' },
    { label: sysName, href: sysHref },
    { label: planetName },
  ];
};
