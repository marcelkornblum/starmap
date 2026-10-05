import React, { useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { type ThreeEvent } from '@react-three/fiber';
import {
  type ReferenceFrame,
  GALACTIC_FRAME,
} from './instrument/referenceFrame';
import { CartographicInstrument } from './instrument/CartographicInstrument';
import { SpatialFrameProvider } from './instrument/SpatialFrameProvider';
import { useCameraTransition } from './instrument/useCameraTransition';
import {
  SpatialEntityProvider,
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
  /** Whether to render planar footprints directly from the instrument. Defaults to false (entities own their stalks and footprints) */
  showPlanarFootprint?: boolean;
  /** Debug hit areas */
  debugHitarea?: boolean;
  /** Sync selection bidirectionally with useUIStore */
  syncWithUIStore?: boolean;
  /** Initial selected entity ID on mount */
  initialSelectedId?: string | null;
  /** Whether to smoothly transition the camera and centre the instrument when double-clicking an entity. Defaults to true */
  enableFocusTransition?: boolean;
  /** Transition duration in seconds for smooth camera centering. Defaults to 0.8 */
  focusTransitionDuration?: number;
  /** Double click callback on an entity */
  onDoubleClick?: (id: string, e: ThreeEvent<MouseEvent>) => void;
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
  showPlanarFootprint = false,
  debugHitarea = false,
  syncWithUIStore = true,
  initialSelectedId,
  enableFocusTransition = true,
  focusTransitionDuration = 0.8,
  onDoubleClick,
}) => {
  const storeApi = useSpatialEntityStoreApi();
  const globalSelectedId = useUIStore((s) => s.selectedNodeId);
  const { transitionTo } = useCameraTransition();

  // Initialize selection on mount if initialSelectedId is provided
  useEffect(() => {
    if (initialSelectedId) {
      storeApi.getState().setSelected(initialSelectedId);
    }
  }, [initialSelectedId, storeApi]);

  // Synchronise external UI store selection inwards to spatial entity store
  useEffect(() => {
    if (!syncWithUIStore) return;
    const current = storeApi.getState().selectedId;
    if (globalSelectedId !== current) {
      storeApi.getState().setSelected(globalSelectedId);
    }
  }, [globalSelectedId, syncWithUIStore, storeApi]);

  // Synchronise local store selection changes outward to UI store and callbacks
  useEffect(() => {
    return storeApi.subscribe((state, prevState) => {
      if (state.selectedId !== prevState.selectedId) {
        if (syncWithUIStore && useUIStore.getState().selectedNodeId !== state.selectedId) {
          useUIStore.getState().setSelectedNodeId(state.selectedId);
        }
        onSelect?.(state.selectedId);
      }
    });
  }, [storeApi, syncWithUIStore, onSelect]);

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

  // Handle entity double-clicks (smooth camera transition centering instrument, elevates to focused tier)
  const handleEntityDoubleClick = useCallback(
    (id: string, e: ThreeEvent<MouseEvent>) => {
      const entity = storeApi.getState().entities[id];
      if (entity?.position && enableFocusTransition) {
        transitionTo(entity.position, { duration: focusTransitionDuration });
      }

      storeApi.getState().setSelected(id);
      if (storeApi.getState().focusedId !== id) {
        storeApi.getState().setFocused(id);
      }

      onInspect?.(id);
      onDoubleClick?.(id, e);
    },
    [
      storeApi,
      enableFocusTransition,
      focusTransitionDuration,
      transitionTo,
      onInspect,
      onDoubleClick,
    ],
  );

  return (
    <group
      name="spatial-viewport"
      data-mode={mode}
      onPointerMissed={() => {
        storeApi.getState().setSelected(null);
        if (storeApi.getState().focusedId !== null) {
          storeApi.getState().setFocused(null);
        }
      }}
    >
      {/* Dynamic O(n) screen-space occlusion pass */}
      <OcclusionPass enabled={true} />

      {/* Cartographic Instrument Primitives */}
      {showInstrument && (
        <CartographicInstrument
          frame={frame}
          referenceDistance={cameraDistance}
          position={cameraTarget}
          showPlanarFootprint={showPlanarFootprint}
        />
      )}

      {/* Decomposed Celestial Entities */}
      {entities.map((entity) => (
        <CelestialEntity
          key={entity.id}
          {...entity}
          debugHitarea={debugHitarea}
          onClick={handleEntityClick}
          onDoubleClick={handleEntityDoubleClick}
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
 * Sets up the scoped SpatialFrameProvider and SpatialEntityStore provider per viewport instance,
 * harmonises reference frames, and coordinates instrument primitives,
 * entity composites, and bespoke planetary bodies.
 */
export const SpatialViewport: React.FC<SpatialViewportProps> = (props) => {
  return (
    <SpatialFrameProvider
      frame={props.frame}
      focusPoint={props.cameraTarget}
      lockToFocusPoint={true}
    >
      <SpatialEntityProvider>
        <SpatialViewportContent {...props} />
      </SpatialEntityProvider>
    </SpatialFrameProvider>
  );
};
