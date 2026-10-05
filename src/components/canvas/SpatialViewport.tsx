import React, { useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { type ThreeEvent } from '@react-three/fiber';
import {
  type ReferenceFrame,
  GALACTIC_FRAME,
} from './instrument/referenceFrame';
import { CartographicInstrument } from './instrument/CartographicInstrument';
import {
  SpatialEntityProvider,
  useSpatialEntityStore,
  useSpatialEntityStoreApi,
} from './entity/SpatialEntityContext';
import { CelestialEntity } from './entity/CelestialEntity';
import { OcclusionPass } from './entity/OcclusionPass';
import { type SpatialEntityDefinition } from './entity/SpatialEntityStore';
import { useUIStore } from '../../stores/useUIStore';

export interface SpatialViewportProps {
  /** The reference frame driving spatial instrument metrics and scale. Defaults to GALACTIC_FRAME */
  frame?: ReferenceFrame;
  /** List of celestial entities to render in the scene */
  entities?: SpatialEntityDefinition[];
  /** Mode: 'explore' | 'focus' | 'route' | 'filter' */
  mode?: 'explore' | 'focus' | 'route' | 'filter';
  /** Primary inspect callback (e.g. double click or inspect action) */
  onInspect?: (id: string) => void;
  /** Callback on entity selection change */
  onSelect?: (id: string | null) => void;
  /** Optional custom children (e.g. PlanetBody, custom routes, bespoke layers) */
  children?: React.ReactNode;
  /** Camera distance override */
  cameraDistance?: number;
  /** Camera target focus point */
  cameraTarget?: [number, number, number] | THREE.Vector3;
  /** Whether to show the cartographic instrument (PlanarGrid, fins, bearings, rings) */
  showInstrument?: boolean;
  /** Debug hit areas */
  debugHitarea?: boolean;
  /** Sync selection bidirectionally with useUIStore */
  syncWithUIStore?: boolean;
}

/**
 * Inner viewport content with access to scoped SpatialEntityStore
 */
const SpatialViewportContent: React.FC<SpatialViewportProps> = ({
  frame = GALACTIC_FRAME,
  entities = [],
  mode = 'explore',
  onInspect,
  onSelect,
  children,
  cameraDistance,
  cameraTarget,
  showInstrument = true,
  debugHitarea = false,
  syncWithUIStore = true,
}) => {
  const storeApi = useSpatialEntityStoreApi();
  const selectedEntityId = useSpatialEntityStore((s) => s.selectedId);
  const globalSelectedId = useUIStore((s) => s.selectedNodeId);
  const setGlobalSelectedId = useUIStore((s) => s.setSelectedNodeId);

  // Synchronise local store selection to UI store and callbacks
  useEffect(() => {
    if (!syncWithUIStore) return;
    if (selectedEntityId !== globalSelectedId) {
      setGlobalSelectedId(selectedEntityId);
    }
    onSelect?.(selectedEntityId);
  }, [selectedEntityId, globalSelectedId, syncWithUIStore, setGlobalSelectedId, onSelect]);

  // Synchronise external UI store selection inwards to spatial entity store
  useEffect(() => {
    if (!syncWithUIStore) return;
    const current = storeApi.getState().selectedId;
    if (globalSelectedId !== current) {
      storeApi.getState().setSelected(globalSelectedId);
    }
  }, [globalSelectedId, syncWithUIStore, storeApi]);

  // Handle entity clicks (single click selects; clicking already-selected inspects)
  const handleEntityClick = useCallback(
    (id: string, _e: ThreeEvent<MouseEvent>) => {
      const currentSelected = storeApi.getState().selectedId;
      if (currentSelected === id && onInspect) {
        onInspect(id);
      } else {
        storeApi.getState().setSelected(id);
      }
    },
    [storeApi, onInspect],
  );

  return (
    <group name="spatial-viewport" data-mode={mode}>
      {/* Dynamic O(n) screen-space occlusion pass */}
      <OcclusionPass enabled={true} />

      {/* Cartographic Instrument Primitives */}
      {showInstrument && (
        <CartographicInstrument
          frame={frame}
          referenceDistance={cameraDistance}
          position={cameraTarget}
        />
      )}

      {/* Decomposed Celestial Entities */}
      {entities.map((entity) => (
        <CelestialEntity
          key={entity.id}
          {...entity}
          debugHitarea={debugHitarea}
          onClick={handleEntityClick}
        />
      ))}

      {/* Custom bespoke visuals (e.g. PlanetBody, route corridors) */}
      {children}
    </group>
  );
};

/**
 * SpatialViewport: Canonical Composition Root for 3D Cartography Scenes.
 * 
 * Sets up the scoped SpatialEntityStore provider per viewport instance,
 * harmonises reference frames, and coordinates instrument primitives,
 * entity composites, and bespoke planetary bodies.
 */
export const SpatialViewport: React.FC<SpatialViewportProps> = (props) => {
  return (
    <SpatialEntityProvider>
      <SpatialViewportContent {...props} />
    </SpatialEntityProvider>
  );
};
