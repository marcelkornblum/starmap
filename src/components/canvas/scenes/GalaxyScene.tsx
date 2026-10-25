import React, { useMemo, useState, useCallback } from 'react';
import { SpatialViewport } from '../viewport/SpatialViewport';
import { GALACTIC_FRAME } from '../instrument/referenceFrame';
import { STANDARD_CAMERA_DISTANCES } from '../cartography/cartographyMath';
import { CANDIDATE_SYSTEMS, type CandidateSystem } from '../../../data';
import { SectorPointCloud, type SpatialEntityDefinition } from '../entity';
import type { SystemSummaryNode } from '../../../types/astro';

export interface GalaxySceneProps {
  systems?: CandidateSystem[];
  initialSelectedId?: string | null;
  onInspectSystem?: (systemId: string) => void;
  onSelectSystem?: (systemId: string | null) => void;
  debugHitarea?: boolean;
}

/**
 * GalaxyScene: Canonical production scene for Milky Way top-level galactic cartography.
 * Renders candidate systems, streamed 3D sector point cloud, and nearest stellar nodes mapped into GALACTIC_FRAME.
 */
export const GalaxyScene: React.FC<GalaxySceneProps> = ({
  systems = CANDIDATE_SYSTEMS,
  initialSelectedId,
  onInspectSystem,
  onSelectSystem,
  debugHitarea = false,
}) => {
  const [streamedSummaries, setStreamedSummaries] = useState<readonly SystemSummaryNode[]>([]);

  const handleHydratedSummariesChange = useCallback((summaries: readonly SystemSummaryNode[]) => {
    setStreamedSummaries((prev) => {
      if (prev.length === summaries.length && prev.every((s, idx) => s.id === summaries[idx]?.id)) {
        return prev;
      }
      return summaries;
    });
  }, []);

  const entities = useMemo<SpatialEntityDefinition[]>(() => {
    const existingIds = new Set<string>();
    const baseEntities: SpatialEntityDefinition[] = systems.map((sys) => {
      existingIds.add(sys.id);
      return {
        id: sys.id,
        name: sys.name,
        position: sys.position,
        classification: sys.classification,
        spectralType: sys.spectralType,
        multiplicity: sys.multiplicity,
        planets: sys.planetsList,
      };
    });

    // Add up to 25 nearest non-duplicate streamed stars to keep CelestialEntity count bounded
    let added = 0;
    for (let i = 0; i < streamedSummaries.length && added < 25; i++) {
      const s = streamedSummaries[i];
      if (s && !existingIds.has(s.id)) {
        existingIds.add(s.id);
        baseEntities.push({
          id: s.id,
          name: s.name,
          position: [s.x, s.y, s.z],
          classification: 'star',
          spectralType: s.spect,
          multiplicity: s.starCount,
        });
        added++;
      }
    }

    return baseEntities;
  }, [systems, streamedSummaries]);

  return (
    <SpatialViewport
      frame={GALACTIC_FRAME}
      entities={entities}
      cameraDistance={STANDARD_CAMERA_DISTANCES.galactic}
      initialSelectedId={initialSelectedId}
      onInspect={onInspectSystem}
      onSelect={onSelectSystem}
      debugHitarea={debugHitarea}
    >
      <SectorPointCloud onHydratedSummariesChange={handleHydratedSummariesChange} />
    </SpatialViewport>
  );
};
