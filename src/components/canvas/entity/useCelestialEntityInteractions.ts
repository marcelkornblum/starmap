import { useCallback, useLayoutEffect, useRef } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import type { SpatialEntityStore } from './SpatialEntityStore';
import type { CelestialOcclusionManager } from '../cartography/celestialOcclusionRegistry';
import type { CelestialInteractionState } from '../../../types/spatial';
import { activateEntity, focusEntity } from './interactionActions';

export interface UseCelestialEntityInteractionsParams {
  activeState: CelestialInteractionState;
  storeApi: SpatialEntityStore;
  occlusionManager: CelestialOcclusionManager;
  onClick?: (id: string, e: ThreeEvent<MouseEvent>) => void;
  onDoubleClick?: (id: string, e: ThreeEvent<MouseEvent>) => void;
  onPointerOver?: (id: string, e: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: (id: string, e: ThreeEvent<PointerEvent>) => void;
}

export function useCelestialEntityInteractions({
  activeState,
  storeApi,
  occlusionManager,
  onClick,
  onDoubleClick,
  onPointerOver,
  onPointerOut,
}: UseCelestialEntityInteractionsParams) {
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
    },
    [storeApi, occlusionManager],
  );

  const handleMarkerDoubleClick = useCallback(
    (targetId: string, e: ThreeEvent<MouseEvent>) => {
      if (activeStateRef.current === 'passive') return;
      if (onDoubleClickRef.current) {
        onDoubleClickRef.current(targetId, e);
      } else {
        focusEntity(storeApi, targetId);
      }
    },
    [storeApi],
  );

  const handleMarkerPointerOver = useCallback(
    (targetId: string, e: ThreeEvent<PointerEvent>) => {
      if (activeStateRef.current === 'passive') return;
      storeApi.getState().setHovered(targetId);
      onPointerOverRef.current?.(targetId, e);
    },
    [storeApi],
  );

  const handleMarkerPointerOut = useCallback(
    (targetId: string, e: ThreeEvent<PointerEvent>) => {
      if (activeStateRef.current === 'passive') return;
      if (storeApi.getState().hoveredId === targetId) {
        storeApi.getState().setHovered(null);
      }
      onPointerOutRef.current?.(targetId, e);
    },
    [storeApi],
  );

  return {
    handleMarkerClick,
    handleMarkerDoubleClick,
    handleMarkerPointerOver,
    handleMarkerPointerOut,
  };
}
