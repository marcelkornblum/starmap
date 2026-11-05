import React, { useEffect, useCallback, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { type ThreeEvent } from '@react-three/fiber';
import {
  type ReferenceFrame,
  GALACTIC_FRAME,
  createCustomReferenceFrame,
  type FrameLightingConfig,
} from '../instrument/referenceFrame';
import { CartographicInstrument } from '../instrument/CartographicInstrument';
import { CameraRig } from '../instrument/CameraRig';
import { CartographicLighting } from '../instrument/CartographicLighting';
import { SpatialFrameProvider } from '../instrument/SpatialFrameProvider';
import { useCameraTransition } from '../instrument/useCameraTransition';
import {
  SpatialEntityProvider,
  ApertureEvaluator,
  useSpatialEntityStoreApi,
  useOptionalSpatialEntityStoreApi,
  CelestialEntity,
  OcclusionPass,
  type SpatialEntityDefinition,
  type SpatialEntityStore,
  createSpatialEntityStore,
  activateEntity,
  focusEntity,
  clearInteraction,
  occlusionCyclicTargetResolver,
  JourneyChord,
} from '../entity';
import type { JourneyChordLeg } from '../cartography';
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
  /** Callback on entity focus change */
  onFocusChange?: (id: string | null) => void;
  /** Outer spatial entity store to sync focus and selection states towards */
  outerStore?: SpatialEntityStore;
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
  /** Journey chord legs to render in the viewport */
  journeyLegs?: readonly JourneyChordLeg[];
  /** Active transit method ID for visual chord styling */
  activeJourneyMethod?: string;
}

/**
 * Inner viewport content with access to scoped SpatialEntityStore
 */
