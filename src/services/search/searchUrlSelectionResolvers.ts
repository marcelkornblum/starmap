import type { SpatialEntityDefinition } from '../../types/spatial';
import type {
  DatasetLayerIndexEntry,
  DatasetLayerManifest,
} from '../../types/datasetLayers';
import type { CompactSearchEntry } from '../../utils/compactDataTypes';
import { findCanonLayerById } from '../../utils/datasetLayerSlugs';
import { formatSlugFallbackTitle } from '../../utils/starNaming';
import {
  findFocusedEntryInCorpus,
  resolveResultDisplayTitle,
  resolveReticleType,
} from './searchCorpusHelpers';
import { normaliseTagKey } from './searchTagDefinitions';
import { doesSystemEntryMatchTag } from './searchTagTriggers';
import { parseUrlSelectTokens } from './searchUrlSelection';
import {
  resolveSelectedSystemsFromPlanetType,
  resolveSelectedSystemsFromStarType,
} from './searchTypeSelection';
import { resolveFocusedEntityFromCorpus } from './searchSelection';

const registerLayerEntrySystem = (
  systemsById: Map<string, SpatialEntityDefinition>,
  entry: {
    readonly systemId?: string;
    readonly targetId: string;
    readonly targetType: string;
    readonly inUniverseName?: string;
  },
  corpus: readonly CompactSearchEntry[],
): void => {
  const systemId = entry.systemId || entry.targetId;
  if (!systemId || systemsById.has(systemId)) {
    return;
  }

  const matched = findFocusedEntryInCorpus(systemId, corpus);
  if (matched) {
    systemsById.set(matched.i, {
      id: matched.i,
      name: resolveResultDisplayTitle(matched),
      position: matched.p
        ? [matched.p[0], matched.p[1], matched.p[2]]
        : [0, 0, 0],
      classification: resolveReticleType(matched),
      ...(matched.m?.[1] ? { spectralType: matched.m[1] } : {}),
    });
  } else {
    systemsById.set(systemId, {
      id: systemId,
      name: formatSlugFallbackTitle(systemId),
      position: [0, 0, 0],
      classification: 'stellar-system',
    });
  }
};

/**
 * Pure unit function resolving all deduplicated host star systems that match a
 * catalog system tag (`ExoplanetHost`, `SolarNeighborhood10pc`, `NakedEye`, etc.),
 * returning `SpatialEntityDefinition` records to be marked `selected` in `SpatialEntityStore`.
 */
export const resolveSelectedSystemsFromTag = (
  tag: string,
  corpus: readonly CompactSearchEntry[],
): readonly SpatialEntityDefinition[] => {
  const tagKey = normaliseTagKey(tag);
  if (!tagKey) {
    return [];
  }
  const systemsById = new Map<string, SpatialEntityDefinition>();

  for (const entry of corpus) {
    if (doesSystemEntryMatchTag(entry, tagKey)) {
      systemsById.set(entry.i, {
        id: entry.i,
        name: resolveResultDisplayTitle(entry),
        position: entry.p ? [entry.p[0], entry.p[1], entry.p[2]] : [0, 0, 0],
        classification: resolveReticleType(entry),
        ...(entry.m?.[1] ? { spectralType: entry.m[1] } : {}),
      });
    }
  }

  return Array.from(systemsById.values());
};

/**
 * Pure unit function resolving all deduplicated host star systems that have annotations
 * in a specified layer (`layerId`), returning `SpatialEntityDefinition` records
 * to be marked `selected` in `SpatialEntityStore`.
 */
export const resolveSelectedSystemsFromLayer = (
  layerId: string,
  corpus: readonly CompactSearchEntry[],
  activeLayers: readonly DatasetLayerManifest[],
): readonly SpatialEntityDefinition[] => {
  const layer = findCanonLayerById(layerId, activeLayers);
  if (!layer) {
    return [];
  }

  const systemsById = new Map<string, SpatialEntityDefinition>();

  for (const entry of Object.values(layer.entries)) {
    registerLayerEntrySystem(systemsById, entry, corpus);
  }

  return Array.from(systemsById.values());
};

/**
 * Pure unit function resolving all deduplicated entities selected via `?select=`
 * (supporting comma-separated `tag:<slug>`, `layer:<slug>`, `star-type:<slug>`,
 * `planet-type:<slug>`, and explicit `<entityId>` tokens).
 */
export const resolveSelectedSystemsFromUrlSelect = (
  searchString: string,
  corpus: readonly CompactSearchEntry[],
  layerIndex: readonly DatasetLayerIndexEntry[],
  loadedLayers: readonly DatasetLayerManifest[],
): readonly SpatialEntityDefinition[] => {
  const tokens = parseUrlSelectTokens(searchString, layerIndex);

  if (tokens.length === 0) {
    return [];
  }

  const entitiesById = new Map<string, SpatialEntityDefinition>();

  for (const token of tokens) {
    if (token.kind === 'tag') {
      for (const sys of resolveSelectedSystemsFromTag(token.tag, corpus)) {
        entitiesById.set(sys.id, sys);
      }
    } else if (token.kind === 'layer') {
      for (const sys of resolveSelectedSystemsFromLayer(
        token.layerId,
        corpus,
        loadedLayers,
      )) {
        entitiesById.set(sys.id, sys);
      }
    } else if (token.kind === 'star-type') {
      for (const sys of resolveSelectedSystemsFromStarType(
        token.starType,
        corpus,
      )) {
        entitiesById.set(sys.id, sys);
      }
    } else if (token.kind === 'planet-type') {
      for (const sys of resolveSelectedSystemsFromPlanetType(
        token.planetType,
        corpus,
      )) {
        entitiesById.set(sys.id, sys);
      }
    } else {
      const entity = resolveFocusedEntityFromCorpus(token.slug, corpus);
      if (entity) {
        entitiesById.set(entity.id, entity);
      }
    }
  }

  return Array.from(entitiesById.values());
};
