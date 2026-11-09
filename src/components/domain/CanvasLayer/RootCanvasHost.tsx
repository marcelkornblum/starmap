import React, { useSyncExternalStore, useLayoutEffect, useEffect, useMemo, useRef } from 'react';
import {
  useCanvasStageStore,
  getStageCallbacks,
  subscribeStageCallbacks,
} from '../../../stores/useCanvasStageStore';
import { useCameraStore } from '../../../stores/useCameraStore';
import { CanvasLayer } from './CanvasLayer';
import styles from './RootCanvasHost.module.css';

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export const RootCanvasHost: React.FC = () => {
  const hostRef = useRef<HTMLDivElement>(null);
  const setRootCanvasMounted = useCanvasStageStore((s) => s.setRootCanvasMounted);
  const activeSlotCount = useCanvasStageStore((s) => s.activeSlotCount);
  const stageProps = useCanvasStageStore((s) => s.stageProps);
  const { onInspect, onSelect, onFocusChange } = useSyncExternalStore(
    subscribeStageCallbacks,
    getStageCallbacks,
    getStageCallbacks,
  );

  const initialCam = useCameraStore.getState();

  useIsomorphicLayoutEffect(() => {
    setRootCanvasMounted(true);
    return () => {
      setRootCanvasMounted(false);
    };
  }, [setRootCanvasMounted]);

  useIsomorphicLayoutEffect(() => {
    return useCameraStore.subscribe((state, prevState) => {
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
    });
  }, []);

  const canvasLayerContent = useMemo(
    () => (
      <CanvasLayer
        isRootHost
        scope={stageProps?.scope ?? 'galaxy'}
        targetId={stageProps?.targetId}
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
        cameraState={stageProps?.cameraState}
        onInspect={onInspect}
        onSelect={onSelect}
        onFocusChange={onFocusChange}
      />
    ),
    [
      stageProps?.scope,
      stageProps?.targetId,
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
      stageProps?.cameraState,
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
      data-stage-inactive={activeSlotCount === 0 ? 'true' : undefined}
      data-camera-mode={initialCam.mode}
      data-camera-pos={initialCam.position.map((v) => v.toFixed(2)).join(',')}
      data-camera-target={initialCam.target.map((v) => v.toFixed(2)).join(',')}
      data-camera-dist={initialCam.focalDistance.toFixed(2)}
      aria-hidden="true"
    >
      {canvasLayerContent}
    </div>
  );
};

RootCanvasHost.displayName = 'RootCanvasHost';
