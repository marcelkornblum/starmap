import React, { useMemo } from 'react';
import { SpatialViewport } from '../SpatialViewport';
import { GALACTIC_FRAME } from '../instrument/referenceFrame';
import { STANDARD_CAMERA_DISTANCES } from '../cartography/cartographyMath';
import { CANDIDATE_SYSTEMS, type CandidateSystem } from './SpatialScenes';
import type { SpatialEntityDefinition } from '../entity/SpatialEntityStore';

export interface GalaxySceneProps {
  systems?: CandidateSystem[];
  onInspectSystem?: (systemId: string) => void;
  onSelectSystem?: (systemId: string | null) => void;
  debugHitarea?: boolean;
}

/**
 * GalaxyScene: Canonical production scene for Milky Way top-level galactic cartography.
 * Renders candidate systems and stellar nodes mapped into GALACTIC_FRAME.
 */
export const GalaxyScene: React.FC<GalaxySceneProps> = ({
  systems = CANDIDATE_SYSTEMS,
  onInspectSystem,
  onSelectSystem,
  debugHitarea = false,
}) => {
  const entities = useMemo<SpatialEntityDefinition[]>(() => {
    return systems.map((sys) => ({
      id: sys.id,
      name: sys.name,
      position: sys.position,
      classification: sys.classification,
      spectralType: sys.spectralType,
      multiplicity: sys.multiplicity,
      planets: sys.planetsList,
      showLabel: true,
      enableOcclusion: true,
    }));
  }, [systems]);

  return (
    <SpatialViewport
      frame={GALACTIC_FRAME}
      entities={entities}
      cameraDistance={STANDARD_CAMERA_DISTANCES.galactic}
      onInspect={onInspectSystem}
      onSelect={onSelectSystem}
      debugHitarea={debugHitarea}
    />
  );
};
