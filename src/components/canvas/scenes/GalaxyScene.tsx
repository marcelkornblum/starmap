import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SpatialViewport } from '../viewport/SpatialViewport';
import { GALACTIC_FRAME } from '../instrument/referenceFrame';
import { STANDARD_CAMERA_DISTANCES } from '../cartography/cartographyMath';
import { SectorPointCloud, type SpatialEntityDefinition } from '../entity';
import type { CelestialClassification, PlanetCensusEntry } from '../cartography/reticleGeometry';
import { useActiveStarsStore } from '../../../stores/useActiveStarsStore';
import {
  getApertureActiveCutoffForViewportWidth,
  getDeviceTierBudget,
} from '../../../services/deviceTierService';
import type { SystemSummaryNode } from '../../../types/astro';

/**
 * Upper bound on streamed stars rendered as individual reticle entities (nearest to the focus first).
 * Every star inside the aperture is still active in the objects panel regardless of this bound.
 */
export const GALAXY_SCENE_MAX_STREAMED_ENTITIES = 1200;

export interface GalaxySceneProps {
  additionalEntities?: readonly SpatialEntityDefinition[];
  initialSelectedId?: string | null;
  onInspectSystem?: (systemId: string) => void;
  onSelectSystem?: (systemId: string | null) => void;
  debugHitarea?: boolean;
  onCeilingApertureRadiusChange?: (radiusPc: number | null) => void;
}

/**
 * GalaxyScene: Canonical production scene for Milky Way top-level galactic cartography.
 * Renders streamed 3D sector point cloud and nearest stellar nodes mapped into GALACTIC_FRAME.
 */
export const GalaxyScene: React.FC<GalaxySceneProps> = ({
  additionalEntities,
  initialSelectedId,
  onInspectSystem,
  onSelectSystem,
  debugHitarea = false,
  onCeilingApertureRadiusChange,
}) => {
  const [streamedSummaries, setStreamedSummaries] = useState<readonly SystemSummaryNode[]>([]);
  const [hasHydrated, setHasHydrated] = useState(() => useActiveStarsStore.getState().isHydrated);
  const [focusPointPc, setFocusPointPc] = useState<readonly [number, number, number]>([0, 0, 0]);
  const budget = useMemo(() => getDeviceTierBudget(), []);

  const handleHydratedSummariesChange = useCallback(
    (
      summaries: readonly SystemSummaryNode[],
      nextFocusPointPc?: readonly [number, number, number],
    ) => {
      setHasHydrated(true);
      useActiveStarsStore.getState().setSummaries(summaries);
      if (nextFocusPointPc) {
        setFocusPointPc((prev) =>
          prev[0] === nextFocusPointPc[0] &&
          prev[1] === nextFocusPointPc[1] &&
          prev[2] === nextFocusPointPc[2]
            ? prev
            : [nextFocusPointPc[0], nextFocusPointPc[1], nextFocusPointPc[2]],
        );
      }
      setStreamedSummaries((prev) => {
        if (prev.length === summaries.length && prev.every((s, idx) => s.id === summaries[idx]?.id)) {
          return prev;
        }
        return summaries;
      });
    },
    [],
  );

  useEffect(() => {
    return () => {
      useActiveStarsStore.getState().clear();
    };
  }, []);

  useEffect(() => {
    if (streamedSummaries.length >= budget.maxActiveEntities) {
      const boundaryStar = streamedSummaries[budget.maxActiveEntities - 1];
      if (boundaryStar) {
        const dx = boundaryStar.x - focusPointPc[0];
        const dy = boundaryStar.y - focusPointPc[1];
        const dz = boundaryStar.z - focusPointPc[2];
        onCeilingApertureRadiusChange?.(Math.hypot(dx, dy, dz));
      } else {
        onCeilingApertureRadiusChange?.(null);
      }
    } else {
      onCeilingApertureRadiusChange?.(null);
    }
  }, [streamedSummaries, focusPointPc, budget.maxActiveEntities, onCeilingApertureRadiusChange]);

  const entities = useMemo<SpatialEntityDefinition[]>(() => {
    const maxActive = Math.min(budget.maxActiveEntities, GALAXY_SCENE_MAX_STREAMED_ENTITIES);
    const hasReachedCeiling = streamedSummaries.length >= maxActive && maxActive > 0;
    const boundaryStar = hasReachedCeiling ? streamedSummaries[maxActive - 1] : undefined;
    const ceilingRadiusSq = boundaryStar
      ? (boundaryStar.x - focusPointPc[0]) ** 2 +
        (boundaryStar.y - focusPointPc[1]) ** 2 +
        (boundaryStar.z - focusPointPc[2]) ** 2
      : Number.POSITIVE_INFINITY;

    const existingIds = new Set<string>();
    const baseEntities: SpatialEntityDefinition[] = [];

    if (additionalEntities) {
      for (const ent of additionalEntities) {
        if (!existingIds.has(ent.id)) {
          if (hasReachedCeiling && Array.isArray(ent.position)) {
            const dx = ent.position[0] - focusPointPc[0];
            const dy = ent.position[1] - focusPointPc[1];
            const dz = ent.position[2] - focusPointPc[2];
            if (dx * dx + dy * dy + dz * dz > ceilingRadiusSq) {
              continue;
            }
          }
          existingIds.add(ent.id);
          baseEntities.push(ent);
        }
      }
    }

    // Add the nearest non-duplicate streamed stars as reticle entities only if within activeCutoff
    const activeCutoff = getApertureActiveCutoffForViewportWidth();
    if (hasHydrated && streamedSummaries.length > 0 && streamedSummaries.length <= activeCutoff) {
      let activeCount = 0;
      for (let i = 0; i < streamedSummaries.length && activeCount < maxActive; i++) {
        const s = streamedSummaries[i];
        if (!s) continue;

        if (existingIds.has(s.id)) {
          activeCount++;
          continue;
        }

        const classification: CelestialClassification = (() => {
          if (!s.spect) return 'star';
          if (/^D/i.test(s.spect)) return 'white-dwarf';
          if (/^[LTY]/i.test(s.spect)) return 'brown-dwarf';
          if (/^PSR/i.test(s.spect)) return 'neutron-star';
          return 'star';
        })();
        const planets: PlanetCensusEntry[] | undefined = s.planetCensus?.map((cat, idx) => ({
          id: `${s.id}-planet-${idx}`,
          name: `Planet ${idx + 1}`,
          classification: cat,
        }));

        existingIds.add(s.id);
        baseEntities.push({
          id: s.id,
          name: s.name,
          position: [s.x, s.y, s.z],
          classification,
          spectralType: s.spect,
          multiplicity: s.starCount,
          ...(planets && planets.length > 0 ? { planets } : {}),
        });
        activeCount++;
      }
    }

    return baseEntities;
  }, [additionalEntities, streamedSummaries, hasHydrated, focusPointPc, budget.maxActiveEntities]);

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
