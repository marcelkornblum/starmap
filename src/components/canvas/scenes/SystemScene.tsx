import React, { useMemo } from 'react';
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
  const entities = useMemo<SpatialEntityDefinition[]>(() => {
    const sysData = CANDIDATE_SYSTEMS.find((s) => s.id === systemId) ?? CANDIDATE_SYSTEMS[0];

    // 1. Central Star Node
    const starEntity: SpatialEntityDefinition = {
      id: explicitSystem?.id ?? sysData.id,
      name: explicitSystem?.name ?? sysData.name,
      position: [0, 0, 0],
      classification: 'star',
      spectralType: explicitSystem?.spectralType ?? sysData.spectralType,
      multiplicity: sysData.multiplicity ?? 1,
      planets: sysData.planetsList,
    };

    // 2. Planetary Bodies with Keplerian Orbits
    let planetEntities: SpatialEntityDefinition[] = [];

    if (systemId === 'sol' || !sysData.planetsList?.length) {
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
    } else {
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
    }

    return [starEntity, ...planetEntities];
  }, [systemId, explicitSystem]);

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
