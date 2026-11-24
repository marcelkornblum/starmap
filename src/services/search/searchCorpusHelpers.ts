import type { CelestialClassification } from '../../types/spatial';
import type { SearchCategoryKey } from '../../types/search';
import type { CompactSearchEntry } from '../../utils/compactDataTypes';
import { toUrlSlug } from '../../utils/datasetLayerSlugs';
import { getMergedCorpusParts } from '../details/activeStarsCorpus';
import type { SearchEntityKind } from './searchTypes';

/**
 * Pure predicate determining whether an entry represents a child body (planet, moon, fictional planet)
 * attached to a distinct host star system, rather than the host system itself.
 */
export const isChildOfHostSystem = (entryId: string, systemId?: string): boolean =>
  Boolean(systemId) && entryId !== systemId && !entryId.endsWith(`:${systemId}`);

/**
 * Pure predicate determining whether a search entry represents an artificial spacecraft / probe.
 * Reads precalculated `entry.u === 'construct'` or the `'spacecraft'` alias token.
 */
export const isArtificialSpacecraftEntry = (entry: CompactSearchEntry): boolean => {
  if (entry.u === 'construct') {
    return true;
  }
  return Boolean(entry.a && entry.a.split(' ').includes('spacecraft'));
};

/**
 * Dedicated hook for resolving the primary display title of a search result entry.
 * Centralizes title formatting so future localization or designation overrides have a single extension point.
 */
export const resolveResultDisplayTitle = (entry: CompactSearchEntry): string => {
  const trimmed = entry.n.trim();
  return trimmed.length > 0 ? trimmed : entry.i;
};

/**
 * Dedicated hook for resolving the parent star system display title of a search result entry.
 */
export const resolveResultSystemTitle = (
  entry: CompactSearchEntry,
  systemNameById: ReadonlyMap<string, string>,
): string | undefined => (entry.s ? systemNameById.get(entry.s) : undefined);

/**
 * Pure selector mapping a CompactSearchEntry's numeric kind code (`k`)
 * to one of the 5 canonical search result categories.
 */
export const resolveEntryCategory = (entry: CompactSearchEntry): SearchCategoryKey => {
  switch (entry.k) {
    case 2:
    case 3:
    case 4:
      return 'planets';
    case 5:
      return 'structures';
    case 6:
      return 'minor-bodies';
    case 7:
      return 'layers';
    default:
      return 'stars';
  }
};

/**
 * Pure selector mapping a CompactSearchEntry's numeric kind code (`k`)
 * to its fine-grained domain entity kind.
 */
export const resolveEntityKind = (entry: CompactSearchEntry): SearchEntityKind => {
  switch (entry.k) {
    case 2:
      return 'planet';
    case 3:
      return 'moon';
    case 4:
      return 'dwarf-planet';
    case 5:
      return 'galactic-structure';
    case 6:
      return 'minor-body';
    case 7:
      return !entry.s || entry.i === entry.w ? 'layer' : 'fictional-entry';
    default:
      return 'star-system';
  }
};

/**
 * Pure selector mapping a CompactSearchEntry to its canonical reticle taxonomy type (`CelestialClassification`).
 * Reads precalculated `entry.u` when present and falls back to category defaults.
 */
export const resolveReticleType = (entry: CompactSearchEntry): CelestialClassification => {
  if (entry.u) {
    return entry.u;
  }
  switch (entry.k) {
    case 0:
    case 1:
      return 'stellar-system';
    case 2:
    case 3:
    case 4:
      return 'terrestrial';
    case 5:
      return 'stellar-cluster';
    case 6:
      return isArtificialSpacecraftEntry(entry) ? 'construct' : 'terrestrial';
    default:
      return 'stellar-system';
  }
};

interface CorpusSearchIndex {
  readonly idMap: Map<string, CompactSearchEntry>;
  readonly nameMap: Map<string, CompactSearchEntry>;
  readonly segmentMap: Map<string, CompactSearchEntry>;
  readonly base?: CorpusSearchIndex;
}

const corpusIndexCache = new WeakMap<
  readonly CompactSearchEntry[],
  CorpusSearchIndex
>();

