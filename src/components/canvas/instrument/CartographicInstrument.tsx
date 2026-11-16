import React from 'react';
import * as THREE from 'three';
import { useSpatialFrame } from './spatialFrameContext';
import { PlanarGrid, type PlanarFootprintItem } from './PlanarGrid';
import { CoordinateFins } from './CoordinateFins';
import { BearingVectors } from './BearingVectors';
import { ScreenEdgeIndicators } from './ScreenEdgeIndicators';
import { CartoHairlineMaterial } from '../materials/CartoLineMaterial';
import { NOOP_RAYCAST } from '../engineConfig';
import { type CelestialClassification } from '../../../types/spatial';
import {
  DEFAULT_GALACTIC_CENTER_DISTANCE_PC,
  DEFAULT_INSTRUMENT_EXTENT,
} from './instrumentDefaults';

const WARMUP_HAIRLINE_GEOMETRY = (() => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  g.setAttribute('lineDistance', new THREE.BufferAttribute(new Float32Array(2), 1));
  g.computeBoundingSphere();
  return g;
})();

const WARMUP_HAIRLINE_MATERIAL = new CartoHairlineMaterial({
  opacity: 0,
  transparent: true,
  depthWrite: false,
});

const WARMUP_DASHED_HAIRLINE_MATERIAL = new CartoHairlineMaterial({
  opacity: 0,
  lineStyle: 'dashed',
  transparent: true,
  depthWrite: false,
});

const WARMUP_LINE_BASIC_MATERIAL = new THREE.LineBasicMaterial({
  opacity: 0,
  transparent: true,
  depthWrite: false,
});

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
export const CartographicInstrument: React.FC<CartographicInstrumentProps> = React.memo(({
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
  const centerDistance = frame.centerDistance ?? DEFAULT_GALACTIC_CENTER_DISTANCE_PC;
  const extent = frame.extent ?? DEFAULT_INSTRUMENT_EXTENT;

  return (
    <group name="cartographic-grid">
      <lineSegments
        name="hairline-shader-warmup"
        geometry={WARMUP_HAIRLINE_GEOMETRY}
        material={WARMUP_HAIRLINE_MATERIAL}
        frustumCulled={false}
        raycast={NOOP_RAYCAST}
      />
      <lineSegments
        name="dashed-hairline-shader-warmup"
        geometry={WARMUP_HAIRLINE_GEOMETRY}
        material={WARMUP_DASHED_HAIRLINE_MATERIAL}
        frustumCulled={false}
        raycast={NOOP_RAYCAST}
      />
      <lineSegments
        name="line-basic-shader-warmup"
        geometry={WARMUP_HAIRLINE_GEOMETRY}
        material={WARMUP_LINE_BASIC_MATERIAL}
        frustumCulled={false}
        raycast={NOOP_RAYCAST}
      />

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
});
