import {
  extractUrlPlanetSlug,
  extractUrlSystemSlug,
  formatSlugFallbackTitle,
  hasExplicitFocusParam,
} from '../searchService';
import { toCanonicalLayerSlug, toUrlSlug } from '../../utils/datasetLayerCodec';
import type {
  BreadcrumbRouteLink,
  FocusedEntityDetails,
  PlanetaryBodiesSummary,
  SceneCameraUrlState,
} from './types';

export { extractUrlPlanetSlug, extractUrlSystemSlug, hasExplicitFocusParam, toUrlSlug };

export type OrbitTargetView = 'galaxy' | 'system' | 'planet';

export interface EntityOrbitTargetInput {
  readonly id: string;
  readonly name?: string;
  readonly entityKind?: string;
  readonly systemId?: string;
  readonly systemName?: string;
  readonly parentBodyId?: string;
  readonly layerId?: string;
  readonly tagSlug?: string;
  readonly isSolarSystem?: boolean;
}

export interface EntityOrbitTargetResult {
  readonly targetView: OrbitTargetView;
  readonly href: string;
}

/**
 * Pure centralised Orbit-Context View Targeting helper (DEC-038).
 * Ensures all entity links navigate to the view where the target's orbit is directly visible:
 * - layer: /galaxy?select=layer:<layerSlug>&layer=<layerSlug>
 * - moon (or parentBodyId is present and !== systemId and !== 'sol'):
 *     /planet/<parentPlanetSlug>?focus=<moonSlug>[&select=layer:<layerSlug>&layer=<layerSlug>:<itemSlug>]
 * - system / structure:
 *     /galaxy/<systemSlug>[&select=layer:<layerSlug>&layer=<layerSlug>:<itemSlug>]
 * - star / planet / dwarf-planet / belt / minor-body / fictional-body:
 *     /system/<systemSlug>?focus=<itemSlug>[&select=layer:<layerSlug>&layer=<layerSlug>:<itemSlug>]
 */
export function buildEntityOrbitTargetHref(
  input: EntityOrbitTargetInput,
): EntityOrbitTargetResult {
  const {
    id,
    name,
    entityKind,
    systemId,
    systemName,
    parentBodyId,
    layerId,
    tagSlug,
  } = input;

  // 1. Parent Layer Overview
  const isParentLayer =
    entityKind === 'layer' ||
    (layerId !== undefined &&
      (id === layerId || toCanonicalLayerSlug(id) === toCanonicalLayerSlug(layerId)));

  if (isParentLayer) {
    const layerSlug = toCanonicalLayerSlug(layerId || id);
    return {
      targetView: 'galaxy',
      href: `/galaxy?select=layer:${layerSlug}&layer=${layerSlug}`,
    };
  }

  const layerSlug = layerId ? toCanonicalLayerSlug(layerId) : undefined;
  const tag = tagSlug ? toUrlSlug(tagSlug.replace(/^tag:/i, '')) : undefined;

  const cleanId = id.includes(':') ? id.split(':').slice(1).join(':') : id;
  const targetSlug = toUrlSlug(name || cleanId || id);

  // 2. Planetary Moon Check
  const isMoon =
    entityKind === 'moon' ||
    (Boolean(parentBodyId) &&
      parentBodyId !== systemId &&
      parentBodyId !== 'sol');

  if (isMoon) {
    const parentPlanetSlug = toUrlSlug(parentBodyId ?? 'sol');
    const moonSlug = targetSlug;
    const params = new URLSearchParams({ focus: moonSlug });
    if (layerSlug) {
      params.set('select', `layer:${layerSlug}`);
      params.set('layer', `${layerSlug}:${moonSlug}`);
    } else if (tag) {
      params.set('select', `tag:${tag}`);
    }
    const qs = params.toString().replace(/%3A/gi, ':').replace(/%2C/gi, ',');
    return {
      targetView: 'planet',
      href: `/planet/${encodeURIComponent(parentPlanetSlug)}?${qs}`,
    };
  }

  // 3. System or Structure Check
  const isSystemOrStructure =
    entityKind === 'system' ||
    entityKind === 'star-system' ||
    entityKind === 'structure' ||
    entityKind === 'galactic-structure' ||
    id === systemId ||
    id.endsWith(`:${systemId}`) ||
    (!systemId && !parentBodyId && entityKind !== 'planet' && entityKind !== 'star');

  if (isSystemOrStructure) {
    const sysSlug = toUrlSlug(systemName ?? systemId ?? name ?? id);
    const itemSlug = toUrlSlug(systemName || cleanId || name || id);
    const params = new URLSearchParams({ focus: sysSlug });
    if (layerSlug) {
      params.set('select', `layer:${layerSlug}`);
      params.set('layer', `${layerSlug}:${itemSlug}`);
    } else if (tag) {
      params.set('select', `tag:${tag}`);
    }
    const qs = params.toString().replace(/%3A/gi, ':').replace(/%2C/gi, ',');
    return {
      targetView: 'galaxy',
      href: `/galaxy?${qs}`,
    };
  }

  // 4. Circumstellar & System-Level Bodies (star, planet, dwarf-planet, belt, minor-body, fictional-body)
  const sysSlug = toUrlSlug(systemName ?? systemId ?? 'sol');
  const itemSlug = targetSlug;
  const params = new URLSearchParams({ focus: itemSlug });
  if (layerSlug) {
    params.set('select', `layer:${layerSlug}`);
    params.set('layer', `${layerSlug}:${itemSlug}`);
  } else if (tag) {
    params.set('select', `tag:${tag}`);
  }
  const qs = params.toString().replace(/%3A/gi, ':').replace(/%2C/gi, ',');
  return {
    targetView: 'system',
    href: `/system/${encodeURIComponent(sysSlug)}?${qs}`,
  };
}

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
  'layer',
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
  const outParams = new URLSearchParams();
  outParams.set('focus', slug);

  if (currentSearch) {
    const cleanSearch = currentSearch.startsWith('?')
      ? currentSearch.slice(1)
      : currentSearch;
    if (cleanSearch) {
      const inParams = new URLSearchParams(cleanSearch);
      for (const [key, val] of inParams.entries()) {
        if (GALAXY_NAV_PRESERVED_PARAMS.has(key)) {
          outParams.append(key, val);
        }
      }
    }
  }

  const qs = outParams.toString().replace(/%3A/gi, ':').replace(/%2C/gi, ',');
  return `/galaxy?${qs}`;
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
