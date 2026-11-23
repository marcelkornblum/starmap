import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { SceneCameraUrlState } from '../services/details/detailsNavigationTypes';
import { useCameraStore } from '../stores/useCameraStore';
import { toUrlSlug } from '../utils/datasetLayerSlugs';
import { parseCenterCoordinatesString } from '../utils/url';

export interface ScaleCenterResolutionResult {
  readonly effectiveCenterId: string | undefined;
  readonly resolvedCenterCoordinates: readonly [number, number, number] | undefined;
  readonly isColdLoadFocus: boolean;
  readonly pendingCenterSlug: string | null;
  readonly canvasFocusedSlugs: ReadonlySet<string>;
}

export interface ResolveEffectiveScaleCenterSlugParams {
  readonly center?: string;
  readonly cameraCenter?: string;
  readonly hasExplicitCoords?: boolean;
  readonly pendingCenterSlug: string | null;
  readonly urlFocusSlug: string | null;
  readonly isColdLoadFocus: boolean;
  readonly canvasFocusedSlugs: ReadonlySet<string>;
}

export interface UseScaleCenterResolutionParams {
  readonly center: string | undefined;
  readonly cameraState: SceneCameraUrlState;
  readonly urlFocusSlug: string | null;
  readonly clearPendingOnUrlSync?: boolean;
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

export function resolveEffectiveScaleCenterSlug({
  center,
  cameraCenter,
  hasExplicitCoords = false,
  pendingCenterSlug,
  urlFocusSlug,
  isColdLoadFocus,
  canvasFocusedSlugs,
}: ResolveEffectiveScaleCenterSlugParams): string | undefined {
  const rawCenter = center ?? cameraCenter;
  if (hasExplicitCoords || parseCenterCoordinatesString(rawCenter)) {
    return undefined;
  }
  const explicitSlug = center
    ? toUrlSlug(center) || undefined
    : cameraCenter
      ? toUrlSlug(cameraCenter) || undefined
      : undefined;
  if (explicitSlug) {
    return explicitSlug;
  }
  if (pendingCenterSlug) {
    return toUrlSlug(pendingCenterSlug) || pendingCenterSlug;
  }
  if (isColdLoadFocus && urlFocusSlug) {
    const normalizedFocus = toUrlSlug(urlFocusSlug) || urlFocusSlug;
    const isCanvasClickFocus =
      canvasFocusedSlugs.has(urlFocusSlug) ||
      canvasFocusedSlugs.has(normalizedFocus);
    if (!isCanvasClickFocus) {
      return normalizedFocus;
    }
  }
  return undefined;
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

export function useScaleCenterResolution({
  center,
  cameraState,
  urlFocusSlug,
  clearPendingOnUrlSync = true,
}: UseScaleCenterResolutionParams): ScaleCenterResolutionResult {
  const pendingCenterSlug = useCameraStore((state) => state.pendingCenterSlug);
  const canvasFocusedSlugs = useCameraStore((state) => state.canvasFocusedSlugs);

  const hasExplicitCoords = Boolean(
    cameraState.x !== undefined &&
      cameraState.y !== undefined &&
      cameraState.z !== undefined,
  );
  const hasExplicitCenterParam = Boolean((center ?? cameraState.center) || hasExplicitCoords);
  const isColdLoadFocus = useColdLoadFocusActive(hasExplicitCenterParam, urlFocusSlug);

  useEffect(() => {
    if (!clearPendingOnUrlSync) return;
    const pending = useCameraStore.getState().pendingCenterSlug;
    if (pending && (!urlFocusSlug || pending === toUrlSlug(urlFocusSlug))) {
      useCameraStore.getState().setPendingCenterSlug(null);
    }
  }, [clearPendingOnUrlSync, urlFocusSlug]);

  return useMemo(() => {
    const rawCenter = center ?? cameraState.center;
    const parsedCoords = parseCenterCoordinatesString(rawCenter);
    const coordTuple: readonly [number, number, number] | undefined =
      cameraState.x !== undefined &&
      cameraState.y !== undefined &&
      cameraState.z !== undefined
        ? [cameraState.x, cameraState.y, cameraState.z]
        : parsedCoords;

    const effectiveCenterId = resolveEffectiveScaleCenterSlug({
      center,
      cameraCenter: cameraState.center,
      hasExplicitCoords: Boolean(coordTuple),
      pendingCenterSlug,
      urlFocusSlug,
      isColdLoadFocus,
      canvasFocusedSlugs,
    });

    return {
      effectiveCenterId,
      resolvedCenterCoordinates: coordTuple,
      isColdLoadFocus,
      pendingCenterSlug,
      canvasFocusedSlugs,
    };
  }, [
    center,
    cameraState.center,
    cameraState.x,
    cameraState.y,
    cameraState.z,
    pendingCenterSlug,
    urlFocusSlug,
    isColdLoadFocus,
    canvasFocusedSlugs,
  ]);
}
