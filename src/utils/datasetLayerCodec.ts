import type {
  DatasetLayerEntry,
  DatasetLayerManifest,
  DatasetLayerSourceMeta,
} from '../types/datasetLayers';
import { CODE_TO_CONFIDENCE } from './compactDataConstants';
import {
  CODE_TO_LAYER_KIND,
  CODE_TO_TARGET_TYPE,
  type CompactEntityAnnotation,
  type CompactLayerManifest,
  type CompactLayerSourceMeta,
  type DecodedEntityAnnotation,
  type ResolvedLayerAnnotation,
} from './datasetLayerTypes';

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
    if (typeof ce.o === 'number' && Number.isFinite(ce.o)) entry.order = ce.o;
    if (ce.p) entry.parentBodyId = ce.p;
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
