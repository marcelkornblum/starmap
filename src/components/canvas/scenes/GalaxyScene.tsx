import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SpatialViewport } from '../viewport/SpatialViewport';
import { GALACTIC_FRAME } from '../../../config/referenceFrames';
import { STANDARD_CAMERA_DISTANCES } from '../cartography/cartographyCamera';
import { SectorPointCloud, type SpatialEntityDefinition } from '../entity';
import type { PlanetCensusEntry } from '../../../types/spatial';
import { toUrlSlug } from '../../../utils/datasetLayerSlugs';
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
  s.planetCensus?.map((cat, idx) => ({ id: `${s.id}-planet-${idx}`, name: `Planet ${idx + 1}`, classification: cat }));

const SUMMARY_ENTITY_CACHE = new WeakMap<SystemSummaryNode, SpatialEntityDefinition>();

const summaryToEntityDefinition = (s: SystemSummaryNode): SpatialEntityDefinition => {
  const cached = SUMMARY_ENTITY_CACHE.get(s);
  if (cached) return cached;
  const classification = s.classification ?? 'star';
  const planets = resolveSummaryPlanets(s);
  const def: SpatialEntityDefinition = {
    id: s.id,
    name: s.name,
    position: [s.x, s.y, s.z],
    classification,
    spectralType: s.spect,
    multiplicity: s.starCount,
    ...(planets && planets.length > 0 ? { planets } : {}),
  };
  SUMMARY_ENTITY_CACHE.set(s, def);
  return def;
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

interface GalaxyHydrationSnapshot {
  readonly streamedSummaries: readonly SystemSummaryNode[];
  readonly hasHydrated: boolean;
  readonly focusPointPc: readonly [number, number, number];
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
  const [hydrationState, setHydrationState] = useState<GalaxyHydrationSnapshot>(() => ({
    streamedSummaries: [],
    hasHydrated: useActiveStarsStore.getState().isHydrated,
    focusPointPc: [0, 0, 0],
  }));
  const { streamedSummaries, hasHydrated, focusPointPc } = hydrationState;
  const budget = useMemo(() => getDeviceTierBudget(), []);
  const lastCeilingRadiusRef = useRef<number | null>(null);
  const hasReceivedFirstSummariesRef = useRef(false);
  const prevStreamedEntitiesRef = useRef<SpatialEntityDefinition[]>([]);

  const handleHydratedSummariesChange = useCallback(
    (summaries: readonly SystemSummaryNode[], nextFocusPointPc?: readonly [number, number, number]) => {
      const applyUpdates = () => {
        useActiveStarsStore.getState().setSummaries(summaries);
        setHydrationState((prev) => {
          const summariesUnchanged =
            prev.streamedSummaries.length === summaries.length &&
            prev.streamedSummaries.every((s, idx) => s.id === summaries[idx]?.id);
          const focusUnchanged =
            !nextFocusPointPc ||
            (prev.focusPointPc[0] === nextFocusPointPc[0] &&
              prev.focusPointPc[1] === nextFocusPointPc[1] &&
              prev.focusPointPc[2] === nextFocusPointPc[2]);

          if (prev.hasHydrated && summariesUnchanged && focusUnchanged) {
            return prev;
          }

          return {
            hasHydrated: true,
            streamedSummaries: summariesUnchanged ? prev.streamedSummaries : summaries,
            focusPointPc: focusUnchanged
              ? prev.focusPointPc
              : [nextFocusPointPc[0], nextFocusPointPc[1], nextFocusPointPc[2]],
          };
        });
      };
      if (!hasReceivedFirstSummariesRef.current || import.meta.env.MODE === 'test') {
        hasReceivedFirstSummariesRef.current = true;
        applyUpdates();
      } else {
        React.startTransition(applyUpdates);
      }
    },
    [],
  );

  useEffect(() => () => { useActiveStarsStore.getState().clear(); }, []);

  useEffect(() => {
    let nextRadius: number | null = null;
    if (streamedSummaries.length >= budget.maxActiveEntities) {
      const boundary = streamedSummaries[budget.maxActiveEntities - 1];
      if (boundary) {
        nextRadius = Math.round(Math.hypot(boundary.x - focusPointPc[0], boundary.y - focusPointPc[1], boundary.z - focusPointPc[2]));
      }
    }
    if (lastCeilingRadiusRef.current !== nextRadius) {
      lastCeilingRadiusRef.current = nextRadius;
      onCeilingApertureRadiusChange?.(nextRadius);
    }
  }, [streamedSummaries, focusPointPc, budget.maxActiveEntities, onCeilingApertureRadiusChange]);

  const {
    streamedEntities,
    streamedEntityById,
    streamedEntityBySlug,
    summaryById,
    summaryBySlug,
  } = useMemo(() => {
    const maxActive = Math.min(budget.maxActiveEntities, GALAXY_SCENE_MAX_STREAMED_ENTITIES);
    const activeCutoff = getApertureActiveCutoffForViewportWidth();
    const sMap = new Map<string, SystemSummaryNode>();
    const sSlugMap = new Map<string, SystemSummaryNode>();
    for (const s of streamedSummaries) {
      sMap.set(s.id, s);
      const idSlug = toUrlSlug(s.id);
      if (idSlug) sSlugMap.set(idSlug, s);
      if (s.name) {
        const nameSlug = toUrlSlug(s.name);
        if (nameSlug && !sSlugMap.has(nameSlug)) sSlugMap.set(nameSlug, s);
      }
    }

    const list: SpatialEntityDefinition[] = [];
    const eMap = new Map<string, SpatialEntityDefinition>();
    const eSlugMap = new Map<string, SpatialEntityDefinition>();

    if (hasHydrated && streamedSummaries.length > 0 && streamedSummaries.length <= activeCutoff) {
      const limit = Math.min(streamedSummaries.length, maxActive);
      for (let i = 0; i < limit; i++) {
        const s = streamedSummaries[i];
        if (!s || eMap.has(s.id)) continue;
        const def = summaryToEntityDefinition(s);
        list.push(def);
        eMap.set(s.id, def);
        const idSlug = toUrlSlug(s.id);
        if (idSlug) eSlugMap.set(idSlug, def);
        if (s.name) {
          const nameSlug = toUrlSlug(s.name);
          if (nameSlug && !eSlugMap.has(nameSlug)) eSlugMap.set(nameSlug, def);
        }
      }
      list.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    }

    const prev = prevStreamedEntitiesRef.current;
    const finalStreamedEntities =
      list.length === prev.length && list.every((ent, idx) => ent === prev[idx])
        ? prev
        : (prevStreamedEntitiesRef.current = list);

    return {
      streamedEntities: finalStreamedEntities,
      streamedEntityById: eMap,
      streamedEntityBySlug: eSlugMap,
      summaryById: sMap,
      summaryBySlug: sSlugMap,
    };
  }, [streamedSummaries, hasHydrated, budget.maxActiveEntities]);

  const entities = useMemo<SpatialEntityDefinition[]>(() => {
    if (
      streamedEntities.length > 0 &&
      (!additionalEntities ||
        additionalEntities.length === 0 ||
        additionalEntities.every(
          (ent) =>
            streamedEntityById.has(ent.id) ||
            streamedEntityBySlug.has(toUrlSlug(ent.id)) ||
            (ent.name ? streamedEntityBySlug.has(toUrlSlug(ent.name)) : false),
        ))
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
        const entIdSlug = toUrlSlug(ent.id);
        const entNameSlug = ent.name ? toUrlSlug(ent.name) : undefined;
        const streamedDef =
          streamedEntityById.get(ent.id) ??
          streamedEntityBySlug.get(entIdSlug) ??
          (entNameSlug ? streamedEntityBySlug.get(entNameSlug) : undefined);

        if (streamedDef) {
          if (!existingIds.has(streamedDef.id)) {
            existingIds.add(streamedDef.id);
            baseEntities.push(streamedDef);
          }
          continue;
        }

        if (existingIds.has(ent.id)) {
          continue;
        }

        const matchedSummary =
          summaryById.get(ent.id) ??
          summaryBySlug.get(entIdSlug) ??
          (entNameSlug ? summaryBySlug.get(entNameSlug) : undefined);

        const effectivePos = matchedSummary
          ? ([matchedSummary.x, matchedSummary.y, matchedSummary.z] as [number, number, number])
          : ent.position;

        if (hasReachedCeiling && additionalEntities.length > 24 && Array.isArray(effectivePos)) {
          const dx = effectivePos[0] - focusPointPc[0];
          const dy = effectivePos[1] - focusPointPc[1];
          const dz = effectivePos[2] - focusPointPc[2];
          if (dx * dx + dy * dy + dz * dz > ceilingRadiusSq) continue;
        }
        existingIds.add(ent.id);
        if (matchedSummary && ent.id === matchedSummary.id) {
          baseEntities.push(summaryToEntityDefinition(matchedSummary));
        } else if (matchedSummary) {
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

    for (const def of streamedEntities) {
      if (!existingIds.has(def.id)) {
        existingIds.add(def.id);
        baseEntities.push(def);
      }
    }

    return baseEntities;
  }, [
    additionalEntities, streamedEntities, streamedEntityById, streamedEntityBySlug,
    summaryById, summaryBySlug, streamedSummaries, focusPointPc, budget.maxActiveEntities,
  ]);

  const sectorPointCloudElement = useMemo(
    () => <SectorPointCloud onHydratedSummariesChange={handleHydratedSummariesChange} />,
    [handleHydratedSummariesChange],
  );

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
      {sectorPointCloudElement}
    </SpatialViewport>
  );
});

GalaxyScene.displayName = 'GalaxyScene';
