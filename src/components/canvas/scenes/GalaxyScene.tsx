import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SpatialViewport } from '../viewport/SpatialViewport';
import { GALACTIC_FRAME } from '../instrument/referenceFrame';
import { STANDARD_CAMERA_DISTANCES } from '../cartography/cartographyMath';
import { SectorPointCloud, type SpatialEntityDefinition } from '../entity';
import type { PlanetCensusEntry } from '../cartography/reticleGeometry';
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

const resolveSummaryPlanets = (s: SystemSummaryNode): PlanetCensusEntry[] | undefined =>
  s.planetCensus?.map((cat, idx) => ({
    id: `${s.id}-planet-${idx}`,
    name: `Planet ${idx + 1}`,
    classification: cat,
  }));

const summaryToEntityDefinition = (s: SystemSummaryNode): SpatialEntityDefinition => {
  const classification = s.classification ?? 'star';
  const planets = resolveSummaryPlanets(s);
  return {
    id: s.id,
    name: s.name,
    position: [s.x, s.y, s.z],
    classification,
    spectralType: s.spect,
    multiplicity: s.starCount,
    ...(planets && planets.length > 0 ? { planets } : {}),
  };
};

export interface GalaxySceneProps {
  additionalEntities?: readonly SpatialEntityDefinition[];
  initialSelectedId?: string | null;
  onInspectSystem?: (systemId: string) => void;
  onSelectSystem?: (systemId: string | null) => void;
  onFocusChange?: (systemId: string | null) => void;
  debugHitarea?: boolean;
  onCeilingApertureRadiusChange?: (radiusPc: number | null) => void;
}

/**
 * GalaxyScene: Canonical production scene for Milky Way top-level galactic cartography.
 * Renders streamed 3D sector point cloud and nearest stellar nodes mapped into GALACTIC_FRAME.
 */
export const GalaxyScene: React.FC<GalaxySceneProps> = React.memo(({
  additionalEntities,
  initialSelectedId,
  onInspectSystem,
  onSelectSystem,
  onFocusChange,
  debugHitarea = false,
  onCeilingApertureRadiusChange,
}) => {
  const [streamedSummaries, setStreamedSummaries] = useState<readonly SystemSummaryNode[]>([]);
  const [hasHydrated, setHasHydrated] = useState(() => useActiveStarsStore.getState().isHydrated);
  const [focusPointPc, setFocusPointPc] = useState<readonly [number, number, number]>([0, 0, 0]);
  const budget = useMemo(() => getDeviceTierBudget(), []);
  const lastCeilingRadiusRef = useRef<number | null>(null);

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
    let nextRadius: number | null = null;
    if (streamedSummaries.length >= budget.maxActiveEntities) {
      const boundaryStar = streamedSummaries[budget.maxActiveEntities - 1];
      if (boundaryStar) {
        const dx = boundaryStar.x - focusPointPc[0];
        const dy = boundaryStar.y - focusPointPc[1];
        const dz = boundaryStar.z - focusPointPc[2];
        nextRadius = Math.round(Math.hypot(dx, dy, dz));
      }
    }

    if (lastCeilingRadiusRef.current !== nextRadius) {
      lastCeilingRadiusRef.current = nextRadius;
      onCeilingApertureRadiusChange?.(nextRadius);
    }
  }, [streamedSummaries, focusPointPc, budget.maxActiveEntities, onCeilingApertureRadiusChange]);

  const { streamedEntities, streamedEntityById, summaryById } = useMemo(() => {
    const maxActive = Math.min(budget.maxActiveEntities, GALAXY_SCENE_MAX_STREAMED_ENTITIES);
    const activeCutoff = getApertureActiveCutoffForViewportWidth();
    const sMap = new Map<string, SystemSummaryNode>();
    for (const s of streamedSummaries) {
      sMap.set(s.id, s);
    }

    const list: SpatialEntityDefinition[] = [];
    const eMap = new Map<string, SpatialEntityDefinition>();

    if (hasHydrated && streamedSummaries.length > 0 && streamedSummaries.length <= activeCutoff) {
      const limit = Math.min(streamedSummaries.length, maxActive);
      for (let i = 0; i < limit; i++) {
        const s = streamedSummaries[i];
        if (!s || eMap.has(s.id)) continue;
        const def = summaryToEntityDefinition(s);
        list.push(def);
        eMap.set(s.id, def);
      }
    }

    return { streamedEntities: list, streamedEntityById: eMap, summaryById: sMap };
  }, [streamedSummaries, hasHydrated, budget.maxActiveEntities]);

  const entities = useMemo<SpatialEntityDefinition[]>(() => {
    if (
      streamedEntities.length > 0 &&
      (!additionalEntities ||
        additionalEntities.length === 0 ||
        additionalEntities.every((ent) => streamedEntityById.has(ent.id)))
    ) {
      return streamedEntities;
    }

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
          const streamedDef = streamedEntityById.get(ent.id);
          if (streamedDef) {
            existingIds.add(ent.id);
            baseEntities.push(streamedDef);
            continue;
          }

          const matchedSummary = summaryById.get(ent.id);
          const effectivePos = matchedSummary
            ? ([matchedSummary.x, matchedSummary.y, matchedSummary.z] as [number, number, number])
            : ent.position;

          if (hasReachedCeiling && Array.isArray(effectivePos)) {
            const dx = effectivePos[0] - focusPointPc[0];
            const dy = effectivePos[1] - focusPointPc[1];
            const dz = effectivePos[2] - focusPointPc[2];
            if (dx * dx + dy * dy + dz * dz > ceilingRadiusSq) {
              continue;
            }
          }
          existingIds.add(ent.id);
          if (matchedSummary) {
            const planets = resolveSummaryPlanets(matchedSummary) ?? ent.planets;
            baseEntities.push({
              ...ent,
              name: ent.name || matchedSummary.name,
              position: effectivePos,
              classification: matchedSummary.classification ?? ent.classification ?? 'star',
              spectralType: matchedSummary.spect || ent.spectralType,
              multiplicity: matchedSummary.starCount ?? ent.multiplicity,
              ...(planets && planets.length > 0 ? { planets } : {}),
            });
          } else {
            baseEntities.push(ent);
          }
        }
      }
    }

    for (const def of streamedEntities) {
      if (!existingIds.has(def.id)) {
        existingIds.add(def.id);
        baseEntities.push(def);
      }
    }

    return baseEntities;
  }, [
    additionalEntities,
    streamedEntities,
    streamedEntityById,
    summaryById,
    streamedSummaries,
    focusPointPc,
    budget.maxActiveEntities,
  ]);

  return (
    <SpatialViewport
      frame={GALACTIC_FRAME}
      entities={entities}
      cameraDistance={STANDARD_CAMERA_DISTANCES.galactic}
      initialSelectedId={initialSelectedId}
      onInspect={onInspectSystem}
      onSelect={onSelectSystem}
      onFocusChange={onFocusChange}
      debugHitarea={debugHitarea}
    >
      <SectorPointCloud onHydratedSummariesChange={handleHydratedSummariesChange} />
    </SpatialViewport>
  );
});

GalaxyScene.displayName = 'GalaxyScene';