const SpatialViewportContent: React.FC<SpatialViewportProps> = ({
  entities = [],
  mode = 'explore',
  onInspect,
  onSelect,
  onFocusChange,
  outerStore,
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
  journeyLegs,
  activeJourneyMethod,
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

  // Synchronise outer store selectedIds inward to local spatial entity store.
  // This is programmatic (e.g. search results), so it must not be reported back out as a user
  // selection; otherwise onSelect rewrites the URL focus, which re-runs search and re-selects.
  const applyingOuterSelectionRef = useRef(false);
  useEffect(() => {
    if (!outerStore || outerStore === storeApi) return;
    const applyOuterSelection = (ids: ReadonlySet<string>): void => {
      applyingOuterSelectionRef.current = true;
      try {
        storeApi.getState().setSelectedIds(ids);
      } finally {
        applyingOuterSelectionRef.current = false;
      }
    };
    applyOuterSelection(outerStore.getState().selectedIds);

    return outerStore.subscribe((state, prevState) => {
      if (state.selectedIds !== prevState.selectedIds) {
        applyOuterSelection(state.selectedIds);
      }
    });
  }, [outerStore, storeApi]);

  // Synchronise outer store hoveredId inward to local spatial entity store
  const applyingOuterHoverRef = useRef(false);
  const applyingLocalHoverRef = useRef(false);

  useEffect(() => {
    if (!outerStore || outerStore === storeApi) return;
    const applyOuterHover = (hoveredId: string | null): void => {
      if (applyingLocalHoverRef.current) return;
      applyingOuterHoverRef.current = true;
      try {
        if (storeApi.getState().hoveredId !== hoveredId) {
          storeApi.getState().setHovered(hoveredId);
        }
      } finally {
        applyingOuterHoverRef.current = false;
      }
    };
    applyOuterHover(outerStore.getState().hoveredId);

    return outerStore.subscribe((state, prevState) => {
      if (state.hoveredId !== prevState.hoveredId) {
        applyOuterHover(state.hoveredId);
      }
    });
  }, [outerStore, storeApi]);

  // Initial outerStore aperture synchronization
  useEffect(() => {
    if (!outerStore || outerStore === storeApi) return;
    const initialLocal = storeApi.getState();
    if (initialLocal.apertureCenter || initialLocal.apertureRadius !== null) {
      outerStore.getState().setApertureFrame(initialLocal.apertureCenter, initialLocal.apertureRadius);
    }
    if (initialLocal.apertureIds.size > 0) {
      outerStore.getState().setApertureIds(initialLocal.apertureIds);
    }
  }, [outerStore, storeApi]);

  // Synchronise local store selection & focus changes outward to UI store, outer spatial store, and callbacks
  useEffect(() => {
    return storeApi.subscribe((state, prevState) => {
      if (state.hoveredId !== prevState.hoveredId && !applyingOuterHoverRef.current) {
        if (outerStore && outerStore !== storeApi) {
          applyingLocalHoverRef.current = true;
          try {
            if (outerStore.getState().hoveredId !== state.hoveredId) {
              outerStore.getState().setHovered(state.hoveredId);
            }
          } finally {
            applyingLocalHoverRef.current = false;
          }
        }
      }

      if (outerStore && outerStore !== storeApi) {
        if (
          state.apertureCenter !== prevState.apertureCenter ||
          state.apertureRadius !== prevState.apertureRadius
        ) {
          outerStore.getState().setApertureFrame(state.apertureCenter, state.apertureRadius);
        }
        if (state.apertureIds !== prevState.apertureIds) {
          outerStore.getState().setApertureIds(state.apertureIds);
        }
      }

      if (state.selectedId !== prevState.selectedId && !applyingOuterSelectionRef.current) {
        if (syncWithUIStore && useUIStore.getState().selectedNodeId !== state.selectedId) {
          useUIStore.getState().setSelectedNodeId(state.selectedId);
        }
        if (outerStore && outerStore !== storeApi) {
          if (state.selectedId) {
            const entity = state.entities[state.selectedId];
            if (entity && !outerStore.getState().entities[entity.id]) {
              outerStore.getState().registerEntity(entity);
            }
          }
          if (outerStore.getState().selectedId !== state.selectedId) {
            outerStore.getState().setSelected(state.selectedId);
          }
        }
        onSelect?.(state.selectedId);
      }

      if (state.focusedId !== prevState.focusedId) {
        if (outerStore && outerStore !== storeApi) {
          if (state.focusedId) {
            const entity = state.entities[state.focusedId];
            if (entity && !outerStore.getState().entities[entity.id]) {
              outerStore.getState().registerEntity(entity);
            }
          }
          if (outerStore.getState().focusedId !== state.focusedId) {
            outerStore.getState().setFocused(state.focusedId);
          }
        }
        onFocusChange?.(state.focusedId);
      }
    });
  }, [storeApi, outerStore, syncWithUIStore, onSelect, onFocusChange]);

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
      useUIStore.getState().setCenteredEntityId(id);
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

      {/* 3D Journey Chord visualization */}
      {journeyLegs && journeyLegs.length > 0 ? (
        <JourneyChord legs={journeyLegs} activeMethodId={activeJourneyMethod} />
      ) : null}

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
  const contextStore = useOptionalSpatialEntityStoreApi();
  const fallbackStore = useSpatialEntityStoreApi();
  const effectiveOuterStore = props.outerStore ?? contextStore ?? fallbackStore;
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
    // When an outer SpatialEntityContext store is already present and props.outerStore is not explicitly overriding it,
    // unify directly with the outer store to avoid redundant duplicate instances and echo loops.
    if (contextStore && !props.outerStore) {
      if (initialSelectedId && !contextStore.getState().selectedId) {
        contextStore.getState().setSelected(initialSelectedId);
      }
      return contextStore;
    }

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

    const initialSelectedIds = effectiveOuterStore
      ? Array.from(effectiveOuterStore.getState().selectedIds)
      : undefined;

    return createSpatialEntityStore({
      selectedId: initialSelectedId ?? null,
      selectedIds: initialSelectedIds,
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
        <SpatialViewportContent {...props} outerStore={effectiveOuterStore} />
      </SpatialEntityProvider>
    </SpatialFrameProvider>
  );
};
