import React, {
  useSyncExternalStore,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useIsomorphicLayoutEffect } from '../../../hooks/useIsomorphicLayoutEffect';
import { useCanvasStageStore } from '../../../stores/useCanvasStageStore';
import {
  getStageCallbacks,
  subscribeStageCallbacks,
} from '../../../stores/canvasStageCallbacks';
import { useCameraStore } from '../../../stores/useCameraStore';
import { useOptionalRouter, useSpaLocation } from '../../../hooks/useSpaLocation';
import { isSpatialRoutePathname, parseSpatialRouteTarget } from '../../../utils/spatialRoute';
import { CanvasLayer } from './CanvasLayer';
import { preloadWebGLHost } from './canvasWebGLHostLoader';
import { preloadTargetScaleEntry } from '../../../services/navigation/scalePreloader';
import styles from './RootCanvasHost.module.css';

export const RootCanvasHost: React.FC = () => {
  const hostRef = useRef<HTMLDivElement>(null);
  const router = useOptionalRouter();
  const { pathname } = useSpaLocation(undefined, undefined, '/galaxy', false);
  const setRootCanvasMounted = useCanvasStageStore((s) => s.setRootCanvasMounted);
  const hasActiveSlot = useCanvasStageStore((s) => s.activeSlotCount > 0);
  const stageProps = useCanvasStageStore((s) => s.stageProps);
  const hasStageProps = stageProps !== null;
  const hasRegisteredRouter = router?.state !== undefined;
  const isSpatialRoute = isSpatialRoutePathname(pathname);
  const initialRouteTarget = hasRegisteredRouter ? parseSpatialRouteTarget(pathname) : null;
  const isStageActive = router
    ? hasActiveSlot || ((hasStageProps || hasRegisteredRouter) && isSpatialRoute)
    : hasActiveSlot;
  const resolvedInitialScope = stageProps?.scope ?? initialRouteTarget?.scope ?? 'galaxy';
  const resolvedInitialTargetId = stageProps
    ? stageProps.targetId
    : initialRouteTarget?.targetId;
  const shouldActivateCanvas = isStageActive || initialRouteTarget !== null;
  const [hasActivatedSpatialCanvas, setHasActivatedSpatialCanvas] =
    useState(shouldActivateCanvas);

  useIsomorphicLayoutEffect(() => {
    if (shouldActivateCanvas) {
      setHasActivatedSpatialCanvas(true);
      preloadWebGLHost(resolvedInitialScope);
    }
  }, [shouldActivateCanvas, resolvedInitialScope]);

  useEffect(() => {
    if (!hasActivatedSpatialCanvas || import.meta.env.MODE === 'test') return;
    const idleTimer = setTimeout(() => {
      void preloadTargetScaleEntry('system');
      void preloadTargetScaleEntry('planet');
    }, 600);
    return () => clearTimeout(idleTimer);
  }, [hasActivatedSpatialCanvas]);
  const { onInspect, onSelect, onFocusChange } = useSyncExternalStore(
    subscribeStageCallbacks,
    getStageCallbacks,
    getStageCallbacks,
  );

  useIsomorphicLayoutEffect(() => {
    setRootCanvasMounted(true);
    return () => {
      setRootCanvasMounted(false);
    };
  }, [setRootCanvasMounted]);

  useIsomorphicLayoutEffect(() => {
    let lastSyncTime = 0;
    let trailingTimer: ReturnType<typeof setTimeout> | null = null;
    let pendingState: ReturnType<typeof useCameraStore.getState> | null = null;
    let isInitialMount = true;

    Promise.resolve().then(() => {
      isInitialMount = false;
    });

    const applyTelemetry = (
      state: ReturnType<typeof useCameraStore.getState>,
      prevState?: ReturnType<typeof useCameraStore.getState> | null,
    ) => {
      const el = hostRef.current;
      if (!el) return;
      if (state.mode !== prevState?.mode) {
        el.setAttribute('data-camera-mode', state.mode);
      }
      if (state.position !== prevState?.position) {
        el.setAttribute('data-camera-pos', state.position.map((v) => v.toFixed(2)).join(','));
      }
      if (state.target !== prevState?.target) {
        el.setAttribute('data-camera-target', state.target.map((v) => v.toFixed(2)).join(','));
      }
      if (state.focalDistance !== prevState?.focalDistance) {
        el.setAttribute('data-camera-dist', state.focalDistance.toFixed(2));
      }
    };

    applyTelemetry(useCameraStore.getState(), null);

    const unsubscribe = useCameraStore.subscribe((state, prevState) => {
      if (isInitialMount) {
        applyTelemetry(state, prevState);
        return;
      }

      const now = performance.now();
      if (lastSyncTime === 0 || now - lastSyncTime >= 80) {
        if (trailingTimer !== null) {
          clearTimeout(trailingTimer);
          trailingTimer = null;
        }
        lastSyncTime = now;
        pendingState = null;
        applyTelemetry(state, prevState);
      } else {
        pendingState = state;
        if (trailingTimer === null) {
          const delay = Math.max(0, 80 - (now - lastSyncTime));
          trailingTimer = setTimeout(() => {
            trailingTimer = null;
            if (pendingState) {
              lastSyncTime = performance.now();
              applyTelemetry(pendingState, null);
              pendingState = null;
            }
          }, delay);
        }
      }
    });

    return () => {
      unsubscribe();
      if (trailingTimer !== null) {
        clearTimeout(trailingTimer);
      }
    };
  }, []);

  const canvasLayerContent = useMemo(
    () => (
      <CanvasLayer
        isRootHost
        scope={resolvedInitialScope}
        targetId={resolvedInitialTargetId}
        centerId={stageProps?.centerId}
        centerCoordinates={stageProps?.centerCoordinates}
        selectedEntities={stageProps?.selectedEntities}
        cameraAzimuthDeg={stageProps?.cameraAzimuthDeg}
        cameraElevationDeg={stageProps?.cameraElevationDeg}
        cameraDistance={stageProps?.cameraDistance}
        journeyLegs={stageProps?.journeyLegs}
        activeJourneyMethod={stageProps?.activeJourneyMethod}
        activeSystemName={stageProps?.activeSystemName}
        focusedTargetName={stageProps?.focusedTargetName}
        routeWaypoints={stageProps?.routeWaypoints}
        onInspect={onInspect}
        onSelect={onSelect}
        onFocusChange={onFocusChange}
      />
    ),
    [
      resolvedInitialScope,
      resolvedInitialTargetId,
      stageProps?.centerId,
      stageProps?.centerCoordinates,
      stageProps?.selectedEntities,
      stageProps?.cameraAzimuthDeg,
      stageProps?.cameraElevationDeg,
      stageProps?.cameraDistance,
      stageProps?.journeyLegs,
      stageProps?.activeJourneyMethod,
      stageProps?.activeSystemName,
      stageProps?.focusedTargetName,
      stageProps?.routeWaypoints,
      onInspect,
      onSelect,
      onFocusChange,
    ],
  );

  return (
    <div
      ref={hostRef}
      className={styles.rootCanvasHost}
      data-testid="root-canvas-host"
      data-stage-inactive={!isStageActive ? 'true' : undefined}
      aria-hidden="true"
    >
      {hasActivatedSpatialCanvas ? canvasLayerContent : null}
    </div>
  );
};

RootCanvasHost.displayName = 'RootCanvasHost';
