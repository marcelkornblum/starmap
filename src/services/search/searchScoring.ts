import type { CompactSearchEntry } from '../../utils/compactDataTypes';
import { normalizeCleanKey } from '../../utils/nomenclature';
import { expandGouldOrConstellationSuffix } from '../../utils/starNaming';
import type { NormalizedSearchQuery, SearchResultItem } from './searchTypes';

/**
 * Pure unit function that expands astronomical Bayer/Flamsteed abbreviations
 * and produces normalized lowercase and alphanumeric lookup tokens.
 */
export const normaliseSearchQuery = (rawQuery: string): NormalizedSearchQuery => {
  const rawTrimmed = rawQuery.trim();
  if (!rawTrimmed) {
    return {
      rawTrimmed: '',
      rawLower: '',
      expandedLower: '',
      rawCleanKey: '',
      cleanKey: '',
      tokens: [],
    };
  }

  const expanded = expandGouldOrConstellationSuffix(rawTrimmed);
  const rawLower = rawTrimmed.toLowerCase();
  const expandedLower = expanded.toLowerCase();
  const rawCleanKey = normalizeCleanKey(rawTrimmed);
  const cleanKey = normalizeCleanKey(expanded);

  const tokens = expandedLower
    .split(/\s+/)
    .map((t) => normalizeCleanKey(t))
    .filter((t) => t.length > 0);

  return {
    rawTrimmed,
    rawLower,
    expandedLower,
    rawCleanKey,
    cleanKey,
    tokens,
  };
};

export interface PreparedSearchEntry {
  readonly idLower: string;
  readonly nameLower: string;
  readonly nameClean: string;
  readonly nameSegments: readonly string[];
  readonly aliasKeys: readonly string[];
  readonly canonLower: string;
  readonly canonClean: string;
}

const PREPARED_SEARCH_CACHE = new WeakMap<CompactSearchEntry, PreparedSearchEntry>();

export const getPreparedSearchEntry = (
  entry: CompactSearchEntry,
): PreparedSearchEntry => {
  const cached = PREPARED_SEARCH_CACHE.get(entry);
  if (cached) {
    return cached;
  }

  const nameSegments = /[(),/]/.test(entry.n)
    ? entry.n
        .split(/[(),/]+/)
        .map((s) => normalizeCleanKey(s))
        .filter((s) => s.length > 0)
    : [];

  const prepared: PreparedSearchEntry = {
    idLower: entry.i.toLowerCase(),
    nameLower: entry.n.toLowerCase(),
    nameClean: normalizeCleanKey(entry.n),
    nameSegments,
    aliasKeys: entry.a ? entry.a.split(' ') : [],
    canonLower: entry.c ? entry.c.toLowerCase() : '',
    canonClean: entry.c ? normalizeCleanKey(entry.c) : '',
  };

  PREPARED_SEARCH_CACHE.set(entry, prepared);
  return prepared;
};

/**
 * Pure unit function scoring a single CompactSearchEntry against a NormalizedSearchQuery.
 * Returns 0 if the entry does not match.
 */
export const scoreSearchEntry = (
  entry: CompactSearchEntry,
  query: NormalizedSearchQuery,
): number => {
  if (!query.cleanKey) {
    return 0;
  }

  const prepared = getPreparedSearchEntry(entry);

  // 1. Exact display name match
  if (
    prepared.nameLower === query.expandedLower ||
    prepared.nameLower === query.rawLower
  ) {
    return 1000;
  }

  // 2. Exact clean key match on display name
  if (
    prepared.nameClean === query.cleanKey ||
    prepared.nameClean === query.rawCleanKey
  ) {
    return 950;
  }

  // 2b. Exact match on a parenthetical, comma-delimited, or slash-delimited display name segment
  if (
    prepared.nameSegments.some(
      (seg) => seg === query.cleanKey || seg === query.rawCleanKey,
    )
  ) {
    return 925;
  }

  // 3. Exact match on one of the space-delimited clean alias keys
  if (
    prepared.aliasKeys.some(
      (alias) => alias === query.cleanKey || alias === query.rawCleanKey,
    )
  ) {
    return 900;
  }

  // 4. Exact match on fictional canon / work title
  if (
    prepared.canonClean.length > 0 &&
    (prepared.canonClean === query.cleanKey ||
      prepared.canonLower === query.rawLower)
  ) {
    return 860;
  }

  // 5. Exact match on entity ID
  if (prepared.idLower === query.rawLower) {
    return 850;
  }

  // 6. Display name prefix match
  if (
    prepared.nameLower.startsWith(query.expandedLower) ||
    prepared.nameLower.startsWith(query.rawLower) ||
    prepared.nameClean.startsWith(query.cleanKey)
  ) {
    return 750;
  }

  // 7. Alias key prefix match
  if (
    prepared.aliasKeys.some(
      (alias) =>
        alias.startsWith(query.cleanKey) || alias.startsWith(query.rawCleanKey),
    )
  ) {
    return 700;
  }

  // 8. Substring match on display name, canon title, or alias keys
  if (
    prepared.nameClean.includes(query.cleanKey) ||
    prepared.nameClean.includes(query.rawCleanKey) ||
    (prepared.canonClean.length > 0 &&
      prepared.canonClean.includes(query.cleanKey)) ||
    prepared.aliasKeys.some(
      (alias) =>
        alias.includes(query.cleanKey) || alias.includes(query.rawCleanKey),
    )
  ) {
    return 550;
  }

  // 9. Multi-token conjunction match across combined searchable text
  if (query.tokens.length > 1) {
    const combined = `${prepared.nameClean} ${entry.a ?? ''} ${prepared.canonClean}`;
    if (query.tokens.every((token) => combined.includes(token))) {
      return 450;
    }
  }

  return 0;
};

/**
 * Pure comparator for deterministic search result ranking:
 * 1. Descending match score
 * 2. Ascending distance from Sol (`distancePc`)
 * 3. Alphabetical display name
 */
export const compareSearchResultItems = (
  a: SearchResultItem,
  b: SearchResultItem,
): number => {
  if (b.score !== a.score) {
    return b.score - a.score;
  }
  const distA = a.distancePc ?? Number.POSITIVE_INFINITY;
  const distB = b.distancePc ?? Number.POSITIVE_INFINITY;
  if (distA !== distB) {
    return distA - distB;
  }
  return a.name.localeCompare(b.name);
};
