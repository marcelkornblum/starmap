import React from 'react';
import { useSpatialFrame } from './SpatialFrameProvider';
import { PlanarGrid, type PlanarFootprintItem } from './PlanarGrid';
import { CoordinateFins } from './CoordinateFins';
import { BearingVectors } from './BearingVectors';
import { ScreenEdgeIndicators } from './ScreenEdgeIndicators';
import { type CelestialClassification } from '../cartography/reticleGeometry';

export interface CartographicInstrumentProps {
  /** Explicit fixed range rings override */
  rangeRings?: number[];
  /** Designated major ring index */
  majorRingIndex?: number;
  /** Whether to render travelling coordinate fins */
  showFins?: boolean;
  /** Whether to render datum plane */
  showDatumPlane?: boolean;
  /** @deprecated Use showDatumPlane instead */
  showGalacticPlane?: boolean;
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
  children?: React.ReactNode;
}

/**
 * CartographicInstrument: composition of instrument primitives.
 *
 * A pure consumer of the enclosing `SpatialFrameProvider` (mounted once per viewport by
 * `SpatialViewport`). It never creates its own provider, so the instrument and entities
 * always share one frame state, one focus point and one aperture.
 */
export const CartographicInstrument: React.FC<CartographicInstrumentProps> = ({
  rangeRings,
  majorRingIndex,
  showFins,
  showDatumPlane,
  showGalacticPlane,
  showPlanarFootprint = false,
  footprintClassification,
  footprintSize,
  footprints,
  showPlanarGrid,
  planarGridGap,
  showAxisLines = true,
  showScreenEdgeIndicators = true,
  children,
}) => {
  const { frame } = useSpatialFrame();
  const finsEnabled = showFins ?? frame.coordinateFins.enabled;
  const isPlaneEnabled = showDatumPlane ?? showGalacticPlane;
  const centerDistance = frame.centerDistance ?? 2000;
  const extent = frame.extent ?? 1200;

  return (
    <group name="cartographic-grid">
      {/* Datum Floor, Planar Grid & Datum Range Rings */}
      <PlanarGrid
        enabled={isPlaneEnabled}
        showPlanarGrid={showPlanarGrid}
        planarGridGap={planarGridGap}
        rings={rangeRings}
        majorRingIndex={majorRingIndex}
        showPlanarFootprint={showPlanarFootprint}
        footprintClassification={footprintClassification}
        footprintSize={footprintSize}
        footprints={footprints}
        centerDistance={centerDistance}
        galacticCenterDistance={centerDistance}
      />

      {/* Three Mobile Orthogonal Travelling Fins with 360° Polar Dial Expansion */}
      <CoordinateFins enabled={showFins} rings={rangeRings} majorRingIndex={majorRingIndex} />

      {/* Bearing Vectors & Spoke Lines */}
      {showAxisLines && finsEnabled && (
        <BearingVectors
          showAxisLines={showAxisLines}
          centerDistance={centerDistance}
          rGc={centerDistance}
          extent={extent}
        />
      )}

      {/* Detachable Screen-Edge Heading Cues */}
      {showAxisLines && showScreenEdgeIndicators && finsEnabled && (
        <ScreenEdgeIndicators
          centerDistance={centerDistance}
          rGc={centerDistance}
          extent={extent}
        />
      )}

      {children}
    </group>
  );
};
