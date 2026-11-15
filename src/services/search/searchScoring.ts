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

  const nameLower = entry.n.toLowerCase();
  const nameClean = normalizeCleanKey(entry.n);
  const aliasKeys = entry.a ? entry.a.split(' ') : [];
  const canonLower = entry.c ? entry.c.toLowerCase() : '';
  const canonClean = entry.c ? normalizeCleanKey(entry.c) : '';

  // 1. Exact display name match
  if (nameLower === query.expandedLower || nameLower === query.rawLower) {
    return 1000;
  }

  // 2. Exact clean key match on display name
  if (nameClean === query.cleanKey || nameClean === query.rawCleanKey) {
    return 950;
  }

  // 2b. Exact match on a parenthetical, comma-delimited, or slash-delimited display name segment
  if (/[(),/]/.test(entry.n)) {
    const segments = entry.n
      .split(/[(),/]+/)
      .map((s) => normalizeCleanKey(s))
      .filter((s) => s.length > 0);
    if (
      segments.some(
        (seg) => seg === query.cleanKey || seg === query.rawCleanKey,
      )
    ) {
      return 925;
    }
  }

  // 3. Exact match on one of the space-delimited clean alias keys
  if (
    aliasKeys.some(
      (alias) => alias === query.cleanKey || alias === query.rawCleanKey,
    )
  ) {
    return 900;
  }

  // 4. Exact match on fictional canon / work title
  if (
    canonClean.length > 0 &&
    (canonClean === query.cleanKey || canonLower === query.rawLower)
  ) {
    return 860;
  }

  // 5. Exact match on entity ID
  if (entry.i.toLowerCase() === query.rawLower) {
    return 850;
  }

  // 6. Display name prefix match
  if (
    nameLower.startsWith(query.expandedLower) ||
    nameLower.startsWith(query.rawLower) ||
    nameClean.startsWith(query.cleanKey)
  ) {
    return 750;
  }

  // 7. Alias key prefix match
  if (
    aliasKeys.some(
      (alias) =>
        alias.startsWith(query.cleanKey) || alias.startsWith(query.rawCleanKey),
    )
  ) {
    return 700;
  }

  // 8. Substring match on display name, canon title, or alias keys
  if (
    nameClean.includes(query.cleanKey) ||
    nameClean.includes(query.rawCleanKey) ||
    (canonClean.length > 0 && canonClean.includes(query.cleanKey)) ||
    aliasKeys.some(
      (alias) =>
        alias.includes(query.cleanKey) || alias.includes(query.rawCleanKey),
    )
  ) {
    return 550;
  }

  // 9. Multi-token conjunction match across combined searchable text
  if (query.tokens.length > 1) {
    const combined = `${nameClean} ${entry.a ?? ''} ${canonClean}`;
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
