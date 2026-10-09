import React, { useEffect, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { type ThreeEvent } from '@react-three/fiber';
import {
  type ReferenceFrame,
  GALACTIC_FRAME,
  createCustomReferenceFrame,
  type FrameLightingConfig,
} from '../../canvas/instrument/referenceFrame';
import { CartographicInstrument } from '../../canvas/instrument/CartographicInstrument';
import { CameraRig } from '../../canvas/instrument/CameraRig';
import { CartographicLighting } from '../../canvas/instrument/CartographicLighting';
import { SpatialFrameProvider } from '../../canvas/instrument/SpatialFrameProvider';
import { useCameraTransition } from '../../canvas/instrument/useCameraTransition';
import {
  SpatialEntityProvider,
  ApertureEvaluator,
  useSpatialEntityStoreApi,
  CelestialEntity,
  OcclusionPass,
  type SpatialEntityDefinition,
  createSpatialEntityStore,
  activateEntity,
  focusEntity,
  clearInteraction,
  occlusionCyclicTargetResolver,
} from '../../canvas/entity';
import { useUIStore } from '../../../stores/useUIStore';

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
  /** Reference camera distance at which the instrument aperture equals the frame radius (screen-constant footprint calibration) */
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
  /** Frame-driven cartographic lighting override or false to disable */
  lighting?: Partial<FrameLightingConfig> | false;
}

/**
 * Inner viewport content with access to scoped SpatialEntityStore
 */
const SpatialViewportContent: React.FC<SpatialViewportProps> = ({
  entities = [],
  mode = 'explore',
  onInspect,
  onSelect,
  children,
  showInstrument = true,
  showPlanarFootprint = false,
  debugHitarea = false,
  syncWithUIStore = true,
  initialSelectedId,
  enableFocusTransition = true,
  focusTransitionDuration = 0.8,
  onDoubleClick,
  lighting,
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

  // Single click: select, or advance cyclic selection when re-clicking the selected entity
  const handleEntityClick = useCallback(
    (id: string) => {
      activateEntity(storeApi, id, occlusionCyclicTargetResolver);
    },
    [storeApi],
  );

  // Double click: centre the instrument, focus the entity, and inspect (the single inspect gesture)
  const handleEntityDoubleClick = useCallback(
    (id: string, e: ThreeEvent<MouseEvent>) => {
      const entity = storeApi.getState().entities[id];
      if (entity?.position && enableFocusTransition) {
        transitionTo(entity.position, { duration: focusTransitionDuration });
      }

      focusEntity(storeApi, id);
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
      onPointerMissed={() => clearInteraction(storeApi)}
    >
      {/* Dynamic O(n) screen-space occlusion pass */}
      <OcclusionPass enabled={true} />
      <ApertureEvaluator />

      {/* Frame-driven camera rig and lighting */}
      <CameraRig />
      {lighting !== false && (
        <CartographicLighting
          lightingOverride={typeof lighting === 'object' ? lighting : undefined}
        />
      )}

      {/* Cartographic Instrument Primitives (consume the viewport's single SpatialFrameProvider) */}
      {showInstrument && <CartographicInstrument showPlanarFootprint={showPlanarFootprint} />}

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
  const { frame = GALACTIC_FRAME, cameraDistance, initialSelectedId } = props;

  // Single source of the screen-constant reference distance for both instrument and entities.
  // Preserves the instrument footprint previously derived from `cameraDistance`.
  const resolvedFrame = useMemo(
    () =>
      cameraDistance
        ? createCustomReferenceFrame(frame, {
            referenceDistanceMultiplier: cameraDistance / frame.radius,
          })
        : frame,
    [frame, cameraDistance],
  );

  const [scopedStore] = React.useState(() => {
    const focusPoint = props.cameraTarget
      ? (props.cameraTarget instanceof THREE.Vector3
          ? props.cameraTarget
          : new THREE.Vector3(props.cameraTarget[0], props.cameraTarget[1], props.cameraTarget[2]))
      : new THREE.Vector3(0, 0, 0);
    const apertureRadius = resolvedFrame.radius;
    const rSq = apertureRadius * apertureRadius;
    const initialAperture = new Set<string>();

    if (props.entities) {
      for (const e of props.entities) {
        const p = e.position;
        const x = p instanceof THREE.Vector3 ? p.x : p[0];
        const y = p instanceof THREE.Vector3 ? p.y : p[1];
        const z = p instanceof THREE.Vector3 ? p.z : p[2];
        const dx = x - focusPoint.x;
        const dy = y - focusPoint.y;
        const dz = z - focusPoint.z;
        if (dx * dx + dy * dy + dz * dz <= rSq) {
          initialAperture.add(e.id);
        }
      }
    }

    return createSpatialEntityStore({
      selectedId: initialSelectedId ?? null,
      apertureIds: initialAperture,
    });
  });

  return (
    <SpatialFrameProvider
      frame={resolvedFrame}
      focusPoint={props.cameraTarget}
      lockToFocusPoint={true}
    >
      <SpatialEntityProvider store={scopedStore}>
        <SpatialViewportContent {...props} />
      </SpatialEntityProvider>
    </SpatialFrameProvider>
  );
};
