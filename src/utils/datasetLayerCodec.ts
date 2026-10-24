import type {
  DatasetLayerKind,
  DatasetLayerTargetType,
  DatasetLayerSourceMeta,
  DatasetLayerEntry,
  DatasetLayerManifest,
  DatasetLayerIndexEntry,
} from '../types/astro';
import {
  CONFIDENCE_TO_CODE,
  CODE_TO_CONFIDENCE,
  getShardKey,
  type CompactSearchEntry,
} from './compactDataCodec';
import {
  buildCleanKeys,
  formatSlugFallbackTitle,
  normalizeCleanKey,
} from './nomenclature';

const LAYER_KIND_TO_CODE: Record<DatasetLayerKind, number> = {
  'fictional-canon': 1,
  'custom-user': 2,
  'scientific-overlay': 3,
};

const CODE_TO_LAYER_KIND: Record<number, DatasetLayerKind> = {
  1: 'fictional-canon',
  2: 'custom-user',
  3: 'scientific-overlay',
};

const TARGET_TYPE_TO_CODE: Record<DatasetLayerTargetType, number> = {
  system: 1,
  planet: 2,
  moon: 3,
  structure: 4,
  'minor-body': 5,
  'fictional-body': 6,
};

const CODE_TO_TARGET_TYPE: Record<number, DatasetLayerTargetType> = {
  1: 'system',
  2: 'planet',
  3: 'moon',
  4: 'structure',
  5: 'minor-body',
  6: 'fictional-body',
};

export interface CompactLayerSourceMeta {
  s: string;
  a: string;
  y?: string;
  m?: string;
  r?: string;
  u?: string;
}

export interface CompactLayerEntry {
  k?: number;
  s?: string;
  o?: number;
  p?: string;
  u?: string;
  t?: string;
  x: string;
  w?: string;
  a?: string;
  c?: 2 | 3 | 4;
  r?: string;
}

export interface CompactLayerManifest {
  i: string;
  n: string;
  t?: string;
  k: number;
  d: string;
  v: number;
  a?: string;
  b?: CompactLayerSourceMeta;
  e: Record<string, CompactLayerEntry>;
}

function encodeSourceMeta(source?: DatasetLayerSourceMeta): CompactLayerSourceMeta | undefined {
  if (!source) return undefined;
  const b: CompactLayerSourceMeta = {
    s: source.summary,
    a: source.creator,
  };
  if (source.publicationYear) b.y = source.publicationYear;
  if (source.medium) b.m = source.medium;
  if (source.canonicalReference) b.r = source.canonicalReference;
  if (source.url) b.u = source.url;
  return b;
}

function decodeSourceMeta(b?: CompactLayerSourceMeta): DatasetLayerSourceMeta | undefined {
  if (!b) return undefined;
  const source: DatasetLayerSourceMeta = {
    summary: b.s,
    creator: b.a,
  };
  if (b.y) source.publicationYear = b.y;
  if (b.m) source.medium = b.m;
  if (b.r) source.canonicalReference = b.r;
  if (b.u) source.url = b.u;
  return source;
}

/**
 * Encodes a DatasetLayerManifest into its minified 1-letter keyed dictionary format (`DEC-007`).
 */
export function encodeLayerManifest(manifest: DatasetLayerManifest): CompactLayerManifest {
  const compactEntries: Record<string, CompactLayerEntry> = {};

  for (const [targetId, entry] of Object.entries(manifest.entries)) {
    const k = TARGET_TYPE_TO_CODE[entry.targetType] ?? 1;
    const compactEntry: CompactLayerEntry = {
      x: entry.text,
    };

    if (k !== 1) compactEntry.k = k;
    if (entry.systemId && entry.systemId !== targetId) {
      compactEntry.s = entry.systemId;
    }
    if (typeof entry.order === 'number' && Number.isFinite(entry.order)) {
      compactEntry.o = entry.order;
    }
    if (entry.parentBodyId) {
      compactEntry.p = entry.parentBodyId;
    }
    if (entry.inUniverseName) compactEntry.u = entry.inUniverseName;
    if (entry.resolvedName) compactEntry.r = entry.resolvedName;
    if (entry.subtitle) compactEntry.t = entry.subtitle;
    if (entry.workTitle) compactEntry.w = entry.workTitle;
    if (entry.aliases) compactEntry.a = entry.aliases;
    if (entry.confidence && entry.confidence !== 'confirmed') {
      const code = CONFIDENCE_TO_CODE[entry.confidence];
      if (code !== 1) compactEntry.c = code;
    }

    compactEntries[targetId] = compactEntry;
  }

  const compact: CompactLayerManifest = {
    i: manifest.layerId,
    n: manifest.title,
    k: LAYER_KIND_TO_CODE[manifest.kind] ?? 1,
    d: manifest.description,
    v: manifest.version,
    e: compactEntries,
  };

  const b = encodeSourceMeta(manifest.source);
  if (b) compact.b = b;
  if (manifest.subtitle) compact.t = manifest.subtitle;
  if (manifest.aliases) compact.a = manifest.aliases;

  return compact;
}

