import { useCallback, useRef } from 'react';
import type * as THREE from 'three';
import { invalidate as r3fInvalidate, type ThreeEvent } from '@react-three/fiber';
import {
  type SpatialEntityStore,
  type useOcclusionManager,
  activateEntity,
  focusEntity,
  clearInteraction,
} from '../entity';
import { getStageCallbacks } from '../../../stores/canvasStageCallbacks';
import {
  isCoarsePointerDevice,
  POINTER_TAP_SLOP_MOUSE_PX,
  POINTER_TAP_SLOP_TOUCH_PX,
} from '../engineConfig';

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
  readonly onTouchPointerMissed?: () => boolean;
}

export function useViewportPointerHandlers({
  storeApi,
  occlusionManager,
  transitionTo,
  invalidate,
  enableFocusTransition = true,
  focusTransitionDuration,
  onInspect,
  onSelect,
  onFocusChange,
  onDoubleClick,
  onTouchPointerMissed,
}: ViewportPointerHandlerOptions) {
  const triggerInvalidate = invalidate ?? r3fInvalidate;
  const lastPointerDownRef = useRef<{ pointerType: string; x: number; y: number } | null>(null);
  const lastPointerTypeRef = useRef<string | null>(null);

  const recordPointerDown = useCallback(
    (e: { pointerType?: string; clientX?: number; clientY?: number }) => {
      const pointerType = e.pointerType || null;
      if (pointerType) {
        lastPointerTypeRef.current = pointerType;
      }
      lastPointerDownRef.current = {
        pointerType: pointerType ?? '',
        x: typeof e.clientX === 'number' ? e.clientX : Number.NaN,
        y: typeof e.clientY === 'number' ? e.clientY : Number.NaN,
      };
    },
    [],
  );

  // Single click: select, or advance cyclic selection when re-clicking the selected entity
  const handleEntityClick = useCallback(
    (id: string, e?: ThreeEvent<MouseEvent>) => {
      const directDetail = (e as { detail?: number } | undefined)?.detail;
      const nativeDetail = (e?.nativeEvent as { detail?: number } | undefined)?.detail;
      if (
        (directDetail !== undefined && directDetail >= 2) ||
        (nativeDetail !== undefined && nativeDetail >= 2)
      ) {
        return;
      }

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
        transitionTo(
          entity.position,
          focusTransitionDuration !== undefined ? { duration: focusTransitionDuration } : undefined,
        );
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

  const handlePointerMissed = useCallback(
    (event?: MouseEvent | PointerEvent) => {
      const eventPointerType =
        event &&
        'pointerType' in event &&
        typeof event.pointerType === 'string' &&
        event.pointerType.length > 0
          ? event.pointerType
          : null;
      const effectivePointerType = eventPointerType ?? lastPointerTypeRef.current;
      const isTouch =
        effectivePointerType === 'touch' ||
        (!effectivePointerType && isCoarsePointerDevice());

      const down = lastPointerDownRef.current;
      lastPointerDownRef.current = null;
      if (
        down &&
        Number.isFinite(down.x) &&
        Number.isFinite(down.y) &&
        event &&
        typeof event.clientX === 'number' &&
        typeof event.clientY === 'number'
      ) {
        const dragDist = Math.hypot(event.clientX - down.x, event.clientY - down.y);
        const tapSlopPx = isTouch ? POINTER_TAP_SLOP_TOUCH_PX : POINTER_TAP_SLOP_MOUSE_PX;
        if (dragDist > tapSlopPx) {
          return;
        }
      }

      if (isTouch) {
        const touchMissHandler = onTouchPointerMissed ?? getStageCallbacks().onTouchPointerMissed;
        if (touchMissHandler?.()) {
          triggerInvalidate();
          return;
        }
      }

      clearInteraction(storeApi);
      triggerInvalidate();
      onSelect?.(null);
      onFocusChange?.(null);
    },
    [storeApi, triggerInvalidate, onSelect, onFocusChange, onTouchPointerMissed],
  );

  return {
    handleEntityClick,
    handleEntityDoubleClick,
    handlePointerMissed,
    recordPointerDown,
  };
}
