import * as THREE from 'three';
import type { SpatialEntityDefinition } from '../entity';
import type { CelestialClassification } from '../../../types/spatial';
import type { ExoplanetRecord, SatelliteRecord } from '../../../types/astro';
import { toUrlSlug } from '../../../utils/datasetLayerSlugs';
import { getCachedDetailRecord, type DecodedDetailRecord } from '../../../data/detailsRepository';
import { SOL_REFERENCE_TARGET } from '../../../config/referenceTargets';
import { calculateKeplerianPosition } from '../math/kepler';
import { resolveCenterCoords } from './useGalaxyViewCamera';

export function resolveTargetCoordsFromEntities(
  entities: readonly SpatialEntityDefinition[],
  centerId?: string,
  centerCoordinates?:
    | readonly [number, number, number]
    | [number, number, number]
    | { x: number; y: number; z: number },
): [number, number, number] {
  if (centerCoordinates) {
    return resolveCenterCoords(centerCoordinates);
  }
  if (centerId) {
    const targetSlug = toUrlSlug(centerId);
    const match = entities.find(
      (e) =>
        e.id === centerId ||
        toUrlSlug(e.id) === targetSlug ||
        toUrlSlug(e.name) === targetSlug,
    );
    if (match?.position) {
      const p = match.position;
      return p instanceof THREE.Vector3 ? [p.x, p.y, p.z] : [p[0], p[1], p[2]];
    }
  }
  return [0, 0, 0];
}

export interface ResolvePlanetaryEntitiesParams {
  readonly planetId: string;
  readonly planetName?: string;
  readonly classification?: CelestialClassification;
  readonly radius?: number;
  readonly minPixelSize?: number;
  readonly fadeRange?: number;
  readonly planet?: ExoplanetRecord;
  readonly explicitSatellites?: SpatialEntityDefinition[];
  readonly hostSystemDetail?: DecodedDetailRecord;
  readonly centerId?: string;
  readonly centerCoordinates?:
    | readonly [number, number, number]
    | [number, number, number]
    | { x: number; y: number; z: number };
}

export interface ResolvedPlanetaryEntitiesResult {
  readonly resolvedName: string;
  readonly allEntities: SpatialEntityDefinition[];
  readonly targetCoords: [number, number, number];
}

export function resolvePlanetaryEntitiesAndTarget({
  planetId,
  planetName,
  classification = 'terrestrial',
  radius = 1.0,
  minPixelSize = 24,
  fadeRange = 16,
  planet,
  explicitSatellites,
  hostSystemDetail,
  centerId,
  centerCoordinates,
}: ResolvePlanetaryEntitiesParams): ResolvedPlanetaryEntitiesResult {
  const resolvedName = planetName ?? (planetId.charAt(0).toUpperCase() + planetId.slice(1));

  let resolvedSatellites: readonly SatelliteRecord[] = [];
  if (planet?.satellites && planet.satellites.length > 0) {
    resolvedSatellites = planet.satellites;
  } else if (planetId) {
    const planetSlug = toUrlSlug(planetId);
    if (hostSystemDetail?.kind === 'system') {
      const found = hostSystemDetail.record.planets?.find(
        (p) =>
          p.id === planetId ||
          toUrlSlug(p.id) === planetSlug ||
          toUrlSlug(p.name) === planetSlug,
      );
      if (found?.satellites) resolvedSatellites = found.satellites;
    }
    if (resolvedSatellites.length === 0) {
      const detail = getCachedDetailRecord(planetId);
      if (detail?.kind === 'system') {
        const found = detail.record.planets?.find(
          (p) =>
            p.id === planetId ||
            toUrlSlug(p.id) === planetSlug ||
            toUrlSlug(p.name) === planetSlug,
        );
        if (found?.satellites) resolvedSatellites = found.satellites;
      }
    }
    if (resolvedSatellites.length === 0) {
      const sol = getCachedDetailRecord(SOL_REFERENCE_TARGET.id);
      if (sol?.kind === 'system') {
        const found = sol.record.planets?.find(
          (p) =>
            p.id === planetId ||
            toUrlSlug(p.id) === planetSlug ||
            toUrlSlug(p.name) === planetSlug,
        );
        if (found?.satellites) resolvedSatellites = found.satellites;
      }
    }
  }

  const satellites: SpatialEntityDefinition[] = explicitSatellites
    ? explicitSatellites
    : resolvedSatellites.map((sat) => {
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
          classification: sat.composition ?? 'terrestrial',
          position: [satX, satY, satZ],
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

  const planetEntity: SpatialEntityDefinition = {
    id: planetId,
    name: resolvedName,
    classification,
    position: [0, 0, 0],
    bodyRadius: radius,
    bodyMinPixelSize: minPixelSize,
    bodyFadeRange: fadeRange,
  };

  const hasPlanet = satellites.some((e) => e.id === planetId);
  const allEntities = hasPlanet ? satellites : [planetEntity, ...satellites];
  const targetCoords = resolveTargetCoordsFromEntities(allEntities, centerId, centerCoordinates);

  return { resolvedName, allEntities, targetCoords };
}
