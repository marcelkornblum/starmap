import React, { useSyncExternalStore, useLayoutEffect, useEffect, useMemo } from 'react';
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
  const setRootCanvasMounted = useCanvasStageStore((s) => s.setRootCanvasMounted);
  const activeSlotCount = useCanvasStageStore((s) => s.activeSlotCount);
  const stageProps = useCanvasStageStore((s) => s.stageProps);
  const { onInspect, onSelect, onFocusChange } = useSyncExternalStore(
    subscribeStageCallbacks,
    getStageCallbacks,
    getStageCallbacks,
  );

  const cameraMode = useCameraStore((s) => s.mode);
  const cameraPosition = useCameraStore((s) => s.position);
  const cameraTarget = useCameraStore((s) => s.target);
  const cameraFocalDistance = useCameraStore((s) => s.focalDistance);

  useIsomorphicLayoutEffect(() => {
    setRootCanvasMounted(true);
    return () => {
      setRootCanvasMounted(false);
    };
  }, [setRootCanvasMounted]);

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
      className={styles.rootCanvasHost}
      data-testid="root-canvas-host"
      data-stage-inactive={activeSlotCount === 0 ? 'true' : undefined}
      data-camera-mode={cameraMode}
      data-camera-pos={cameraPosition.map((v) => v.toFixed(2)).join(',')}
      data-camera-target={cameraTarget.map((v) => v.toFixed(2)).join(',')}
      data-camera-dist={cameraFocalDistance.toFixed(2)}
      aria-hidden="true"
    >
      {canvasLayerContent}
    </div>
  );
};

RootCanvasHost.displayName = 'RootCanvasHost';
