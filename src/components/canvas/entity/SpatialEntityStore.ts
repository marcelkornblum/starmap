import { createStore } from 'zustand/vanilla';
import * as THREE from 'three';
import type {
  SpatialEntityDefinition,
  CelestialInteractionState,
} from './types';

import { deriveEntityTier } from '../math/tiers';

export type { SpatialEntityDefinition, CelestialInteractionState };
export { deriveEntityTier };

export interface SpatialEntityState {
  entities: Record<string, SpatialEntityDefinition>;
  hoveredId: string | null;
  selectedId: string | null;
  selectedIds: Set<string>;
  focusedId: string | null;
  apertureIds: Set<string>;

  registerEntity: (entity: SpatialEntityDefinition) => void;
  unregisterEntity: (id: string) => void;
  updateEntity: (id: string, updates: Partial<SpatialEntityDefinition>) => void;
  setHovered: (id: string | null) => void;
  setSelected: (id: string | null) => void;
  setSelectedIds: (ids: Iterable<string>) => void;
  setFocused: (id: string | null) => void;
  setEntityInAperture: (id: string, inAperture: boolean) => void;
  setApertureIds: (ids: Set<string>) => void;
  getEntityState: (id: string) => CelestialInteractionState;
  getEntitiesInAperture: (center: THREE.Vector3, radius: number) => SpatialEntityDefinition[];
  getEntitiesByState: (state: CelestialInteractionState) => SpatialEntityDefinition[];
}

export const createSpatialEntityStore = (initial?: {
  selectedId?: string | null;
  selectedIds?: Iterable<string>;
  focusedId?: string | null;
  hoveredId?: string | null;
  apertureIds?: Set<string>;
}) => {
  const initialSelectedSet = new Set<string>(
    initial?.selectedIds ?? (initial?.selectedId ? [initial.selectedId] : []),
  );
  const initialSelectedId =
    initial?.selectedId !== undefined
      ? initial.selectedId
      : (initialSelectedSet.values().next().value ?? null);

  return createStore<SpatialEntityState>((set, get) => ({
    entities: {},
    hoveredId: initial?.hoveredId ?? null,
    selectedId: initialSelectedId,
    selectedIds: initialSelectedSet,
    focusedId: initial?.focusedId ?? null,
    apertureIds: initial?.apertureIds ?? new Set<string>(),

    registerEntity: (entity) => {
      set((state) => {
        const existing = state.entities[entity.id];
        if (
          existing &&
          existing.name === entity.name &&
          existing.classification === entity.classification &&
          existing.spectralType === entity.spectralType &&
          existing.position === entity.position
        ) {
          return state;
        }
        return {
          entities: {
            ...state.entities,
            [entity.id]: entity,
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
        if (!existing) return state;
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
        if (
          state.selectedId === id &&
          state.selectedIds.size === (id ? 1 : 0) &&
          (id === null || state.selectedIds.has(id))
        ) {
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
        if (
          state.selectedId === nextSelectedId &&
          state.selectedIds.size === nextSelectedIds.size &&
          Array.from(nextSelectedIds).every((item) => state.selectedIds.has(item))
        ) {
          return state;
        }
        return {
          selectedId: nextSelectedId,
          selectedIds: nextSelectedIds,
        };
      }),

    setFocused: (id) =>
      set((state) => (state.focusedId === id ? state : { focusedId: id })),

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

    setApertureIds: (apertureIds) => set({ apertureIds }),

    getEntityState: (id) => deriveEntityTier(id, get()),

    getEntitiesInAperture: (center, radius) => {
      const state = get();
      const radiusSq = radius * radius;
      const matches: SpatialEntityDefinition[] = [];
      const scratchVec = new THREE.Vector3();

      for (const id in state.entities) {
        const entity = state.entities[id];
        const p = entity.position;
        if (p instanceof THREE.Vector3) {
          scratchVec.copy(p);
        } else if (Array.isArray(p)) {
          scratchVec.set(p[0], p[1], p[2]);
        }
        if (scratchVec.distanceToSquared(center) <= radiusSq) {
          matches.push(entity);
        }
      }

      return matches;
    },

    getEntitiesByState: (targetState) => {
      const state = get();
      const matches: SpatialEntityDefinition[] = [];
      for (const id in state.entities) {
        if (state.getEntityState(id) === targetState) {
          matches.push(state.entities[id]);
        }
      }
      return matches;
    },
  }));
};

export type SpatialEntityStore = ReturnType<typeof createSpatialEntityStore>;