/**
 * Decodes a minified CompactLayerManifest back into a full DatasetLayerManifest.
 */
export function decodeLayerManifest(compact: CompactLayerManifest): DatasetLayerManifest {
  const entries: Record<string, DatasetLayerEntry> = {};

  for (const [targetId, ce] of Object.entries(compact.e)) {
    const entry: DatasetLayerEntry = {
      targetId,
      targetType: CODE_TO_TARGET_TYPE[ce.k ?? 1] ?? 'system',
      systemId: ce.s ?? targetId,
      text: ce.x,
      confidence: ce.c ? (CODE_TO_CONFIDENCE[ce.c] ?? 'confirmed') : 'confirmed',
    };
    if (typeof ce.o === 'number' && Number.isFinite(ce.o)) {
      entry.order = ce.o;
    }
    if (ce.p) {
      entry.parentBodyId = ce.p;
    }
    if (ce.u) entry.inUniverseName = ce.u;
    if (ce.r) entry.resolvedName = ce.r;
    if (ce.t) entry.subtitle = ce.t;
    if (ce.w) entry.workTitle = ce.w;
    if (ce.a) entry.aliases = ce.a;

    entries[targetId] = entry;
  }

  const manifest: DatasetLayerManifest = {
    layerId: compact.i,
    title: compact.n,
    kind: CODE_TO_LAYER_KIND[compact.k] ?? 'fictional-canon',
    description: compact.d,
    version: compact.v,
    entries,
  };

  const source = decodeSourceMeta(compact.b);
  if (source) manifest.source = source;
  if (compact.t) manifest.subtitle = compact.t;
  if (compact.a) manifest.aliases = compact.a;

  return manifest;
}

/**
 * Compact by-entity annotation record stored in
 * `public/data/overlays/layers/by-entity/<bucket>.json` (`DL-05` S3).
 * Defaults are omitted: `k` (layer kind) defaults to 1 (fictional-canon),
 * `y` (target type) defaults to 1 (system), `s` defaults to `t`.
 */
export interface CompactEntityAnnotation {
  i: string;
  n: string;
  k?: number;
  t: string;
  y?: number;
  s?: string;
  p?: string;
  u?: string;
  b?: string;
  w?: string;
  x: string;
  o?: number;
  a?: string;
  r?: string;
  d?: string;
}

export interface DecodedEntityAnnotation {
  readonly layerId: string;
  readonly layerTitle: string;
  readonly kind: DatasetLayerKind;
  readonly targetId: string;
  readonly targetType: DatasetLayerTargetType;
  readonly systemId: string;
  readonly parentBodyId?: string;
  readonly inUniverseName?: string;
  readonly resolvedName?: string;
  readonly subtitle?: string;
  readonly workTitle?: string;
  readonly text: string;
  readonly order?: number;
  readonly creator?: string;
  readonly publicationYear?: string;
}

function encodeEntityAnnotation(
  layer: DatasetLayerManifest,
  entry: DatasetLayerEntry,
): CompactEntityAnnotation {
  const record: CompactEntityAnnotation = {
    i: layer.layerId,
    n: layer.title,
    t: entry.targetId,
    x: entry.text,
  };
  const kindCode = LAYER_KIND_TO_CODE[layer.kind] ?? 1;
  if (kindCode !== 1) record.k = kindCode;
  const typeCode = TARGET_TYPE_TO_CODE[entry.targetType] ?? 1;
  if (typeCode !== 1) record.y = typeCode;
  if (entry.systemId && entry.systemId !== entry.targetId) record.s = entry.systemId;
  if (entry.parentBodyId) record.p = entry.parentBodyId;
  if (entry.inUniverseName) record.u = entry.inUniverseName;
  if (entry.resolvedName) record.d = entry.resolvedName;
  if (entry.subtitle) record.b = entry.subtitle;
  if (entry.workTitle) record.w = entry.workTitle;
  if (typeof entry.order === 'number' && Number.isFinite(entry.order)) {
    record.o = entry.order;
  }
  if (layer.source?.creator) record.a = layer.source.creator;
  if (layer.source?.publicationYear) record.r = layer.source.publicationYear;
  return record;
}

/**
 * Decodes a `CompactEntityAnnotation` into its domain representation.
 */
