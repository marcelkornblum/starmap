import React, { useLayoutEffect, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import {
  useSpatialEntityStoreApi,
  useOcclusionManager,
  CelestialEntity,
  OcclusionPass,
  ApertureEvaluator,
  JourneyChord,
  type SpatialEntityStore,
} from '../entity';
import { CameraRig } from '../instrument/CameraRig';
import { CartographicInstrument } from '../instrument/CartographicInstrument';
import { CartographicLighting } from '../instrument/CartographicLighting';
import { useCameraTransition } from '../instrument/useCameraTransition';
import { useSpatialFrameSafe } from '../instrument/spatialFrameContext';
import { useActiveStarsStore } from '../../../stores/useActiveStarsStore';
import { getApertureActiveCutoffForViewportWidth } from '../../../services/deviceTierService';
import { useViewportStoreSync } from './useViewportStoreSync';
import { useViewportPointerHandlers } from './useViewportPointerHandlers';
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
  syncWithUIStore: _syncWithUIStore = true,
  initialSelectedId,
  enableFocusTransition = true,
  focusTransitionDuration,
  onDoubleClick,
  lighting,
  journeyLegs,
  activeJourneyMethod,
}) => {
  const storeApi = useSpatialEntityStoreApi();
  const occlusionManager = useOcclusionManager();
  const invalidate = useThree((s) => s.invalidate);
  const { transitionTo } = useCameraTransition();
  const prevEntityIdsRef = useRef<Set<string>>(new Set());
  const frameCtx = useSpatialFrameSafe();

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
  }, [entities, storeApi, frameCtx]);

  useViewportStoreSync({
    storeApi,
    outerStore,
    initialSelectedId,
  });

  const {
    handleEntityClick,
    handleEntityDoubleClick,
    handlePointerMissed,
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
  });

  return (
    <group
      name="spatial-viewport"
      userData={{ mode }}
      onPointerMissed={handlePointerMissed}
    >
      <OcclusionPass enabled={true} />
      <ApertureEvaluator />

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
  );
});

SpatialViewportContent.displayName = 'SpatialViewportContent';
