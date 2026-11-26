import { useEffect, useSyncExternalStore } from 'react';
import { SOL_REFERENCE_TARGET } from '../config/referenceTargets';
import {
  fetchSolPrimaryShard,
  isSolPrimaryShardCached,
  subscribeDetailsRepository,
  type DecodedDetailRecord,
} from '../data/detailsRepository';
import type { SystemSummaryNode } from '../types/astro';
import { useEntityDetails } from './useEntityDetails';

export interface UseSystemDataResult {
  readonly systemSummary: SystemSummaryNode | undefined;
  readonly systemDetail: DecodedDetailRecord | undefined;
  readonly focusedDetail: DecodedDetailRecord | undefined;
  readonly isLoading: boolean;
  readonly solPrimaryReady?: boolean;
}

/**
 * Reactive hook providing the system summary node, host system detail, and focused entity detail (AUD-087 & DEC-R042).
 * Synchronously reads cached data and reactively updates via repository subscriptions.
 */
export function useSystemData(
  systemId: string | null | undefined,
  focusedEntityId?: string | null,
): UseSystemDataResult {
  const {
    detail: systemDetail,
    summary: systemSummary,
    isLoading: isSystemLoading,
  } = useEntityDetails(systemId);

  const needsDistinctFocused = Boolean(
    focusedEntityId && focusedEntityId !== systemId,
  );

  const {
    detail: distinctFocusedDetail,
    isLoading: isFocusedLoading,
  } = useEntityDetails(needsDistinctFocused ? focusedEntityId : null);

  const solPrimaryReady = useSyncExternalStore(
    subscribeDetailsRepository,
    isSolPrimaryShardCached,
    isSolPrimaryShardCached,
  );

  useEffect(() => {
    if (systemId !== SOL_REFERENCE_TARGET.id || solPrimaryReady) {
      return undefined;
    }
    const controller = new AbortController();
    void fetchSolPrimaryShard(fetch, controller.signal).catch(() => false);
    return () => {
      controller.abort();
    };
  }, [systemId, solPrimaryReady]);

  const focusedDetail = needsDistinctFocused ? distinctFocusedDetail : systemDetail;
  const isLoading = isSystemLoading || (needsDistinctFocused && isFocusedLoading);

  return {
    systemSummary,
    systemDetail,
    focusedDetail,
    isLoading,
    solPrimaryReady,
  };
}
