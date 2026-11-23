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

const resolveSummaryPlanets = (summary: SystemSummaryNode): PlanetCensusEntry[] | undefined =>
  summary.planetCensus?.map((category, index) => ({
    id: `${summary.id}-planet-${index}`,
    name: `Planet ${index + 1}`,
    classification: category,
  }));

const SUMMARY_ENTITY_CACHE = new WeakMap<SystemSummaryNode, SpatialEntityDefinition>();

export function summaryToEntityDefinition(summary: SystemSummaryNode): SpatialEntityDefinition {
  const cached = SUMMARY_ENTITY_CACHE.get(summary);
  if (cached) return cached;
  const classification = summary.classification ?? 'star';
  const planets = resolveSummaryPlanets(summary);
  const definition: SpatialEntityDefinition = {
    id: summary.id,
    name: summary.name,
    position: [summary.x, summary.y, summary.z],
    classification,
    spectralType: summary.spect,
    multiplicity: summary.starCount,
    ...(planets && planets.length > 0 ? { planets } : {}),
  };
  SUMMARY_ENTITY_CACHE.set(summary, definition);
  return definition;
}

export function buildStreamedEntitiesIndex(
  streamedSummaries: readonly SystemSummaryNode[],
  hasHydrated: boolean,
  maxActiveEntities: number,
  activeCutoff: number,
  prevStreamedEntitiesRef: { current: SpatialEntityDefinition[] },
): StreamedEntitiesIndex {
  const maxActive = Math.min(maxActiveEntities, GALAXY_SCENE_MAX_STREAMED_ENTITIES);
  const summaryById = new Map<string, SystemSummaryNode>();
  const summaryBySlug = new Map<string, SystemSummaryNode>();
  for (const summary of streamedSummaries) {
    summaryById.set(summary.id, summary);
    const idSlug = toUrlSlug(summary.id);
    if (idSlug) summaryBySlug.set(idSlug, summary);
    if (summary.name) {
      const nameSlug = toUrlSlug(summary.name);
      if (nameSlug && !summaryBySlug.has(nameSlug)) summaryBySlug.set(nameSlug, summary);
    }
  }

  const list: SpatialEntityDefinition[] = [];
  const entityById = new Map<string, SpatialEntityDefinition>();
  const entityBySlug = new Map<string, SpatialEntityDefinition>();

  if (hasHydrated && streamedSummaries.length > 0 && streamedSummaries.length <= activeCutoff) {
    const limit = Math.min(streamedSummaries.length, maxActive);
    for (let i = 0; i < limit; i++) {
      const summary = streamedSummaries[i];
      if (!summary || entityById.has(summary.id)) continue;
      const definition = summaryToEntityDefinition(summary);
      list.push(definition);
      entityById.set(summary.id, definition);
      const idSlug = toUrlSlug(summary.id);
      if (idSlug) entityBySlug.set(idSlug, definition);
      if (summary.name) {
        const nameSlug = toUrlSlug(summary.name);
        if (nameSlug && !entityBySlug.has(nameSlug)) entityBySlug.set(nameSlug, definition);
      }
    }
    list.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  }

  const previousEntities = prevStreamedEntitiesRef.current;
  const finalStreamedEntities =
    list.length === previousEntities.length &&
    list.every((entity, index) => entity === previousEntities[index])
      ? previousEntities
      : (prevStreamedEntitiesRef.current = list);

  return {
    streamedEntities: finalStreamedEntities,
    streamedEntityById: entityById,
    streamedEntityBySlug: entityBySlug,
    summaryById,
    summaryBySlug,
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
        (entity) =>
          streamedEntityById.has(entity.id) ||
          streamedEntityBySlug.has(toUrlSlug(entity.id)) ||
          (entity.name ? streamedEntityBySlug.has(toUrlSlug(entity.name)) : false),
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
    for (const entity of additionalEntities) {
      const entityIdSlug = toUrlSlug(entity.id);
      const entityNameSlug = entity.name ? toUrlSlug(entity.name) : undefined;
      const streamedDef =
        streamedEntityById.get(entity.id) ??
        streamedEntityBySlug.get(entityIdSlug) ??
        (entityNameSlug ? streamedEntityBySlug.get(entityNameSlug) : undefined);

      if (streamedDef) {
        if (!existingIds.has(streamedDef.id)) {
          existingIds.add(streamedDef.id);
          baseEntities.push(streamedDef);
        }
        continue;
      }

      if (existingIds.has(entity.id)) {
        continue;
      }

      const matchedSummary =
        summaryById.get(entity.id) ??
        summaryBySlug.get(entityIdSlug) ??
        (entityNameSlug ? summaryBySlug.get(entityNameSlug) : undefined);

      const effectivePos: SpatialEntityDefinition['position'] = matchedSummary
        ? [matchedSummary.x, matchedSummary.y, matchedSummary.z]
        : entity.position;

      if (hasReachedCeiling && additionalEntities.length > 24 && Array.isArray(effectivePos)) {
        const dx = effectivePos[0] - focusPointPc[0];
        const dy = effectivePos[1] - focusPointPc[1];
        const dz = effectivePos[2] - focusPointPc[2];
        if (dx * dx + dy * dy + dz * dz > ceilingRadiusSq) continue;
      }
      existingIds.add(entity.id);
      if (matchedSummary && entity.id === matchedSummary.id) {
        baseEntities.push(summaryToEntityDefinition(matchedSummary));
      } else if (matchedSummary) {
        const planets = resolveSummaryPlanets(matchedSummary) ?? entity.planets;
        baseEntities.push({
          ...entity,
          name: entity.name || matchedSummary.name,
          position: effectivePos,
          classification: matchedSummary.classification ?? entity.classification ?? 'star',
          spectralType: matchedSummary.spect || entity.spectralType,
          multiplicity: matchedSummary.starCount ?? entity.multiplicity,
          ...(planets && planets.length > 0 ? { planets } : {}),
        });
      } else {
        baseEntities.push(entity);
      }
    }
  }

  for (const definition of streamedEntities) {
    if (!existingIds.has(definition.id)) {
      existingIds.add(definition.id);
      baseEntities.push(definition);
    }
  }

  return baseEntities;
}
