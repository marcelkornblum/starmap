import { useEffect, useMemo, useState } from 'react';
import { SOL_REFERENCE_TARGET } from '../config/referenceTargets';
import {
  fetchDetailsRoutingTable,
  fetchSummaryNode,
  getCachedSummaryNode,
} from '../data/detailsRepository';
import { appendExtraEntriesToCorpus } from '../services/details/activeStarsCorpus';
import { findFocusedEntryInCorpus } from '../services/search/searchCorpusHelpers';
import { extractUrlSelectSlugs } from '../services/search/searchUrlSelection';
import type { SystemSummaryNode } from '../types/astro';
import type { DatasetLayerIndexEntry } from '../types/datasetLayers';
import { SYSTEM_TAG_BITS } from '../utils/compactDataConstants';
import type { CompactSearchEntry, SearchSummaryTuple } from '../utils/compactDataTypes';
import { toUrlSlug } from '../utils/datasetLayerSlugs';

const CANONICAL_ID_PREFIX_RE = /^(?:hip|gaia|hyg|exo)-/i;
const EMPTY_ENTRIES: readonly CompactSearchEntry[] = [];
const EMPTY_SLUGS: readonly string[] = [];

/**
 * Collects explicit `?center=`, `?focus=`, and `?select=` entity slugs that are not
 * yet resolved in the live aperture corpus.
 */
export function collectUnresolvedUrlSlugs(params: {
  readonly centerId?: string;
  readonly optimisticFocusSlug: string | null;
  readonly selectQuery: string;
  readonly layerIndex: readonly DatasetLayerIndexEntry[];
  readonly corpus: readonly CompactSearchEntry[];
}): readonly string[] {
  const candidates = new Set<string>();
  if (params.centerId && params.centerId !== 'search') {
    const normalizedCenter = toUrlSlug(params.centerId);
    if (normalizedCenter && normalizedCenter !== 'search') {
      candidates.add(normalizedCenter);
    }
  }
  if (params.optimisticFocusSlug && params.optimisticFocusSlug !== 'search') {
    const normalizedFocus = toUrlSlug(params.optimisticFocusSlug);
    if (normalizedFocus && normalizedFocus !== 'search') {
      candidates.add(normalizedFocus);
    }
  }
  if (params.selectQuery) {
    const { entitySlugs } = extractUrlSelectSlugs(params.selectQuery, params.layerIndex);
    for (const entitySlug of entitySlugs) {
      if (entitySlug && entitySlug !== 'search') {
        candidates.add(entitySlug);
      }
    }
  }
  if (candidates.size === 0) {
    return EMPTY_SLUGS;
  }
  const unresolved: string[] = [];
  for (const slug of candidates) {
    if (!findFocusedEntryInCorpus(slug, params.corpus)) {
      unresolved.push(slug);
    }
  }
  return unresolved.length > 0 ? unresolved : EMPTY_SLUGS;
}

/**
 * Merges fallback `CompactSearchEntry` records into the base aperture corpus without
 * duplicating any ID already present.
 */
export function mergeFallbackEntriesIntoCorpus(
  baseCorpus: readonly CompactSearchEntry[],
  fallbackEntries: readonly CompactSearchEntry[],
): readonly CompactSearchEntry[] {
  if (fallbackEntries.length === 0) {
    return baseCorpus;
  }
  const missing = fallbackEntries.filter(
    (entry) => !findFocusedEntryInCorpus(entry.i, baseCorpus),
  );
  return missing.length > 0
    ? appendExtraEntriesToCorpus(baseCorpus, missing)
    : baseCorpus;
}

function encodeNodeTagsMask(tags: SystemSummaryNode['tags']): number | undefined {
  if (!tags || tags.length === 0) return undefined;
  let mask = 0;
  for (const tag of tags) {
    const bit = SYSTEM_TAG_BITS[tag];
    if (bit !== undefined) mask |= bit;
  }
  return mask > 0 ? mask : undefined;
}

/**
 * Converts a hydrated `SystemSummaryNode` into a `CompactSearchEntry` suitable for
 * appending to the live search/aperture corpus during cold deep-link resolution.
 */
