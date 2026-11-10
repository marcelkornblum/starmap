import { useEffect } from 'react';
import type { DecodedDetailRecord } from '../data/detailsRepository';
import { appRouter } from '../hooks/useSpaLocation';
import { toUrlSlug } from '../services/searchService';
import type { CompactSearchEntry } from '../utils/compactDataCodec';

export interface UsePlanetOutOfScopeGuardParams {
  readonly urlPlanetSlug: string | null;
  readonly activeCorpus: readonly CompactSearchEntry[];
  readonly urlFocusSlug: string | null;
  readonly isFocusInPlanetScope: boolean;
  readonly centerParam?: string;
  readonly targetPlanetId: string;
  readonly orbitingBodyIds: readonly string[];
  readonly systemDetail?: DecodedDetailRecord;
}

export function checkIsFocusInPlanetScope(
  urlFocusSlug: string | null,
  urlPlanetSlug: string | null,
  targetPlanetId: string,
  systemDetail: DecodedDetailRecord | undefined,
  orbitingBodyIds: readonly string[],
  activeCorpusLength: number,
): boolean {
  if (!urlFocusSlug) return false;
  if (urlFocusSlug === urlPlanetSlug || urlFocusSlug === toUrlSlug(targetPlanetId)) {
    return true;
  }
  if (systemDetail?.kind === 'system') {
    const rec = systemDetail.record;
    const planet = rec.planets.find(
      (p) =>
        p.id === targetPlanetId ||
        toUrlSlug(p.id) === urlPlanetSlug ||
        toUrlSlug(p.name) === urlPlanetSlug,
    );
    if (
      planet?.satellites?.some(
        (sat) =>
          sat.id === urlFocusSlug ||
          toUrlSlug(sat.id) === urlFocusSlug ||
          toUrlSlug(sat.name) === urlFocusSlug,
      )
    ) {
      return true;
    }
    if (orbitingBodyIds.length > 0) {
      return orbitingBodyIds.some(
        (id) => id === urlFocusSlug || toUrlSlug(id) === urlFocusSlug,
      );
    }
    return false;
  }
  if (activeCorpusLength > 0) {
    return orbitingBodyIds.some(
      (id) => id === urlFocusSlug || toUrlSlug(id) === urlFocusSlug,
    );
  }
  return true;
}

export function usePlanetOutOfScopeGuard({
  urlPlanetSlug,
  activeCorpus,
  urlFocusSlug,
  isFocusInPlanetScope,
  centerParam,
  targetPlanetId,
  orbitingBodyIds,
  systemDetail,
}: UsePlanetOutOfScopeGuardParams): void {
  useEffect(() => {
    if (!urlPlanetSlug) return;
    if (activeCorpus.length === 0 && !systemDetail) return;

    if (urlFocusSlug && !isFocusInPlanetScope) {
      if (import.meta.env?.DEV) {
        console.warn(`[router] Out-of-scope focus '${urlFocusSlug}' stripped on /planet/${urlPlanetSlug}`);
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

    if (centerParam && !centerParam.includes(',')) {
      const centerSlug = toUrlSlug(centerParam);
      const isCenterInPlanetScope =
        centerSlug === urlPlanetSlug ||
        centerSlug === toUrlSlug(targetPlanetId) ||
        orbitingBodyIds.some((id) => id === centerSlug || toUrlSlug(id) === centerSlug);

      if (!isCenterInPlanetScope) {
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
    urlPlanetSlug,
    activeCorpus.length,
    urlFocusSlug,
    isFocusInPlanetScope,
    centerParam,
    targetPlanetId,
    orbitingBodyIds,
    systemDetail,
  ]);
}
