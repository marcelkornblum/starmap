import { useEffect } from 'react';
import type { DecodedDetailRecord } from '../data/detailsRepository';
import { appRouter, type StarmapSearchParams } from '../hooks/useSpaLocation';
import { findFocusedEntryInCorpus } from '../services/search/searchCorpusHelpers';
import { toUrlSlug } from '../utils/datasetLayerSlugs';
import type { CompactSearchEntry } from '../utils/compactDataTypes';

export interface UseSystemOutOfScopeGuardParams {
  readonly urlSystemSlug: string | null;
  readonly activeCorpus: readonly CompactSearchEntry[];
  readonly urlFocusSlug: string | null;
  readonly isFocusInThisSystem: boolean;
  readonly center?: string;
  readonly targetSystemId: string;
  readonly systemDetail?: DecodedDetailRecord;
}

export function useSystemOutOfScopeGuard({
  urlSystemSlug,
  activeCorpus,
  urlFocusSlug,
  isFocusInThisSystem,
  center,
  targetSystemId,
  systemDetail,
}: UseSystemOutOfScopeGuardParams): void {
  useEffect(() => {
    if (!urlSystemSlug) return;
    if (activeCorpus.length === 0 && !systemDetail) return;

    const stripFocus = Boolean(urlFocusSlug && !isFocusInThisSystem);
    let stripCenter = false;

    if (center && !center.includes(',')) {
      const centerSlug = toUrlSlug(center);
      const isCenterInThisSystem =
        centerSlug === urlSystemSlug ||
        centerSlug === toUrlSlug(targetSystemId) ||
        (() => {
          if (systemDetail?.kind === 'system') {
            const rec = systemDetail.record;
            return (
              rec.stars.some((s) => s.id === centerSlug || toUrlSlug(s.id) === centerSlug) ||
              rec.planets.some((p) => p.id === centerSlug || toUrlSlug(p.id) === centerSlug)
            );
          }
          if (activeCorpus.length > 0) {
            const entry = findFocusedEntryInCorpus(centerSlug, activeCorpus);
            if (entry && (entry.s === targetSystemId || (entry.s && toUrlSlug(entry.s) === urlSystemSlug))) return true;
            return false;
          }
          return true;
        })();

      if (!isCenterInThisSystem) {
        stripCenter = true;
      }
    }

    if (stripFocus && import.meta.env?.DEV) {
      console.warn(`[router] Out-of-scope focus '${urlFocusSlug}' stripped on /system/${urlSystemSlug}`);
    }

    if (stripFocus || stripCenter) {
      void appRouter.navigate?.({
        to: '/system/$systemId',
        params: { systemId: urlSystemSlug },
        search: (prev: StarmapSearchParams = {}) => {
          const next: StarmapSearchParams = { ...prev };
          if (stripFocus) {
            delete next.focus;
          }
          if (stripCenter) {
            delete next.center;
          }
          return next;
        },
        replace: true,
      })?.catch(() => {});
    }
  }, [
    urlSystemSlug,
    activeCorpus,
    urlFocusSlug,
    isFocusInThisSystem,
    center,
    targetSystemId,
    systemDetail,
  ]);
}
