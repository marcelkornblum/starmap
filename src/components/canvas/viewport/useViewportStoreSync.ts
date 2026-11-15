import { useEffect } from 'react';
import type { SpatialEntityStore } from '../entity';
import { toUrlSlug } from '../../../utils/datasetLayerSlugs';

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
  // Initialize selection on mount if initialSelectedId is provided
  useEffect(() => {
    if (initialSelectedId) {
      storeApi.getState().setSelected(initialSelectedId);
    }
  }, [initialSelectedId, storeApi]);

  // Synchronise outer store selectedIds inward to local spatial entity store.
  useEffect(() => {
    if (!outerStore || outerStore === storeApi) return;
    const applyOuterSelection = (ids: ReadonlySet<string>): void => {
      storeApi.getState().setSelectedIds(ids);
    };
    applyOuterSelection(outerStore.getState().selectedIds);

    return outerStore.subscribe((state, prevState) => {
      if (state.selectedIds !== prevState.selectedIds) {
        applyOuterSelection(state.selectedIds);
      }
    });
  }, [outerStore, storeApi]);

  // Synchronise outer store focusedId inward to local spatial entity store
  useEffect(() => {
    if (!outerStore || outerStore === storeApi) return;
    const applyOuterFocus = (focusedId: string | null): void => {
      const curFocused = storeApi.getState().focusedId;
      if (curFocused === focusedId) return;

      let resolvedLocalId = focusedId;
      if (focusedId) {
        const localEntities = storeApi.getState().entities;
        if (localEntities[focusedId]) {
          resolvedLocalId = focusedId;
        } else {
          const outerEntity = outerStore.getState().entities[focusedId];
          const targetSlug = toUrlSlug(focusedId);
          const outerNameSlug = outerEntity?.name ? toUrlSlug(outerEntity.name) : null;

          const localMatch = Object.values(localEntities).find(
            (e) =>
              toUrlSlug(e.id) === targetSlug ||
              toUrlSlug(e.name) === targetSlug ||
              (outerNameSlug && toUrlSlug(e.name) === outerNameSlug),
          );

          if (localMatch) {
            resolvedLocalId = localMatch.id;
          } else if (outerEntity && !localEntities[outerEntity.id]) {
            storeApi.getState().registerEntity(outerEntity);
          }
        }
      }
      if (storeApi.getState().focusedId !== resolvedLocalId) {
        storeApi.getState().setFocused(resolvedLocalId);
      }
    };
    applyOuterFocus(outerStore.getState().focusedId);

    return outerStore.subscribe((state, prevState) => {
      if (state.focusedId !== prevState.focusedId) {
        applyOuterFocus(state.focusedId);
      }
    });
  }, [outerStore, storeApi]);

  // Synchronise outer store hoveredId inward to local spatial entity store
  useEffect(() => {
    if (!outerStore || outerStore === storeApi) return;
    const applyOuterHover = (hoveredId: string | null): void => {
      if (storeApi.getState().hoveredId !== hoveredId) {
        storeApi.getState().setHovered(hoveredId);
      }
    };
    applyOuterHover(outerStore.getState().hoveredId);

    return outerStore.subscribe((state, prevState) => {
      if (state.hoveredId !== prevState.hoveredId) {
        applyOuterHover(state.hoveredId);
      }
    });
  }, [outerStore, storeApi]);

  // Initial outerStore aperture synchronization
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

  // Synchronise local store selection & focus changes outward to outer spatial store
  useEffect(() => {
    return storeApi.subscribe((state, prevState) => {
      if (state.hoveredId !== prevState.hoveredId) {
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

      if (state.selectedId !== prevState.selectedId) {
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

      if (state.focusedId !== prevState.focusedId) {
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
  }, [storeApi, outerStore]);
}
