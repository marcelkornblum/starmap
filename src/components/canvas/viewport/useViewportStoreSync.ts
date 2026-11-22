import { useCallback, useEffect, useRef } from 'react';
import type { SpatialEntityDefinition } from '../../../types/spatial';
import type { SpatialEntityStore } from '../entity';

export interface ViewportStoreSyncOptions {
  readonly storeApi: SpatialEntityStore;
  readonly outerStore?: SpatialEntityStore;
  readonly initialSelectedId?: string | null;
}

export function useViewportStoreSync({
  storeApi,
  outerStore,
  initialSelectedId,
}: ViewportStoreSyncOptions): void {
  const isApplyingFromOuterRef = useRef(false);

  const applyOuterSelection = useCallback(
    (ids: ReadonlySet<string>): void => {
      if (!outerStore || outerStore === storeApi) return;
      const localState = storeApi.getState();
      const outerState = outerStore.getState();
      const resolvedIds: string[] = [];
      for (const id of ids) {
        const outerEntity = outerState.entities[id];
        const resolved =
          localState.resolveEntityId(id) ??
          (outerEntity?.name ? localState.resolveEntityId(outerEntity.name) : null) ??
          id;
        resolvedIds.push(resolved);
      }
      isApplyingFromOuterRef.current = true;
      try {
        storeApi.getState().setSelectedIds(resolvedIds);
      } finally {
        isApplyingFromOuterRef.current = false;
      }
    },
    [outerStore, storeApi],
  );

  const applyOuterFocus = useCallback(
    (focusedId: string | null): void => {
      if (!outerStore || outerStore === storeApi) return;

      let resolvedLocalId = focusedId;
      let entityToRegister: SpatialEntityDefinition | undefined;
      if (focusedId) {
        const localState = storeApi.getState();
        const outerEntity = outerStore.getState().entities[focusedId];
        const resolved =
          localState.resolveEntityId(focusedId) ??
          (outerEntity?.name ? localState.resolveEntityId(outerEntity.name) : null);

        if (resolved) {
          resolvedLocalId = resolved;
        } else if (outerEntity && !localState.entities[outerEntity.id]) {
          entityToRegister = outerEntity;
        }
      }

      if (storeApi.getState().focusedId === resolvedLocalId && !entityToRegister) {
        return;
      }

      isApplyingFromOuterRef.current = true;
      try {
        if (entityToRegister) {
          storeApi.getState().registerEntity(entityToRegister);
        }
        if (storeApi.getState().focusedId !== resolvedLocalId) {
          storeApi.getState().setFocused(resolvedLocalId);
        }
      } finally {
        isApplyingFromOuterRef.current = false;
      }
    },
    [outerStore, storeApi],
  );

  useEffect(() => {
    if (initialSelectedId) {
      storeApi.getState().setSelected(initialSelectedId);
    }
  }, [initialSelectedId, storeApi]);

  useEffect(() => {
    if (!outerStore || outerStore === storeApi) return;
    const initialOuterSelected = outerStore.getState().selectedIds;
    if (initialOuterSelected.size > 0 || !initialSelectedId) {
      applyOuterSelection(initialOuterSelected);
    }

    return outerStore.subscribe((state, prevState) => {
      if (state.selectedIds !== prevState.selectedIds) {
        applyOuterSelection(state.selectedIds);
      }
    });
  }, [outerStore, storeApi, initialSelectedId, applyOuterSelection]);

  useEffect(() => {
    if (!outerStore || outerStore === storeApi) return;
    applyOuterFocus(outerStore.getState().focusedId);

    return outerStore.subscribe((state, prevState) => {
      if (state.focusedId !== prevState.focusedId) {
        applyOuterFocus(state.focusedId);
      }
    });
  }, [outerStore, storeApi, applyOuterFocus]);

  useEffect(() => {
    if (!outerStore || outerStore === storeApi) return;
    const applyOuterHover = (hoveredId: string | null): void => {
      let resolvedLocalId = hoveredId;
      if (hoveredId) {
        const localState = storeApi.getState();
        const outerEntity = outerStore.getState().entities[hoveredId];
        resolvedLocalId =
          localState.resolveEntityId(hoveredId) ??
          (outerEntity?.name ? localState.resolveEntityId(outerEntity.name) : null) ??
          hoveredId;
      }
      if (storeApi.getState().hoveredId !== resolvedLocalId) {
        isApplyingFromOuterRef.current = true;
        try {
          storeApi.getState().setHovered(resolvedLocalId);
        } finally {
          isApplyingFromOuterRef.current = false;
        }
      }
    };
    applyOuterHover(outerStore.getState().hoveredId);

    return outerStore.subscribe((state, prevState) => {
      if (state.hoveredId !== prevState.hoveredId) {
        applyOuterHover(state.hoveredId);
      }
    });
  }, [outerStore, storeApi]);

  useEffect(() => {
    if (!outerStore || outerStore === storeApi) return;
    const initialLocal = storeApi.getState();
    if (initialLocal.apertureCenter || initialLocal.apertureRadius !== null) {
      outerStore.getState().setApertureFrame(initialLocal.apertureCenter, initialLocal.apertureRadius);
    }
    if (initialLocal.apertureIds.size > 0) {
      outerStore.getState().setApertureIds(initialLocal.apertureIds);
    }
  }, [outerStore, storeApi]);

  useEffect(() => {
    return storeApi.subscribe((state, prevState) => {
      if (
        !isApplyingFromOuterRef.current &&
        outerStore &&
        outerStore !== storeApi &&
        state.entityIdBySlug !== prevState.entityIdBySlug
      ) {
        const outerState = outerStore.getState();
        if (outerState.selectedIds.size > 0) {
          applyOuterSelection(outerState.selectedIds);
        }
        if (outerState.focusedId !== null) {
          applyOuterFocus(outerState.focusedId);
        }
      }

      if (!isApplyingFromOuterRef.current && state.hoveredId !== prevState.hoveredId) {
        if (outerStore && outerStore !== storeApi) {
          if (outerStore.getState().hoveredId !== state.hoveredId) {
            outerStore.getState().setHovered(state.hoveredId);
          }
        }
      }

      if (outerStore && outerStore !== storeApi) {
        if (
          state.apertureCenter !== prevState.apertureCenter ||
          state.apertureRadius !== prevState.apertureRadius
        ) {
          const currentOuter = outerStore.getState();
          const curCenter = currentOuter.apertureCenter;
          const nextCenter = state.apertureCenter;
          const centerChanged =
            (curCenter === null) !== (nextCenter === null) ||
            (curCenter !== null &&
              nextCenter !== null &&
              (Math.abs(curCenter[0] - nextCenter[0]) > 0.05 ||
                Math.abs(curCenter[1] - nextCenter[1]) > 0.05 ||
                Math.abs(curCenter[2] - nextCenter[2]) > 0.05));
          const radiusChanged =
            (currentOuter.apertureRadius === null) !== (state.apertureRadius === null) ||
            (currentOuter.apertureRadius !== null &&
              state.apertureRadius !== null &&
              Math.abs(currentOuter.apertureRadius - state.apertureRadius) > 0.05);

          if (centerChanged || radiusChanged) {
            outerStore.getState().setApertureFrame(state.apertureCenter, state.apertureRadius);
          }
        }
        if (state.apertureIds !== prevState.apertureIds) {
          outerStore.getState().setApertureIds(state.apertureIds);
        }
      }

      if (!isApplyingFromOuterRef.current && state.selectedId !== prevState.selectedId) {
        if (outerStore && outerStore !== storeApi) {
          if (state.selectedId) {
            const entity = state.entities[state.selectedId];
            if (entity) {
              outerStore.getState().registerEntity(entity);
            }
          }
          if (outerStore.getState().selectedId !== state.selectedId) {
            outerStore.getState().setSelected(state.selectedId);
          }
        }
      }

      if (!isApplyingFromOuterRef.current && state.focusedId !== prevState.focusedId) {
        if (outerStore && outerStore !== storeApi) {
          if (state.focusedId) {
            const entity = state.entities[state.focusedId];
            if (entity) {
              outerStore.getState().registerEntity(entity);
            }
          }
          if (outerStore.getState().focusedId !== state.focusedId) {
            outerStore.getState().setFocused(state.focusedId);
          }
        }
      }
    });
  }, [storeApi, outerStore, applyOuterSelection, applyOuterFocus]);
}
