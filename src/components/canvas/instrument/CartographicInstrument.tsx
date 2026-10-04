import React from 'react';
import * as THREE from 'three';
import {
  type ReferenceFrame,
  GALACTIC_FRAME,
  createCustomReferenceFrame,
} from './referenceFrame';
import { SpatialFrameProvider } from './SpatialFrameProvider';
import { PlanarGrid, type PlanarFootprintItem } from './PlanarGrid';
import { CoordinateFins } from './CoordinateFins';
import { BearingVectors } from './BearingVectors';
import { ScreenEdgeIndicators } from './ScreenEdgeIndicators';
import { CameraRig } from './CameraRig';
import { type CelestialClassification } from '../cartography/reticleGeometry';

export interface CartographicInstrumentProps {
  /** The reference frame driving instrument configuration. Defaults to GALACTIC_FRAME. */
  frame?: ReferenceFrame;
  /** Explicit radius override */
  radius?: number;
  /** Explicit fixed range rings override */
  rangeRings?: number[];
  /** Designated major ring index */
  majorRingIndex?: number;
  /** Whether to render travelling coordinate fins */
  showFins?: boolean;
  /** Whether to render datum plane (Galactic Equator) */
  showGalacticPlane?: boolean;
  /** Deprecated alias for showGalacticPlane */
  showFullDatumCircle?: boolean;
  /** Whether to render planar footprints on datum */
  showPlanarFootprint?: boolean;
  /** Footprint classification */
  footprintClassification?: CelestialClassification;
  /** Footprint size */
  footprintSize?: number;
  /** Explicit external footprints */
  footprints?: PlanarFootprintItem[];
  /** Whether to render the planar grid */
  showPlanarGrid?: boolean;
  /** Spacing of planar grid */
  planarGridGap?: number;
  /** Whether to render axis lines/spokes */
  showAxisLines?: boolean;
  /** Whether to render screen-edge bearing indicators */
  showScreenEdgeIndicators?: boolean;
  /** Whether to enable adaptive perspective-to-orthographic projection switching */
  adaptiveProjection?: boolean;
  /** Whether the instrument maintains screen-constant footprint */
  screenConstant?: boolean;
  /** Reference camera distance multiplier */
  referenceDistance?: number;
  /** Angular threshold where cardinal transition begins */
  thresholdStart?: number;
  /** Angular threshold where cardinal transition completes */
  thresholdEnd?: number;
  /** Whether the instrument locks its origin to the camera focus point */
  lockToFocusPoint?: boolean;
  /** Manual position offset */
  position?: [number, number, number] | THREE.Vector3;
  /** Explicit focus target to lock origin to */
  focusTarget?: THREE.Vector3 | React.RefObject<THREE.Vector3 | THREE.Object3D | null>;
  children?: React.ReactNode;
}

