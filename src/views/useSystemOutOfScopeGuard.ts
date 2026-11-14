import { useEffect } from 'react';
import type { DecodedDetailRecord } from '../data/detailsRepository';
import { appRouter } from '../hooks/useSpaLocation';
import { findFocusedEntryInCorpus, toUrlSlug } from '../services/searchService';
import type { CompactSearchEntry } from '../utils/compactDataCodec';

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

    if (urlFocusSlug && !isFocusInThisSystem) {
      if (import.meta.env?.DEV) {
        console.warn(`[router] Out-of-scope focus '${urlFocusSlug}' stripped on /system/${urlSystemSlug}`);
      }
      if (typeof window !== 'undefined') {
        const nextUrl = new URL(window.location.href);
        if (nextUrl.searchParams.has('focus')) {
          nextUrl.searchParams.delete('focus');
          const nextHref = nextUrl.pathname + (nextUrl.search ? nextUrl.search : '');
          if (appRouter.history?.replace) {
            appRouter.history.replace(nextHref);
          } else if (window.history?.replaceState) {
            window.history.replaceState(null, '', nextHref);
          }
        }
      }
    }

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
        if (typeof window !== 'undefined') {
          const nextUrl = new URL(window.location.href);
          if (nextUrl.searchParams.has('center')) {
            nextUrl.searchParams.delete('center');
            const nextHref = nextUrl.pathname + (nextUrl.search ? nextUrl.search : '');
            if (appRouter.history?.replace) {
              appRouter.history.replace(nextHref);
            } else if (window.history?.replaceState) {
              window.history.replaceState(null, '', nextHref);
            }
          }
        }
      }
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
