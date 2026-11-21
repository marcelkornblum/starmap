import type { DatasetLayerIndexEntry } from '../../types/datasetLayers';
import { findCanonLayerById, toUrlSlug } from '../../utils/datasetLayerSlugs';
import { parseLayerQueryParam } from '../../utils/url';
import { isCatalogTag } from './searchTagDefinitions';
import type { UrlSelectToken } from './searchTypes';

/**
 * Pure parser extracting structured selection tokens (`tag:<slug>`, `layer:<slug>`,
 * `star-type:<slug>`, `planet-type:<slug>`, or `<entityId>`)
 * from a URL search string's `?select=` parameter.
 */
export const parseUrlSelectTokens = (
  searchString: string,
  layerIndex: readonly DatasetLayerIndexEntry[],
): readonly UrlSelectToken[] => {
  const params = new URLSearchParams(searchString);
  const rawValues = params.getAll('select');
  const tokens: UrlSelectToken[] = [];

  for (const rawValue of rawValues) {
    for (const part of rawValue.split(',')) {
      const token = part.trim();
      if (!token) {
        continue;
      }
      const tagMatch = /^tag:(.+)$/i.exec(token);
      if (tagMatch?.[1]) {
        const candidateTag = tagMatch[1].trim();
        if (isCatalogTag(candidateTag)) {
          tokens.push({ kind: 'tag', tag: candidateTag });
        }
        continue;
      }

      const layerMatch = /^layer:(.+)$/i.exec(token);
      if (layerMatch?.[1]) {
        const rawSlug = layerMatch[1].trim().split(':')[0];
        if (!rawSlug) {
          continue;
        }
        const matchedLayer = findCanonLayerById(rawSlug, layerIndex);
        if (matchedLayer) {
          tokens.push({ kind: 'layer', layerId: matchedLayer.layerId });
        }
        continue;
      }

      const starTypeMatch = /^star-type:(.+)$/i.exec(token);
      if (starTypeMatch?.[1]) {
        const candidateStarType = toUrlSlug(starTypeMatch[1]);
        if (candidateStarType.length > 0) {
          tokens.push({ kind: 'star-type', starType: candidateStarType });
        }
        continue;
      }

      const planetTypeMatch = /^planet-type:(.+)$/i.exec(token);
      if (planetTypeMatch?.[1]) {
        const candidatePlanetType = toUrlSlug(planetTypeMatch[1]);
        if (candidatePlanetType.length > 0) {
          tokens.push({ kind: 'planet-type', planetType: candidatePlanetType });
        }
        continue;
      }

      const entitySlug = toUrlSlug(token);
      if (entitySlug.length > 0 && entitySlug !== 'search') {
        tokens.push({ kind: 'entity', slug: entitySlug });
      }
    }
  }

  return tokens;
};

/**
 * Pure parser extracting the first active catalog or canon tag from `?select=tag:<tag>`.
 */
export const extractUrlTagFocus = (searchString: string): string | null => {
  const tagToken = parseUrlSelectTokens(searchString, []).find(
    (t): t is Extract<UrlSelectToken, { readonly kind: 'tag' }> => t.kind === 'tag',
  );
  return tagToken ? tagToken.tag : null;
};

/**
 * Pure parser extracting the first active layer ID from `?select=layer:<slug>` or `?layer=<layerId>`.
 */
export const extractUrlLayerId = (
  searchString: string,
  layerIndex: readonly DatasetLayerIndexEntry[],
): string | null => {
  const layerToken = parseUrlSelectTokens(searchString, layerIndex).find(
    (t): t is Extract<UrlSelectToken, { readonly kind: 'layer' }> => t.kind === 'layer',
  );
  if (layerToken) {
    return layerToken.layerId;
  }
  const rawLayer = new URLSearchParams(searchString).get('layer');
  const parsed = parseLayerQueryParam(rawLayer);
  if (parsed) {
    const matched = findCanonLayerById(parsed.layerSlug, layerIndex);
    return matched ? matched.layerId : parsed.layerSlug;
  }
  return null;
};

/**
 * Pure helper extracting structured selection slugs across tags, layers, types, and entities.
 */
export const extractUrlSelectSlugs = (
  searchString: string,
  layerIndex: readonly DatasetLayerIndexEntry[],
): {
  readonly tags: readonly string[];
  readonly layerSlugs: readonly string[];
  readonly starTypes: readonly string[];
  readonly planetTypes: readonly string[];
  readonly entitySlugs: readonly string[];
} => {
  const tokens = parseUrlSelectTokens(searchString, layerIndex);
  const tags: string[] = [];
  const layerSlugs: string[] = [];
  const starTypes: string[] = [];
  const planetTypes: string[] = [];
  const entitySlugs: string[] = [];

  for (const t of tokens) {
    if (t.kind === 'tag') tags.push(t.tag);
    else if (t.kind === 'layer') layerSlugs.push(t.layerId);
    else if (t.kind === 'star-type') starTypes.push(t.starType);
    else if (t.kind === 'planet-type') planetTypes.push(t.planetType);
    else if (t.kind === 'entity') entitySlugs.push(t.slug);
  }

  return {
    tags,
    layerSlugs,
    starTypes,
    planetTypes,
    entitySlugs,
  };
};
