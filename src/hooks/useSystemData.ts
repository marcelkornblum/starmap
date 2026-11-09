import type { DecodedDetailRecord } from '../data/detailsRepository';
import type { SystemSummaryNode } from '../types/astro';
import { useEntityDetails } from './useEntityDetails';

export interface UseSystemDataResult {
  readonly systemSummary: SystemSummaryNode | undefined;
  readonly systemDetail: DecodedDetailRecord | undefined;
  readonly focusedDetail: DecodedDetailRecord | undefined;
  readonly isLoading: boolean;
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

  const focusedDetail = needsDistinctFocused ? distinctFocusedDetail : systemDetail;
  const isLoading = isSystemLoading || (needsDistinctFocused && isFocusedLoading);

  return {
    systemSummary,
    systemDetail,
    focusedDetail,
    isLoading,
  };
}
