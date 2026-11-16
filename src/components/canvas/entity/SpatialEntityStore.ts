import { createStore } from 'zustand/vanilla';
import type * as THREE from 'three';
import type {
  SpatialEntityDefinition,
  CelestialInteractionState,
} from '../../../types/spatial';
import { deriveEntityTier } from '../math/tiers';
import {
  isEntityRegistrationIdentical,
  mergeRegisteredEntity,
  isEntityUpdateUnchanged,
  areSetsEqual,
  findEntitiesInAperture,
  findEntitiesByState,
  resolveInitialEntitySelection,
  indexEntitySlugs,
  removeEntityFromSlugIndex,
  resolveEntityIdFromState,
} from './spatialEntityReducers';

export interface SpatialEntityState {
  entities: Record<string, SpatialEntityDefinition>;
  entityIdBySlug: Record<string, string>;
  hoveredId: string | null;
  selectedId: string | null;
  selectedIds: Set<string>;
  focusedId: string | null;
  focusedIds: Set<string>;
  apertureIds: Set<string>;
  apertureRadius: number | null;
  apertureCenter: readonly [number, number, number] | null;

  registerEntity: (entity: SpatialEntityDefinition) => void;
  registerEntities: (entities: readonly SpatialEntityDefinition[]) => void;
  unregisterEntity: (id: string) => void;
  unregisterEntities: (ids: readonly string[]) => void;
  clearEntities: () => void;
  updateEntity: (id: string, updates: Partial<SpatialEntityDefinition>) => void;
  resolveEntityId: (idOrSlug: string) => string | null;
  setHovered: (id: string | null) => void;
  setSelected: (id: string | null) => void;
  setSelectedIds: (ids: Iterable<string>) => void;
  setFocused: (id: string | null) => void;
  setFocusedIds: (ids: Iterable<string>) => void;
  setEntityInAperture: (id: string, inAperture: boolean) => void;
  setApertureIds: (ids: Set<string>) => void;
  setApertureFrame: (center: readonly [number, number, number] | null, radius: number | null) => void;
  getEntityState: (id: string) => CelestialInteractionState;
  getEntitiesInAperture: (center: THREE.Vector3, radius: number) => SpatialEntityDefinition[];
  getEntitiesByState: (state: CelestialInteractionState) => SpatialEntityDefinition[];
}

export interface SpatialEntityStoreInitial {
  selectedId?: string | null;
  selectedIds?: Iterable<string>;
  focusedId?: string | null;
  focusedIds?: Iterable<string>;
  hoveredId?: string | null;
  apertureIds?: Set<string>;
  apertureRadius?: number | null;
  apertureCenter?: readonly [number, number, number] | null;
}

