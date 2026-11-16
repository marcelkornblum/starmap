import type { DatasetLayerKind } from '../../types/datasetLayers';
import type { CompactSearchEntry } from '../../utils/compactDataTypes';
import {
  toAnnotationLookupKey,
  toCanonicalLayerSlug,
  toUrlSlug,
} from '../../utils/datasetLayerSlugs';
import type { DecodedEntityAnnotation } from '../../utils/datasetLayerTypes';
import { buildLayerGalaxyHref } from '../search/searchUrls';
import type {
  CanonAnnotationOrderOptions,
  FocusedCanonAnnotation,
} from './detailsCanonTypes';

export const DEFAULT_CANON_LAYER_KIND_ORDER: readonly DatasetLayerKind[] = [
  'scientific-overlay',
  'custom-user',
  'fictional-canon',
];

export const resolveCanonLayerKindPriority = (
  kind: DatasetLayerKind,
  kindOrder: readonly DatasetLayerKind[] = DEFAULT_CANON_LAYER_KIND_ORDER,
): number => {
  const index = kindOrder.indexOf(kind);
  return index >= 0 ? index : kindOrder.length;
};

export const sortCanonAnnotations = (
  annotations: readonly FocusedCanonAnnotation[],
  options?: CanonAnnotationOrderOptions,
): readonly FocusedCanonAnnotation[] => {
  const kindOrder = options?.kindOrder ?? DEFAULT_CANON_LAYER_KIND_ORDER;
  const layerIdOrder = options?.layerIdOrder;

  return annotations
    .map((annotation, index) => ({ annotation, index }))
    .sort((a, b) => {
      if (layerIdOrder && layerIdOrder.length > 0) {
        const rankA = layerIdOrder.indexOf(a.annotation.layerId);
        const rankB = layerIdOrder.indexOf(b.annotation.layerId);
        const normA = rankA >= 0 ? rankA : Number.POSITIVE_INFINITY;
        const normB = rankB >= 0 ? rankB : Number.POSITIVE_INFINITY;
        if (normA !== normB) {
          return normA - normB;
        }
      }

      const kindPriorityA = resolveCanonLayerKindPriority(
        a.annotation.kind,
        kindOrder,
      );
      const kindPriorityB = resolveCanonLayerKindPriority(
        b.annotation.kind,
        kindOrder,
      );
      if (kindPriorityA !== kindPriorityB) {
        return kindPriorityA - kindPriorityB;
      }

      return a.index - b.index;
    })
    .map((entry) => entry.annotation);
};

export function buildInPlaceLayerItemHref(
  layerId: string,
  targetId: string,
  name?: string,
  currentPathname?: string,
  currentSearch?: string,
): string {
  const cleanId = targetId.includes(':')
    ? targetId.split(':').slice(1).join(':')
    : targetId;
  const itemSlug = toUrlSlug(name || cleanId);
  const layerSlug = toCanonicalLayerSlug(layerId) || toUrlSlug(layerId);

  const searchSource =
    currentSearch ??
    (currentPathname?.includes('?')
      ? currentPathname.split('?')[1]?.split('#')[0]
      : '');
  const searchParams = new URLSearchParams(searchSource);
  searchParams.set('select', `layer:${layerSlug}`);
  searchParams.set('layer', `${layerSlug}:${itemSlug}`);
  const qs = searchParams.toString().replace(/%3A/gi, ':').replace(/%2C/gi, ',');
  const basePath = (currentPathname || '/galaxy').split('?')[0].split('#')[0];
  return `${basePath}?${qs}`;
}