export function decodeEntityAnnotation(
  compact: CompactEntityAnnotation,
): DecodedEntityAnnotation {
  return {
    layerId: compact.i,
    layerTitle: compact.n,
    kind: CODE_TO_LAYER_KIND[compact.k ?? 1] ?? 'fictional-canon',
    targetId: compact.t,
    targetType: CODE_TO_TARGET_TYPE[compact.y ?? 1] ?? 'system',
    systemId: compact.s ?? compact.t,
    ...(compact.p ? { parentBodyId: compact.p } : {}),
    ...(compact.u ? { inUniverseName: compact.u } : {}),
    ...(compact.d ? { resolvedName: compact.d } : {}),
    ...(compact.b ? { subtitle: compact.b } : {}),
    ...(compact.w ? { workTitle: compact.w } : {}),
    text: compact.x,
    ...(typeof compact.o === 'number' && Number.isFinite(compact.o)
      ? { order: compact.o }
      : {}),
    ...(compact.a ? { creator: compact.a } : {}),
    ...(compact.r ? { publicationYear: compact.r } : {}),
  };
}

/**
 * Strips a leading `layerId:` prefix from a focused target ID to obtain the by-entity lookup key.
 */
export function toAnnotationLookupKey(targetId: string): string {
  return targetId.includes(':') ? (targetId.split(':')[1] ?? targetId) : targetId;
}

/**
 * Builds the by-entity annotation buckets (`public/data/overlays/layers/by-entity/<bucket>.json`).
 * Each layer entry is indexed under its `targetId` and (when different) its `systemId`,
 * so that `records[targetId] ∪ records[systemId]` reproduces direct + system-wide lookups.
 * Bucket keys use the same 36-bucket `getShardKey` hashing as the details shards.
 */
export function buildEntityAnnotationBuckets(
  layers: readonly DatasetLayerManifest[],
): Record<string, Record<string, CompactEntityAnnotation[]>> {
  const buckets: Record<string, Record<string, CompactEntityAnnotation[]>> = {};

  const add = (key: string, record: CompactEntityAnnotation): void => {
    const bucketKey = getShardKey(key);
    const bucket = (buckets[bucketKey] ??= {});
    (bucket[key] ??= []).push(record);
  };

  for (const layer of layers) {
    for (const entry of Object.values(layer.entries)) {
      const record = encodeEntityAnnotation(layer, entry);
      add(entry.targetId, record);
      if (entry.systemId && entry.systemId !== entry.targetId) {
        add(entry.systemId, record);
      }
    }
  }

  return buckets;
}

export function toUrlSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Splits a space-delimited alias string into individual alias tokens.
 */
export function splitAliases(aliases: string | undefined): string[] {
  return (aliases ?? '').split(/\s+/).filter((token) => token.length > 0);
}

/**
 * Strips leading 'canon-', 'overlay-', or 'layer-' prefix from a layer ID or candidate string.
 */
export function toCanonicalLayerSlug(layerId: string): string {
  const slug = toUrlSlug(layerId);
  return slug.replace(/^(canon|overlay|layer)-/, '');
}

/**
 * Deterministically sorts a layer's entries:
 * 1. Entries with finite typeof entry.order === 'number' ascending by entry.order
 *    (tie-breaking by original declaration index, then targetId.localeCompare).
 * 2. Followed by entries without order in their original declaration order in layer.entries.
 */
export function getOrderedLayerEntries(layer: DatasetLayerManifest): DatasetLayerEntry[] {
  const entriesWithIndex = Object.values(layer.entries).map((entry, index) => ({
    entry,
    index,
  }));

  const ordered: { entry: DatasetLayerEntry; index: number }[] = [];
  const unOrdered: { entry: DatasetLayerEntry; index: number }[] = [];

  for (const item of entriesWithIndex) {
    if (typeof item.entry.order === 'number' && Number.isFinite(item.entry.order)) {
      ordered.push(item);
    } else {
      unOrdered.push(item);
    }
  }

  ordered.sort((a, b) => {
    if ((a.entry.order as number) !== (b.entry.order as number)) {
      return (a.entry.order as number) - (b.entry.order as number);
    }
    if (a.index !== b.index) {
      return a.index - b.index;
    }
    return a.entry.targetId.localeCompare(b.entry.targetId);
  });

  return [...ordered.map((o) => o.entry), ...unOrdered.map((u) => u.entry)];
}

/**
 * Pure lookup finding a dataset layer manifest by its layerId or short slug
 * (strips leading 'canon-', 'overlay-', or 'layer-' prefix to match cleanly).
 */