export const createSpatialEntityStore = (initial?: SpatialEntityStoreInitial) => {
  const { initialSelectedId, initialSelectedSet, initialFocusedId, initialFocusedSet } =
    resolveInitialEntitySelection(initial);

  return createStore<SpatialEntityState>((set, get) => ({
    entities: {},
    entityIdBySlug: {},
    hoveredId: initial?.hoveredId ?? null,
    selectedId: initialSelectedId,
    selectedIds: initialSelectedSet,
    focusedId: initialFocusedId,
    focusedIds: initialFocusedSet,
    apertureIds: initial?.apertureIds ?? new Set<string>(),
    apertureRadius: initial?.apertureRadius ?? null,
    apertureCenter: initial?.apertureCenter ?? null,

    registerEntity: (entity) => {
      set((state) => {
        const existing = state.entities[entity.id];
        if (isEntityRegistrationIdentical(existing, entity)) {
          return state;
        }
        return {
          entities: {
            ...state.entities,
            [entity.id]: mergeRegisteredEntity(existing, entity),
          },
          entityIdBySlug: indexEntitySlugs(state.entityIdBySlug, entity, existing),
        };
      });
    },

    registerEntities: (entityList) => {
      set((state) => {
        let changed = false;
        let nextEntities = state.entities;
        let nextSlugIndex = state.entityIdBySlug;
        for (const entity of entityList) {
          const existing = nextEntities[entity.id];
          if (isEntityRegistrationIdentical(existing, entity)) {
            continue;
          }
          if (!changed) {
            nextEntities = { ...state.entities };
            nextSlugIndex = state.entityIdBySlug;
            changed = true;
          }
          nextEntities[entity.id] = mergeRegisteredEntity(existing, entity);
          nextSlugIndex = indexEntitySlugs(nextSlugIndex, entity, existing);
        }
        if (!changed) return state;
        return {
          entities: nextEntities,
          entityIdBySlug: nextSlugIndex,
        };
      });
    },

    unregisterEntity: (id) => {
      get().unregisterEntities([id]);
    },

    unregisterEntities: (ids) => {
      set((state) => {
        let changed = false;
        let nextEntities = state.entities;
        let nextAperture = state.apertureIds;
        let nextSlugIndex = state.entityIdBySlug;
        for (const id of ids) {
          const existing = nextEntities[id];
          const inAperture = nextAperture.has(id);
          if (!existing && !inAperture) continue;
          if (!changed) {
            nextEntities = { ...state.entities };
            nextAperture = new Set(state.apertureIds);
            changed = true;
          }
          if (existing) {
            delete nextEntities[id];
            nextSlugIndex = removeEntityFromSlugIndex(nextSlugIndex, id, existing);
          }
          if (inAperture) nextAperture.delete(id);
        }
        if (!changed) return state;
        return {
          entities: nextEntities,
          entityIdBySlug: nextSlugIndex,
          apertureIds: nextAperture,
        };
      });
    },

    clearEntities: () => {
      set((state) => {
        if (
          Object.keys(state.entities).length === 0 &&
          Object.keys(state.entityIdBySlug).length === 0 &&
          state.apertureIds.size === 0
        ) {
          return state;
        }
        return {
          entities: {},
          entityIdBySlug: {},
          apertureIds: new Set<string>(),
        };
      });
    },

    updateEntity: (id, updates) => {
      set((state) => {
        const existing = state.entities[id];
        if (!existing || isEntityUpdateUnchanged(existing, updates)) {
          return state;
        }
        const updated = { ...existing, ...updates };
        return {
          entities: {
            ...state.entities,
            [id]: updated,
          },
          entityIdBySlug: indexEntitySlugs(state.entityIdBySlug, updated, existing),
        };
      });
    },

    resolveEntityId: (idOrSlug) =>
      resolveEntityIdFromState(get().entities, get().entityIdBySlug, idOrSlug),

    setHovered: (id) =>
      set((state) => (state.hoveredId === id ? state : { hoveredId: id })),

    setSelected: (id) =>
      set((state) => {
        if (state.selectedId === id && state.selectedIds.size === (id ? 1 : 0) && (id === null || state.selectedIds.has(id))) {
          return state;
        }
        return {
          selectedId: id,
          selectedIds: id ? new Set<string>([id]) : new Set<string>(),
        };
      }),

    setSelectedIds: (ids) =>
      set((state) => {
        const nextSelectedIds = new Set<string>(ids);
        const nextSelectedId = nextSelectedIds.values().next().value ?? null;
        if (state.selectedId === nextSelectedId && areSetsEqual(state.selectedIds, nextSelectedIds)) {
          return state;
        }
        return { selectedId: nextSelectedId, selectedIds: nextSelectedIds };
      }),

    setFocused: (id) =>
      set((state) => {
        if (state.focusedId === id && state.focusedIds.size === (id ? 1 : 0) && (id === null || state.focusedIds.has(id))) {
          return state;
        }
        return {
          focusedId: id,
          focusedIds: id ? new Set<string>([id]) : new Set<string>(),
        };
      }),

    setFocusedIds: (ids) =>
      set((state) => {
        const nextFocusedIds = new Set<string>(ids);
        const nextFocusedId = nextFocusedIds.values().next().value ?? null;
        if (state.focusedId === nextFocusedId && areSetsEqual(state.focusedIds, nextFocusedIds)) {
          return state;
        }
        return { focusedId: nextFocusedId, focusedIds: nextFocusedIds };
      }),

    setEntityInAperture: (id, inAperture) => {
      set((state) => {
        const has = state.apertureIds.has(id);
        if (has === inAperture) return state;
        const next = new Set(state.apertureIds);
        if (inAperture) next.add(id);
        else next.delete(id);
        return { apertureIds: next };
      });
    },

    setApertureIds: (apertureIds) =>
      set((state) => {
        if (areSetsEqual(state.apertureIds, apertureIds)) {
          return state;
        }
        return { apertureIds };
      }),

    setApertureFrame: (center, radius) =>
      set((state) => {
        const centerMatch =
          (!state.apertureCenter && !center) ||
          (state.apertureCenter !== null &&
            center !== null &&
            state.apertureCenter[0] === center[0] &&
            state.apertureCenter[1] === center[1] &&
            state.apertureCenter[2] === center[2]);
        if (state.apertureRadius === radius && centerMatch) {
          return state;
        }
        return { apertureCenter: center, apertureRadius: radius };
      }),

    getEntityState: (id) => deriveEntityTier(id, get()),

    getEntitiesInAperture: (center, radius) =>
      findEntitiesInAperture(get().entities, center, radius),

    getEntitiesByState: (targetState) =>
      findEntitiesByState(
        get().entities,
        targetState,
        get().focusedId,
        (id) => deriveEntityTier(id, get()),
      ),
  }));
};

export type SpatialEntityStore = ReturnType<typeof createSpatialEntityStore>;
