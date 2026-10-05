import { createStore } from 'zustand/vanilla';
import * as THREE from 'three';
import type {
  SpatialEntityDefinition,
  CelestialInteractionState,
} from './types';

export type { SpatialEntityDefinition, CelestialInteractionState };

export interface SpatialEntityState {
  entities: Record<string, SpatialEntityDefinition>;
  hoveredId: string | null;
  selectedId: string | null;
  focusedId: string | null;

  registerEntity: (entity: SpatialEntityDefinition) => void;
  unregisterEntity: (id: string) => void;
  updateEntity: (id: string, updates: Partial<SpatialEntityDefinition>) => void;
  setHovered: (id: string | null) => void;
  setSelected: (id: string | null) => void;
  setFocused: (id: string | null) => void;
  getEntityState: (id: string) => CelestialInteractionState;
  getEntitiesInAperture: (center: THREE.Vector3, radius: number) => SpatialEntityDefinition[];
  getEntitiesByState: (state: CelestialInteractionState) => SpatialEntityDefinition[];
}

export const createSpatialEntityStore = () => {
  return createStore<SpatialEntityState>((set, get) => ({
    entities: {},
    hoveredId: null,
    selectedId: null,
    focusedId: null,

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
        return { entities: next };
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

    getEntityState: (id) => {
      const state = get();
      const entity = state.entities[id];
      if (entity?.state) return entity.state;

      if (state.focusedId === id) return 'focused';
      if (state.selectedId === id || state.hoveredId === id) return 'selected';
      return 'passive';
    },

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
