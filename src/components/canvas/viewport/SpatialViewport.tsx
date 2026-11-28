import React, { useMemo } from 'react';
import * as THREE from 'three';
import { type ThreeEvent } from '@react-three/fiber';
import type { ReferenceFrame, FrameLightingConfig } from '../../../types/spatial';
import { GALACTIC_FRAME } from '../../../config/referenceFrames';
import { createCustomReferenceFrame } from '../instrument/referenceFrame';
import { SpatialFrameProvider } from '../instrument/SpatialFrameProvider';
import {
  SpatialEntityProvider,
  useOptionalSpatialEntityStoreApi,
  type SpatialEntityDefinition,
  type SpatialEntityStore,
  createSpatialEntityStore,
} from '../entity';
import type { JourneyChordLeg } from '../cartography';
import { useActiveStarsStore } from '../../../stores/useActiveStarsStore';
import { getApertureActiveCutoffForViewportWidth } from '../../../services/deviceTierService';
import { SpatialViewportContent } from './SpatialViewportContent';

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
  /** Minimum OrbitControls camera distance override */
  minCameraDistance?: number;
  /** Maximum OrbitControls camera distance override */
  maxCameraDistance?: number;
  /** Camera target focus point */
  cameraTarget?: [number, number, number] | THREE.Vector3;
  /** Whether to show the cartographic instrument (PlanarGrid, fins, bearings, rings) */
  showInstrument?: boolean;
  /** Whether to render planar footprints directly from the instrument. Defaults to false (entities own their stalks and footprints) */
  showPlanarFootprint?: boolean;
  /** Debug hit areas */
  debugHitarea?: boolean;
  /** Initial selected entity ID on mount */
  initialSelectedId?: string | null;
  /** Whether to smoothly transition the camera and centre the instrument when double-clicking an entity. Defaults to true */
  enableFocusTransition?: boolean;
  /** Transition duration in seconds for smooth camera centering. Defaults to 0.8 */
  focusTransitionDuration?: number;
  /** Double click callback on an entity */
  onDoubleClick?: (id: string, e: ThreeEvent<MouseEvent>) => void;
  /** Optional touch empty-canvas miss callback; return true to consume tap without clearing selection */
  onTouchPointerMissed?: () => boolean;
  /** Frame-driven cartographic lighting override or false to disable */
  lighting?: Partial<FrameLightingConfig> | false;
  /** Journey chord legs to render in the viewport */
  journeyLegs?: readonly JourneyChordLeg[];
  /** Active transit method ID for visual chord styling */
  activeJourneyMethod?: string;
}

/**
 * SpatialViewport: Canonical Composition Root for 3D Cartography Scenes.
 *
 * Sets up the scoped SpatialFrameProvider and SpatialEntityStore provider per viewport instance,
 * harmonises reference frames, and coordinates instrument primitives,
 * entity composites, and bespoke planetary bodies.
 */
const SpatialViewportComponent: React.FC<SpatialViewportProps> = (props) => {
  const contextStore = useOptionalSpatialEntityStoreApi();
  const effectiveOuterStore = props.outerStore ?? contextStore ?? undefined;
  const {
    frame = GALACTIC_FRAME,
    cameraDistance,
    minCameraDistance,
    maxCameraDistance,
    initialSelectedId,
  } = props;

  // Single source of the screen-constant reference distance for both instrument and entities.
  const resolvedFrame = useMemo(() => {
    const base = cameraDistance
      ? createCustomReferenceFrame(frame, {
          referenceDistanceMultiplier: cameraDistance / frame.radius,
        })
      : frame;
    if (minCameraDistance === undefined && maxCameraDistance === undefined) {
      return base;
    }
    return {
      ...base,
      camera: {
        ...base.camera,
        ...(minCameraDistance !== undefined ? { minDistance: minCameraDistance } : {}),
        ...(maxCameraDistance !== undefined ? { maxDistance: maxCameraDistance } : {}),
      },
    };
  }, [frame, cameraDistance, minCameraDistance, maxCameraDistance]);

  const [scopedStore] = React.useState(() => {
    const focusPoint = props.cameraTarget
      ? (props.cameraTarget instanceof THREE.Vector3
          ? props.cameraTarget
          : new THREE.Vector3(props.cameraTarget[0], props.cameraTarget[1], props.cameraTarget[2]))
      : new THREE.Vector3(0, 0, 0);
    const apertureRadius = resolvedFrame.radius;
    const rSq = apertureRadius * apertureRadius;
    const initialAperture = new Set<string>();

    const { summaries, isHydrated } = useActiveStarsStore.getState();
    if (props.entities && isHydrated && summaries.length <= getApertureActiveCutoffForViewportWidth()) {
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

export const SpatialViewport: React.FC<SpatialViewportProps> = React.memo(SpatialViewportComponent);
SpatialViewport.displayName = 'SpatialViewport';
