
import { toCanonicalLayerSlug, toUrlSlug } from '../../utils/datasetLayerSlugs';
import { DEFAULT_ORIGIN_TARGETS } from '../../config/referenceTargets';


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
      const params = new URLSearchParams();
      if (layerSlug) {
        params.set('select', `layer:${layerSlug}`);
        params.set('layer', `${layerSlug}:${itemSlug}`);
      } else if (tag) {
        params.set('select', `tag:${tag}`);
      }
      const qs = params.toString().replace(/%3A/gi, ':').replace(/%2C/gi, ',');
      return {
        targetView: 'system',
        href: `/system/${encodeURIComponent(activeSystemSlug)}${qs.length > 0 ? `?${qs}` : ''}`,
      };
    }

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

  const sysSlug = toUrlSlug(systemName ?? systemId ?? name ?? id ?? DEFAULT_ORIGIN_TARGETS.interstellarOriginId);
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
  const params = new URLSearchParams({ focus: focusSlug });
  return `${baseHref}?${params.toString()}`;
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
  const params = new URLSearchParams({ focus: focusSlug });
  return `${baseHref}?${params.toString()}`;
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