export const CartographicInstrument: React.FC<CartographicInstrumentProps> = ({
  frame = GALACTIC_FRAME,
  radius,
  rangeRings,
  majorRingIndex,
  showFins,
  showGalacticPlane,
  showFullDatumCircle,
  showPlanarFootprint,
  footprintClassification,
  footprintSize,
  footprints,
  showPlanarGrid,
  planarGridGap,
  showAxisLines = true,
  showScreenEdgeIndicators = true,
  adaptiveProjection,
  screenConstant,
  referenceDistance,
  thresholdStart,
  thresholdEnd,
  lockToFocusPoint = true,
  position,
  focusTarget,
  children,
}) => {
  // Resolve datum plane visibility from both showGalacticPlane and deprecated showFullDatumCircle
  const resolvedShowDatum = showGalacticPlane ?? showFullDatumCircle;

  // Build configured reference frame applying any top-level prop overrides
  const resolvedFrame = React.useMemo(() => {
    return createCustomReferenceFrame(frame, {
      radius: radius ?? frame.radius,
      screenConstant: screenConstant ?? (rangeRings ? false : frame.screenConstant),
      referenceDistanceMultiplier: referenceDistance
        ? referenceDistance / (radius ?? frame.radius)
        : frame.referenceDistanceMultiplier,
      camera: {
        ...frame.camera,
        adaptiveProjection: adaptiveProjection ?? frame.camera.adaptiveProjection,
        thresholdStart: thresholdStart ?? frame.camera.thresholdStart,
        thresholdEnd: thresholdEnd ?? frame.camera.thresholdEnd,
      },
      datumPlane: {
        ...frame.datumPlane,
        enabled: resolvedShowDatum ?? frame.datumPlane.enabled,
        planarGrid: showPlanarGrid ?? frame.datumPlane.planarGrid,
        planarGridGap: planarGridGap ?? frame.datumPlane.planarGridGap,
        footprints: showPlanarFootprint ?? frame.datumPlane.footprints,
      },
      coordinateFins: {
        ...frame.coordinateFins,
        enabled: showFins ?? frame.coordinateFins.enabled,
      },
      rangeRings: {
        ...frame.rangeRings,
        fixedRings: rangeRings ?? frame.rangeRings.fixedRings,
        majorRingIndex: majorRingIndex ?? frame.rangeRings.majorRingIndex,
      },
    });
  }, [
    frame,
    radius,
    screenConstant,
    rangeRings,
    referenceDistance,
    adaptiveProjection,
    thresholdStart,
    thresholdEnd,
    resolvedShowDatum,
    showPlanarGrid,
    planarGridGap,
    showPlanarFootprint,
    showFins,
    majorRingIndex,
  ]);

  // Resolve focus point
  const resolvedFocusPoint = React.useMemo(() => {
    if (focusTarget) {
      if ('current' in focusTarget && focusTarget.current) {
        const val = focusTarget.current;
        return 'position' in val ? val.position : val;
      }
      if (focusTarget instanceof THREE.Vector3) {
        return focusTarget;
      }
    }
    return position;
  }, [focusTarget, position]);

  return (
    <SpatialFrameProvider
      frame={resolvedFrame}
      focusPoint={resolvedFocusPoint}
      lockToFocusPoint={lockToFocusPoint}
    >
      <group position={position} name="cartographic-grid">
        {/* Camera Rig (Frustum, Reference FOV, Ortho Blending) */}
        <CameraRig />

        {/* Datum Floor, Planar Grid & Datum Range Rings */}
        <PlanarGrid
          showPlanarGrid={showPlanarGrid ?? resolvedFrame.datumPlane.planarGrid}
          planarGridGap={planarGridGap ?? resolvedFrame.datumPlane.planarGridGap}
          rings={rangeRings}
          majorRingIndex={majorRingIndex}
          showPlanarFootprint={showPlanarFootprint ?? resolvedFrame.datumPlane.footprints}
          footprintClassification={footprintClassification}
          footprintSize={footprintSize}
          footprints={footprints}
          galacticCenterDistance={resolvedFrame.centerDistance ?? 2000}
        />

        {/* Three Mobile Orthogonal Travelling Fins with 360° Polar Dial Expansion */}
        <CoordinateFins rings={rangeRings} majorRingIndex={majorRingIndex} />

        {/* Bearing Vectors & Spoke Lines */}
        {showAxisLines && (showFins ?? resolvedFrame.coordinateFins.enabled) && (
          <BearingVectors
            showAxisLines={showAxisLines}
            rGc={resolvedFrame.centerDistance ?? 2000}
            extent={resolvedFrame.extent ?? 1200}
          />
        )}

        {/* Detachable Screen-Edge Heading Cues */}
        {showAxisLines && showScreenEdgeIndicators && (showFins ?? resolvedFrame.coordinateFins.enabled) && (
          <ScreenEdgeIndicators
            rGc={resolvedFrame.centerDistance ?? 2000}
            extent={resolvedFrame.extent ?? 1200}
          />
        )}

        {children}
      </group>
    </SpatialFrameProvider>
  );
};
