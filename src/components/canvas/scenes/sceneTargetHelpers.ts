import { useMemo } from 'react';
import * as THREE from 'three';
import type { SpatialEntityDefinition } from '../entity';
import type { CelestialClassification } from '../../../types/spatial';
import type { ExoplanetRecord, SatelliteRecord } from '../../../types/astro';
import type { CompactSearchEntry } from '../../../utils/compactDataTypes';
import { toUrlSlug } from '../../../utils/datasetLayerSlugs';
import { formatSlugFallbackTitle } from '../../../utils/starNaming';
import { getCachedDetailRecord } from '../../../data/detailsRepository';
import { SOL_REFERENCE_TARGET } from '../../../config/referenceTargets';
import { useSystemData } from '../../../hooks/useSystemData';
import { useSearchCorpus } from '../../../hooks/useSearchCorpus';
import { getCorpusSystemChildrenIndex } from '../../../services/details/focusedChildrenResolver';
import { findFocusedEntryInCorpus } from '../../../services/search/searchCorpusHelpers';
import { calculateKeplerianPosition } from '../math/kepler';
import { resolveCenterCoords } from './useGalaxyViewCamera';
import {
  resolveSystemPlanetEntity,
  resolveCorpusPlanetEntity,
} from './systemPlanetResolver';
import type { StarDossierData } from './SystemScene';

const EMPTY_CORPUS: readonly CompactSearchEntry[] = [];
const DEFAULT_SATELLITE_RADIUS_EARTH = 0.272;

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

export function useResolvedSystemEntitiesAndTarget(
  systemId?: string,
  explicitSystem?: StarDossierData,
  centerId?: string,
  centerCoordinates?:
    | readonly [number, number, number]
    | [number, number, number]
    | { x: number; y: number; z: number },
): {
  readonly entities: SpatialEntityDefinition[];
  readonly targetCoords: [number, number, number];
} {
  const targetId = explicitSystem?.id ?? systemId;
  const { corpus } = useSearchCorpus('startup');
  const activeCorpus = corpus ?? EMPTY_CORPUS;

  const matchedEntry = useMemo(
    () =>
      activeCorpus.length > 0 && targetId
        ? findFocusedEntryInCorpus(targetId, activeCorpus)
        : undefined,
    [targetId, activeCorpus],
  );

  const resolvedId = explicitSystem?.id ?? matchedEntry?.s ?? matchedEntry?.i ?? targetId;
  const { systemSummary: summaryNode, systemDetail: detailRecord } = useSystemData(
    resolvedId ?? targetId,
  );
  const sysManifest = detailRecord?.kind === 'system' ? detailRecord.record : undefined;

  const entities = useMemo<SpatialEntityDefinition[]>(() => {
    if (!resolvedId && !targetId) return [];

    const starName =
      explicitSystem?.name ??
      sysManifest?.name ??
      summaryNode?.name ??
      matchedEntry?.n ??
      (targetId ? formatSlugFallbackTitle(targetId) : 'System');

    const starSpectral =
      explicitSystem?.spectralType ??
      sysManifest?.stars?.[0]?.spectralType ??
      summaryNode?.spect ??
      matchedEntry?.m?.[1];

    const starEntity: SpatialEntityDefinition = {
      id: explicitSystem?.id ?? resolvedId ?? targetId ?? '',
      name: starName,
      position: [0, 0, 0],
      classification: 'star',
      spectralType: starSpectral,
      multiplicity: sysManifest?.stars?.length ?? summaryNode?.starCount ?? 1,
      planets: sysManifest?.planets?.map((p) => ({
        id: p.id,
        name: p.name,
        classification: p.composition ?? 'terrestrial',
      })),
    };

    const primaryStarMassMsun =
      explicitSystem?.massMsun ?? sysManifest?.stars?.[0]?.massMsun;
    let planetEntities: SpatialEntityDefinition[] = [];

    if (explicitSystem?.planets?.length) {
      planetEntities = explicitSystem.planets.map((p, index) =>
        resolveSystemPlanetEntity(p, index, primaryStarMassMsun),
      );
    } else if (sysManifest?.planets?.length) {
      planetEntities = sysManifest.planets.map((p, index) =>
        resolveSystemPlanetEntity(p, index, primaryStarMassMsun),
      );
    } else {
      const childrenIndex = getCorpusSystemChildrenIndex(activeCorpus);
      const seen = new Set<CompactSearchEntry>();
      const corpusPlanets: CompactSearchEntry[] = [];
      const addChildren = (key: string | null | undefined) => {
        if (!key) return;
        const list = childrenIndex.get(key);
        if (!list) return;
        for (const entry of list) {
          if (entry.k === 2 && !seen.has(entry)) {
            seen.add(entry);
            corpusPlanets.push(entry);
          }
        }
      };
      addChildren(resolvedId);
      if (targetId && targetId !== resolvedId) {
        addChildren(targetId);
      }
      if (corpusPlanets.length > 0) {
        planetEntities = corpusPlanets.map((p, index) =>
          resolveCorpusPlanetEntity(p, index),
        );
      }
    }

    return [starEntity, ...planetEntities];
  }, [
    targetId,
    explicitSystem,
    sysManifest,
    summaryNode,
    matchedEntry,
    resolvedId,
    activeCorpus,
  ]);

  const targetCoords = useMemo(
    () => resolveTargetCoordsFromEntities(entities, centerId, centerCoordinates),
    [entities, centerId, centerCoordinates],
  );

  return { entities, targetCoords };
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
  readonly centerId?: string;
  readonly centerCoordinates?:
    | readonly [number, number, number]
    | [number, number, number]
    | { x: number; y: number; z: number };
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
  centerId,
  centerCoordinates,
}: ResolvePlanetaryEntitiesParams): {
  readonly resolvedName: string;
  readonly allEntities: SpatialEntityDefinition[];
  readonly targetCoords: [number, number, number];
} {
  const resolvedName = planetName ?? (planetId.charAt(0).toUpperCase() + planetId.slice(1));

  let resolvedSatellites: readonly SatelliteRecord[] = [];
  if (planet?.satellites && planet.satellites.length > 0) {
    resolvedSatellites = planet.satellites;
  } else if (planetId) {
    const detail = getCachedDetailRecord(planetId);
    if (detail?.kind === 'system') {
      const found = detail.record.planets?.find((p) => p.id === planetId);
      if (found?.satellites) resolvedSatellites = found.satellites;
    }
    if (resolvedSatellites.length === 0) {
      const sol = getCachedDetailRecord(SOL_REFERENCE_TARGET.id);
      if (sol?.kind === 'system') {
        const found = sol.record.planets?.find(
          (p) => p.id === planetId || p.name.toLowerCase() === planetId.toLowerCase(),
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
          bodyRadius: (sat.radiusEarth ?? DEFAULT_SATELLITE_RADIUS_EARTH) * radius,
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
