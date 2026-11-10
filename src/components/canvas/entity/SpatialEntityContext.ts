import { createContext, useContext } from 'react';
import { useStore } from 'zustand';
import {
  deriveEntityTier,
  type SpatialEntityStore,
  type SpatialEntityState,
  type CelestialInteractionState,
} from './SpatialEntityStore';
import { CelestialOcclusionManager } from '../cartography/celestialOcclusionRegistry';

export const SpatialEntityStoreContext = createContext<SpatialEntityStore | null>(null);
export const OcclusionContext = createContext<CelestialOcclusionManager | null>(null);

export function useOcclusionManager(): CelestialOcclusionManager {
  const manager = useContext(OcclusionContext);
  if (!manager) {
    throw new Error('useOcclusionManager must be used within an <OcclusionContext.Provider> or <SpatialEntityProvider>');
  }
  return manager;
}

export function useSpatialEntityStore<T>(selector: (state: SpatialEntityState) => T): T {
  const store = useContext(SpatialEntityStoreContext);
  if (!store) {
    throw new Error('useSpatialEntityStore must be used within a <SpatialEntityProvider>');
  }
  return useStore(store, selector);
}

export function useSpatialEntityStoreApi(): SpatialEntityStore {
  const store = useContext(SpatialEntityStoreContext);
  if (!store) {
    throw new Error('useSpatialEntityStore must be used within a <SpatialEntityProvider>');
  }
  return store;
}

export function useOptionalSpatialEntityStoreApi(): SpatialEntityStore | null {
  return useContext(SpatialEntityStoreContext);
}

/**
 * Subscribes to the authoritative derived visual tier for an entity.
 * Component only re-renders when this specific entity's tier changes.
 */
export function useEntityTier(id: string): CelestialInteractionState {
  return useSpatialEntityStore((s) => deriveEntityTier(id, s));
}

export {
  SpatialEntityProvider,
  type SpatialEntityProviderProps,
} from './SpatialEntityProvider';
export { ApertureEvaluator } from './ApertureEvaluator';
