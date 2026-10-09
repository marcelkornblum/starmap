import React, { useMemo } from 'react';
import { SpatialViewport } from '../SpatialViewport';
import { SYSTEM_FRAME } from '../instrument/referenceFrame';
import { STANDARD_CAMERA_DISTANCES } from '../cartography/cartographyMath';
import { CANDIDATE_SYSTEMS, SOL_PLANETS, type SolPlanetConfig } from './SpatialScenes';
import type { SpatialEntityDefinition } from '../entity/SpatialEntityStore';
import type { StarDossierData } from '../../domain';

export interface SystemSceneProps {
  systemId?: string;
  system?: StarDossierData;
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
        position: [p.a, 0, 0],
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
        return {
          id: p.id,
          name: p.name,
          position: [a, 0, 0],
          classification: p.classification,
          orbit: {
            semiMajorAxis: a,
            eccentricity: 0.05 + index * 0.02,
            inclination: index * 1.5,
            ascendingNode: index * 25,
            argumentOfPeriapsis: index * 40,
            period: Math.round(Math.pow(a, 1.5) * 365.25),
            meanAnomaly: (index * 60) % 360,
          },
        };
      });
    }

    return [starEntity, ...planetEntities];
  }, [systemId, explicitSystem]);

  return (
    <SpatialViewport
      frame={SYSTEM_FRAME}
      entities={entities}
      cameraDistance={STANDARD_CAMERA_DISTANCES.system}
      onInspect={onInspectPlanet}
      onSelect={onSelectEntity}
      debugHitarea={debugHitarea}
    />
  );
};
