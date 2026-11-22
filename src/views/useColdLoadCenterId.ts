import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { toUrlSlug } from '../utils/datasetLayerSlugs';
import { parseCenterCoordinatesString } from '../utils/url';
import type { SceneCameraUrlState } from '../services/details/detailsNavigationTypes';

export interface UseColdLoadCenterResult {
  readonly effectiveCenterId: string | undefined;
  readonly resolvedCenterCoordinates: readonly [number, number, number] | undefined;
}

interface ColdLoadLatch {
  readonly subscribe: (listener: () => void) => () => void;
  readonly getSnapshot: () => string | null;
  readonly clear: () => void;
}

function createColdLoadLatch(initialFocus: string | null): ColdLoadLatch {
  let current = initialFocus;
  const listeners = new Set<() => void>();
  return {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => current,
    clear: () => {
      if (current !== null) {
        current = null;
        for (const listener of listeners) {
          listener();
        }
      }
    },
  };
}

export function useColdLoadFocusActive(
  hasExplicitCenterParam: boolean,
  urlFocusSlug: string | null,
): boolean {
  const [latch] = useState(() =>
    createColdLoadLatch(!hasExplicitCenterParam ? urlFocusSlug : null),
  );
  const coldLoadFocus = useSyncExternalStore(
    latch.subscribe,
    latch.getSnapshot,
    latch.getSnapshot,
  );

  useEffect(() => {
    if (
      coldLoadFocus !== null &&
      (hasExplicitCenterParam || urlFocusSlug !== coldLoadFocus)
    ) {
      latch.clear();
    }
  }, [latch, coldLoadFocus, hasExplicitCenterParam, urlFocusSlug]);

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
  const hasExplicitCenterParam = Boolean(
    (center ?? cameraState.center) ||
      (cameraState.x !== undefined &&
        cameraState.y !== undefined &&
        cameraState.z !== undefined),
  );
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
