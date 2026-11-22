import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { useOptionalRouter, useSpaLocation } from '../../../hooks/useSpaLocation';
import type { SpatialScale } from '../../../utils/referenceFrameOrientation';
import {
  getPendingSpatialRouteTarget,
  parseSpatialRouteTarget,
  setPendingSpatialNavigationHref,
  subscribePendingSpatialRoute,
} from '../../../utils/spatialRoute';
import { isMatchingSceneTarget } from './crossScaleStageHelpers';

const READY_SWAP_FALLBACK_TIMEOUT_MS = 800;

export function useRequestedSpatialTarget(
  fallbackScope: SpatialScale,
  fallbackTargetId: string | undefined,
  isSpatialSceneMounted: boolean,
): {
  readonly router: ReturnType<typeof useOptionalRouter>;
  readonly requestedScope: SpatialScale;
  readonly requestedTargetId: string | undefined;
} {
  const router = useOptionalRouter();
  const location = useSpaLocation();
  const pendingIntentTarget = useSyncExternalStore(
    subscribePendingSpatialRoute,
    getPendingSpatialRouteTarget,
    getPendingSpatialRouteTarget,
  );
  const currentLocationTarget = parseSpatialRouteTarget(location.pathname);
  const pendingLocationPathname = (
    router?.state as { pendingLocation?: { pathname?: string } } | undefined
  )?.pendingLocation?.pathname;
  const pendingLocationTarget = pendingLocationPathname
    ? parseSpatialRouteTarget(pendingLocationPathname)
    : null;
  const routeTarget =
    router && isSpatialSceneMounted
      ? (pendingIntentTarget ?? pendingLocationTarget ?? currentLocationTarget)
      : null;

  useEffect(() => {
    if (
      pendingIntentTarget &&
      currentLocationTarget &&
      isMatchingSceneTarget(
        currentLocationTarget.scope,
        currentLocationTarget.targetId,
        pendingIntentTarget.scope,
        pendingIntentTarget.targetId,
      )
    ) {
      setPendingSpatialNavigationHref(null);
    }
  }, [pendingIntentTarget, currentLocationTarget]);

  return {
    router,
    requestedScope: routeTarget?.scope ?? fallbackScope,
    requestedTargetId: routeTarget ? routeTarget.targetId : fallbackTargetId,
  };
}

export interface CrossScaleReadySwapController {
  readonly clearPendingReadySwap: () => void;
  readonly flushPendingReadySwap: () => void;
  readonly scheduleReadySwap: (
    commitSwap: () => void,
    shouldWaitForProps: () => boolean,
    isTokenCurrent: () => boolean,
  ) => void;
}

/**
 * Coordinates the optional post-Stage-1 swap hold so router HUD props and the 3D scene
 * commit atomically in a single swap, falling back after 800ms if route props stall.
 */
export function useCrossScaleReadySwap(): CrossScaleReadySwapController {
  const pendingReadySwapRef = useRef<(() => void) | null>(null);
  const pendingSwapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPendingReadySwap = useCallback(() => {
    if (pendingSwapTimerRef.current !== null) {
      clearTimeout(pendingSwapTimerRef.current);
      pendingSwapTimerRef.current = null;
    }
    pendingReadySwapRef.current = null;
  }, []);

  const flushPendingReadySwap = useCallback(() => {
    const runSwap = pendingReadySwapRef.current;
    if (!runSwap) return;
    clearPendingReadySwap();
    runSwap();
  }, [clearPendingReadySwap]);

  const scheduleReadySwap = useCallback(
    (
      commitSwap: () => void,
      shouldWaitForProps: () => boolean,
      isTokenCurrent: () => boolean,
    ) => {
      if (!isTokenCurrent()) return;
      if (!shouldWaitForProps()) {
        commitSwap();
        return;
      }
      clearPendingReadySwap();
      pendingReadySwapRef.current = () => {
        if (!isTokenCurrent()) return;
        commitSwap();
      };
      pendingSwapTimerRef.current = setTimeout(() => {
        pendingSwapTimerRef.current = null;
        flushPendingReadySwap();
      }, READY_SWAP_FALLBACK_TIMEOUT_MS);
    },
    [clearPendingReadySwap, flushPendingReadySwap],
  );

  useEffect(() => clearPendingReadySwap, [clearPendingReadySwap]);

  return {
    clearPendingReadySwap,
    flushPendingReadySwap,
    scheduleReadySwap,
  };
}
