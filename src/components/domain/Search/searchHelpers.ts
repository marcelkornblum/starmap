import type { GroupedSearchResults } from '../../../services/searchService';
import { executeCatalogSearch } from '../../../services/searchService';
import type { CompactSearchEntry } from '../../../utils/compactDataCodec';
import {
  fetchDetailRecord,
  fetchSummaryNode,
} from '../../../data/detailsRepository';
import {
  fetchEntityAnnotations,
  fetchLayerManifest,
} from '../../../data/layerRepository';

/** Minimum trimmed query length before the catalogue is searched and results are suggested. */
export const SEARCH_MIN_QUERY_LENGTH = 3;

/** Idle time after the last keystroke before a search runs, so typing is never blocked by matching. */
export const SEARCH_DEBOUNCE_MS = 150;

/**
 * Single entry point for catalogue searches in this component. Queries shorter than the minimum
 * length are treated as empty, so no code path (typing, URL echo, initial load, filter change)
 * can run a broad, expensive match and push thousands of hits into the 3D selection.
 */
export const searchCatalog = (
  entries: readonly CompactSearchEntry[],
  options: Parameters<typeof executeCatalogSearch>[1],
): GroupedSearchResults =>
  executeCatalogSearch(
    entries,
    options.query.trim().length >= SEARCH_MIN_QUERY_LENGTH
      ? options
      : { ...options, query: '' },
  );

/**
 * Lazily prefetches summary nodes, detail records, layer manifests, and entity annotations
 * for top search results once at least 3 characters have been entered.
 */
export const prefetchSearchResultsDetails = (
  results: GroupedSearchResults,
): void => {
  if (!results || !results.query || results.query.trim().length < 3) {
    return;
  }

  const groups = results.groups;
  if (!groups) {
    return;
  }

  const seenSummaryNodes = new Set<string>();
  const seenDetailRecords = new Set<string>();
  const seenEntityAnnotations = new Set<string>();
  const seenLayerManifests = new Set<string>();

  for (const [groupKey, group] of Object.entries(groups)) {
    if (!group || !Array.isArray(group.items)) {
      continue;
    }

    const isLayerGroup = groupKey === 'layers';

    for (const item of group.items) {
      if (!item) {
        continue;
      }

      const isLayer = isLayerGroup || item.category === 'layers';

      if (isLayer) {
        const itemWithLayerId = item as unknown as { layerId?: string };
        const rawLayerId =
          itemWithLayerId.layerId ??
          item.canonLayerId ??
          (item.id.includes(':') ? item.id.split(':')[0] : item.id);

        if (rawLayerId && !seenLayerManifests.has(rawLayerId)) {
          seenLayerManifests.add(rawLayerId);
          void fetchLayerManifest(rawLayerId).catch(() => undefined);
        }

        const targetSystemId =
          item.systemId ??
          (item.id.includes(':') ? item.id.split(':')[1] : undefined);

        if (targetSystemId) {
          if (!seenSummaryNodes.has(targetSystemId)) {
            seenSummaryNodes.add(targetSystemId);
            void fetchSummaryNode(targetSystemId).catch(() => undefined);
          }
          if (!seenDetailRecords.has(targetSystemId)) {
            seenDetailRecords.add(targetSystemId);
            void fetchDetailRecord(targetSystemId).catch(() => undefined);
          }
        }

        if (item.id.includes(':')) {
          const targetEntityId = item.id.split(':')[1];
          if (targetEntityId && !seenDetailRecords.has(targetEntityId)) {
            seenDetailRecords.add(targetEntityId);
            void fetchDetailRecord(targetEntityId).catch(() => undefined);
          }
        }
      } else {
        const entityId = item.id;
        const systemId = item.systemId ?? item.id;

        if (systemId && !seenSummaryNodes.has(systemId)) {
          seenSummaryNodes.add(systemId);
          void fetchSummaryNode(systemId).catch(() => undefined);
        }

        if (systemId && !seenDetailRecords.has(systemId)) {
          seenDetailRecords.add(systemId);
          void fetchDetailRecord(systemId).catch(() => undefined);
        }

        if (entityId && entityId !== systemId && !seenDetailRecords.has(entityId)) {
          seenDetailRecords.add(entityId);
          void fetchDetailRecord(entityId).catch(() => undefined);
        }

        const annotationIds = [
          entityId,
          ...(item.systemId ? [item.systemId] : []),
        ].filter(Boolean);
        const annotationKey = annotationIds.join(',');
        if (annotationIds.length > 0 && !seenEntityAnnotations.has(annotationKey)) {
          seenEntityAnnotations.add(annotationKey);
          void fetchEntityAnnotations(annotationIds).catch(() => undefined);
        }
      }
    }
  }
};
