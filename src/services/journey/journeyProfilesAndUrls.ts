import { toUrlSlug } from '../../utils/datasetLayerSlugs';
import {
  DEFAULT_INTERSTELLAR_ORIGIN_ID,
  DEFAULT_INTRA_SYSTEM_ORIGIN_ID,
} from './journeyTypes';

/**
 * Extracts route stops from URL search string (?route=sol,tau-ceti).
 * If a single stop is provided, prepends the default Step 1 origin based on scope.
 */
export function extractUrlRouteStops(
  searchString: string,
  viewScope: 'galaxy' | 'system' | 'planet' = 'galaxy',
): readonly string[] | null {
  if (!searchString) return null;
  const query = searchString.startsWith('?') ? searchString.slice(1) : searchString;
  const params = new URLSearchParams(query);
  const routeParam = params.get('route');
  if (!routeParam) return null;

  const rawStops = routeParam
    .split(',')
    .map((s) => {
      const entityPart = s.split(':')[0] ?? '';
      return toUrlSlug(entityPart.trim());
    })
    .filter((s) => s.length > 0);

  if (rawStops.length === 0) {
    return null;
  }

  if (rawStops.length === 1) {
    const singleStop = rawStops[0];
    if (!singleStop) return null;
    const defaultOrigin =
      viewScope === 'system' || viewScope === 'planet'
        ? DEFAULT_INTRA_SYSTEM_ORIGIN_ID
        : DEFAULT_INTERSTELLAR_ORIGIN_ID;
    return [defaultOrigin, singleStop];
  }

  return rawStops;
}

/**
 * Extracts journeyOption ID from embedded departure modes on route stops (e.g. ?route=sol:torchship-1g,tau-ceti).
 */
export function extractUrlJourneyOptionId(searchString: string): string | null {
  if (!searchString) return null;
  const query = searchString.startsWith('?') ? searchString.slice(1) : searchString;
  const params = new URLSearchParams(query);

  const routeParam = params.get('route');
  if (routeParam) {
    const stops = routeParam.split(',');
    for (const stop of stops) {
      const parts = stop.split(':');
      if (parts.length > 1 && parts[1]?.trim()) {
        return parts[1].trim();
      }
    }
  }

  return null;
}

/**
 * Builds the Directions trigger URL when a user clicks the Directions button.
 * Only defaults the Step 1 origin to Sol (galaxy) or Earth (system/planet).
 * Preserves the current top-level view pathname and existing search parameters.
 */
export function buildDirectionsTriggerHref(input: {
  readonly viewScope: 'galaxy' | 'system' | 'planet';
  readonly focusedId: string;
  readonly systemId?: string;
  readonly focusedKind?: 'system' | 'star' | 'planet' | 'belt' | 'minor-body' | 'structure';
  readonly currentPathname?: string;
  readonly currentSearch?: string;
  readonly hasExplicitFocus?: boolean;
  readonly explicitOriginId?: string;
}): string {
  const {
    viewScope,
    focusedId,
    systemId,
    currentPathname,
    currentSearch = '',
    hasExplicitFocus = false,
    explicitOriginId,
  } = input;

  const targetId = toUrlSlug(focusedId || systemId || '');

  const originId =
    explicitOriginId ??
    (viewScope === 'galaxy'
      ? DEFAULT_INTERSTELLAR_ORIGIN_ID
      : DEFAULT_INTRA_SYSTEM_ORIGIN_ID);

  const basePath =
    viewScope === 'galaxy' && (!currentPathname || currentPathname.startsWith('/galaxy'))
      ? '/galaxy'
      : currentPathname && currentPathname.length > 0
        ? currentPathname
        : viewScope === 'galaxy'
          ? '/galaxy'
          : viewScope === 'system'
            ? `/system/${encodeURIComponent(systemId || targetId)}`
            : `/planet/${encodeURIComponent(targetId)}`;

  const searchParams = new URLSearchParams(
    currentSearch.startsWith('?') ? currentSearch.slice(1) : currentSearch,
  );

  if (viewScope === 'galaxy') {
    if (!searchParams.has('focus') && (systemId || targetId)) {
      searchParams.set('focus', toUrlSlug(focusedId || systemId || ''));
    }
  } else {
    if (
      hasExplicitFocus &&
      targetId &&
      toUrlSlug(systemId ?? '') !== targetId &&
      !searchParams.has('focus')
    ) {
      searchParams.set('focus', targetId);
    }
  }

  searchParams.set('route', `${originId},${targetId}`);

  const queryString = searchParams
    .toString()
    .replace(/%2C/gi, ',')
    .replace(/%3A/gi, ':');
  return `${basePath}${queryString ? `?${queryString}` : ''}`;
}

export function buildJourneyOptionHref(
  currentPathname: string,
  currentSearch: string,
  routeStopIds: readonly string[],
  optionId: string,
): string {
  const params = new URLSearchParams(
    currentSearch.startsWith('?') ? currentSearch.slice(1) : currentSearch,
  );
  const cleanStops = routeStopIds.map((id) => id.split(':')[0] ?? id);
  const encodedStops = cleanStops.map((stop, idx) =>
    idx === 0 && optionId ? `${stop}:${optionId}` : stop,
  );
  params.set('route', encodedStops.join(','));
  const qs = params.toString().replace(/%2C/gi, ',').replace(/%3A/gi, ':');
  return `${currentPathname}${qs ? `?${qs}` : ''}`;
}

export function buildJourneyClearOptionHref(
  currentPathname: string,
  currentSearch: string,
  routeStopIds: readonly string[],
): string {
  const params = new URLSearchParams(
    currentSearch.startsWith('?') ? currentSearch.slice(1) : currentSearch,
  );
  const cleanRoute = routeStopIds.map((id) => id.split(':')[0] ?? id).join(',');
  params.set('route', cleanRoute);
  const qs = params.toString().replace(/%2C/gi, ',').replace(/%3A/gi, ':');
  return `${currentPathname}${qs ? `?${qs}` : ''}`;
}

export function buildJourneyCloseHref(
  currentPathname: string,
  currentSearch: string,
): string {
  const params = new URLSearchParams(
    currentSearch.startsWith('?') ? currentSearch.slice(1) : currentSearch,
  );
  params.delete('route');
  const qs = params.toString().replace(/%2C/gi, ',').replace(/%3A/gi, ':');
  return `${currentPathname}${qs ? `?${qs}` : ''}`;
}
