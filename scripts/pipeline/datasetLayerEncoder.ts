import type {
  DatasetLayerEntry,
  DatasetLayerIndexEntry,
  DatasetLayerManifest,
  DatasetLayerSourceMeta,
} from '../../src/types/datasetLayers';
import {
  COMPACT_SCHEMA_VERSION,
  CONFIDENCE_TO_CODE,
} from '../../src/utils/compactDataConstants';
import { getShardKey } from '../../src/utils/compactDataCodec';
import {
  LAYER_KIND_TO_CODE,
  TARGET_TYPE_TO_CODE,
  type CompactEntityAnnotation,
  type CompactLayerEntry,
  type CompactLayerManifest,
  type CompactLayerSourceMeta,
} from '../../src/utils/datasetLayerTypes';

export function encodeSourceMeta(source?: DatasetLayerSourceMeta): CompactLayerSourceMeta | undefined {
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

export function encodeLayerManifest(manifest: DatasetLayerManifest): CompactLayerManifest {
  const compactEntries: Record<string, CompactLayerEntry> = {};

  for (const [targetId, entry] of Object.entries(manifest.entries)) {
    const k = TARGET_TYPE_TO_CODE[entry.targetType] ?? 1;
    const compactEntry: CompactLayerEntry = {
      x: entry.text,
    };

    if (k !== 1) compactEntry.k = k;
    if (entry.systemId && entry.systemId !== targetId) compactEntry.s = entry.systemId;
    if (typeof entry.order === 'number' && Number.isFinite(entry.order)) compactEntry.o = entry.order;
    if (entry.parentBodyId) compactEntry.p = entry.parentBodyId;
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

export function encodeEntityAnnotation(
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
  if (typeof entry.order === 'number' && Number.isFinite(entry.order)) record.o = entry.order;
  if (layer.source?.creator) record.a = layer.source.creator;
  if (layer.source?.publicationYear) record.r = layer.source.publicationYear;
  return record;
}

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

export function buildLayerIndexManifest(layers: readonly DatasetLayerManifest[]): {
  v: number;
  i: string;
  n: string;
  c: number;
  d: DatasetLayerIndexEntry[];
} {
  return {
    v: COMPACT_SCHEMA_VERSION,
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
