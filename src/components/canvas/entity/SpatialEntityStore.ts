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
} from './spatialEntityReducers';

export interface SpatialEntityState {
  entities: Record<string, SpatialEntityDefinition>;
  hoveredId: string | null;
  selectedId: string | null;
  selectedIds: Set<string>;
  focusedId: string | null;
  focusedIds: Set<string>;
  apertureIds: Set<string>;
  apertureRadius: number | null;
  apertureCenter: readonly [number, number, number] | null;

  registerEntity: (entity: SpatialEntityDefinition) => void;
  unregisterEntity: (id: string) => void;
  updateEntity: (id: string, updates: Partial<SpatialEntityDefinition>) => void;
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
        };
      });
    },

    unregisterEntity: (id) => {
      set((state) => {
        if (!(id in state.entities) && !state.apertureIds.has(id)) {
          return state;
        }
        const next = { ...state.entities };
        delete next[id];
        let nextAperture = state.apertureIds;
        if (state.apertureIds.has(id)) {
          nextAperture = new Set(state.apertureIds);
          nextAperture.delete(id);
        }
        return { entities: next, apertureIds: nextAperture };
      });
    },

    updateEntity: (id, updates) => {
      set((state) => {
        const existing = state.entities[id];
        if (!existing || isEntityUpdateUnchanged(existing, updates)) {
          return state;
        }
        return {
          entities: {
            ...state.entities,
            [id]: { ...existing, ...updates },
          },
        };
      });
    },

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
