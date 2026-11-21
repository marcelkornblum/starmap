import React, { useMemo } from 'react';
import { SpatialViewport } from '../viewport/SpatialViewport';
import { PLANETARY_FRAME } from '../../../config/referenceFrames';
import { STANDARD_CAMERA_DISTANCES } from '../cartography/cartographyCamera';
import { PlanetBody } from '../entity/PlanetBody';
import type { SpatialEntityDefinition } from '../entity';
import type { CelestialClassification } from '../../../types/spatial';
import type { ExoplanetRecord } from '../../../types/astro';
import { EARTH_REFERENCE_TARGET } from '../../../config/referenceTargets';
import { resolvePlanetaryEntitiesAndTarget } from './sceneTargetHelpers';

export interface PlanetSceneProps {
  planetId?: string;
  planetName?: string;
  classification?: CelestialClassification;
  radius?: number;
  minPixelSize?: number;
  fadeRange?: number;
  planet?: ExoplanetRecord;
  satellites?: SpatialEntityDefinition[];
  centerId?: string;
  centerCoordinates?: readonly [number, number, number] | [number, number, number];
  onInspectSatellite?: (satelliteId: string) => void;
  onSelectEntity?: (entityId: string | null) => void;
  debugHitarea?: boolean;
}

/**
 * PlanetScene: Canonical production scene for planetary body inspection.
 * Renders the physical uniform-lit PlanetBody alongside Keplerian natural/artificial satellites in PLANETARY_FRAME.
 * Seamlessly cross-fades the 3D globe into an invariant cartographic node with reticle when zooming out.
 */
export const PlanetScene: React.FC<PlanetSceneProps> = ({
  planetId = EARTH_REFERENCE_TARGET.id,
  planetName,
  classification = 'terrestrial',
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
  const { resolvedName, allEntities, targetCoords } = useMemo(
    () =>
      resolvePlanetaryEntitiesAndTarget({
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
      }),
    [
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
    ],
  );

  return (
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
};
