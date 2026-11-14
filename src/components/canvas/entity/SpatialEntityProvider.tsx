import React from 'react';
import {
  createSpatialEntityStore,
  type SpatialEntityStore,
} from './SpatialEntityStore';
import { CelestialOcclusionManager } from '../cartography/celestialOcclusionRegistry';
import { SpatialEntityStoreContext, OcclusionContext } from './SpatialEntityContext';

export interface SpatialEntityProviderProps {
  store?: SpatialEntityStore;
  occlusionManager?: CelestialOcclusionManager;
  children?: React.ReactNode;
}

export const SpatialEntityProvider: React.FC<SpatialEntityProviderProps> = ({
  store: explicitStore,
  occlusionManager: explicitManager,
  children,
}) => {
  const [localStore] = React.useState(() => createSpatialEntityStore());
  const activeStore = explicitStore ?? localStore;
  const [localManager] = React.useState(() => new CelestialOcclusionManager());
  const activeManager = explicitManager ?? localManager;

  return (
    <SpatialEntityStoreContext.Provider value={activeStore}>
      <OcclusionContext.Provider value={activeManager}>
        {children}
      </OcclusionContext.Provider>
    </SpatialEntityStoreContext.Provider>
  );
};
