import { useEffect, useRef } from 'react';
import type { SpatialEntityStore } from '../components/canvas/entity/SpatialEntityStore';
import type { SpatialEntityDefinition } from '../components/canvas/entity/SpatialEntityStore';
import { useCameraStore } from '../stores/useCameraStore';
import { useUIStore } from '../stores/useUIStore';

export interface UseGalaxyStoreSyncParams {
  readonly storeApi: SpatialEntityStore;
  readonly urlFocusSlug: string | null;
  readonly hasExplicitFocus: boolean;
  readonly focusedEntity: SpatialEntityDefinition | null;
  readonly urlSelectedEntities: readonly SpatialEntityDefinition[];
  readonly hasExplicitSelection: boolean;
  readonly apertureIds: Set<string>;
  readonly liveApertureRadius: number | null;
  readonly pathname: string;
  readonly search: string;
  readonly isExplicitLocation: boolean;
}

export function useGalaxyStoreSync({
  storeApi,
  urlFocusSlug,
  hasExplicitFocus,
  focusedEntity,
  urlSelectedEntities,
  hasExplicitSelection,
  apertureIds,
  liveApertureRadius,
  pathname,
  search,
  isExplicitLocation,
}: UseGalaxyStoreSyncParams): void {
  const prevUrlFocusSlugRef = useRef<string | null>(urlFocusSlug);

  if (isExplicitLocation && !urlFocusSlug && !hasExplicitFocus) {
    if (storeApi.getState().focusedId) {
      storeApi.getState().setFocused(null);
    }
  }

  useEffect(() => {
    const store = storeApi.getState();
    const currentFocusedId = store.focusedId;

    if (urlFocusSlug) {
      if (focusedEntity) {
        if (!store.entities[focusedEntity.id]) {
          store.registerEntity(focusedEntity);
        }
        if (store.focusedId !== focusedEntity.id) {
          store.setFocused(focusedEntity.id);
        }
      } else if (currentFocusedId !== urlFocusSlug) {
        store.setFocused(urlFocusSlug);
      }
      if (useUIStore.getState().detailsDetent === 'collapsed') {
        useUIStore.getState().setDetailsDetent('peek');
      }
    } else if (prevUrlFocusSlugRef.current !== null && !urlFocusSlug) {
      if (currentFocusedId !== null) {
        store.setFocused(null);
      }
    }
    prevUrlFocusSlugRef.current = urlFocusSlug;
  }, [urlFocusSlug, focusedEntity, storeApi]);

  useEffect(() => {
    if (pathname === '/galaxy') {
      useCameraStore.getState().setLastGalaxySearch(search);
    }
  }, [pathname, search]);

  useEffect(() => {
    if (urlSelectedEntities.length > 0 || hasExplicitSelection) {
      const nextIds = urlSelectedEntities.map((e) => e.id);
      const current = storeApi.getState().selectedIds;
      if (
        current.size !== nextIds.length ||
        !nextIds.every((id) => current.has(id))
      ) {
        storeApi.getState().setSelectedIds(nextIds);
      }
    }
  }, [urlSelectedEntities, hasExplicitSelection, storeApi]);

  useEffect(() => {
    if (liveApertureRadius === null) {
      storeApi.getState().setApertureIds(apertureIds);
    }
  }, [storeApi, apertureIds, liveApertureRadius]);
}
