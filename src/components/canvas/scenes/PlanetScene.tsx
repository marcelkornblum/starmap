import React, { useMemo } from 'react';
import { SpatialViewport } from '../viewport/SpatialViewport';
import { PLANETARY_FRAME } from '../../../config/referenceFrames';
import { STANDARD_CAMERA_DISTANCES } from '../cartography/cartographyCamera';
import { PlanetBody } from '../entity/PlanetBody';
import type { SpatialEntityDefinition } from '../entity';
import type { CelestialClassification } from '../../../types/spatial';
import type { ExoplanetRecord } from '../../../types/astro';
import { EARTH_REFERENCE_TARGET } from '../../../config/referenceTargets';
import { resolveTargetCoordsFromEntities } from './planetaryEntityResolver';
import { useResolvedPlanetaryEntitiesAndTarget } from './sceneTargetHelpers';

export interface PlanetSceneProps {
  planetId?: string;
  planetName?: string;
  classification?: CelestialClassification;
  radius?: number;
  minPixelSize?: number;
  fadeRange?: number;
  planet?: ExoplanetRecord;
  satellites?: SpatialEntityDefinition[];
  resolvedEntities?: SpatialEntityDefinition[];
  centerId?: string;
  centerCoordinates?: readonly [number, number, number] | [number, number, number];
  onInspectSatellite?: (satelliteId: string) => void;
  onSelectEntity?: (entityId: string | null) => void;
  debugHitarea?: boolean;
}

interface PlanetSceneViewportProps {
  readonly resolvedName: string;
  readonly allEntities: SpatialEntityDefinition[];
  readonly targetCoords: [number, number, number];
  readonly classification: CelestialClassification;
  readonly radius: number;
  readonly minPixelSize: number;
  readonly fadeRange: number;
  readonly onInspectSatellite?: (satelliteId: string) => void;
  readonly onSelectEntity?: (entityId: string | null) => void;
  readonly debugHitarea: boolean;
}

const PlanetSceneViewport: React.FC<PlanetSceneViewportProps> = ({
  resolvedName,
  allEntities,
  targetCoords,
  classification,
  radius,
  minPixelSize,
  fadeRange,
  onInspectSatellite,
  onSelectEntity,
  debugHitarea,
}) => (
  <SpatialViewport
    frame={PLANETARY_FRAME}
    entities={allEntities}
    cameraDistance={STANDARD_CAMERA_DISTANCES.planetary}
    cameraTarget={targetCoords}
    onInspect={onInspectSatellite}
    onSelect={onSelectEntity}
    onFocusChange={onSelectEntity}
    debugHitarea={debugHitarea}
  >
    <PlanetBody
      name={resolvedName}
      classification={classification}
      radius={radius}
      minPixelSize={minPixelSize}
      fadeRange={fadeRange}
      hasAtmosphere={classification === 'terrestrial' || classification === 'gas-giant'}
    />
  </SpatialViewport>
);

const PlanetSceneFromLookup: React.FC<PlanetSceneProps> = ({
  planetId = EARTH_REFERENCE_TARGET.id,
  planetName,
  classification,
  radius = 1.0,
  minPixelSize = 24,
  fadeRange = 16,
  planet,
  satellites: explicitSatellites,
  centerId,
  centerCoordinates,
  onInspectSatellite,
  onSelectEntity,
  debugHitarea = false,
}) => {
  const { resolvedName, resolvedClassification, allEntities, targetCoords } =
    useResolvedPlanetaryEntitiesAndTarget({
      planetId,
      planetName,
      classification,
      radius,
      minPixelSize,
      fadeRange,
      planet,
      explicitSatellites,
      centerId,
      centerCoordinates,
    });

  return (
    <PlanetSceneViewport
      resolvedName={resolvedName}
      allEntities={allEntities}
      targetCoords={targetCoords}
      classification={resolvedClassification}
      radius={radius}
      minPixelSize={minPixelSize}
      fadeRange={fadeRange}
      onInspectSatellite={onInspectSatellite}
      onSelectEntity={onSelectEntity}
      debugHitarea={debugHitarea}
    />
  );
};

const PlanetSceneWithEntities: React.FC<
  PlanetSceneProps & { readonly resolvedEntities: SpatialEntityDefinition[] }
> = ({
  planetId = EARTH_REFERENCE_TARGET.id,
  planetName,
  classification,
  radius = 1.0,
  minPixelSize = 24,
  fadeRange = 16,
  resolvedEntities,
  centerId,
  centerCoordinates,
  onInspectSatellite,
  onSelectEntity,
  debugHitarea = false,
}) => {
  const { resolvedName, resolvedClassification, targetCoords } = useMemo(
    () => ({
      resolvedName: planetName ?? (planetId.charAt(0).toUpperCase() + planetId.slice(1)),
      resolvedClassification:
        classification ??
        resolvedEntities.find((e) => e.id === planetId)?.classification ??
        'terrestrial',
      targetCoords: resolveTargetCoordsFromEntities(
        resolvedEntities,
        centerId,
        centerCoordinates,
      ),
    }),
    [planetName, planetId, classification, resolvedEntities, centerId, centerCoordinates],
  );

  return (
    <PlanetSceneViewport
      resolvedName={resolvedName}
      allEntities={resolvedEntities}
      targetCoords={targetCoords}
      classification={resolvedClassification}
      radius={radius}
      minPixelSize={minPixelSize}
      fadeRange={fadeRange}
      onInspectSatellite={onInspectSatellite}
      onSelectEntity={onSelectEntity}
      debugHitarea={debugHitarea}
    />
  );
};

/**
 * PlanetScene: Canonical production scene for planetary body inspection.
 * Renders the physical uniform-lit PlanetBody alongside Keplerian natural/artificial satellites in PLANETARY_FRAME.
 * Seamlessly cross-fades the 3D globe into an invariant cartographic node with reticle when zooming out.
 */
export const PlanetScene: React.FC<PlanetSceneProps> = React.memo((props) => {
  if (props.resolvedEntities) {
    return <PlanetSceneWithEntities {...props} resolvedEntities={props.resolvedEntities} />;
  }
  return <PlanetSceneFromLookup {...props} />;
});
