import {
  SEARCH_CATEGORIES,
  type SearchCategoryFilter,
  type SearchCategoryKey,
} from '../../types/search';
import type { CompactSearchEntry } from '../../utils/compactDataTypes';
import { formatSlugFallbackTitle } from '../../utils/starNaming';
import {
  resolveEntryCategory,
  resolveResultDisplayTitle,
  resolveResultSystemTitle,
} from './searchCorpusHelpers';
import {
  compareSearchResultItems,
  normaliseSearchQuery,
  scoreSearchEntry,
} from './searchScoring';
import { toSearchResultItem } from './searchSelection';
import { QUERY_CLEAN_KEY_TO_TAG_SLUG } from './searchTagDefinitions';
import { doesSystemEntryMatchTag } from './searchTagTriggers';
import {
  normalizeSearchCategoryFilter,
  type CategorySearchResultGroup,
  type ExecuteCatalogSearchOptions,
  type GroupedSearchResults,
  type SearchResultItem,
} from './searchTypes';

const DEFAULT_LIMIT_PER_CATEGORY = 25;

const createEmptyGroupedResults = (
  query: string,
  filter: SearchCategoryFilter,
): GroupedSearchResults => {
  const groups: Record<SearchCategoryKey, CategorySearchResultGroup> = {
    stars: {
      category: 'stars',
      heading: 'Stars & Systems',
      totalMatches: 0,
      items: [],
    },
    planets: {
      category: 'planets',
      heading: 'Exoplanets & Worlds',
      totalMatches: 0,
      items: [],
    },
    structures: {
      category: 'structures',
      heading: 'Deep-Sky Structures',
      totalMatches: 0,
      items: [],
    },
    'minor-bodies': {
      category: 'minor-bodies',
      heading: 'Solar Minor Bodies & Spacecraft',
      totalMatches: 0,
      items: [],
    },
    layers: {
      category: 'layers',
      heading: 'Overlays & Layers',
      totalMatches: 0,
      items: [],
    },
  };
  return {
    query,
    filter,
    totalMatches: 0,
    groups,
  };
};

/**
 * Pure service unit function that executes a search against an in-memory array of
 * `CompactSearchEntry` records, resolves relational child entities attached to strongly
 * matched star systems (`entry.s`), ranks results deterministically, and groups them
 * into the 5 result categories.
 */
export const executeCatalogSearch = (
  entries: readonly CompactSearchEntry[],
  options: ExecuteCatalogSearchOptions,
): GroupedSearchResults => {
  const rawFilter: SearchCategoryFilter = options.filter ?? 'all';
  const filter: SearchCategoryFilter = normalizeSearchCategoryFilter(rawFilter);
  const limitPerCategory = options.limitPerCategory ?? DEFAULT_LIMIT_PER_CATEGORY;
  const normalised = normaliseSearchQuery(options.query);

  if (!normalised.cleanKey) {
    return createEmptyGroupedResults(normalised.rawTrimmed, rawFilter);
  }

  const matchedTagSlug =
    QUERY_CLEAN_KEY_TO_TAG_SLUG[normalised.cleanKey] ??
    QUERY_CLEAN_KEY_TO_TAG_SLUG[normalised.rawCleanKey];

  const systemNameById = new Map<string, string>();
  const systemPosById = new Map<string, readonly [number, number, number]>();
  const stronglyMatchedSystemIds = new Set<string>();

  if (options.systemEntries) {
    for (const sys of options.systemEntries) {
      if (resolveEntryCategory(sys) === 'stars') {
        systemNameById.set(sys.i, resolveResultDisplayTitle(sys));
        if (sys.p) systemPosById.set(sys.i, sys.p);
        if (scoreSearchEntry(sys, normalised) >= 700) {
          stronglyMatchedSystemIds.add(sys.i);
        }
      }
    }
  }
  for (const entry of entries) {
    if (resolveEntryCategory(entry) === 'stars') {
      systemNameById.set(entry.i, resolveResultDisplayTitle(entry));
      if (entry.p) systemPosById.set(entry.i, entry.p);
    }
  }

  const matchedByCategory: Record<SearchCategoryKey, SearchResultItem[]> = {
    stars: [],
    planets: [],
    structures: [],
    'minor-bodies': [],
    layers: [],
  };

  const deferredSystemChildren: CompactSearchEntry[] = [];

  for (const entry of entries) {
    const category = resolveEntryCategory(entry);
    const directScore = scoreSearchEntry(entry, normalised);

    const matchesTag =
      matchedTagSlug !== undefined &&
      category === 'stars' &&
      doesSystemEntryMatchTag(entry, matchedTagSlug);

    const effectiveScore = directScore > 0 ? directScore : (matchesTag ? 650 : 0);
    const itemTagSlug = matchesTag ? matchedTagSlug : undefined;

    if (effectiveScore > 0) {
      if (category === 'stars' && effectiveScore >= 700) {
        stronglyMatchedSystemIds.add(entry.i);
      }
      if (filter === 'all' || filter === category) {
        const hostName =
          resolveResultSystemTitle(entry, systemNameById) ??
          (entry.h === 1 && entry.s ? formatSlugFallbackTitle(entry.s) : undefined);
        const hostPos = entry.s ? systemPosById.get(entry.s) : undefined;
        matchedByCategory[category].push(
          toSearchResultItem(entry, effectiveScore, hostName, itemTagSlug, hostPos),
        );
      }
    } else if (
      entry.s &&
      (category === 'planets' || category === 'layers') &&
      (filter === 'all' || filter === category)
    ) {
      deferredSystemChildren.push(entry);
    }
  }

  if (stronglyMatchedSystemIds.size > 0) {
    for (const child of deferredSystemChildren) {
      if (child.s && stronglyMatchedSystemIds.has(child.s)) {
        const category = resolveEntryCategory(child);
        const hostName =
          resolveResultSystemTitle(child, systemNameById) ??
          (child.h === 1 && child.s ? formatSlugFallbackTitle(child.s) : undefined);
        const hostPos = systemPosById.get(child.s);
        matchedByCategory[category].push(
          toSearchResultItem(child, 600, hostName, undefined, hostPos),
        );
      }
    }
  }

  const groups = {} as Record<SearchCategoryKey, CategorySearchResultGroup>;
  let totalMatches = 0;

  for (const meta of SEARCH_CATEGORIES) {
    const sortedList = matchedByCategory[meta.key];
    sortedList.sort(compareSearchResultItems);
    const seenItemIds = new Set<string>();
    const list = sortedList.filter((item) => {
      if (seenItemIds.has(item.id)) {
        return false;
      }
      seenItemIds.add(item.id);
      return true;
    });
    totalMatches += list.length;
    groups[meta.key] = {
      category: meta.key,
      heading: meta.heading,
      totalMatches: list.length,
      items: list.slice(0, limitPerCategory),
    };
  }

  return {
    query: normalised.rawTrimmed,
    filter: rawFilter,
    totalMatches,
    groups: groups as GroupedSearchResults['groups'],
  };
};
