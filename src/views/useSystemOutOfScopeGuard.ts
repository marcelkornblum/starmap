import { useEffect } from 'react';
import type { DecodedDetailRecord } from '../data/detailsRepository';
import { useOptionalRouter, type StarmapSearchParams } from '../hooks/useSpaLocation';
import { findFocusedEntryInCorpus } from '../services/search/searchCorpusHelpers';
import { toUrlSlug } from '../utils/datasetLayerSlugs';
import { parseCenterCoordinatesString } from '../utils/url';
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
  const router = useOptionalRouter();

  useEffect(() => {
    if (!urlSystemSlug) return;
    if (activeCorpus.length === 0 && !systemDetail) return;

    const stripFocus = Boolean(urlFocusSlug && !isFocusInThisSystem);
    let stripCenter = false;

    if (center && !parseCenterCoordinatesString(center)) {
      const centerSlug = toUrlSlug(center);
      const matchesSlug = (id?: string, name?: string): boolean =>
        id === centerSlug ||
        (id ? toUrlSlug(id) === centerSlug : false) ||
        (name ? toUrlSlug(name) === centerSlug : false);

      const isCenterInThisSystem =
        centerSlug === urlSystemSlug ||
        centerSlug === toUrlSlug(targetSystemId) ||
        (() => {
          if (systemDetail?.kind === 'system') {
            const rec = systemDetail.record;
            return (
              matchesSlug(rec.id, rec.name) ||
              rec.stars.some((s) => matchesSlug(s.id, s.name)) ||
              rec.planets.some((p) => matchesSlug(p.id, p.name)) ||
              rec.planets.some(
                (p) => p.satellites?.some((sat) => matchesSlug(sat.id, sat.name)) ?? false,
              ) ||
              (rec.disks?.some((d) => matchesSlug(d.id, d.name)) ?? false)
            );
          }
          if (activeCorpus.length > 0) {
            const entry = findFocusedEntryInCorpus(centerSlug, activeCorpus);
            if (
              entry &&
              (entry.i === targetSystemId ||
                toUrlSlug(entry.i) === urlSystemSlug ||
                entry.s === targetSystemId ||
                (entry.s && toUrlSlug(entry.s) === urlSystemSlug))
            ) {
              return true;
            }
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

    if ((stripFocus || stripCenter) && router && typeof router.navigate === 'function') {
      void Promise.resolve(
        router.navigate({
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
        }),
      ).catch(() => {});
    }
  }, [
    urlSystemSlug,
    activeCorpus,
    urlFocusSlug,
    isFocusInThisSystem,
    center,
    targetSystemId,
    systemDetail,
    router,
  ]);
}
