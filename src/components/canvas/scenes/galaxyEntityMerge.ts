import type { PlanetCensusEntry } from '../../../types/spatial';
import type { SystemSummaryNode } from '../../../types/astro';
import { toUrlSlug } from '../../../utils/datasetLayerSlugs';
import type { SpatialEntityDefinition } from '../entity';

/**
 * Upper bound on streamed stars rendered as individual reticle entities (nearest to the focus first).
 * Every star inside the aperture is still active in the objects panel regardless of this bound.
 */
export const GALAXY_SCENE_MAX_STREAMED_ENTITIES = 1200;

export interface StreamedEntitiesIndex {
  readonly streamedEntities: SpatialEntityDefinition[];
  readonly streamedEntityById: ReadonlyMap<string, SpatialEntityDefinition>;
  readonly streamedEntityBySlug: ReadonlyMap<string, SpatialEntityDefinition>;
  readonly summaryById: ReadonlyMap<string, SystemSummaryNode>;
  readonly summaryBySlug: ReadonlyMap<string, SystemSummaryNode>;
}

const resolveSummaryPlanets = (s: SystemSummaryNode): PlanetCensusEntry[] | undefined =>
  s.planetCensus?.map((cat, idx) => ({
    id: `${s.id}-planet-${idx}`,
    name: `Planet ${idx + 1}`,
    classification: cat,
  }));

const SUMMARY_ENTITY_CACHE = new WeakMap<SystemSummaryNode, SpatialEntityDefinition>();

export function summaryToEntityDefinition(s: SystemSummaryNode): SpatialEntityDefinition {
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
}

export function buildStreamedEntitiesIndex(
  streamedSummaries: readonly SystemSummaryNode[],
  hasHydrated: boolean,
  maxActiveEntities: number,
  activeCutoff: number,
  prevStreamedEntitiesRef: { current: SpatialEntityDefinition[] },
): StreamedEntitiesIndex {
  const maxActive = Math.min(maxActiveEntities, GALAXY_SCENE_MAX_STREAMED_ENTITIES);
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
}

export function mergeGalaxyEntities(
  additionalEntities: readonly SpatialEntityDefinition[] | undefined,
  index: StreamedEntitiesIndex,
  streamedSummaries: readonly SystemSummaryNode[],
  focusPointPc: readonly [number, number, number],
  maxActiveEntities: number,
): SpatialEntityDefinition[] {
  const {
    streamedEntities,
    streamedEntityById,
    streamedEntityBySlug,
    summaryById,
    summaryBySlug,
  } = index;

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

  const maxActive = Math.min(maxActiveEntities, GALAXY_SCENE_MAX_STREAMED_ENTITIES);
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
}
