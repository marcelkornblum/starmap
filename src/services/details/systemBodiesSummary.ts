import type { CompactSearchEntry } from '../../utils/compactDataTypes';
import { toUrlSlug } from '../../utils/datasetLayerSlugs';
import {
  isArtificialSpacecraftEntry,
  resolveResultDisplayTitle,
} from '../search/searchCorpusHelpers';
import { resolveFocusedCanonAnnotations } from './detailsCanonAnnotations';
import {
  buildPlanetElementFocusHref,
  buildSystemDetailsHref,
  buildSystemElementFocusHref,
} from './detailsNavigation';
import { getCorpusSystemChildrenIndex } from './focusedChildrenResolver';
import type {
  BuildSystemBodiesSummaryInput,
  SystemBodiesSummary,
  SystemElementBodyItem,
} from './detailsHierarchyTypes';

interface CachedSystemBodiesLists {
  readonly moonsAndDwarfPlanets: readonly SystemElementBodyItem[];
  readonly minorBodiesAndSpacecraft: readonly SystemElementBodyItem[];
}

const systemBodiesCache = new WeakMap<
  readonly CompactSearchEntry[],
  Map<string, CachedSystemBodiesLists>
>();

export const buildSystemBodiesSummary = (
  input: BuildSystemBodiesSummaryInput,
): SystemBodiesSummary | null => {
  const { details, corpus = [], canonRecords = [], selectedEntityIds } = input;
  if (!details) {
    return null;
  }

  const { systemId, systemName, stars, planets, disks } = details;
  const focusedEntityId =
    'focusedEntityId' in input ? input.focusedEntityId : details.id;
  const systemHref = buildSystemDetailsHref(systemName || systemId);

  let perCorpusMap = systemBodiesCache.get(corpus);
  if (!perCorpusMap) {
    perCorpusMap = new Map<string, CachedSystemBodiesLists>();
    systemBodiesCache.set(corpus, perCorpusMap);
  }

  const cacheKey = `${systemId}::${systemName ?? ''}`;
  let cachedLists = perCorpusMap.get(cacheKey);

  if (!cachedLists) {
    const moonsAndDwarfPlanets: SystemElementBodyItem[] = [];
    const minorBodiesAndSpacecraft: SystemElementBodyItem[] = [];

    const systemChildren = getCorpusSystemChildrenIndex(corpus);
    const sysSlug = toUrlSlug(systemId);
    const candidateEntries =
      systemChildren.get(sysSlug) ??
      (systemId !== sysSlug ? systemChildren.get(systemId) : undefined) ??
      [];

    for (const entry of candidateEntries) {
      if (entry.s !== systemId && toUrlSlug(entry.s ?? '') !== sysSlug) {
        continue;
      }
      const name = resolveResultDisplayTitle(entry);
      const isMoon = entry.k === 3 || (Boolean(entry.o) && entry.o !== systemId);
      const href = isMoon && entry.o
        ? buildPlanetElementFocusHref(entry.o, name || entry.i)
        : buildSystemElementFocusHref(
            systemName || systemId,
            name || entry.i,
          );
      if (entry.k === 3 || entry.k === 4) {
        moonsAndDwarfPlanets.push({
          id: entry.i,
          name,
          href,
          categoryKey: entry.k === 3 ? 'moon' : 'dwarf-planet',
          categoryLabel: entry.k === 3 ? 'Moon' : 'Dwarf Planet',
        });
      } else if (entry.k === 6) {
        const isSpacecraft = isArtificialSpacecraftEntry(entry);
        minorBodiesAndSpacecraft.push({
          id: entry.i,
          name,
          href,
          categoryKey: isSpacecraft ? 'spacecraft' : 'asteroid',
          categoryLabel: isSpacecraft ? 'Spacecraft' : 'Minor Body',
        });
      }
    }

    cachedLists = { moonsAndDwarfPlanets, minorBodiesAndSpacecraft };
    perCorpusMap.set(cacheKey, cachedLists);
  }

  const systemCanonAnnotations = resolveFocusedCanonAnnotations(
    systemId,
    systemId,
    canonRecords,
  );

  return {
    scope: 'system',
    systemId,
    systemName,
    systemHref,
    focusedEntityId,
    ...(selectedEntityIds ? { selectedEntityIds } : {}),
    stars,
    planets,
    disks,
    moonsAndDwarfPlanets: cachedLists.moonsAndDwarfPlanets,
    minorBodiesAndSpacecraft: cachedLists.minorBodiesAndSpacecraft,
    canonAnnotations: systemCanonAnnotations,
  };
};
