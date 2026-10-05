import React, { useMemo } from 'react';
import { SpatialViewport } from '../SpatialViewport';
import { PLANETARY_FRAME } from '../instrument/referenceFrame';
import { STANDARD_CAMERA_DISTANCES } from '../cartography/cartographyMath';
import { calculateKeplerianPosition } from '../math/kepler';
import { PlanetBody } from './PlanetBody';
import type { SpatialEntityDefinition } from '../entity/SpatialEntityStore';
import type { CelestialClassification } from '../cartography/reticleGeometry';

export interface PlanetSceneProps {
  planetId?: string;
  planetName?: string;
  classification?: CelestialClassification;
  radius?: number;
  minPixelSize?: number;
  fadeRange?: number;
  satellites?: SpatialEntityDefinition[];
  onInspectSatellite?: (satelliteId: string) => void;
  onSelectEntity?: (entityId: string | null) => void;
  debugHitarea?: boolean;
}

/**
 * Astronomical ratio: Moon orbital semi-major axis (384,400 km) / Earth radius (6,371 km) ≈ 60.3359.
 */
export const EARTH_LUNA_ORBITAL_RATIO = 60.34;

/**
 * PlanetScene: Canonical production scene for planetary body inspection.
 * Renders the physical uniform-lit PlanetBody alongside Keplerian natural/artificial satellites in PLANETARY_FRAME.
 * Seamlessly cross-fades the 3D globe into an invariant cartographic node with reticle when zooming out.
 */
export const PlanetScene: React.FC<PlanetSceneProps> = ({
  planetId = 'earth',
  planetName,
  classification = 'terrestrial',
  radius = 1.0,
  minPixelSize = 24,
  fadeRange = 16,
  satellites: explicitSatellites,
  onInspectSatellite,
  onSelectEntity,
  debugHitarea = false,
}) => {
  const resolvedName = planetName ?? (planetId.charAt(0).toUpperCase() + planetId.slice(1));

  const satellites = useMemo<SpatialEntityDefinition[]>(() => {
    if (explicitSatellites) return explicitSatellites;
    if (planetId.toLowerCase() === 'earth') {
      const lunaA = EARTH_LUNA_ORBITAL_RATIO * radius;
      const [lunaX, lunaY, lunaZ] = calculateKeplerianPosition(
        lunaA,
        0.0549,
        5.14,
        125.08,
        318.15,
        135.0,
      );
      return [
        {
          id: 'moon',
          name: 'Luna',
          classification: 'terrestrial',
          position: [lunaX, lunaY, lunaZ],
          showLabel: true,
          enableOcclusion: true,
          bodyRadius: 0.272 * radius,
          orbit: {
            semiMajorAxis: lunaA,
            eccentricity: 0.0549,
            inclination: 5.14,
            ascendingNode: 125.08,
            argumentOfPeriapsis: 318.15,
            period: 27.32,
            meanAnomaly: 135.0,
          },
        },
      ];
    }
    return [];
  }, [explicitSatellites, planetId, radius]);

  // Central planet representation: seamlessly cross-fades between 3D PlanetBody and invariant node
  const planetEntity = useMemo<SpatialEntityDefinition>(() => ({
    id: planetId,
    name: resolvedName,
    classification,
    position: [0, 0, 0],
    showLabel: true,
    enableOcclusion: true,
    bodyRadius: radius,
    bodyMinPixelSize: minPixelSize,
    bodyFadeRange: fadeRange,
  }), [planetId, resolvedName, classification, radius, minPixelSize, fadeRange]);

  const allEntities = useMemo<SpatialEntityDefinition[]>(() => {
    const hasPlanet = satellites.some((e) => e.id === planetId);
    return hasPlanet ? satellites : [planetEntity, ...satellites];
  }, [satellites, planetEntity, planetId]);

  return (
    <SpatialViewport
      frame={PLANETARY_FRAME}
      entities={allEntities}
      cameraDistance={STANDARD_CAMERA_DISTANCES.planetary}
      onInspect={onInspectSatellite}
      onSelect={onSelectEntity}
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
