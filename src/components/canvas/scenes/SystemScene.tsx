import React, { useMemo } from 'react';
import { SpatialViewport } from '../viewport/SpatialViewport';
import { SYSTEM_FRAME } from '../../../config/referenceFrames';
import { STANDARD_CAMERA_DISTANCES } from '../cartography/cartographyCamera';
import type { ExoplanetRecord } from '../../../types/astro';
import type { SpatialEntityDefinition } from '../entity';
import {
  resolveTargetCoordsFromEntities,
  useResolvedSystemEntitiesAndTarget,
} from './sceneTargetHelpers';

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
  resolvedEntities?: SpatialEntityDefinition[];
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
  resolvedEntities,
  onInspectPlanet,
  onSelectEntity,
  debugHitarea = false,
}) => {
  const resolved = useResolvedSystemEntitiesAndTarget(
    resolvedEntities ? undefined : systemId,
    resolvedEntities ? undefined : explicitSystem,
    centerId,
    centerCoordinates,
  );

  const entities = resolvedEntities ?? resolved.entities;
  const targetCoords = useMemo(
    () =>
      resolvedEntities
        ? resolveTargetCoordsFromEntities(resolvedEntities, centerId, centerCoordinates)
        : resolved.targetCoords,
    [resolvedEntities, centerId, centerCoordinates, resolved.targetCoords],
  );

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
      onFocusChange={onSelectEntity}
      debugHitarea={debugHitarea}
    />
  );
};
