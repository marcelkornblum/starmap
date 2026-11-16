
import { toCanonicalLayerSlug, toUrlSlug } from '../../utils/datasetLayerSlugs';
import { DEFAULT_ORIGIN_TARGETS } from '../../config/referenceTargets';

export type OrbitTargetView = 'galaxy' | 'system' | 'planet';

const encodeQueryParam = (v: string): string =>
  encodeURIComponent(v)
    .replace(/%20/g, '+')
    .replace(/%3A/gi, ':')
    .replace(/%2C/gi, ',');

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
  readonly currentPathname?: string;
}

export interface EntityOrbitTargetResult {
  readonly targetView: OrbitTargetView;
  readonly href: string;
}

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
    currentPathname,
  } = input;

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

  const isMoon =
    entityKind === 'moon' ||
    (Boolean(parentBodyId) && parentBodyId !== systemId);

  if (isMoon) {
    const parentPlanetSlug = toUrlSlug(parentBodyId ?? DEFAULT_ORIGIN_TARGETS.intraSystemOriginId);
    const moonSlug = targetSlug;
    let qs = `focus=${encodeQueryParam(moonSlug)}`;
    if (layerSlug) {
      qs += `&select=layer:${encodeQueryParam(layerSlug)}&layer=${encodeQueryParam(layerSlug)}:${encodeQueryParam(moonSlug)}`;
    } else if (tag) {
      qs += `&select=tag:${encodeQueryParam(tag)}`;
    }
    return {
      targetView: 'planet',
      href: `/planet/${encodeURIComponent(parentPlanetSlug)}?${qs}`,
    };
  }

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

    const currentSystemMatch =
      currentPathname && /^\/system\/([^/?#]+)/i.exec(currentPathname.trim());
    const rawSysParam = currentSystemMatch?.[1];
    const decodedSys = (() => {
      if (!rawSysParam) return null;
      try {
        return decodeURIComponent(rawSysParam);
      } catch {
        return rawSysParam;
      }
    })();
    const currentSysSlug = decodedSys ? toUrlSlug(decodedSys) : null;
    const matchesCurrentSystem =
      currentSysSlug !== null &&
      (currentSysSlug === sysSlug ||
        currentSysSlug === toUrlSlug(systemId ?? '') ||
        currentSysSlug === toUrlSlug(id));

    if (matchesCurrentSystem) {
      const activeSystemSlug = currentSysSlug ?? sysSlug;
      let qs = '';
      if (layerSlug) {
        qs = `select=layer:${encodeQueryParam(layerSlug)}&layer=${encodeQueryParam(layerSlug)}:${encodeQueryParam(itemSlug)}`;
      } else if (tag) {
        qs = `select=tag:${encodeQueryParam(tag)}`;
      }
      return {
        targetView: 'system',
        href: `/system/${encodeURIComponent(activeSystemSlug)}${qs.length > 0 ? `?${qs}` : ''}`,
      };
    }

    let qs = `focus=${encodeQueryParam(sysSlug)}`;
    if (layerSlug) {
      qs += `&select=layer:${encodeQueryParam(layerSlug)}&layer=${encodeQueryParam(layerSlug)}:${encodeQueryParam(itemSlug)}`;
    } else if (tag) {
      qs += `&select=tag:${encodeQueryParam(tag)}`;
    }
    return {
      targetView: 'galaxy',
      href: `/galaxy?${qs}`,
    };
  }

  const sysSlug = toUrlSlug(systemName ?? systemId ?? name ?? id ?? DEFAULT_ORIGIN_TARGETS.interstellarOriginId);
  const itemSlug = targetSlug;
  let qs = `focus=${encodeQueryParam(itemSlug)}`;
  if (layerSlug) {
    qs += `&select=layer:${encodeQueryParam(layerSlug)}&layer=${encodeQueryParam(layerSlug)}:${encodeQueryParam(itemSlug)}`;
  } else if (tag) {
    qs += `&select=tag:${encodeQueryParam(tag)}`;
  }
  return {
    targetView: 'system',
    href: `/system/${encodeURIComponent(sysSlug)}?${qs}`,
  };
}

export const buildSystemDetailsHref = (systemNameOrId: string): string => {
  const slug = toUrlSlug(systemNameOrId);
  return `/system/${encodeURIComponent(slug || systemNameOrId.trim() || DEFAULT_ORIGIN_TARGETS.interstellarOriginId)}`;
};

export const buildSystemElementFocusHref = (
  systemNameOrId: string,
  elementNameOrId: string,
): string => {
  const baseHref = buildSystemDetailsHref(systemNameOrId);
  const focusSlug = toUrlSlug(elementNameOrId) || elementNameOrId.trim();
  if (!focusSlug) {
    return baseHref;
  }
  return `${baseHref}?focus=${encodeQueryParam(focusSlug)}`;
};

export const buildPlanetDetailsHref = (planetNameOrId: string): string => {
  const slug = toUrlSlug(planetNameOrId);
  return `/planet/${encodeURIComponent(slug || planetNameOrId.trim() || DEFAULT_ORIGIN_TARGETS.intraSystemOriginId)}`;
};

export const buildPlanetElementFocusHref = (
  planetNameOrId: string,
  elementNameOrId: string,
): string => {
  const baseHref = buildPlanetDetailsHref(planetNameOrId);
  const focusSlug = toUrlSlug(elementNameOrId) || elementNameOrId.trim();
  if (!focusSlug) {
    return baseHref;
  }
  return `${baseHref}?focus=${encodeQueryParam(focusSlug)}`;
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
]);

export function buildGalaxySystemNavigationHref(
  systemId: string,
  currentSearch = '',
): string {
  const slug = toUrlSlug(systemId) || systemId.trim();

  if (
    !currentSearch ||
    (!currentSearch.includes('&') &&
      (currentSearch.startsWith('?focus=') || currentSearch.startsWith('focus=')))
  ) {
    return `/galaxy?focus=${encodeQueryParam(slug)}`;
  }

  const outParams = new URLSearchParams();
  outParams.set('focus', slug);

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

  const qs = outParams.toString().replace(/%3A/gi, ':').replace(/%2C/gi, ',');
  return `/galaxy?${qs}`;
}


