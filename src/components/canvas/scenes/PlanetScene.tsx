import React, { useMemo } from 'react';
import { SpatialViewport } from '../viewport/SpatialViewport';
import { PLANETARY_FRAME } from '../instrument/referenceFrame';
import { STANDARD_CAMERA_DISTANCES } from '../cartography/cartographyMath';
import { calculateKeplerianPosition } from '../math/kepler';
import { PlanetBody } from '../entity/PlanetBody';
import type { SpatialEntityDefinition } from '../entity';
import type { CelestialClassification } from '../cartography/reticleGeometry';
import type { PlanetRecord, SatelliteRecord } from '../../../types/astro';
import { getCachedDetailRecord } from '../../../data/detailsRepository';

export interface PlanetSceneProps {
  planetId?: string;
  planetName?: string;
  classification?: CelestialClassification;
  radius?: number;
  minPixelSize?: number;
  fadeRange?: number;
  planet?: PlanetRecord;
  satellites?: SpatialEntityDefinition[];
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
  planetId = 'earth',
  planetName,
  classification = 'terrestrial',
  radius = 1.0,
  minPixelSize = 24,
  fadeRange = 16,
  planet,
  satellites: explicitSatellites,
  onInspectSatellite,
  onSelectEntity,
  debugHitarea = false,
}) => {
  const resolvedName = planetName ?? (planetId.charAt(0).toUpperCase() + planetId.slice(1));

  const resolvedSatellites = useMemo<readonly SatelliteRecord[]>(() => {
    if (planet?.satellites && planet.satellites.length > 0) {
      return planet.satellites;
    }
    if (planetId) {
      const detail = getCachedDetailRecord(planetId);
      if (detail?.kind === 'system') {
        const found = detail.record.planets?.find((p) => p.id === planetId);
        if (found?.satellites) return found.satellites;
      }
      const sol = getCachedDetailRecord('sol');
      if (sol?.kind === 'system') {
        const found = sol.record.planets?.find(
          (p) => p.id === planetId || p.name.toLowerCase() === planetId.toLowerCase(),
        );
        if (found?.satellites) return found.satellites;
      }
    }
    return [];
  }, [planet, planetId]);

  const satellites = useMemo<SpatialEntityDefinition[]>(() => {
    if (explicitSatellites) return explicitSatellites;
    if (resolvedSatellites.length > 0) {
      return resolvedSatellites.map((sat) => {
        const satSemiMajorAxis = sat.orbit.semiMajorAxis;
        const [satX, satY, satZ] = calculateKeplerianPosition(
          satSemiMajorAxis,
          sat.orbit.eccentricity,
          sat.orbit.inclination,
          sat.orbit.ascendingNode,
          sat.orbit.argumentOfPeriapsis,
          sat.orbit.meanAnomaly,
        );
        return {
          id: sat.id,
          name: sat.name,
          classification: (sat.composition ?? 'terrestrial') as CelestialClassification,
          position: [satX, satY, satZ],
          bodyRadius: (sat.radiusEarth ?? 0.272) * radius,
          orbit: {
            semiMajorAxis: satSemiMajorAxis,
            eccentricity: sat.orbit.eccentricity,
            inclination: sat.orbit.inclination,
            ascendingNode: sat.orbit.ascendingNode,
            argumentOfPeriapsis: sat.orbit.argumentOfPeriapsis,
            period: sat.orbit.periodDays,
            meanAnomaly: sat.orbit.meanAnomaly,
          },
        };
      });
    }
    return [];
  }, [explicitSatellites, resolvedSatellites, radius]);

  // Central planet representation: seamlessly cross-fades between 3D PlanetBody and invariant node
  const planetEntity = useMemo<SpatialEntityDefinition>(() => ({
    id: planetId,
    name: resolvedName,
    classification,
    position: [0, 0, 0],
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
