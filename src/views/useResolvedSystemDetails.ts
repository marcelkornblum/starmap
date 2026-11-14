import { useEffect, useMemo } from 'react';
import {
  useSpatialEntityStore,
  useSpatialEntityStoreApi,
} from '../components/canvas/entity/SpatialEntityContext';
import type { SpatialEntityDefinition } from '../components/canvas/entity/SpatialEntityStore';
import { SOL_REFERENCE_TARGET } from '../config/referenceTargets';
import type { DecodedDetailRecord } from '../data/detailsRepository';
import { useSystemData } from '../hooks/useSystemData';
import { useSearchCorpus } from '../hooks/useSearchCorpus';
import {
  buildFocusedEntityDetails,
  type FocusedEntityDetails,
} from '../services/detailsService';
import { useParams, useSearch } from '@tanstack/react-router';
import {
  findFocusedEntryInCorpus,
  resolveFocusedEntityFromCorpus,
  toUrlSlug,
} from '../services/searchService';
import type { CompactSearchEntry } from '../utils/compactDataCodec';
import {
  toAnnotationLookupKey,
  type DecodedEntityAnnotation,
} from '../utils/datasetLayerCodec';
import { useEntityAnnotations } from '../hooks/useLayerData';
import {
  useSpaLocation,
  type StarmapSearchParams,
} from '../hooks/useSpaLocation';

export interface UseResolvedSystemDetailsProps {
  readonly initialCorpus?: readonly CompactSearchEntry[];
  readonly locationPathname?: string;
  readonly locationSearch?: string;
  readonly systemId?: string;
}

export interface ResolvedSystemDetailsResult {
  readonly focusedDetails: FocusedEntityDetails | null;
  readonly systemContextDetails: FocusedEntityDetails | null;
  readonly focusedEntity: SpatialEntityDefinition | null;
  readonly focusedEntityId?: string;
  readonly activeCorpus: readonly CompactSearchEntry[];
  readonly canonRecords: readonly DecodedEntityAnnotation[];
  readonly urlSystemSlug: string | null;
  readonly hasExplicitFocus: boolean;
  readonly focusedDetail: DecodedDetailRecord | undefined;
  readonly systemDetail: DecodedDetailRecord | undefined;
  readonly isFocusInThisSystem: boolean;
  readonly targetSystemId: string;
}

const EMPTY_CORPUS: readonly CompactSearchEntry[] = [];

