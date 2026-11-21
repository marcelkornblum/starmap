import { useCallback } from 'react';
import type * as THREE from 'three';
import { invalidate as r3fInvalidate, type ThreeEvent } from '@react-three/fiber';
import {
  type SpatialEntityStore,
  type useOcclusionManager,
  activateEntity,
  focusEntity,
  clearInteraction,
} from '../entity';

export const DEFAULT_FOCUS_TRANSITION_DURATION = 0.8;

export interface ViewportPointerHandlerOptions {
  readonly storeApi: SpatialEntityStore;
  readonly occlusionManager: ReturnType<typeof useOcclusionManager>;
  readonly transitionTo: (
    target: [number, number, number] | THREE.Vector3,
    options?: { duration?: number },
  ) => void;
  readonly invalidate?: () => void;
  readonly enableFocusTransition?: boolean;
  readonly focusTransitionDuration?: number;
  readonly onInspect?: (id: string) => void;
  readonly onSelect?: (id: string | null) => void;
  readonly onFocusChange?: (id: string | null) => void;
  readonly onDoubleClick?: (id: string, e: ThreeEvent<MouseEvent>) => void;
}

export function useViewportPointerHandlers({
  storeApi,
  occlusionManager,
  transitionTo,
  invalidate,
  enableFocusTransition = true,
  focusTransitionDuration = DEFAULT_FOCUS_TRANSITION_DURATION,
  onInspect,
  onSelect,
  onFocusChange,
  onDoubleClick,
}: ViewportPointerHandlerOptions) {
  const triggerInvalidate = invalidate ?? r3fInvalidate;

  // Single click: select, or advance cyclic selection when re-clicking the selected entity
  const handleEntityClick = useCallback(
    (id: string) => {
      activateEntity(storeApi, id, (targetId) =>
        occlusionManager.getCyclicSelectionTarget(targetId),
      );
      triggerInvalidate();
      const state = storeApi.getState();
      const entityId = state.focusedId ?? state.selectedId;
      if (onFocusChange) {
        onFocusChange(state.focusedId);
      } else {
        onSelect?.(entityId);
      }
    },
    [storeApi, occlusionManager, triggerInvalidate, onSelect, onFocusChange],
  );

  // Double click: centre the instrument, focus the entity, and inspect
  const handleEntityDoubleClick = useCallback(
    (id: string, e: ThreeEvent<MouseEvent>) => {
      const entity = storeApi.getState().entities[id];
      if (entity?.position && enableFocusTransition) {
        transitionTo(entity.position, { duration: focusTransitionDuration });
      }

      focusEntity(storeApi, id);
      triggerInvalidate();
      if (onInspect) {
        onInspect(id);
      } else if (onFocusChange) {
        onFocusChange(id);
      } else {
        onSelect?.(id);
      }
      onDoubleClick?.(id, e);
    },
    [
      storeApi,
      enableFocusTransition,
      focusTransitionDuration,
      transitionTo,
      triggerInvalidate,
      onInspect,
      onDoubleClick,
      onSelect,
      onFocusChange,
    ],
  );

  const handlePointerMissed = useCallback(() => {
    clearInteraction(storeApi);
    triggerInvalidate();
    onSelect?.(null);
    onFocusChange?.(null);
  }, [storeApi, triggerInvalidate, onSelect, onFocusChange]);

  return {
    handleEntityClick,
    handleEntityDoubleClick,
    handlePointerMissed,
  };
}
