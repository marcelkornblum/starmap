import { createStore } from 'zustand/vanilla';
import * as THREE from 'three';
import type {
  SpatialEntityDefinition,
  CelestialInteractionState,
} from './types';

import { deriveEntityTier } from '../../../canvas/math/tiers';

export type { SpatialEntityDefinition, CelestialInteractionState };
export { deriveEntityTier };

export interface SpatialEntityState {
  entities: Record<string, SpatialEntityDefinition>;
  hoveredId: string | null;
  selectedId: string | null;
  focusedId: string | null;
  apertureIds: Set<string>;

  registerEntity: (entity: SpatialEntityDefinition) => void;
  unregisterEntity: (id: string) => void;
  updateEntity: (id: string, updates: Partial<SpatialEntityDefinition>) => void;
  setHovered: (id: string | null) => void;
  setSelected: (id: string | null) => void;
  setFocused: (id: string | null) => void;
  setEntityInAperture: (id: string, inAperture: boolean) => void;
  setApertureIds: (ids: Set<string>) => void;
  getEntityState: (id: string) => CelestialInteractionState;
  getEntitiesInAperture: (center: THREE.Vector3, radius: number) => SpatialEntityDefinition[];
  getEntitiesByState: (state: CelestialInteractionState) => SpatialEntityDefinition[];
}

export const createSpatialEntityStore = (initial?: {
  selectedId?: string | null;
  focusedId?: string | null;
  hoveredId?: string | null;
  apertureIds?: Set<string>;
}) => {
  return createStore<SpatialEntityState>((set, get) => ({
    entities: {},
    hoveredId: initial?.hoveredId ?? null,
    selectedId: initial?.selectedId ?? null,
    focusedId: initial?.focusedId ?? null,
    apertureIds: initial?.apertureIds ?? new Set<string>(),

    registerEntity: (entity) => {
      set((state) => ({
        entities: {
          ...state.entities,
          [entity.id]: entity,
        },
      }));
    },

    unregisterEntity: (id) => {
      set((state) => {
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

    setHovered: (id) => set({ hoveredId: id }),
    setSelected: (id) => set({ selectedId: id }),
    setFocused: (id) => set({ focusedId: id }),

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