const toFocusedCanonAnnotation = (
  record: DecodedEntityAnnotation,
  _corpus?: readonly CompactSearchEntry[],
  currentPathname?: string,
  currentSearch?: string,
  hrefBuilder?: (layerId: string, targetId: string, name?: string) => string,
): FocusedCanonAnnotation => {
  const displayName = record.inUniverseName || record.resolvedName;
  const href = hrefBuilder
    ? hrefBuilder(record.layerId, record.targetId, displayName)
    : buildInPlaceLayerItemHref(
        record.layerId,
        record.targetId,
        displayName,
        currentPathname,
        currentSearch,
      );
  return {
    layerId: record.layerId,
    layerTitle: record.layerTitle,
    layerHref: buildLayerGalaxyHref(record.layerId),
    href,
    kind: record.kind,
    targetId: record.targetId,
    targetType: record.targetType,
    ...(record.inUniverseName ? { inUniverseName: record.inUniverseName } : {}),
    ...(record.resolvedName ? { resolvedName: record.resolvedName } : {}),
    ...(record.subtitle ? { subtitle: record.subtitle } : {}),
    ...(record.workTitle ? { workTitle: record.workTitle } : {}),
    text: record.text,
    ...(record.creator ? { creator: record.creator } : {}),
    ...(record.publicationYear
      ? { publicationYear: record.publicationYear }
      : {}),
  };
};

export const resolveFocusedCanonAnnotations = (
  targetId: string,
  systemId: string,
  records: readonly DecodedEntityAnnotation[],
  orderOptions?: CanonAnnotationOrderOptions,
  corpus?: readonly CompactSearchEntry[],
  currentPathname?: string,
  currentSearch?: string,
): readonly FocusedCanonAnnotation[] => {
  const rawTargetKey = toAnnotationLookupKey(targetId);

  const directMatches = records.filter((r) => r.targetId === rawTargetKey);
  const systemMatches = records.filter(
    (r) => r.systemId === systemId || r.targetId === systemId,
  );

  const searchSource =
    currentSearch ??
    (currentPathname?.includes('?')
      ? currentPathname.split('?')[1]?.split('#')[0]
      : '');
  const searchParams = new URLSearchParams(searchSource);
  searchParams.delete('select');
  searchParams.delete('layer');
  const preservedQs = searchParams.toString().replace(/%3A/gi, ':').replace(/%2C/gi, ',');
  const preservedPrefix = preservedQs ? `${preservedQs}&` : '';
  const basePath = (currentPathname || '/galaxy').split('?')[0].split('#')[0];

  const hrefBuilder = (layerId: string, recordTargetId: string, name?: string): string => {
    const cleanId = recordTargetId.includes(':')
      ? recordTargetId.split(':').slice(1).join(':')
      : recordTargetId;
    const itemSlug = toUrlSlug(name || cleanId);
    const layerSlug = toCanonicalLayerSlug(layerId) || toUrlSlug(layerId);
    return `${basePath}?${preservedPrefix}select=layer:${layerSlug}&layer=${layerSlug}:${itemSlug}`;
  };

  const seen = new Set<string>();
  const annotations: FocusedCanonAnnotation[] = [];

  for (const record of [...directMatches, ...systemMatches]) {
    const dedupeKey = `${record.layerId}:${record.targetId}`;
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);
    annotations.push(
      toFocusedCanonAnnotation(
        record,
        corpus,
        currentPathname,
        currentSearch,
        hrefBuilder,
      ),
    );
  }

  return sortCanonAnnotations(annotations, orderOptions);
};

export const resolveDirectTargetCanonAnnotations = (
  targetIds: readonly string[],
  recordsById: Readonly<Record<string, readonly DecodedEntityAnnotation[]>>,
  corpus?: readonly CompactSearchEntry[],
): readonly FocusedCanonAnnotation[] => {
  const seen = new Set<string>();
  const annotations: FocusedCanonAnnotation[] = [];

  for (const targetId of targetIds) {
    const rawTargetKey = toAnnotationLookupKey(targetId);
    for (const record of recordsById[rawTargetKey] ?? []) {
      if (record.targetId !== rawTargetKey) {
        continue;
      }
      const dedupeKey = `${record.layerId}:${record.targetId}`;
      if (seen.has(dedupeKey)) {
        continue;
      }
      seen.add(dedupeKey);
      annotations.push(toFocusedCanonAnnotation(record, corpus));
    }
  }

  return sortCanonAnnotations(annotations);
};
