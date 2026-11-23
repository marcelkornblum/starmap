import { toUrlSlug } from '../../utils/datasetLayerSlugs';
import { parseCenterCoordinatesString } from '../../utils/url';
import type { SceneCameraUrlState } from './detailsNavigationTypes';

const CENTER_HREF_PRESERVED_PARAMS = new Set(['layer', 'select', 'route', 'q']);
const CONTEXT_PRESERVED_PARAMS = ['q', 'searchCategory', 'select', 'layer', 'route'] as const;

export const buildPreservedContextSearch = (searchParams: URLSearchParams): string => {
  const out = new URLSearchParams();
  for (const key of CONTEXT_PRESERVED_PARAMS) {
    for (const value of searchParams.getAll(key)) {
      if (value.length > 0) {
        out.append(key, value);
      }
    }
  }
  const qs = out.toString();
  return qs ? `?${qs}` : '';
};

export const buildCenterEntityHref = (
  viewScope: 'galaxy' | 'system' | 'planet',
  scopeTargetId?: string,
  focusId?: string,
  currentSearch?: string,
): string | undefined => {
  if (!focusId) {
    return undefined;
  }
  if (viewScope !== 'galaxy' && !scopeTargetId) {
    return undefined;
  }
  const basePath =
    viewScope === 'galaxy'
      ? '/galaxy'
      : viewScope === 'system'
        ? `/system/${encodeURIComponent(scopeTargetId ?? '')}`
        : `/planet/${encodeURIComponent(scopeTargetId ?? '')}`;

  const outParams = new URLSearchParams();
  outParams.set('center', focusId);
  outParams.set('focus', focusId);

  if (currentSearch) {
    const cleanSearch = currentSearch.startsWith('?')
      ? currentSearch.slice(1)
      : currentSearch;
    if (cleanSearch) {
      const inParams = new URLSearchParams(cleanSearch);
      for (const [key, val] of inParams.entries()) {
        if (CENTER_HREF_PRESERVED_PARAMS.has(key) && val.length > 0) {
          outParams.append(key, val);
        }
      }
    }
  }

  const qs = outParams.toString().replace(/%3A/gi, ':').replace(/%2C/gi, ',');
  return `${basePath}?${qs}`;
};

const EMPTY_SCENE_CAMERA_URL_STATE: SceneCameraUrlState = Object.freeze({});

export const extractUrlSceneCameraState = (
  searchString: string,
): SceneCameraUrlState => {
  if (
    !searchString ||
    (!searchString.includes('center=') &&
      !searchString.includes('x=') &&
      !searchString.includes('y=') &&
      !searchString.includes('z=') &&
      !searchString.includes('az=') &&
      !searchString.includes('el=') &&
      !searchString.includes('dist=') &&
      !searchString.includes('zoom='))
  ) {
    return EMPTY_SCENE_CAMERA_URL_STATE;
  }

  const params = new URLSearchParams(searchString);
  const centerRaw = params.get('center');
  const trimmedCenter = centerRaw?.trim();
  const center =
    trimmedCenter && trimmedCenter.length > 0
      ? (parseCenterCoordinatesString(trimmedCenter) ? trimmedCenter : toUrlSlug(trimmedCenter))
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

  if (
    center === undefined &&
    x === undefined &&
    y === undefined &&
    z === undefined &&
    az === undefined &&
    el === undefined &&
    dist === undefined &&
    zoom === undefined
  ) {
    return EMPTY_SCENE_CAMERA_URL_STATE;
  }

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
