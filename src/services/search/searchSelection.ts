import type { SpatialEntityDefinition } from '../../types/spatial';
import { SEARCH_CATEGORIES } from '../../types/search';
import type { CompactSearchEntry } from '../../utils/compactDataTypes';
import { computeDistance3D } from '../../utils/spatialMath';
import { formatSlugFallbackTitle } from '../../utils/starNaming';
import { toUrlSlug } from '../../utils/datasetLayerSlugs';
import { buildEntityOrbitTargetHref } from '../details/detailsNavigation';
import {
  findFocusedEntryInCorpus,
  resolveEntryCategory,
  resolveEntityKind,
  resolveResultDisplayTitle,
  resolveReticleType,
} from './searchCorpusHelpers';
import type {
  GroupedSearchResults,
  ResultLinkInput,
  SearchResultItem,
  SearchTargetView,
} from './searchTypes';

const ORIGIN_3D: readonly [number, number, number] = [0, 0, 0];

/**
 * Pure unit function that determines whether a search result navigates to the Galaxy View,
 * System View, or Planetary View based on centralized Orbit-Context targeting (DEC-038).
 */
export const buildResultTargetLink = (
  input: ResultLinkInput,
): { readonly targetView: SearchTargetView; readonly href: string } => {
  return buildEntityOrbitTargetHref(input);
};

/**
 * Pure conversion from a CompactSearchEntry + match score into a domain SearchResultItem.
 */
export const toSearchResultItem = (
  entry: CompactSearchEntry,
  score: number,
  systemName?: string,
  tagSlug?: string,
): SearchResultItem => {
  const displayName = resolveResultDisplayTitle(entry);
  const category = resolveEntryCategory(entry);
  const entityKind = resolveEntityKind(entry);
  const reticleType = resolveReticleType(entry);

  let distancePc: number | undefined;
  let position: readonly [number, number, number] | undefined;
  if (entry.p) {
    const [x, y, z] = entry.p;
    position = [x, y, z];
    distancePc = Math.round(computeDistance3D(entry.p, ORIGIN_3D) * 100) / 100;
  } else if (entry.h === 1) {
    position = ORIGIN_3D;
    distancePc = 0;
  }

  const magnitude = entry.m ? entry.m[0] : undefined;
  const spectralType = entry.m ? entry.m[1] : undefined;
  const planetCount = entry.m ? entry.m[2] : undefined;
  const hasHabitableCandidate = entry.m ? entry.m[3] === 1 : undefined;
  const isSolarSystem = entry.h === 1 ? true : undefined;

  const { targetView, href } = buildResultTargetLink({
    id: entry.i,
    name: displayName,
    entityKind,
    parentBodyId: entry.o,
    systemId: entry.s,
    systemName,
    isSolarSystem,
    layerId: entry.w,
    tagSlug,
  });

  return {
    id: entry.i,
    name: displayName,
    category,
    entityKind,
    reticleType,
    targetView,
    href,
    ...(entry.s ? { systemId: entry.s } : {}),
    ...(systemName ? { systemName } : {}),
    ...(position ? { position } : {}),
    ...(distancePc !== undefined ? { distancePc } : {}),
    ...(magnitude !== undefined ? { magnitude } : {}),
    ...(spectralType !== undefined ? { spectralType } : {}),
    ...(planetCount !== undefined ? { planetCount } : {}),
    ...(hasHabitableCandidate !== undefined ? { hasHabitableCandidate } : {}),
    ...(isSolarSystem ? { isSolarSystem } : {}),
    ...(entry.w ? { canonLayerId: entry.w } : {}),
    ...(entry.c ? { canonTitle: entry.c } : {}),
    ...(tagSlug ? { tagSlug } : {}),
    score,
  };
};

/**
 * Pure unit function resolving all deduplicated star system entities that should be
 * marked `selected` in `SpatialEntityStore` from a set of grouped search results.
 * Includes direct star-system results as well as the parent star systems (`systemId`)
 * of non-system-level results (planets, moons, dwarf planets, minor bodies, fictional entries).
 */
export const resolveSelectedSystemsFromSearchResults = (
  results: GroupedSearchResults,
): readonly SpatialEntityDefinition[] => {
  const systemsById = new Map<string, SpatialEntityDefinition>();

  for (const meta of SEARCH_CATEGORIES) {
    const group = results.groups[meta.key];
    for (const item of group.items) {
      if (item.category === 'stars') {
        systemsById.set(item.id, {
          id: item.id,
          name: item.name,
          position: item.position
            ? [item.position[0], item.position[1], item.position[2]]
            : [0, 0, 0],
          classification: item.reticleType,
          ...(item.spectralType ? { spectralType: item.spectralType } : {}),
        });
      } else if (item.systemId && !systemsById.has(item.systemId)) {
        const resolvedSystemName = item.systemName ?? item.systemId;
        systemsById.set(item.systemId, {
          id: item.systemId,
          name: resolvedSystemName,
          position: item.position
            ? [item.position[0], item.position[1], item.position[2]]
            : [0, 0, 0],
          classification: 'stellar-system',
        });
      }
    }
  }

  return Array.from(systemsById.values());
};

/**
 * Pure unit function resolving the `SpatialEntityDefinition` to mark `focused` in
 * `SpatialEntityStore` from a URL focus slug and search corpus.
 */
export const resolveFocusedEntityFromCorpus = (
  focusSlug: string,
  corpus: readonly CompactSearchEntry[],
): SpatialEntityDefinition | null => {
  const targetSlug = toUrlSlug(focusSlug);
  if (!targetSlug || targetSlug === 'search') {
    return null;
  }

  const matched = findFocusedEntryInCorpus(focusSlug, corpus);
  if (matched) {
    const position: [number, number, number] = matched.p
      ? [matched.p[0], matched.p[1], matched.p[2]]
      : [0, 0, 0];
    return {
      id: matched.i,
      name: resolveResultDisplayTitle(matched),
      position,
      classification: resolveReticleType(matched),
      ...(matched.m?.[1] ? { spectralType: matched.m[1] } : {}),
    };
  }

  return {
    id: targetSlug,
    name: formatSlugFallbackTitle(targetSlug),
    position: [0, 0, 0],
    classification: 'stellar-system',
  };
};
