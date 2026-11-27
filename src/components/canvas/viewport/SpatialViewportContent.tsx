import React, { useLayoutEffect, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import {
  useSpatialEntityStoreApi,
  useOcclusionManager,
  CelestialEntity,
  OcclusionPass,
  ApertureEvaluator,
  EntityDotsBatch,
  EntityDotsBatchContext,
  createEntityDotsBatchRegistry,
  JourneyChord,
  type SpatialEntityStore,
} from '../entity';
import { CameraRig } from '../instrument/CameraRig';
import { CartographicInstrument } from '../instrument/CartographicInstrument';
import { CartographicLighting } from '../instrument/CartographicLighting';
import { useCameraTransition } from '../instrument/useCameraTransition';
import { useSpatialFrameSafe } from '../instrument/spatialFrameContext';
import { useActiveStarsStore } from '../../../stores/useActiveStarsStore';
import { useCanvasStageStore } from '../../../stores/useCanvasStageStore';
import { getApertureActiveCutoffForViewportWidth } from '../../../services/deviceTierService';
import { useViewportStoreSync } from './useViewportStoreSync';
import { useViewportPointerHandlers } from './useViewportPointerHandlers';
import { consumeEntityPointerActive } from '../entity/bodyMarkerHelpers';
import type { SpatialViewportProps } from './SpatialViewport';

export interface SpatialViewportContentProps extends SpatialViewportProps {
  readonly outerStore?: SpatialEntityStore;
}

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export const SpatialViewportContent: React.FC<SpatialViewportContentProps> = React.memo(({
  entities = [],
  mode = 'explore',
  onInspect,
  onSelect,
  onFocusChange,
  outerStore,
  children,
  showInstrument = true,
  showPlanarFootprint = false,
  debugHitarea = false,
  initialSelectedId,
  enableFocusTransition = true,
  focusTransitionDuration,
  onDoubleClick,
  onTouchPointerMissed,
  lighting,
  journeyLegs,
  activeJourneyMethod,
}) => {
  const storeApi = useSpatialEntityStoreApi();
  const occlusionManager = useOcclusionManager();
  const invalidate = useThree((s) => s.invalidate);
  const gl = useThree((s) => s.gl);
  const { transitionTo } = useCameraTransition();
  const prevEntityIdsRef = useRef<Set<string>>(new Set());
  const frameCtx = useSpatialFrameSafe();
  const dotsBatchRegistry = useMemo(() => createEntityDotsBatchRegistry(), []);

  useIsomorphicLayoutEffect(() => {
    useCanvasStageStore.getState().setActiveSceneStore(storeApi);
    return () => {
      if (useCanvasStageStore.getState().activeSceneStore === storeApi) {
        useCanvasStageStore.getState().setActiveSceneStore(null);
      }
    };
  }, [storeApi]);

  useIsomorphicLayoutEffect(() => {
    const nextIds = new Set<string>();
    for (const ent of entities) {
      nextIds.add(ent.id);
    }
    const removedIds: string[] = [];
    for (const prevId of prevEntityIdsRef.current) {
      if (!nextIds.has(prevId)) {
        removedIds.push(prevId);
      }
    }
    prevEntityIdsRef.current = nextIds;

    const store = storeApi.getState();
    if (removedIds.length > 0) {
      store.unregisterEntities(removedIds);
    }
    if (entities.length > 0) {
      store.registerEntities(entities);
    }

    if (frameCtx?.frameRef?.current) {
      const { summaries, isHydrated } = useActiveStarsStore.getState();
      const activeCutoff = getApertureActiveCutoffForViewportWidth();
      if (isHydrated && summaries.length <= activeCutoff) {
        const { focusPoint, apertureRadius } = frameCtx.frameRef.current;
        const rSq = apertureRadius * apertureRadius;
        const nextAperture = new Set<string>();
        for (const ent of entities) {
          const p = ent.position;
          let x = 0, y = 0, z = 0;
          if (p instanceof THREE.Vector3) {
            x = p.x; y = p.y; z = p.z;
          } else if (Array.isArray(p)) {
            x = p[0]; y = p[1]; z = p[2];
          }
          const dx = x - focusPoint.x;
          const dy = y - focusPoint.y;
          const dz = z - focusPoint.z;
          if (dx * dx + dy * dy + dz * dz <= rSq) {
            nextAperture.add(ent.id);
          }
        }
        if (nextAperture.size <= activeCutoff) {
          store.setApertureIds(nextAperture);
        }
      }
    }
    invalidate();
  }, [entities, storeApi, frameCtx, invalidate]);

  useViewportStoreSync({
    storeApi,
    outerStore,
    initialSelectedId,
  });

  const {
    handleEntityClick,
    handleEntityDoubleClick,
    handlePointerMissed,
    recordPointerDown,
    handleDomTouchPointerUp,
  } = useViewportPointerHandlers({
    storeApi,
    occlusionManager,
    transitionTo,
    invalidate,
    enableFocusTransition,
    focusTransitionDuration,
    onInspect,
    onSelect,
    onFocusChange,
    onDoubleClick,
    onTouchPointerMissed,
  });

  useEffect(() => {
    const domElement = gl?.domElement;
    if (!domElement || typeof domElement.addEventListener !== 'function') return;
    const activeTouchIds = new Set<number>();
    let wasMultiTouch = false;

    const onPointerDown = (e: PointerEvent) => {
      recordPointerDown(e);
      if (e.pointerType === 'touch') {
        activeTouchIds.add(e.pointerId);
        if (activeTouchIds.size > 1) {
          wasMultiTouch = true;
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      activeTouchIds.delete(e.pointerId);
      const hitEntity = consumeEntityPointerActive(e.pointerId);
      handleDomTouchPointerUp(e, wasMultiTouch, hitEntity);
      if (activeTouchIds.size === 0) {
        wasMultiTouch = false;
      }
    };

    const onPointerCancel = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      activeTouchIds.delete(e.pointerId);
      consumeEntityPointerActive(e.pointerId);
      if (activeTouchIds.size === 0) {
        wasMultiTouch = false;
      }
    };

    domElement.addEventListener('pointerdown', onPointerDown, { passive: true });
    domElement.addEventListener('pointerup', onPointerUp, { passive: true });
    domElement.addEventListener('pointercancel', onPointerCancel, { passive: true });
    return () => {
      domElement.removeEventListener('pointerdown', onPointerDown);
      domElement.removeEventListener('pointerup', onPointerUp);
      domElement.removeEventListener('pointercancel', onPointerCancel);
      activeTouchIds.clear();
    };
  }, [gl, recordPointerDown, handleDomTouchPointerUp]);

  return (
    <EntityDotsBatchContext.Provider value={dotsBatchRegistry}>
      <group
        name="spatial-viewport"
        userData={{ mode }}
        onPointerMissed={handlePointerMissed}
      >
        <OcclusionPass enabled={true} />
        <ApertureEvaluator />
        <EntityDotsBatch />

        <CameraRig />
        {lighting !== false && (
          <CartographicLighting
            lightingOverride={typeof lighting === 'object' ? lighting : undefined}
          />
        )}

        {showInstrument && <CartographicInstrument showPlanarFootprint={showPlanarFootprint} />}

        {entities.map((entity) => (
          <CelestialEntity
            key={entity.id}
            {...entity}
            debugHitarea={debugHitarea}
            onClick={handleEntityClick}
            onDoubleClick={handleEntityDoubleClick}
          />
        ))}

        {journeyLegs && journeyLegs.length > 0 ? (
          <JourneyChord legs={journeyLegs} activeMethodId={activeJourneyMethod} />
        ) : null}

        {children}
      </group>
    </EntityDotsBatchContext.Provider>
  );
});

SpatialViewportContent.displayName = 'SpatialViewportContent';
