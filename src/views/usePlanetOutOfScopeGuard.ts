import { useEffect } from 'react';
import type { DecodedDetailRecord } from '../data/detailsRepository';
import { appRouter, type StarmapSearchParams } from '../hooks/useSpaLocation';
import { toUrlSlug } from '../utils/datasetLayerSlugs';
import type { CompactSearchEntry } from '../utils/compactDataTypes';

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

    const stripFocus = Boolean(urlFocusSlug && !isFocusInPlanetScope);
    let stripCenter = false;

    if (centerParam && !centerParam.includes(',')) {
      const centerSlug = toUrlSlug(centerParam);
      const isCenterInPlanetScope =
        centerSlug === urlPlanetSlug ||
        centerSlug === toUrlSlug(targetPlanetId) ||
        orbitingBodyIds.some((id) => id === centerSlug || toUrlSlug(id) === centerSlug);

      if (!isCenterInPlanetScope) {
        stripCenter = true;
      }
    }

    if (stripFocus && import.meta.env?.DEV) {
      console.warn(`[router] Out-of-scope focus '${urlFocusSlug}' stripped on /planet/${urlPlanetSlug}`);
    }

    if (stripFocus || stripCenter) {
      void appRouter.navigate?.({
        to: '/planet/$planetId',
        params: { planetId: urlPlanetSlug },
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
