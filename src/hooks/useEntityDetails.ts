import { useEffect, useState, useSyncExternalStore } from 'react';
import {
  fetchDetailRecord,
  fetchSummaryNode,
  getCachedDetailRecord,
  getCachedSummaryNode,
  getDetailsRepositoryVersion,
  subscribeDetailsRepository,
  type DecodedDetailRecord,
} from '../data/detailsRepository';
import type { SystemSummaryNode } from '../types/astro';

export interface UseEntityDetailsResult {
  readonly detail: DecodedDetailRecord | undefined;
  readonly summary: SystemSummaryNode | undefined;
  readonly isLoading: boolean;
}

/**
 * Reactive hook providing decoded detail and summary records for a celestial entity (AUD-087 & DEC-R042).
 * Resolves synchronously on initial render if already cached in memory.
 * Subscribes to cache updates via useSyncExternalStore and automatically cancels
 * in-flight AbortSignal on unmount or entityId change.
 */
export function useEntityDetails(
  entityId: string | null | undefined,
): UseEntityDetailsResult {
  useSyncExternalStore(
    subscribeDetailsRepository,
    getDetailsRepositoryVersion,
    getDetailsRepositoryVersion,
  );

  const [completedId, setCompletedId] = useState<string | null>(null);

  const detail = entityId ? getCachedDetailRecord(entityId) : undefined;
  const summary = entityId ? getCachedSummaryNode(entityId) : undefined;

  const isCached =
    !entityId ||
    Boolean(detail && (detail.kind !== 'system' || Boolean(summary)));

  const isPending = Boolean(entityId && !isCached && completedId !== entityId);

  useEffect(() => {
    if (!entityId) {
      return undefined;
    }

    const cachedDetail = getCachedDetailRecord(entityId);
    const cachedSummary = getCachedSummaryNode(entityId);
    if (cachedDetail && (cachedDetail.kind !== 'system' || cachedSummary)) {
      return undefined;
    }

    const controller = new AbortController();

    const needDetail = !cachedDetail;
    const needSummary = !cachedSummary && (!cachedDetail || cachedDetail.kind === 'system');

    void Promise.all([
      needDetail
        ? fetchDetailRecord(entityId, fetch, controller.signal)
        : Promise.resolve(undefined),
      needSummary
        ? fetchSummaryNode(entityId, fetch, controller.signal)
        : Promise.resolve(undefined),
    ])
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) {
          setCompletedId(entityId);
        }
      });

    return () => {
      controller.abort();
    };
  }, [entityId]);

  return {
    detail,
    summary,
    isLoading: isPending,
  };
}
