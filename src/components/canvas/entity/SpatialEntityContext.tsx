import React, { createContext, useContext } from 'react';
import { useStore } from 'zustand';
import {
  createSpatialEntityStore,
  type SpatialEntityStore,
  type SpatialEntityState,
} from './SpatialEntityStore';

const SpatialEntityStoreContext = createContext<SpatialEntityStore | null>(null);

export interface SpatialEntityProviderProps {
  store?: SpatialEntityStore;
  children: React.ReactNode;
}

export const SpatialEntityProvider: React.FC<SpatialEntityProviderProps> = ({
  store: explicitStore,
  children,
}) => {
  const [localStore] = React.useState(() => createSpatialEntityStore());

  return (
    <SpatialEntityStoreContext.Provider value={explicitStore ?? localStore}>
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

