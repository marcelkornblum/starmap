import React, { useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';
import { SpatialViewport } from '../viewport/SpatialViewport';
import { SYSTEM_FRAME } from '../instrument/referenceFrame';
import { STANDARD_CAMERA_DISTANCES } from '../cartography/cartographyMath';
import type { ExoplanetRecord } from '../../../types/astro';
import type { SpatialEntityDefinition } from '../entity';
import { toUrlSlug } from '../../../utils/datasetLayerCodec';
import { GalacticCameraController } from './GalacticCameraController';
import {
  resolveSystemPlanetEntity,
  resolveCorpusPlanetEntity,
} from './systemPlanetResolver';
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
import {
  getCachedCorpusForFilter,
  loadSearchCorpusForFilter,
} from '../../../data/searchRepository';

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
  systemId,
  system: explicitSystem,
  centerId,
  centerCoordinates,
  onInspectPlanet,
  onSelectEntity,
  debugHitarea = false,
}) => {
  const targetId = explicitSystem?.id ?? systemId;
  const [tick, setTick] = useState(0);

  const activeCorpus = useMemo(
    () =>
      getCachedCorpusForFilter('all') ??
      getCachedCorpusForFilter('stars') ??
      [],
    [tick],
  );

  const matchedEntry = useMemo(
    () =>
      activeCorpus.length > 0 && targetId
        ? findFocusedEntryInCorpus(targetId, activeCorpus)
        : undefined,
    [targetId, activeCorpus],
  );

  const resolvedId = explicitSystem?.id ?? matchedEntry?.s ?? matchedEntry?.i ?? targetId;

  useEffect(() => {
    if (!resolvedId) return undefined;
    let cancelled = false;
    const run = async () => {
      let currentTargetId = resolvedId;
      if (activeCorpus.length === 0) {
        const loaded = await loadSearchCorpusForFilter('all').catch(() => undefined);
        if (cancelled) return;
        if (loaded && targetId) {
          const found = findFocusedEntryInCorpus(targetId, loaded);
          if (found) {
            currentTargetId = found.s ?? found.i;
          }
        }
      }
      await Promise.all([
        fetchSummaryNode(currentTargetId).catch(() => undefined),
        fetchDetailRecord(currentTargetId).catch(() => undefined),
      ]);
      if (!cancelled) {
        setTick((t) => t + 1);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [resolvedId, targetId, activeCorpus.length]);

  const summaryNode = resolvedId
    ? getCachedSummaryNode(resolvedId) ??
      (targetId && resolvedId !== targetId ? getCachedSummaryNode(targetId) : undefined)
    : undefined;
  const detailRecord = resolvedId
    ? getCachedDetailRecord(resolvedId) ??
      (targetId && resolvedId !== targetId ? getCachedDetailRecord(targetId) : undefined)
    : undefined;
  const sysManifest = detailRecord?.kind === 'system' ? detailRecord.record : undefined;

  const entities = useMemo<SpatialEntityDefinition[]>(() => {
    if (!resolvedId && !targetId) {
      return [];
    }

    // 1. Central Star Node
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
      multiplicity:
        sysManifest?.stars?.length ??
        summaryNode?.starCount ??
        1,
      planets: sysManifest?.planets?.map((p) => ({
        id: p.id,
        name: p.name,
        classification: p.composition ?? 'terrestrial',
      })),
    };

    // 2. Planetary Bodies with Keplerian Orbits
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
      const corpusPlanets = activeCorpus.filter(
        (entry) =>
          entry.k === 2 &&
          ((resolvedId && entry.s === resolvedId) || (targetId && entry.s === targetId)),
      );
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

  if (entities.length === 0) {
    return null;
  }

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
      <GalacticCameraController target={targetCoords} persistGalaxyPose={false} />
    </SpatialViewport>
  );
};
