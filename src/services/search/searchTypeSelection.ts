import type { SpatialEntityDefinition } from '../../types/spatial';
import type { CompactSearchEntry } from '../../utils/compactDataTypes';
import { toUrlSlug } from '../../utils/datasetLayerSlugs';
import { formatSlugFallbackTitle } from '../../utils/starNaming';
import {
  findFocusedEntryInCorpus,
  resolveEntryCategory,
  resolveResultDisplayTitle,
  resolveReticleType,
} from './searchCorpusHelpers';

/**
 * Pure unit function resolving all deduplicated star systems that match a specified star type
 * (e.g. 'G', 'G2V', 'white-dwarf', 'brown-dwarf', 'neutron-star') from `?select=star-type:<starType>`.
 */
export const resolveSelectedSystemsFromStarType = (
  starType: string,
  corpus: readonly CompactSearchEntry[],
): readonly SpatialEntityDefinition[] => {
  const normStarType = toUrlSlug(starType.trim().replace(/^star-type:/i, ''));
  if (!normStarType) {
    return [];
  }

  const cleanStarType = normStarType.replace(/[^a-z0-9]/g, '');
  const isReticleClass =
    normStarType === 'white-dwarf' ||
    normStarType === 'brown-dwarf' ||
    normStarType === 'neutron-star';

  const systemsById = new Map<string, SpatialEntityDefinition>();

  for (const entry of corpus) {
    if (resolveEntryCategory(entry) !== 'stars') {
      continue;
    }

    let matches = false;
    if (isReticleClass) {
      matches = resolveReticleType(entry) === normStarType;
    } else {
      const entrySpectClean = (entry.m?.[1] ?? '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      matches = entrySpectClean.length > 0 && entrySpectClean.startsWith(cleanStarType);
    }

    if (matches) {
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
 * Pure unit function resolving all deduplicated host star systems of matching planet entries
 * (e.g. 'terrestrial', 'super-earth', 'sub-neptune', 'gas-giant') from `?select=planet-type:<planetType>`.
 * Falls back to star `entry.b` composition counts tuple [terrestrialAndSuperEarth, subNeptune, gasGiant]
 * when no child planet entries are in the corpus.
 */
export const resolveSelectedSystemsFromPlanetType = (
  planetType: string,
  corpus: readonly CompactSearchEntry[],
): readonly SpatialEntityDefinition[] => {
  const normPlanetType = toUrlSlug(planetType.trim().replace(/^planet-type:/i, ''));
  if (!normPlanetType) {
    return [];
  }

  const systemsById = new Map<string, SpatialEntityDefinition>();
  const matchingHostSystemIds = new Set<string>();

  const childPlanetEntries = corpus.filter((e) => e.k === 2);
  for (const planet of childPlanetEntries) {
    const rawType = planet.u ? toUrlSlug(planet.u) : resolveReticleType(planet);
    const matches =
      rawType === normPlanetType ||
      (normPlanetType === 'super-earth' && rawType === 'super-earth') ||
      (normPlanetType === 'terrestrial' && rawType === 'terrestrial') ||
      (normPlanetType === 'sub-neptune' && (rawType === 'sub-neptune' || rawType === 'ice-giant')) ||
      (normPlanetType === 'ice-giant' && (rawType === 'ice-giant' || rawType === 'sub-neptune')) ||
      (normPlanetType === 'gas-giant' && rawType === 'gas-giant');

    if (matches && planet.s) {
      matchingHostSystemIds.add(planet.s);
    }
  }

  if (childPlanetEntries.length === 0 || matchingHostSystemIds.size === 0) {
    for (const entry of corpus) {
      if (resolveEntryCategory(entry) === 'stars' && entry.b) {
        let count = 0;
        if (entry.b.length === 4) {
          if (normPlanetType === 'terrestrial') count = entry.b[0] ?? 0;
          else if (normPlanetType === 'super-earth') count = entry.b[1] ?? 0;
          else if (normPlanetType === 'sub-neptune' || normPlanetType === 'ice-giant') count = entry.b[2] ?? 0;
          else if (normPlanetType === 'gas-giant') count = entry.b[3] ?? 0;
        } else {
          if (normPlanetType === 'terrestrial' || normPlanetType === 'super-earth') count = entry.b[0] ?? 0;
          else if (normPlanetType === 'sub-neptune' || normPlanetType === 'ice-giant') count = entry.b[1] ?? 0;
          else if (normPlanetType === 'gas-giant') count = entry.b[2] ?? 0;
        }
        if (count > 0) {
          matchingHostSystemIds.add(entry.i);
        }
      }
    }
  }

  for (const hostId of matchingHostSystemIds) {
    const matched = findFocusedEntryInCorpus(hostId, corpus);
    if (matched) {
      systemsById.set(matched.i, {
        id: matched.i,
        name: resolveResultDisplayTitle(matched),
        position: matched.p ? [matched.p[0], matched.p[1], matched.p[2]] : [0, 0, 0],
        classification: resolveReticleType(matched),
        ...(matched.m?.[1] ? { spectralType: matched.m[1] } : {}),
      });
    } else {
      systemsById.set(hostId, {
        id: hostId,
        name: formatSlugFallbackTitle(hostId),
        position: [0, 0, 0],
        classification: 'stellar-system',
      });
    }
  }

  return Array.from(systemsById.values());
};