export function summaryNodeToCompactSearchEntry(node: SystemSummaryNode): CompactSearchEntry {
  const summaryTuple: SearchSummaryTuple = node.hasHabitableCandidate
    ? [node.mag, node.spect || 'Unknown', node.planetCount, 1]
    : [node.mag, node.spect || 'Unknown', node.planetCount];

  const entry: CompactSearchEntry = {
    i: node.id,
    n: node.properName ?? node.name,
    m: summaryTuple,
    c: 'stars',
  };
  if (node.x !== 0 || node.y !== 0 || node.z !== 0) {
    entry.p = [node.x, node.y, node.z];
  }
  if (node.id === SOL_REFERENCE_TARGET.id) {
    entry.h = 1;
  }
  const tagsMask = encodeNodeTagsMask(node.tags);
  if (tagsMask !== undefined) {
    entry.g = tagsMask;
  }
  if (
    node.planetCompositionCounts &&
    ((node.planetCompositionCounts[0] ?? 0) > 0 ||
      (node.planetCompositionCounts[1] ?? 0) > 0 ||
      (node.planetCompositionCounts[2] ?? 0) > 0 ||
      (node.planetCompositionCounts[3] !== undefined && node.planetCompositionCounts[3] > 0))
  ) {
    entry.b = node.planetCompositionCounts;
  }
  if (node.hazardMask && node.hazardMask > 0) {
    entry.H = node.hazardMask;
  }
  if (node.classification && node.classification !== 'star') {
    entry.u = node.classification;
  }
  return entry;
}

/**
 * Resolves cold deep-link slugs (`hip-*`, `gaia-*`, `hyg-*`, `exo-*`, or IDs indexed in
 * `details/routing.json`) directly via `fetchSummaryNode` without waiting for `stars.json`.
 */
export function useRoutingSummaryFallback(
  unresolvedSlugs: readonly string[],
): readonly CompactSearchEntry[] {
  const slugsKey = unresolvedSlugs.join('\0');

  const normalizedSlugs = useMemo(() => {
    if (!slugsKey) return EMPTY_SLUGS;
    const seen = new Set<string>();
    const list: string[] = [];
    for (const raw of slugsKey.split('\0')) {
      const slug = raw.trim().toLowerCase();
      if (slug && !seen.has(slug)) {
        seen.add(slug);
        list.push(slug);
      }
    }
    return list.length > 0 ? list : EMPTY_SLUGS;
  }, [slugsKey]);

  const [resolvedBySlug, setResolvedBySlug] = useState<ReadonlyMap<string, CompactSearchEntry>>(
    () => new Map(),
  );

  useEffect(() => {
    if (normalizedSlugs.length === 0) {
      return undefined;
    }

    const controller = new AbortController();

    const resolveSlugs = async () => {
      try {
        const prefixedSlugs: string[] = [];
        const unprefixedSlugs: string[] = [];

        for (const slug of normalizedSlugs) {
          if (CANONICAL_ID_PREFIX_RE.test(slug)) {
            prefixedSlugs.push(slug);
          } else {
            unprefixedSlugs.push(slug);
          }
        }

        const candidateSlugs = [...prefixedSlugs];
        if (unprefixedSlugs.length > 0) {
          const routing = await fetchDetailsRoutingTable(fetch, controller.signal).catch(() => null);
          if (controller.signal.aborted) return;
          if (routing?.s) {
            for (const slug of unprefixedSlugs) {
              if (Object.prototype.hasOwnProperty.call(routing.s, slug)) {
                candidateSlugs.push(slug);
              }
            }
          }
        }

        if (candidateSlugs.length === 0 || controller.signal.aborted) {
          return;
        }

        const results = await Promise.allSettled(
          candidateSlugs.map(async (slug) => {
            const node = await fetchSummaryNode(slug, fetch, controller.signal);
            return node ? ([slug, summaryNodeToCompactSearchEntry(node)] as const) : undefined;
          }),
        );

        if (controller.signal.aborted) {
          return;
        }

        const additions: Array<readonly [string, CompactSearchEntry]> = [];
        for (const res of results) {
          if (res.status === 'fulfilled' && res.value) {
            additions.push(res.value);
          }
        }
        if (additions.length === 0) {
          return;
        }

        setResolvedBySlug((prev) => {
          let changed = false;
          for (const [slug] of additions) {
            if (!prev.has(slug)) {
              changed = true;
              break;
            }
          }
          if (!changed) return prev;
          const next = new Map(prev);
          for (const [slug, entry] of additions) {
            next.set(slug, entry);
          }
          return next;
        });
      } catch {
        // Ignore transient network failures during cold deep-link fallback.
      }
    };

    void resolveSlugs();

    return () => {
      controller.abort();
    };
  }, [normalizedSlugs]);

  return useMemo(() => {
    if (normalizedSlugs.length === 0) {
      return EMPTY_ENTRIES;
    }
    const entries: CompactSearchEntry[] = [];
    const seenIds = new Set<string>();
    for (const slug of normalizedSlugs) {
      const entry =
        resolvedBySlug.get(slug) ??
        (CANONICAL_ID_PREFIX_RE.test(slug)
          ? (() => {
              const cached = getCachedSummaryNode(slug);
              return cached ? summaryNodeToCompactSearchEntry(cached) : undefined;
            })()
          : undefined);
      if (entry && !seenIds.has(entry.i)) {
        seenIds.add(entry.i);
        entries.push(entry);
      }
    }
    return entries.length > 0 ? entries : EMPTY_ENTRIES;
  }, [normalizedSlugs, resolvedBySlug]);
}
