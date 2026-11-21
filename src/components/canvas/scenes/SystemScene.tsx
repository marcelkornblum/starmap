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

interface SystemSceneViewportProps {
  readonly entities: SpatialEntityDefinition[];
  readonly targetCoords: [number, number, number];
  readonly onInspectPlanet?: (planetId: string) => void;
  readonly onSelectEntity?: (entityId: string | null) => void;
  readonly debugHitarea: boolean;
}

const SystemSceneViewport: React.FC<SystemSceneViewportProps> = ({
  entities,
  targetCoords,
  onInspectPlanet,
  onSelectEntity,
  debugHitarea,
}) => {
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

const SystemSceneFromLookup: React.FC<SystemSceneProps> = ({
  systemId,
  system: explicitSystem,
  centerId,
  centerCoordinates,
  onInspectPlanet,
  onSelectEntity,
  debugHitarea = false,
}) => {
  const { entities, targetCoords } = useResolvedSystemEntitiesAndTarget(
    systemId,
    explicitSystem,
    centerId,
    centerCoordinates,
  );

  return (
    <SystemSceneViewport
      entities={entities}
      targetCoords={targetCoords}
      onInspectPlanet={onInspectPlanet}
      onSelectEntity={onSelectEntity}
      debugHitarea={debugHitarea}
    />
  );
};

const SystemSceneWithEntities: React.FC<
  SystemSceneProps & { readonly resolvedEntities: SpatialEntityDefinition[] }
> = ({
  resolvedEntities,
  centerId,
  centerCoordinates,
  onInspectPlanet,
  onSelectEntity,
  debugHitarea = false,
}) => {
  const targetCoords = useMemo(
    () => resolveTargetCoordsFromEntities(resolvedEntities, centerId, centerCoordinates),
    [resolvedEntities, centerId, centerCoordinates],
  );

  return (
    <SystemSceneViewport
      entities={resolvedEntities}
      targetCoords={targetCoords}
      onInspectPlanet={onInspectPlanet}
      onSelectEntity={onSelectEntity}
      debugHitarea={debugHitarea}
    />
  );
};

/**
 * SystemScene: Canonical production scene for stellar system cartography.
 * Renders the central star(s) and Keplerian orbiting planetary bodies mapped into SYSTEM_FRAME.
 */
export const SystemScene: React.FC<SystemSceneProps> = React.memo((props) => {
  if (props.resolvedEntities) {
    return <SystemSceneWithEntities {...props} resolvedEntities={props.resolvedEntities} />;
  }
  return <SystemSceneFromLookup {...props} />;
});
