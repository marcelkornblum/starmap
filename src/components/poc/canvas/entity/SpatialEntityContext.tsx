import React, { createContext, useContext } from 'react';
import * as THREE from 'three';
import { useStore } from 'zustand';
import { useFrame } from '@react-three/fiber';
import { useLazyRef } from '../../../../hooks/useLazyRef';
import {
  createSpatialEntityStore,
  deriveEntityTier,
  type SpatialEntityStore,
  type SpatialEntityState,
  type CelestialInteractionState,
} from './SpatialEntityStore';
import { useSpatialFrameSafe } from '../instrument/SpatialFrameProvider';
import { FRAME_PRIORITY } from '../engineConfig';

const SpatialEntityStoreContext = createContext<SpatialEntityStore | null>(null);

export interface SpatialEntityProviderProps {
  store?: SpatialEntityStore;
  children: React.ReactNode;
}

/**
 * ApertureEvaluator (§2.1 / §2.2):
 * Runs at FRAME_PRIORITY.entityAperture, right after SpatialFrameProvider computes
 * focusPoint and apertureRadius.
 * Evaluates spatial proximity across all registered entities in the store in a single
 * centralised pass and updates store.apertureIds atomically.
 */
export const ApertureEvaluator: React.FC = () => {
  const frameCtx = useSpatialFrameSafe();
  const store = useSpatialEntityStoreApi();
  const scratchApertureRef = useLazyRef(() => new Set<string>());

  useFrame(() => {
    if (!frameCtx?.frameRef?.current) return;
    const { focusPoint, apertureRadius } = frameCtx.frameRef.current;
    const rSq = apertureRadius * apertureRadius;
    const state = store.getState();
    const currentAperture = state.apertureIds;
    let changed = false;
    const scratch = scratchApertureRef.current;
    scratch.clear();

    for (const [id, entity] of Object.entries(state.entities)) {
      const pos = entity.position;
      let x = 0;
      let y = 0;
      let z = 0;
      if (pos instanceof THREE.Vector3) {
        x = pos.x;
        y = pos.y;
        z = pos.z;
      } else if (Array.isArray(pos)) {
        x = pos[0];
        y = pos[1];
        z = pos[2];
      }
      const dx = x - focusPoint.x;
      const dy = y - focusPoint.y;
      const dz = z - focusPoint.z;
      const dSq = dx * dx + dy * dy + dz * dz;
      if (dSq <= rSq) {
        scratch.add(id);
      }
    }

    if (scratch.size !== currentAperture.size) {
      changed = true;
    } else {
      for (const id of scratch) {
        if (!currentAperture.has(id)) {
          changed = true;
          break;
        }
      }
    }

    if (changed) {
      // r3f-audit-disable-next-line no-alloc-in-use-frame
      state.setApertureIds(new Set(scratch));
    }
  }, FRAME_PRIORITY.entityAperture);

  return null;
};

export const SpatialEntityProvider: React.FC<SpatialEntityProviderProps> = ({
  store: explicitStore,
  children,
}) => {
  const [localStore] = React.useState(() => createSpatialEntityStore());
  const activeStore = explicitStore ?? localStore;

  return (
    <SpatialEntityStoreContext.Provider value={activeStore}>
      {children}
    </SpatialEntityStoreContext.Provider>
  );
};

const defaultStore = createSpatialEntityStore();

export function useSpatialEntityStore<T>(selector: (state: SpatialEntityState) => T): T {
  const store = useContext(SpatialEntityStoreContext);
  return useStore(store ?? defaultStore, selector);
}

export function useSpatialEntityStoreApi(): SpatialEntityStore {
  const store = useContext(SpatialEntityStoreContext);
  return store ?? defaultStore;
}

/**
 * Subscribes to the authoritative derived visual tier for an entity.
 * Component only re-renders when this specific entity's tier changes.
 */
export function useEntityTier(id: string): CelestialInteractionState {
  return useSpatialEntityStore((s) => deriveEntityTier(id, s));
}