export function findCanonLayerById<T extends { readonly layerId: string }>(
  candidateId: string,
  activeLayers: readonly T[],
): T | undefined {
  const trimmed = candidateId.trim().replace(/^(canon|layer|overlay):/i, '');
  if (!trimmed) {
    return undefined;
  }
  const targetLower = trimmed.toLowerCase();
  const targetSlug = toUrlSlug(trimmed);
  const targetCanonSlug = toCanonicalLayerSlug(trimmed);

  return activeLayers.find((layer) => {
    const layerSlug = toUrlSlug(layer.layerId);
    const layerCanonSlug = toCanonicalLayerSlug(layer.layerId);
    return (
      layer.layerId.toLowerCase() === targetLower ||
      layerSlug === targetSlug ||
      (targetCanonSlug.length > 0 && layerCanonSlug === targetCanonSlug)
    );
  });
}

export interface ResolvedLayerAnnotation {
  layerId: string;
  layerTitle: string;
  kind: DatasetLayerKind;
  source?: DatasetLayerSourceMeta;
  entry: DatasetLayerEntry;
}

/**
 * Resolves all layer annotations targeting a given `targetId` across active layers in O(1) per layer.
 */
export function resolveEntityLayers(
  targetId: string,
  activeLayers: DatasetLayerManifest[],
): ResolvedLayerAnnotation[] {
  const results: ResolvedLayerAnnotation[] = [];

  for (const layer of activeLayers) {
    const entry = layer.entries[targetId];
    if (entry) {
      results.push({
        layerId: layer.layerId,
        layerTitle: layer.title,
        kind: layer.kind,
        source: layer.source,
        entry,
      });
    }
  }

  return results;
}

/**
 * Resolves all layer annotations belonging to a given host star system (`systemId`),
 * including the system itself, its catalogued exoplanets, and any attached `fictional-body` worlds.
 */
export function resolveSystemLayerEntries(
  systemId: string,
  activeLayers: DatasetLayerManifest[],
): ResolvedLayerAnnotation[] {
  const results: ResolvedLayerAnnotation[] = [];

  for (const layer of activeLayers) {
    for (const entry of Object.values(layer.entries)) {
      if (entry.systemId === systemId || entry.targetId === systemId) {
        results.push({
          layerId: layer.layerId,
          layerTitle: layer.title,
          kind: layer.kind,
          source: layer.source,
          entry,
        });
      }
    }
  }

  return results;
}

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

/**
 * Builds a compact, stopword-stripped, deduplicated clean-key search string for layer search entries.
 * Drops prose stopwords and any token that is already a substring of the entry's display name
 * or canon title (or any supplied excludeKeys), preventing index bloat.
 */
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

/**
 * Maps real-sky catalogued names from `realNames` onto entries of a layer where `inUniverseName`
 * is omitted (or preserves existing `resolvedName`), returning a new manifest with precalculated names.
 */
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

/**
 * Applies real-sky catalogued display names across a collection of layer manifests.
 */
export function applyResolvedNamesToLayers(
  layers: readonly DatasetLayerManifest[],
  realNames: ReadonlyMap<string, string>,
): DatasetLayerManifest[] {
  return layers.map((layer) => applyResolvedNamesToLayer(layer, realNames));
}

export interface UnresolvedLayerTarget {
  readonly layerId: string;
  readonly targetId: string;
  readonly systemId: string;
}

/**
 * Returns all layer entries that have neither an explicit `inUniverseName`, an existing `resolvedName`,
 * nor a resolvable real-sky name in `realNames`.
 */
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

/**
 * Converts DatasetLayerManifest entries into `CompactSearchEntry` records (`k = 7` layers)
 * for inclusion in `public/data/search/layers.json`, `core.json`, and `full.json`.
 */
export function buildSearchEntriesFromLayers(
  layers: readonly DatasetLayerManifest[],
  coordsById: Map<string, [number, number, number]>,
  realNames: ReadonlyMap<string, string> = new Map(),
): CompactSearchEntry[] {
  const searchEntries: CompactSearchEntry[] = [];

  for (const layer of layers) {
    const parentCategory =
      layer.kind === 'scientific-overlay' ? 'Scientific Layer' : 'Fictional Canon';

    // 1. Emit parent layer CompactSearchEntry (k: 7, no 's' field)
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

    // 2. Emit child entries in deterministic order
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

      if (entry.parentBodyId) {
        searchEntry.o = entry.parentBodyId;
      }

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

/**
 * Builds the `public/data/overlays/layers/index.json` summary envelope.
 */
export function buildLayerIndexManifest(layers: readonly DatasetLayerManifest[]): {
  i: string;
  n: string;
  c: number;
  d: DatasetLayerIndexEntry[];
} {
  return {
    i: 'dataset-layers-index',
    n: 'Dataset Layers Registry (FS-001 & FS-002)',
    c: layers.length,
    d: layers.map((l) => ({
      layerId: l.layerId,
      title: l.title,
      kind: l.kind,
      description: l.description,
      ...(l.source ? { source: l.source } : {}),
      entryCount: Object.keys(l.entries).length,
      path: `/data/overlays/layers/${l.layerId}.json`,
    })),
  };
}
