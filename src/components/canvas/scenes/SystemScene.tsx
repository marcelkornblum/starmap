import React, { useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';
import { SpatialViewport } from '../viewport/SpatialViewport';
import { SYSTEM_FRAME } from '../instrument/referenceFrame';
import { STANDARD_CAMERA_DISTANCES } from '../cartography/cartographyMath';
import { CANDIDATE_SYSTEMS, SOL_PLANETS, type SolPlanetConfig } from '../../../data';
import type { ExoplanetRecord } from '../../../types/astro';
import type { SpatialEntityDefinition } from '../entity';
import { toUrlSlug } from '../../../utils/datasetLayerCodec';
import { calculateKeplerianPosition } from '../math/kepler';
import { GalacticCameraController } from './SpatialScenes';
import {
  findFocusedEntryInCorpus,
  formatSlugFallbackTitle,
} from '../../../services/searchService';
import {
  getCachedDetailRecord,
  getCachedSummaryNode,
  fetchDetailRecord,
  fetchSummaryNode,
} from '../../../data/detailsRepository';
import { getCachedCorpusForFilter } from '../../../data/searchRepository';

export interface StarDossierData {
  id: string;
  name: string;
  properName?: string;
  spectralType?: string;
  luminosityLsun?: number;
  massMsun?: number;
  radiusRsun?: number;
  effectiveTempK?: number;
  distPc?: number;
  con?: string | null;
  planets?: ExoplanetRecord[];
  overviewText?: string;
}

export interface SystemSceneProps {
  systemId?: string;
  system?: StarDossierData;
  centerId?: string;
  centerCoordinates?: readonly [number, number, number] | [number, number, number];
  onInspectPlanet?: (planetId: string) => void;
  onSelectEntity?: (entityId: string | null) => void;
  debugHitarea?: boolean;
}

/**
 * SystemScene: Canonical production scene for stellar system cartography.
 * Renders the central star(s) and Keplerian orbiting planetary bodies mapped into SYSTEM_FRAME.
 */
export const SystemScene: React.FC<SystemSceneProps> = ({
  systemId = 'sol',
  system: explicitSystem,
  centerId,
  centerCoordinates,
  onInspectPlanet,
  onSelectEntity,
  debugHitarea = false,
}) => {
  const [, setTick] = useState(0);

  const sysData = useMemo(
    () => CANDIDATE_SYSTEMS.find((s) => s.id === systemId || toUrlSlug(s.name) === systemId),
    [systemId],
  );

  const activeCorpus = useMemo(
    () =>
      getCachedCorpusForFilter('all') ??
      getCachedCorpusForFilter('stars') ??
      [],
    [],
  );

  const matchedEntry = useMemo(
    () => (activeCorpus.length > 0 ? findFocusedEntryInCorpus(systemId, activeCorpus) : undefined),
    [systemId, activeCorpus],
  );

  const resolvedId = sysData?.id ?? matchedEntry?.s ?? matchedEntry?.i ?? systemId;

  useEffect(() => {
    if (systemId === 'sol') return;
    let cancelled = false;
    Promise.all([
      fetchSummaryNode(resolvedId).catch(() => undefined),
      fetchDetailRecord(resolvedId).catch(() => undefined),
    ]).then(() => {
      if (!cancelled) setTick((t) => t + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [resolvedId, systemId]);

  const summaryNode =
    getCachedSummaryNode(resolvedId) ??
    (resolvedId !== systemId ? getCachedSummaryNode(systemId) : undefined);
  const detailRecord =
    getCachedDetailRecord(resolvedId) ??
    (resolvedId !== systemId ? getCachedDetailRecord(systemId) : undefined);
  const sysManifest = detailRecord?.kind === 'system' ? detailRecord.record : undefined;

  const entities = useMemo<SpatialEntityDefinition[]>(() => {
    // 1. Central Star Node
    const starName =
      explicitSystem?.name ??
      sysData?.name ??
      sysManifest?.name ??
      summaryNode?.name ??
      matchedEntry?.n ??
      formatSlugFallbackTitle(systemId);

    const starSpectral =
      explicitSystem?.spectralType ??
      sysData?.spectralType ??
      sysManifest?.stars?.[0]?.spectralType ??
      summaryNode?.spect ??
      matchedEntry?.m?.[1];

    const starEntity: SpatialEntityDefinition = {
      id: explicitSystem?.id ?? resolvedId ?? systemId,
      name: starName,
      position: [0, 0, 0],
      classification: 'star',
      spectralType: starSpectral,
      multiplicity:
        sysData?.multiplicity ??
        sysManifest?.stars?.length ??
        summaryNode?.starCount ??
        1,
      planets: sysData?.planetsList,
    };

    // 2. Planetary Bodies with Keplerian Orbits
    let planetEntities: SpatialEntityDefinition[] = [];

    if (systemId === 'sol') {
      // Use full solar system configuration
      planetEntities = SOL_PLANETS.map((p: SolPlanetConfig) => ({
        id: p.id,
        name: p.name,
        position: calculateKeplerianPosition(
          p.a,
          p.e,
          p.inc,
          p.node,
          p.peri,
          p.meanAnomaly,
        ),
        classification: p.classification,
        orbit: {
          semiMajorAxis: p.a,
          eccentricity: p.e,
          inclination: p.inc,
          ascendingNode: p.node,
          argumentOfPeriapsis: p.peri,
          period: p.period,
          meanAnomaly: p.meanAnomaly,
        },
      }));
    } else if (sysManifest?.planets?.length) {
      planetEntities = sysManifest.planets.map((p, index) => {
        const a = p.orbit?.semiMajorAxis ?? (0.4 + index * 0.6);
        const e = p.orbit?.eccentricity ?? 0.05;
        const inc = p.orbit?.inclination ?? (index * 1.5);
        const node = p.orbit?.ascendingNode ?? (index * 25);
        const peri = p.orbit?.argumentOfPeriapsis ?? (index * 40);
        const meanAnomaly = p.orbit?.meanAnomaly ?? ((index * 60) % 360);
        return {
          id: p.id,
          name: p.name,
          position: calculateKeplerianPosition(a, e, inc, node, peri, meanAnomaly),
          classification: p.composition ?? 'terrestrial',
          orbit: {
            semiMajorAxis: a,
            eccentricity: e,
            inclination: inc,
            ascendingNode: node,
            argumentOfPeriapsis: peri,
            period: p.orbit?.periodDays ?? Math.round(Math.pow(a, 1.5) * 365.25),
            meanAnomaly,
          },
        };
      });
    } else if (sysData?.planetsList?.length) {
      // Generic exoplanet mapping from system planet census
      planetEntities = sysData.planetsList.map((p, index) => {
        const a = 0.4 + index * 0.6;
        const e = 0.05 + index * 0.02;
        const inc = index * 1.5;
        const node = index * 25;
        const peri = index * 40;
        const meanAnomaly = (index * 60) % 360;
        return {
          id: p.id,
          name: p.name,
          position: calculateKeplerianPosition(a, e, inc, node, peri, meanAnomaly),
          classification: p.classification,
          orbit: {
            semiMajorAxis: a,
            eccentricity: e,
            inclination: inc,
            ascendingNode: node,
            argumentOfPeriapsis: peri,
            period: Math.round(Math.pow(a, 1.5) * 365.25),
            meanAnomaly,
          },
        };
      });
    } else {
      const corpusPlanets = activeCorpus.filter(
        (entry) => entry.k === 2 && (entry.s === resolvedId || entry.s === systemId),
      );
      if (corpusPlanets.length > 0) {
        planetEntities = corpusPlanets.map((p, index) => {
          const a = 0.4 + index * 0.6;
          const e = 0.05 + index * 0.02;
          const inc = index * 1.5;
          const node = index * 25;
          const peri = index * 40;
          const meanAnomaly = (index * 60) % 360;
          return {
            id: p.i,
            name: p.n ?? p.i,
            position: calculateKeplerianPosition(a, e, inc, node, peri, meanAnomaly),
            classification: 'terrestrial',
            orbit: {
              semiMajorAxis: a,
              eccentricity: e,
              inclination: inc,
              ascendingNode: node,
              argumentOfPeriapsis: peri,
              period: Math.round(Math.pow(a, 1.5) * 365.25),
              meanAnomaly,
            },
          };
        });
      }
    }

    return [starEntity, ...planetEntities];
  }, [
    systemId,
    explicitSystem,
    sysData,
    sysManifest,
    summaryNode,
    matchedEntry,
    resolvedId,
    activeCorpus,
  ]);

  const targetCoords = useMemo<[number, number, number]>(() => {
    if (centerCoordinates) {
      return [centerCoordinates[0], centerCoordinates[1], centerCoordinates[2]];
    }
    if (centerId) {
      const match = entities.find((e) => {
        return (
          e.id === centerId ||
          toUrlSlug(e.id) === toUrlSlug(centerId) ||
          toUrlSlug(e.name) === toUrlSlug(centerId)
        );
      });
      if (match) {
        const p = match.position;
        const x = p instanceof THREE.Vector3 ? p.x : p ? p[0] : 0;
        const y = p instanceof THREE.Vector3 ? p.y : p ? p[1] : 0;
        const z = p instanceof THREE.Vector3 ? p.z : p ? p[2] : 0;
        return [x, y, z];
      }
    }
    return [0, 0, 0];
  }, [centerCoordinates, centerId, entities]);

  return (
    <SpatialViewport
      frame={SYSTEM_FRAME}
      entities={entities}
      cameraDistance={STANDARD_CAMERA_DISTANCES.system}
      cameraTarget={targetCoords}
      onInspect={onInspectPlanet}
      onSelect={onSelectEntity}
      debugHitarea={debugHitarea}
    >
      <GalacticCameraController target={targetCoords} />
    </SpatialViewport>
  );
};
