import React, { useEffect, useLayoutEffect, useSyncExternalStore } from 'react';
import { Canvas } from '@react-three/fiber';
import type { JourneyChordLeg } from '../../canvas/cartography/journeyChordGeometry';
import type { SpatialEntityDefinition } from '../../canvas/entity/types';
import { SceneTokenBridge } from '../../canvas/ThemeTokenBridge';
import { SafeHtmlPortalOutlet } from '../../canvas/SafeHtml';
import {
  GalacticSceneContent,
  SystemSceneContent,
  PlanetarySceneContent,
} from '../../canvas/scenes/SpatialScenes';
import {
  useCanvasStageStore,
  setStageCallbacks,
  getStageCallbacks,
  subscribeStageCallbacks,
} from '../../../stores/useCanvasStageStore';
import { useCameraStore } from '../../../stores/useCameraStore';
import styles from './CanvasLayer.module.css';

export interface CanvasLayerProps {
  readonly scope: 'galaxy' | 'system' | 'planet';
  readonly targetId?: string;
  readonly centerId?: string;
  readonly centerCoordinates?: readonly [number, number, number];
  readonly selectedEntities?: readonly SpatialEntityDefinition[];
  readonly cameraAzimuthDeg?: number;
  readonly cameraElevationDeg?: number;
  readonly cameraDistance?: number;
  readonly journeyLegs?: readonly JourneyChordLeg[];
  readonly activeJourneyMethod?: string;
  readonly activeSystemName?: string;
  readonly focusedTargetName?: string;
  readonly routeWaypoints?: readonly string[];
  readonly cameraState?: Record<string, unknown>;
  readonly testId?: string;
  readonly isRootHost?: boolean;
  readonly onInspect?: (id: string) => void;
  readonly onSelect?: (id: string | null) => void;
  readonly onFocusChange?: (id: string | null) => void;
}

let webglSupported: boolean | null = null;

export const canMountWebGLCanvas = (): boolean => {
  if (webglSupported !== null) {
    return webglSupported;
  }
  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined'
  ) {
    webglSupported = false;
    return false;
  }
  try {
    const canvas = document.createElement('canvas');
    webglSupported = Boolean(
      canvas.getContext('webgl2') || canvas.getContext('webgl'),
    );
  } catch {
    webglSupported = false;
  }
  return webglSupported;
};

export const _resetWebGLSupportedForTesting = (): void => {
  webglSupported = null;
};

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export const CanvasLayer: React.FC<CanvasLayerProps> = React.memo((props) => {
  const {
    scope,
    targetId,
    centerId,
    centerCoordinates,
    selectedEntities,
    cameraAzimuthDeg,
    cameraElevationDeg,
    cameraDistance,
    journeyLegs,
    activeJourneyMethod,
    activeSystemName,
    focusedTargetName,
    routeWaypoints,
    cameraState,
    testId,
    isRootHost = false,
    onInspect,
    onSelect,
    onFocusChange,
  } = props;

  const isRootCanvasMounted = useCanvasStageStore((s) => s.isRootCanvasMounted);
  const mountSlot = useCanvasStageStore((s) => s.mountSlot);
  const unmountSlot = useCanvasStageStore((s) => s.unmountSlot);
  const setStageProps = useCanvasStageStore((s) => s.setStageProps);

  const isSlot = isRootCanvasMounted && !isRootHost;

  useIsomorphicLayoutEffect(() => {
    if (!isRootHost) {
      mountSlot();
      return () => {
        unmountSlot();
      };
    }
    return undefined;
  }, [isRootHost, mountSlot, unmountSlot]);

  useIsomorphicLayoutEffect(() => {
    if (!isRootHost) {
      setStageCallbacks({ onInspect, onSelect, onFocusChange });
      setStageProps({
        scope,
        targetId,
        centerId,
        centerCoordinates,
        selectedEntities,
        cameraAzimuthDeg,
        cameraElevationDeg,
        cameraDistance,
        journeyLegs,
        activeJourneyMethod,
        activeSystemName,
        focusedTargetName,
        routeWaypoints,
        cameraState,
      });
    }
  }, [
    isRootHost,
    scope,
    targetId,
    centerId,
    centerCoordinates,
    selectedEntities,
    cameraAzimuthDeg,
    cameraElevationDeg,
    cameraDistance,
    journeyLegs,
    activeJourneyMethod,
    activeSystemName,
    focusedTargetName,
    routeWaypoints,
    cameraState,
    onInspect,
    onSelect,
    onFocusChange,
    setStageProps,
  ]);

  const defaultTestId = isSlot ? 'canvas-layer-slot' : 'canvas-layer';
  const resolvedTestId = testId ?? defaultTestId;

  if (isSlot) {
    return (
      <div
        className={styles.canvasLayer}
        data-slot={isSlot ? 'true' : undefined}
        data-testid={resolvedTestId}
        data-scope={scope}
        data-target-id={targetId}
        data-center-id={centerId}
        data-center-coords={
          centerCoordinates ? centerCoordinates.join(',') : undefined
        }
        data-camera-az={cameraAzimuthDeg}
        data-camera-el={cameraElevationDeg}
        data-camera-dist={cameraDistance}
        data-journey-legs-count={
          journeyLegs && journeyLegs.length > 0 ? journeyLegs.length : undefined
        }
        data-journey-method={activeJourneyMethod}
        aria-label={`${scope} 3D canvas layer`}
      />
    );
  }

  const mountCanvas = canMountWebGLCanvas();

  return (
    <div
      className={styles.canvasLayer}
      data-testid={resolvedTestId}
      data-scope={scope}
      data-target-id={targetId}
      data-center-id={centerId}
      data-center-coords={
        centerCoordinates ? centerCoordinates.join(',') : undefined
      }
      data-camera-az={cameraAzimuthDeg}
      data-camera-el={cameraElevationDeg}
      data-camera-dist={cameraDistance}
      data-journey-legs-count={
        journeyLegs && journeyLegs.length > 0 ? journeyLegs.length : undefined
      }
      data-journey-method={activeJourneyMethod}
      aria-label={`${scope} 3D canvas layer`}
    >
      {mountCanvas && (
        <div className={styles.canvasWrapper}>
          <Canvas
            flat
            dpr={1}
            gl={{ antialias: true, alpha: true }}
            className={styles.persistentCanvas}
          >
            <SceneTokenBridge />
            {scope === 'galaxy' && (
              <GalacticSceneContent
                initialSelectedId={centerId ?? null}
                centerCoordinates={centerCoordinates}
                centerId={centerId}
                cameraDistance={cameraDistance}
                additionalEntities={selectedEntities}
                onInspectSystem={onInspect}
                onSelectSystem={onSelect}
                onFocusChange={onFocusChange}
              />
            )}
            {scope === 'system' && (
              targetId ? (
                <SystemSceneContent
                  systemId={targetId}
                  centerId={centerId}
                  centerCoordinates={centerCoordinates}
                  onInspectPlanet={onInspect}
                  onSelectEntity={onSelect}
                />
              ) : null
            )}
            {scope === 'planet' && (
              targetId ? (
                <PlanetarySceneContent
                  planetId={targetId}
                />
              ) : null
            )}
          </Canvas>
          <SafeHtmlPortalOutlet />
        </div>
      )}
    </div>
  );
});

CanvasLayer.displayName = 'CanvasLayer';

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
    </div>
  );
};
