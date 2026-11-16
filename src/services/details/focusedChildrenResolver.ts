import type { CompactSearchEntry } from '../../utils/compactDataTypes';
import {
  isArtificialSpacecraftEntry,
  resolveResultDisplayTitle,
} from '../search/searchCorpusHelpers';
import { toUrlSlug } from '../../utils/datasetLayerSlugs';
import { getMergedCorpusParts } from './activeStarsCorpus';
import { isDwarfPlanetInDisk, resolveMinorBodyCategoryLabel } from './detailsHazards';
import {
  buildPlanetElementFocusHref,
  buildSystemElementFocusHref,
} from './detailsNavigation';
import type { FocusedDiskDetail } from './detailsEntityTypes';
import type {
  SystemElementBodyItem,
  SystemElementCategoryKey,
} from './detailsHierarchyTypes';

const corpusSystemChildrenCache = new WeakMap<
  readonly CompactSearchEntry[],
  ReadonlyMap<string, readonly CompactSearchEntry[]>
>();

export function getCorpusSystemChildrenIndex(
  corpus: readonly CompactSearchEntry[],
): ReadonlyMap<string, readonly CompactSearchEntry[]> {
  let index = corpusSystemChildrenCache.get(corpus);
  if (!index) {
    const parts = getMergedCorpusParts(corpus);
    if (parts && parts.extras.every((e) => !e.s)) {
      index = getCorpusSystemChildrenIndex(parts.base);
      corpusSystemChildrenCache.set(corpus, index);
      return index;
    }

    const map = new Map<string, CompactSearchEntry[]>();
    for (const entry of corpus) {
      if (!entry.s) continue;
      const rawS = entry.s;
      const slugS = toUrlSlug(rawS);

      let list = map.get(slugS);
      if (!list) {
        list = [];
        map.set(slugS, list);
      }
      if (rawS !== slugS && !map.has(rawS)) {
        map.set(rawS, list);
      }
      list.push(entry);
    }
    corpusSystemChildrenCache.set(corpus, map);
    index = map;
  }
  return index;
}

export const resolveOrbitingBodies = (
  planetTargetSlugs: ReadonlySet<string>,
  systemNameOrId: string,
  corpus: readonly CompactSearchEntry[],
  urlPlanetSlug?: string | null,
): readonly SystemElementBodyItem[] => {
  if (planetTargetSlugs.size === 0 || corpus.length === 0) {
    return [];
  }
  const systemIndex = getCorpusSystemChildrenIndex(corpus);
  const sysSlug = toUrlSlug(systemNameOrId);
  const systemEntries =
    systemIndex.get(sysSlug) ??
    (systemNameOrId !== sysSlug ? systemIndex.get(systemNameOrId) : undefined);

  const candidates = systemEntries ?? corpus;
  const items: SystemElementBodyItem[] = [];
  for (const entry of candidates) {
    if (!entry.o) {
      continue;
    }
    const parentSlug = toUrlSlug(entry.o);
    if (!planetTargetSlugs.has(parentSlug)) {
      continue;
    }
    const name = resolveResultDisplayTitle(entry);
    const parentPlanetSlug = urlPlanetSlug || parentSlug;
    const isMoon = entry.k === 3;
    const isDwarf = entry.k === 4;
    const isSpacecraft = isArtificialSpacecraftEntry(entry);
    const categoryKey: SystemElementCategoryKey = isMoon
      ? 'moon'
      : isDwarf
        ? 'dwarf-planet'
        : isSpacecraft
          ? 'spacecraft'
          : 'asteroid';

    items.push({
      id: entry.i,
      name,
      href: buildPlanetElementFocusHref(parentPlanetSlug, name || entry.i),
      categoryKey,
      categoryLabel: resolveMinorBodyCategoryLabel(entry),
    });
  }
  return items;
};

export const resolveDiskResidentBodies = (
  disk: FocusedDiskDetail,
  systemNameOrId: string,
  corpusEntries: readonly CompactSearchEntry[],
  systemId: string,
  urlPlanet?: string | null,
): readonly SystemElementBodyItem[] => {
  const items: SystemElementBodyItem[] = [];
  const systemIndex = getCorpusSystemChildrenIndex(corpusEntries);
  const sysSlug = toUrlSlug(systemId);
  const candidateEntries =
    systemIndex.get(sysSlug) ??
    (systemId !== sysSlug ? systemIndex.get(systemId) : undefined) ??
    corpusEntries;
  for (const entry of candidateEntries) {
    if (entry.s !== systemId && toUrlSlug(entry.s ?? '') !== sysSlug) continue;
    if (entry.o) continue;
    if (entry.k !== 4 && entry.k !== 6) continue;
    if (isDwarfPlanetInDisk(entry, disk)) {
      const name = resolveResultDisplayTitle(entry);
      const isSpacecraft = isArtificialSpacecraftEntry(entry);
      const categoryKey: SystemElementCategoryKey = entry.k === 4
        ? 'dwarf-planet'
        : isSpacecraft
          ? 'spacecraft'
          : 'asteroid';

      items.push({
        id: entry.i,
        name,
        href: urlPlanet
          ? buildPlanetElementFocusHref(urlPlanet, name || entry.i)
          : buildSystemElementFocusHref(systemNameOrId, name || entry.i),
        categoryKey,
        categoryLabel: resolveMinorBodyCategoryLabel(entry),
      });
    }
  }
  return items;
};
