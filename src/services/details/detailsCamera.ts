import { toUrlSlug } from '../../utils/datasetLayerSlugs';
import { parseCenterCoordinatesString } from '../../utils/url';
import type { SceneCameraUrlState } from './detailsNavigationTypes';

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
