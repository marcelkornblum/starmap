import { useMemo, useState } from 'react';
import { toUrlSlug } from '../utils/datasetLayerSlugs';
import { parseCenterCoordinatesString } from '../utils/url';
import type { SceneCameraUrlState } from '../services/details/detailsNavigationTypes';

export interface UseColdLoadCenterResult {
  readonly effectiveCenterId: string | undefined;
  readonly resolvedCenterCoordinates: readonly [number, number, number] | undefined;
}

export function useColdLoadFocusActive(
  hasExplicitCenterParam: boolean,
  urlFocusSlug: string | null,
): boolean {
  const [coldLoadFocus, setColdLoadFocus] = useState<string | null>(() =>
    !hasExplicitCenterParam ? urlFocusSlug : null,
  );

  if (
    coldLoadFocus !== null &&
    (hasExplicitCenterParam || urlFocusSlug !== coldLoadFocus)
  ) {
    setColdLoadFocus(null);
  }

  return (
    coldLoadFocus !== null &&
    !hasExplicitCenterParam &&
    urlFocusSlug === coldLoadFocus
  );
}

export function useColdLoadCenter(
  center: string | undefined,
  cameraState: SceneCameraUrlState,
  urlFocusSlug: string | null,
): UseColdLoadCenterResult {
  const hasExplicitCenterParam = Boolean(center ?? cameraState.center);
  const isColdLoadFocus = useColdLoadFocusActive(hasExplicitCenterParam, urlFocusSlug);
  const coldFocus = isColdLoadFocus && urlFocusSlug ? urlFocusSlug : undefined;

  return useMemo(() => {
    const rawCenter = center ?? cameraState.center;
    const parsedCoords = parseCenterCoordinatesString(rawCenter);
    const coordTuple: readonly [number, number, number] | undefined =
      cameraState.x !== undefined &&
      cameraState.y !== undefined &&
      cameraState.z !== undefined
        ? [cameraState.x, cameraState.y, cameraState.z]
        : parsedCoords;

    const effectiveCenterId = parsedCoords
      ? undefined
      : center
        ? toUrlSlug(center)
        : (cameraState.center ?? coldFocus);

    return {
      effectiveCenterId,
      resolvedCenterCoordinates: coordTuple,
    };
  }, [center, cameraState.center, cameraState.x, cameraState.y, cameraState.z, coldFocus]);
}