export function useResolvedSystemDetails(
  { initialCorpus, locationPathname, locationSearch, systemId: propSystemId }: UseResolvedSystemDetailsProps,
  _shouldFetchShards = false,
): ResolvedSystemDetailsResult {
  const storeApi = useSpatialEntityStoreApi();
  useSpatialEntityStore((state) => state.entities);
  useSpatialEntityStore((state) => state.focusedId);

  const { pathname, search } = useSpaLocation(
    locationPathname,
    locationSearch,
    SOL_REFERENCE_TARGET.href,
  );

  const routeParams = useParams({ strict: false }) as Record<string, string | undefined> | undefined;
  const routeSearch = useSearch({ strict: false }) as StarmapSearchParams | undefined;

  const rawSystemId = routeParams?.systemId ?? propSystemId;
  const fallbackSlug = pathname.startsWith('/system/')
    ? toUrlSlug(pathname.slice('/system/'.length).split('/')[0])
    : null;
  const urlSystemSlug = toUrlSlug(rawSystemId ?? '') || fallbackSlug || null;

  const searchParams = useMemo(() => new URLSearchParams(search), [search]);
  const focusParam = routeSearch?.focus ?? searchParams.get('focus') ?? undefined;
  const urlFocusSlug = focusParam ? toUrlSlug(focusParam) || null : null;
  const hasExplicitFocus = Boolean(focusParam && urlFocusSlug && urlFocusSlug.length > 0);

  const { corpus } = useSearchCorpus('all', initialCorpus);
  const activeCorpus = corpus ?? EMPTY_CORPUS;

  const urlSystemEntry = urlSystemSlug
    ? findFocusedEntryInCorpus(urlSystemSlug, activeCorpus)
    : undefined;
  const targetSystemId =
    urlSystemEntry?.s ??
    urlSystemEntry?.i ??
    urlSystemSlug ??
    '';

  const { systemSummary, systemDetail, focusedDetail } = useSystemData(
    targetSystemId,
    urlFocusSlug ?? '',
  );

  const isFocusInThisSystem = useMemo(() => {
    if (!urlFocusSlug) return false;
    if (urlFocusSlug === urlSystemSlug || urlFocusSlug === toUrlSlug(targetSystemId)) {
      return true;
    }
    if (systemDetail?.kind === 'system') {
      const rec = systemDetail.record;
      if (
        toUrlSlug(rec.id) === urlFocusSlug ||
        toUrlSlug(rec.name) === urlFocusSlug ||
        rec.stars.some((s) => s.id === urlFocusSlug || toUrlSlug(s.id) === urlFocusSlug || toUrlSlug(s.name) === urlFocusSlug) ||
        rec.planets.some((p) => p.id === urlFocusSlug || toUrlSlug(p.id) === urlFocusSlug || toUrlSlug(p.name) === urlFocusSlug) ||
        rec.planets.some((p) => p.satellites?.some((sat) => sat.id === urlFocusSlug || toUrlSlug(sat.id) === urlFocusSlug || toUrlSlug(sat.name) === urlFocusSlug)) ||
        rec.disks?.some((d) => d.id === urlFocusSlug || toUrlSlug(d.id) === urlFocusSlug || toUrlSlug(d.name) === urlFocusSlug)
      ) {
        return true;
      }
      return false;
    }
    if (activeCorpus.length > 0) {
      const entry = findFocusedEntryInCorpus(urlFocusSlug, activeCorpus);
      if (entry) {
        if (
          entry.i === targetSystemId ||
          toUrlSlug(entry.i) === urlSystemSlug ||
          entry.s === targetSystemId ||
          (entry.s && toUrlSlug(entry.s) === urlSystemSlug)
        ) {
          return true;
        }
      }
      return false;
    }
    return true;
  }, [urlFocusSlug, urlSystemSlug, targetSystemId, activeCorpus, systemDetail]);

  const urlFocusEntity = useMemo(
    () =>
      urlFocusSlug && isFocusInThisSystem
        ? resolveFocusedEntityFromCorpus(urlFocusSlug, activeCorpus)
        : null,
    [urlFocusSlug, isFocusInThisSystem, activeCorpus],
  );

  const rawStoreFocused = storeApi.getState().getEntitiesByState('focused')[0] ?? null;

  const isStoreFocusedInCurrentSystem =
    rawStoreFocused && urlSystemSlug
      ? toUrlSlug(rawStoreFocused.id) === urlSystemSlug ||
        toUrlSlug(rawStoreFocused.name) === urlSystemSlug ||
        toUrlSlug(rawStoreFocused.parentBodyId ?? '') === urlSystemSlug ||
        rawStoreFocused.parentBodyId === urlSystemSlug ||
        rawStoreFocused.id === urlSystemSlug
      : false;

  const storeFocusedEntity = isStoreFocusedInCurrentSystem ? rawStoreFocused : null;
  const explicitFocusedEntity = urlFocusSlug
    ? (urlFocusEntity ?? storeFocusedEntity)
    : storeFocusedEntity;

  const focusedEntity = explicitFocusedEntity;

  const matchingDisk =
    !explicitFocusedEntity &&
    urlFocusSlug &&
    systemDetail?.kind === 'system'
      ? systemDetail.record.disks?.find((d) => {
          const dSlug = toUrlSlug(d.id);
          const nameSlug = toUrlSlug(d.name);
          return dSlug === urlFocusSlug || nameSlug === urlFocusSlug;
        })
      : undefined;

  useEffect(() => {
    if (!urlFocusSlug) {
      const currentFocusedId = storeApi.getState().focusedId;
      if (
        currentFocusedId &&
        toUrlSlug(currentFocusedId) !== urlSystemSlug &&
        currentFocusedId !== urlSystemSlug &&
        currentFocusedId !== targetSystemId
      ) {
        storeApi.getState().setFocused(null);
      }
    }
  }, [urlSystemSlug, urlFocusSlug, targetSystemId, storeApi]);

  const canonRecords = useEntityAnnotations([
    toAnnotationLookupKey(
      matchingDisk?.id ?? focusedEntity?.id ?? targetSystemId,
    ),
    targetSystemId,
  ]);

  const effectiveUrlFocusSlug = isFocusInThisSystem ? urlFocusSlug : null;

  const systemContextDetails = buildFocusedEntityDetails({
    focusedEntity,
    corpus: activeCorpus,
    summaryNode: systemSummary,
    systemDetail,
    entityDetail: focusedDetail,
    urlSystemSlug,
    urlFocusSlug: effectiveUrlFocusSlug,
    hasExplicitFocus: Boolean(hasExplicitFocus && isFocusInThisSystem),
    canonRecords,
    viewScope: 'system',
    currentPathname: pathname,
    currentSearch: search,
  });

  const focusedDetails = (focusedEntity && isFocusInThisSystem) || matchingDisk ? systemContextDetails : null;

  return {
    focusedDetails,
    systemContextDetails,
    focusedEntity,
    focusedEntityId: focusedEntity?.id ?? matchingDisk?.id,
    activeCorpus,
    canonRecords,
    urlSystemSlug,
    hasExplicitFocus,
    focusedDetail,
    systemDetail,
    isFocusInThisSystem,
    targetSystemId,
  };
}
