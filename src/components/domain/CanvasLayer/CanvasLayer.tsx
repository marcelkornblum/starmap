import React, { Suspense, lazy, useEffect, useLayoutEffect } from 'react';
import type { JourneyChordLeg } from '../../canvas/cartography/journeyChordGeometry';
import type { SpatialEntityDefinition } from '../../canvas/entity/types';
import { useCanvasStageStore } from '../../../stores/useCanvasStageStore';
import { setStageCallbacks } from '../../../stores/canvasStageCallbacks';
import { useOptionalRouter, useSpaLocation } from '../../../hooks/useSpaLocation';
import { isSpatialRoutePathname } from '../../../utils/spatialRoute';
import { RootCanvasStageContext } from './RootCanvasStageContext';
import { canMountWebGLCanvas } from './webglSupport';
import type { CanvasWebGLHostProps } from './CanvasWebGLHost';
import { preloadSceneEntry, type SpatialCanvasScope } from './sceneEntryLoader';
import styles from './CanvasLayer.module.css';

let cachedHostLazy: React.LazyExoticComponent<React.ComponentType<CanvasWebGLHostProps>> | null =
  null;

function getWebGLHostLazy(
  initialScope: SpatialCanvasScope,
): React.LazyExoticComponent<React.ComponentType<CanvasWebGLHostProps>> {
  if (!cachedHostLazy) {
    cachedHostLazy = lazy(async () => {
      const [hostMod] = await Promise.all([
        import('./CanvasWebGLHost'),
        preloadSceneEntry(initialScope),
      ]);
      return hostMod;
    });
  }
  return cachedHostLazy;
}

/**
 * Eagerly warms the lazy WebGL host and initial scene chunks in parallel with route views.
 */
// oxlint-disable-next-line react/only-export-components -- Co-located host chunk preloader shares cachedHostLazy with CanvasLayer
export function preloadWebGLHost(initialScope: SpatialCanvasScope): void {
  if (!canMountWebGLCanvas()) return;
  getWebGLHostLazy(initialScope);
  void import('./CanvasWebGLHost');
  void preloadSceneEntry(initialScope);
}

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
  readonly testId?: string;
  readonly isRootHost?: boolean;
  readonly onInspect?: (id: string) => void;
  readonly onSelect?: (id: string | null) => void;
  readonly onFocusChange?: (id: string | null) => void;
}

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
    testId,
    isRootHost = false,
    onInspect,
    onSelect,
    onFocusChange,
  } = props;

  const router = useOptionalRouter();
  const { pathname } = useSpaLocation();
  const isRootCanvasMounted = useCanvasStageStore((s) => s.isRootCanvasMounted);
  const hasActiveSlot = useCanvasStageStore((s) => s.activeSlotCount > 0);
  const hasStageProps = useCanvasStageStore((s) => s.stageProps !== null);
  const mountSlot = useCanvasStageStore((s) => s.mountSlot);
  const unmountSlot = useCanvasStageStore((s) => s.unmountSlot);
  const setStageProps = useCanvasStageStore((s) => s.setStageProps);
  const hasRootHostContext = React.useContext(RootCanvasStageContext);

  const hasRegisteredRouter = router?.state !== undefined;
  const isSlot = (isRootCanvasMounted || hasRootHostContext) && !isRootHost;
  const isSpatialRoute = isSpatialRoutePathname(pathname);
  const isStageActive = router
    ? hasActiveSlot || ((hasStageProps || hasRegisteredRouter) && isSpatialRoute)
    : hasActiveSlot;
  const frameloop = isRootHost ? (isStageActive ? 'demand' : 'never') : 'demand';
  const isSpatialSceneMounted =
    !isRootHost || (isStageActive && (hasStageProps || hasRegisteredRouter));

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
  const WebGLHostComponent = mountCanvas ? getWebGLHostLazy(scope) : null;

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
      {WebGLHostComponent && (
        <Suspense fallback={null}>
          <WebGLHostComponent
            scope={scope}
            targetId={targetId}
            centerId={centerId}
            centerCoordinates={centerCoordinates}
            selectedEntities={selectedEntities}
            cameraDistance={cameraDistance}
            frameloop={frameloop}
            isSpatialSceneMounted={isSpatialSceneMounted}
            onInspect={onInspect}
            onSelect={onSelect}
            onFocusChange={onFocusChange}
          />
        </Suspense>
      )}
    </div>
  );
});

CanvasLayer.displayName = 'CanvasLayer';
