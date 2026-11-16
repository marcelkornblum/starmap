import type {
  DatasetLayerEntry,
  DatasetLayerManifest,
} from '../../src/types/datasetLayers';
import type { CompactSearchEntry } from '../../src/utils/compactDataTypes';
import type { UnresolvedLayerTarget } from '../../src/utils/datasetLayerTypes';
import { getOrderedLayerEntries } from '../../src/utils/datasetLayerCodec';
import { splitAliases } from '../../src/utils/datasetLayerSlugs';
import {
  buildCleanKeys,
  normalizeCleanKey,
} from '../../src/utils/nomenclature';
import { formatSlugFallbackTitle } from '../../src/utils/starNaming';

export const LAYER_SEARCH_STOPWORDS: ReadonlySet<string> = new Set([
  'the',
  'of',
  'in',
  'on',
  'at',
  'to',
  'for',
  'and',
  'or',
  'a',
  'an',
  'from',
  'by',
  'with',
  'is',
  'are',
  'we',
]);

export function buildCompactLayerSearchKeys(
  rawTerms: readonly (string | undefined | null)[],
  excludeKeys: readonly (string | undefined | null)[] = [],
): string {
  const normalizedExclude = excludeKeys
    .filter((k): k is string => Boolean(k && k.trim().length > 0))
    .map((k) => normalizeCleanKey(k))
    .filter((k) => k.length > 0);

  const candidateKeys: string[] = [];

  for (const term of rawTerms) {
    if (!term) continue;
    const tokens = term.split(/[\s,()]+/).filter((t) => t.length > 0);
    for (const token of tokens) {
      const clean = normalizeCleanKey(token);
      if (clean.length < 2) continue;
      if (LAYER_SEARCH_STOPWORDS.has(clean)) continue;
      if (normalizedExclude.some((exclude) => exclude.includes(clean))) continue;
      candidateKeys.push(clean);
    }
  }

  return buildCleanKeys(candidateKeys);
}

export function applyResolvedNamesToLayer(
  layer: DatasetLayerManifest,
  realNames: ReadonlyMap<string, string>,
): DatasetLayerManifest {
  let changed = false;
  const newEntries: Record<string, DatasetLayerEntry> = {};

  for (const [targetId, entry] of Object.entries(layer.entries)) {
    if (entry.inUniverseName || entry.resolvedName) {
      newEntries[targetId] = entry;
      continue;
    }
    const resolved = realNames.get(entry.targetId) ?? realNames.get(entry.systemId);
    if (resolved) {
      newEntries[targetId] = { ...entry, resolvedName: resolved };
      changed = true;
    } else {
      newEntries[targetId] = entry;
    }
  }

  return changed ? { ...layer, entries: newEntries } : layer;
}

export function applyResolvedNamesToLayers(
  layers: readonly DatasetLayerManifest[],
  realNames: ReadonlyMap<string, string>,
): DatasetLayerManifest[] {
  return layers.map((layer) => applyResolvedNamesToLayer(layer, realNames));
}

export function collectUnresolvedLayerTargets(
  layers: readonly DatasetLayerManifest[],
  realNames: ReadonlyMap<string, string>,
): UnresolvedLayerTarget[] {
  const unresolved: UnresolvedLayerTarget[] = [];
  for (const layer of layers) {
    for (const entry of Object.values(layer.entries)) {
      if (entry.inUniverseName) continue;
      if (entry.resolvedName) continue;
      const resolved = realNames.get(entry.targetId) ?? realNames.get(entry.systemId);
      if (!resolved) {
        unresolved.push({
          layerId: layer.layerId,
          targetId: entry.targetId,
          systemId: entry.systemId,
        });
      }
    }
  }
  return unresolved;
}

export function buildSearchEntriesFromLayers(
  layers: readonly DatasetLayerManifest[],
  coordsById: Map<string, [number, number, number]>,
  realNames: ReadonlyMap<string, string> = new Map(),
): CompactSearchEntry[] {
  const searchEntries: CompactSearchEntry[] = [];

  for (const layer of layers) {
    const parentCategory =
      layer.kind === 'scientific-overlay' ? 'Scientific Layer' : 'Fictional Canon';

    const parentCleanKeys = buildCompactLayerSearchKeys(
      [layer.subtitle, ...splitAliases(layer.aliases)],
      [layer.title, parentCategory],
    );

    const parentSearchEntry: CompactSearchEntry = {
      i: layer.layerId,
      k: 7,
      n: layer.title,
      w: layer.layerId,
      c: parentCategory,
      ...(parentCleanKeys.length > 0 ? { a: parentCleanKeys } : {}),
    };
    searchEntries.push(parentSearchEntry);

    for (const entry of getOrderedLayerEntries(layer)) {
      const resolvedFallback =
        realNames.get(entry.targetId) ??
        realNames.get(entry.systemId) ??
        entry.resolvedName ??
        formatSlugFallbackTitle(entry.targetId);
      const displayName = entry.inUniverseName || resolvedFallback;

      const cleanKeys = buildCompactLayerSearchKeys(
        [entry.subtitle, ...splitAliases(entry.aliases), entry.workTitle],
        [displayName, layer.title],
      );

      const coords = coordsById.get(entry.targetId) ?? coordsById.get(entry.systemId);
      const searchId = entry.targetId.startsWith(`${layer.layerId}:`)
        ? entry.targetId
        : `${layer.layerId}:${entry.targetId}`;
      const searchEntry: CompactSearchEntry = {
        i: searchId,
        k: 7,
        n: displayName,
        s: entry.systemId,
        w: layer.layerId,
        c: layer.title,
        ...(cleanKeys.length > 0 ? { a: cleanKeys } : {}),
      };

      if (entry.parentBodyId) searchEntry.o = entry.parentBodyId;
      if (coords && (coords[0] !== 0 || coords[1] !== 0 || coords[2] !== 0)) {
        searchEntry.p = coords;
      }
      if (entry.systemId === 'sol' || entry.targetId === 'sol') {
        searchEntry.h = 1;
      }

      searchEntries.push(searchEntry);
    }
  }

  return searchEntries;
}
