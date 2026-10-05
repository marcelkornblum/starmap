import React, { useMemo } from 'react';
import { SpatialViewport } from '../SpatialViewport';
import { PLANETARY_FRAME } from '../instrument/referenceFrame';
import { STANDARD_CAMERA_DISTANCES } from '../cartography/cartographyMath';
import { PlanetBody } from './PlanetBody';
import type { SpatialEntityDefinition } from '../entity/SpatialEntityStore';
import type { CelestialClassification } from '../cartography/reticleGeometry';

export interface PlanetSceneProps {
  planetId?: string;
  planetName?: string;
  classification?: CelestialClassification;
  radius?: number;
  satellites?: SpatialEntityDefinition[];
  onInspectSatellite?: (satelliteId: string) => void;
  onSelectEntity?: (entityId: string | null) => void;
  debugHitarea?: boolean;
}

const DEFAULT_EARTH_MOONS: SpatialEntityDefinition[] = [
  {
    id: 'moon',
    name: 'Luna',
    classification: 'terrestrial',
    position: [3.8, 0, 0],
    showLabel: true,
    enableOcclusion: true,
    orbit: {
      semiMajorAxis: 3.84,
      eccentricity: 0.0549,
      inclination: 5.14,
      ascendingNode: 125.08,
      argumentOfPeriapsis: 318.15,
      period: 27.32,
      meanAnomaly: 135.0,
    },
  },
];

/**
 * PlanetScene: Canonical production scene for planetary body inspection.
 * Renders the physical uniform-lit PlanetBody alongside Keplerian natural/artificial satellites in PLANETARY_FRAME.
 */
export const PlanetScene: React.FC<PlanetSceneProps> = ({
  planetId = 'earth',
  planetName,
  classification = 'terrestrial',
  radius = 2.0,
  satellites: explicitSatellites,
  onInspectSatellite,
  onSelectEntity,
  debugHitarea = false,
}) => {
  const resolvedName = planetName ?? (planetId.charAt(0).toUpperCase() + planetId.slice(1));

  const satellites = useMemo<SpatialEntityDefinition[]>(() => {
    if (explicitSatellites) return explicitSatellites;
    if (planetId.toLowerCase() === 'earth') {
      return DEFAULT_EARTH_MOONS;
    }
    return [];
  }, [explicitSatellites, planetId]);

  return (
    <SpatialViewport
      frame={PLANETARY_FRAME}
      entities={satellites}
      cameraDistance={STANDARD_CAMERA_DISTANCES.planetary}
      onInspect={onInspectSatellite}
      onSelect={onSelectEntity}
      debugHitarea={debugHitarea}
    >
      <PlanetBody
        name={resolvedName}
        classification={classification}
        radius={radius}
        hasAtmosphere={classification === 'terrestrial' || classification === 'gas-giant'}
      />
    </SpatialViewport>
  );
};