const ALREADY_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const computeCorpusSlug = (value: string): string => {
  if (!value) return '';
  if (ALREADY_SLUG_RE.test(value)) return value;
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const getOrBuildCorpusIndex = (
  corpus: readonly CompactSearchEntry[],
): CorpusSearchIndex => {
  const cached = corpusIndexCache.get(corpus);
  if (cached) {
    return cached;
  }

  const parts = getMergedCorpusParts(corpus);
  if (parts) {
    const baseIndex = getOrBuildCorpusIndex(parts.base);
    const idMap = new Map<string, CompactSearchEntry>();
    const nameMap = new Map<string, CompactSearchEntry>();
    const segmentMap = new Map<string, CompactSearchEntry>();

    for (const entry of parts.extras) {
      if (entry.c === 'stars' || resolveEntryCategory(entry) === 'stars') {
        const idLower = entry.i.toLowerCase();
        const idSlug = computeCorpusSlug(entry.i);
        if (idLower) idMap.set(idLower, entry);
        if (idSlug) idMap.set(idSlug, entry);

        const displayTitle = resolveResultDisplayTitle(entry);
        const nameSlug = computeCorpusSlug(displayTitle);
        const nameLower = displayTitle.trim().toLowerCase();
        if (nameSlug) nameMap.set(nameSlug, entry);
        if (nameLower) nameMap.set(nameLower, entry);

        if (displayTitle.includes('(')) {
          const segments = displayTitle
            .split(/[()]/)
            .map((s) => computeCorpusSlug(s))
            .filter((s) => s.length > 0);
          for (const seg of segments) {
            segmentMap.set(seg, entry);
          }
        }
      }
    }

    const index: CorpusSearchIndex = { idMap, nameMap, segmentMap, base: baseIndex };
    corpusIndexCache.set(corpus, index);
    return index;
  }

  const idMap = new Map<string, CompactSearchEntry>();
  const nameMap = new Map<string, CompactSearchEntry>();
  const segmentMap = new Map<string, CompactSearchEntry>();
  const stars: CompactSearchEntry[] = [];
  const nonStars: CompactSearchEntry[] = [];

  for (const entry of corpus) {
    if (resolveEntryCategory(entry) === 'stars') {
      stars.push(entry);
    } else {
      nonStars.push(entry);
    }
  }

  for (const entry of nonStars) {
    const idLower = entry.i.toLowerCase();
    const idSlug = computeCorpusSlug(entry.i);
    if (idLower && !idMap.has(idLower)) idMap.set(idLower, entry);
    if (idSlug && !idMap.has(idSlug)) idMap.set(idSlug, entry);
  }
  for (const entry of stars) {
    const idLower = entry.i.toLowerCase();
    const idSlug = computeCorpusSlug(entry.i);
    if (idLower) idMap.set(idLower, entry);
    if (idSlug) idMap.set(idSlug, entry);
  }

  for (const entry of nonStars) {
    const displayTitle = resolveResultDisplayTitle(entry);
    const nameSlug = computeCorpusSlug(displayTitle);
    const nameLower = displayTitle.trim().toLowerCase();
    if (nameSlug && !nameMap.has(nameSlug)) nameMap.set(nameSlug, entry);
    if (nameLower && !nameMap.has(nameLower)) nameMap.set(nameLower, entry);
  }
  for (const entry of stars) {
    const displayTitle = resolveResultDisplayTitle(entry);
    const nameSlug = computeCorpusSlug(displayTitle);
    const nameLower = displayTitle.trim().toLowerCase();
    if (nameSlug) nameMap.set(nameSlug, entry);
    if (nameLower) nameMap.set(nameLower, entry);
  }

  for (const entry of nonStars) {
    const displayTitle = resolveResultDisplayTitle(entry);
    if (!displayTitle.includes('(')) continue;
    const segments = displayTitle.split(/[()]/).map((s) => computeCorpusSlug(s)).filter((s) => s.length > 0);
    for (const seg of segments) {
      if (!segmentMap.has(seg)) segmentMap.set(seg, entry);
    }
  }
  for (const entry of stars) {
    const displayTitle = resolveResultDisplayTitle(entry);
    if (!displayTitle.includes('(')) continue;
    const segments = displayTitle.split(/[()]/).map((s) => computeCorpusSlug(s)).filter((s) => s.length > 0);
    for (const seg of segments) {
      const existing = segmentMap.get(seg);
      if (!existing || resolveEntryCategory(existing) !== 'stars') {
        segmentMap.set(seg, entry);
      }
    }
  }

  const index: CorpusSearchIndex = { idMap, nameMap, segmentMap };
  corpusIndexCache.set(corpus, index);
  return index;
};

const lookupInCorpusIndex = (
  index: CorpusSearchIndex,
  selector: (idx: CorpusSearchIndex) => Map<string, CompactSearchEntry>,
  slug?: string,
  lower?: string,
): CompactSearchEntry | undefined => {
  let curr: CorpusSearchIndex | undefined = index;
  while (curr) {
    const map = selector(curr);
    const match = (slug ? map.get(slug) : undefined) ?? (lower ? map.get(lower) : undefined);
    if (match) return match;
    curr = curr.base;
  }
  return undefined;
};

/**
 * Pure lookup finding the matching `CompactSearchEntry` in a corpus for a focused URL slug or ID.
 * Prefers direct star-system entries when multiple entries share the same slug.
 * Uses a WeakMap-cached O(1) corpus index to eliminate O(N) linear scans on render and focus updates.
 */
export const findFocusedEntryInCorpus = (
  focusSlug: string,
  corpus: readonly CompactSearchEntry[],
): CompactSearchEntry | undefined => {
  const targetSlug = toUrlSlug(focusSlug);
  const targetLower = focusSlug.trim().toLowerCase();
  if (!targetSlug && !targetLower) {
    return undefined;
  }
  if (corpus.length === 0) {
    return undefined;
  }

  const index = getOrBuildCorpusIndex(corpus);
  return (
    lookupInCorpusIndex(index, (i) => i.idMap, targetSlug, targetLower) ??
    lookupInCorpusIndex(index, (i) => i.nameMap, targetSlug, targetLower) ??
    lookupInCorpusIndex(index, (i) => i.segmentMap, targetSlug, undefined)
  );
};
