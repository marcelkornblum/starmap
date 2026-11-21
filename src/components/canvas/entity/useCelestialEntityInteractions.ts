import { useCallback, useLayoutEffect, useRef } from 'react';
import { invalidate as r3fInvalidate, type ThreeEvent } from '@react-three/fiber';
import type { SpatialEntityStore } from './SpatialEntityStore';
import type { CelestialOcclusionManager } from '../cartography/celestialOcclusionRegistry';
import type { CelestialInteractionState } from '../../../types/spatial';
import { activateEntity, focusEntity } from './interactionActions';
import {
  cancelHoverPrefetch,
  scheduleHoverPrefetch,
} from '../../../services/details/prefetchEntitySelection';

export interface UseCelestialEntityInteractionsParams {
  activeState: CelestialInteractionState;
  storeApi: SpatialEntityStore;
  occlusionManager: CelestialOcclusionManager;
  invalidate?: () => void;
  onClick?: (id: string, e: ThreeEvent<MouseEvent>) => void;
  onDoubleClick?: (id: string, e: ThreeEvent<MouseEvent>) => void;
  onPointerOver?: (id: string, e: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: (id: string, e: ThreeEvent<PointerEvent>) => void;
}

export function useCelestialEntityInteractions({
  activeState,
  storeApi,
  occlusionManager,
  invalidate,
  onClick,
  onDoubleClick,
  onPointerOver,
  onPointerOut,
}: UseCelestialEntityInteractionsParams) {
  const triggerInvalidate = invalidate ?? r3fInvalidate;
  const onClickRef = useRef(onClick);
  const onDoubleClickRef = useRef(onDoubleClick);
  const onPointerOverRef = useRef(onPointerOver);
  const onPointerOutRef = useRef(onPointerOut);
  const activeStateRef = useRef(activeState);

  useLayoutEffect(() => {
    onClickRef.current = onClick;
    onDoubleClickRef.current = onDoubleClick;
    onPointerOverRef.current = onPointerOver;
    onPointerOutRef.current = onPointerOut;
    activeStateRef.current = activeState;
  }, [onClick, onDoubleClick, onPointerOver, onPointerOut, activeState]);

  const handleMarkerClick = useCallback(
    (targetId: string, e: ThreeEvent<MouseEvent>) => {
      if (activeStateRef.current === 'passive') return;
      if (onClickRef.current) {
        onClickRef.current(targetId, e);
      } else {
        activateEntity(storeApi, targetId, (tId) => occlusionManager.getCyclicSelectionTarget(tId));
      }
      triggerInvalidate();
    },
    [storeApi, occlusionManager, triggerInvalidate],
  );

  const handleMarkerDoubleClick = useCallback(
    (targetId: string, e: ThreeEvent<MouseEvent>) => {
      if (activeStateRef.current === 'passive') return;
      if (onDoubleClickRef.current) {
        onDoubleClickRef.current(targetId, e);
      } else {
        focusEntity(storeApi, targetId);
      }
      triggerInvalidate();
    },
    [storeApi, triggerInvalidate],
  );

  const handleMarkerPointerOver = useCallback(
    (targetId: string, e: ThreeEvent<PointerEvent>) => {
      if (activeStateRef.current === 'passive') return;
      scheduleHoverPrefetch(targetId, targetId, 12);
      storeApi.getState().setHovered(targetId);
      triggerInvalidate();
      onPointerOverRef.current?.(targetId, e);
    },
    [storeApi, triggerInvalidate],
  );

  const handleMarkerPointerOut = useCallback(
    (targetId: string, e: ThreeEvent<PointerEvent>) => {
      cancelHoverPrefetch();
      if (activeStateRef.current === 'passive') return;
      let shouldInvalidate = false;
      if (storeApi.getState().hoveredId === targetId) {
        storeApi.getState().setHovered(null);
        shouldInvalidate = true;
      }
      if (onPointerOutRef.current) {
        onPointerOutRef.current(targetId, e);
        shouldInvalidate = true;
      }
      if (shouldInvalidate) {
        triggerInvalidate();
      }
    },
    [storeApi, triggerInvalidate],
  );

  return {
    handleMarkerClick,
    handleMarkerDoubleClick,
    handleMarkerPointerOver,
    handleMarkerPointerOut,
  };
}
