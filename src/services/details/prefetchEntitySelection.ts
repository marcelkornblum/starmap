import {
  fetchDetailRecord,
  fetchSummaryNode,
  getCachedDetailRecord,
  getCachedSummaryNode,
} from '../../data/detailsRepository';
import {
  areEntityAnnotationsCached,
  fetchEntityAnnotations,
} from '../../data/layerRepository';
import { toAnnotationLookupKey, toUrlSlug } from '../../utils/datasetLayerSlugs';

let hoverPrefetchTimer: ReturnType<typeof setTimeout> | null = null;

export function cancelHoverPrefetch(): void {
  if (hoverPrefetchTimer !== null) {
    clearTimeout(hoverPrefetchTimer);
    hoverPrefetchTimer = null;
  }
}

export function scheduleHoverPrefetch(
  entityId: string | null | undefined,
  systemId?: string | null,
  delayMs = 80,
  forceInTest = false,
): void {
  cancelHoverPrefetch();
  if (typeof window === 'undefined' && !forceInTest) return;
  if (!forceInTest && import.meta.env.MODE === 'test') return;

  hoverPrefetchTimer = setTimeout(() => {
    hoverPrefetchTimer = null;
    prefetchEntitySelection(entityId, systemId, forceInTest);
  }, delayMs);
}

export function prefetchEntitySelection(
  entityId: string | null | undefined,
  systemId?: string | null,
  forceInTest = false,
): void {
  if (typeof window === 'undefined' && !forceInTest) return;
  if (!forceInTest && import.meta.env.MODE === 'test') return;

  const rawTarget = (entityId ?? '').trim();
  const rawSys = (systemId ?? rawTarget).trim();
  if (!rawSys) return;

  const sysIds = Array.from(new Set([rawSys, toUrlSlug(rawSys)].filter(Boolean)));
  for (const id of sysIds) {
    if (!getCachedDetailRecord(id)) {
      void fetchDetailRecord(id).catch(() => undefined);
    }
    if (!getCachedSummaryNode(id)) {
      void fetchSummaryNode(id).catch(() => undefined);
    }
  }

  if (rawTarget && rawTarget !== rawSys && !getCachedDetailRecord(rawTarget)) {
    void fetchDetailRecord(rawTarget).catch(() => undefined);
  }

  const lookupIds = [
    toAnnotationLookupKey(rawTarget || rawSys),
    rawSys,
    toUrlSlug(rawSys),
  ].filter(Boolean);
  if (!areEntityAnnotationsCached(lookupIds)) {
    void fetchEntityAnnotations(lookupIds).catch(() => undefined);
  }
}
