import { useMemo } from 'react';
import {
  useSpatialEntityStore,
  useSpatialEntityStoreApi,
} from '../components/canvas/entity/SpatialEntityContext';
import type { SpatialEntityDefinition } from '../components/canvas/entity/SpatialEntityStore';
import {
  EARTH_REFERENCE_TARGET,
  SOL_REFERENCE_TARGET,
} from '../config/referenceTargets';
import type { DecodedDetailRecord } from '../data/detailsRepository';
import { useEntityDetails } from '../hooks/useEntityDetails';
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
  resolveSelectedSystemsFromUrlSelect,
  toUrlSlug,
} from '../services/searchService';
import type { CompactSearchEntry } from '../utils/compactDataCodec';
import {
  toAnnotationLookupKey,
  type DecodedEntityAnnotation,
} from '../utils/datasetLayerCodec';
import {
  useEntityAnnotations,
  useLayerIndex,
  useLoadedLayerManifests,
} from '../hooks/useLayerData';
import {
  useSpaLocation,
  type StarmapSearchParams,
} from '../hooks/useSpaLocation';
import {
  checkIsFocusInPlanetScope,
  usePlanetOutOfScopeGuard,
} from './usePlanetOutOfScopeGuard';

export interface UseResolvedPlanetDetailsProps {
  readonly initialCorpus?: readonly CompactSearchEntry[];
  readonly locationPathname?: string;
  readonly locationSearch?: string;
  readonly planetId?: string;
}

export interface ResolvedPlanetDetailsResult {
  readonly focusedDetails: FocusedEntityDetails | null;
  readonly systemContextDetails: FocusedEntityDetails | null;
  readonly planetEntityDetail: DecodedDetailRecord | undefined;
  readonly focusedDetail: DecodedDetailRecord | undefined;
  readonly canonRecords: readonly DecodedEntityAnnotation[];
  readonly selectedEntityIds: readonly string[];
  readonly selectedEntities: readonly SpatialEntityDefinition[];
  readonly activeCorpus: readonly CompactSearchEntry[];
  readonly urlPlanetSlug: string | null;
  readonly hasExplicitFocus: boolean;
  readonly focusedEntity: SpatialEntityDefinition | null;
}

const EMPTY_CORPUS: readonly CompactSearchEntry[] = [];

export function useResolvedPlanetDetails(
  { initialCorpus, locationPathname, locationSearch, planetId: propPlanetId }: UseResolvedPlanetDetailsProps,
  _shouldFetchShards = false,
): ResolvedPlanetDetailsResult {
  const storeApi = useSpatialEntityStoreApi();
  useSpatialEntityStore((state) => state.entities);
  useSpatialEntityStore((state) => state.focusedId);
  useSpatialEntityStore((state) => state.selectedId);
  useSpatialEntityStore((state) => state.selectedIds);

  const { pathname, search } = useSpaLocation(
    locationPathname,
    locationSearch,
    EARTH_REFERENCE_TARGET.href,
  );

  const routeParams = useParams({ strict: false }) as Record<string, string | undefined> | undefined;
  const routeSearch = useSearch({ strict: false }) as StarmapSearchParams | undefined;

  const rawPlanetId = routeParams?.planetId ?? propPlanetId;
  const fallbackPlanetSlug = pathname.startsWith('/planet/')
    ? toUrlSlug(pathname.slice('/planet/'.length).split('/')[0])
    : null;
  const urlPlanetSlug = toUrlSlug(rawPlanetId ?? '') || fallbackPlanetSlug || null;

  const searchParams = useMemo(() => new URLSearchParams(search), [search]);
  const focusParam = routeSearch?.focus ?? searchParams.get('focus') ?? undefined;
  const selectParam = routeSearch?.select ?? searchParams.get('select') ?? undefined;
  const centerParam = routeSearch?.center ?? searchParams.get('center') ?? undefined;
  const urlFocusSlug = focusParam ? toUrlSlug(focusParam) || null : null;
  const hasExplicitFocus = Boolean(focusParam && urlFocusSlug && urlFocusSlug.length > 0);

  const { corpus } = useSearchCorpus('all', initialCorpus);
  const activeCorpus = corpus ?? EMPTY_CORPUS;

  const urlPlanetEntry = urlPlanetSlug
    ? findFocusedEntryInCorpus(urlPlanetSlug, activeCorpus)
    : undefined;
  const targetPlanetId = urlPlanetEntry?.i ?? urlPlanetSlug ?? '';
  const targetSystemId =
    urlPlanetEntry?.s ??
    (urlPlanetEntry && urlPlanetEntry.k === 1
      ? urlPlanetEntry.i
      : SOL_REFERENCE_TARGET.id);

  const planetSlugs = useMemo(
    () =>
      new Set(
        [toUrlSlug(targetPlanetId), urlPlanetSlug ? toUrlSlug(urlPlanetSlug) : '']
          .filter((slug) => slug.length > 0),
      ),
    [targetPlanetId, urlPlanetSlug],
  );

  const { systemSummary, systemDetail, focusedDetail } = useSystemData(
    targetSystemId,
    urlFocusSlug ?? '',
  );

  const orbitingBodyIds = useMemo(
    () =>
      activeCorpus
        .filter((entry) => entry.o && planetSlugs.has(toUrlSlug(entry.o)))
        .map((entry) => entry.i),
    [activeCorpus, planetSlugs],
  );

  const isFocusInPlanetScope = useMemo(
    () =>
      checkIsFocusInPlanetScope(
        urlFocusSlug,
        urlPlanetSlug,
        targetPlanetId,
        systemDetail,
        orbitingBodyIds,
        activeCorpus.length,
      ),
    [urlFocusSlug, urlPlanetSlug, targetPlanetId, systemDetail, orbitingBodyIds, activeCorpus.length],
  );

  const urlFocusEntity = useMemo(
    () =>
      urlFocusSlug && isFocusInPlanetScope
        ? resolveFocusedEntityFromCorpus(urlFocusSlug, activeCorpus)
        : null,
    [urlFocusSlug, isFocusInPlanetScope, activeCorpus],
  );
  const focusedEntity = urlFocusSlug
    ? (urlFocusEntity ?? (isFocusInPlanetScope ? storeApi.getState().getEntitiesByState('focused')[0] ?? null : null))
    : (storeApi.getState().getEntitiesByState('focused')[0] ?? null);

  const focusedEntityId = focusedEntity?.id ?? '';

  const isPlanetDistinctFromSystem = Boolean(
    targetPlanetId && targetPlanetId !== targetSystemId,
  );
  const isPlanetDistinctFromFocused = Boolean(
    targetPlanetId && targetPlanetId !== focusedEntityId,
  );
  const { detail: distinctPlanetDetail } = useEntityDetails(
    isPlanetDistinctFromSystem && isPlanetDistinctFromFocused
      ? targetPlanetId
      : null,
  );

  const planetEntityDetail = !isPlanetDistinctFromSystem
    ? systemDetail
    : !isPlanetDistinctFromFocused
      ? focusedDetail
      : distinctPlanetDetail;

  const layerIndex = useLayerIndex();
  const loadedLayers = useLoadedLayerManifests(search);

  const canonRecords = useEntityAnnotations(
    [
      targetPlanetId,
      urlPlanetSlug ?? '',
      focusedEntity?.id ?? targetSystemId,
      targetSystemId,
      ...orbitingBodyIds,
    ].map(toAnnotationLookupKey),
  );

  const effectiveUrlFocusSlug = isFocusInPlanetScope ? urlFocusSlug : null;

  const systemContextDetails = buildFocusedEntityDetails({
    focusedEntity,
    corpus: activeCorpus,
    summaryNode: systemSummary,
    systemDetail,
    entityDetail: focusedDetail,
    urlSystemSlug: targetSystemId,
    urlPlanetSlug,
    urlFocusSlug: effectiveUrlFocusSlug,
    hasExplicitFocus: Boolean(hasExplicitFocus && isFocusInPlanetScope),
    canonRecords,
    viewScope: 'planet',
    currentPathname: pathname,
    currentSearch: search,
  });

  const focusedDetails = (focusedEntity && isFocusInPlanetScope) ? systemContextDetails : null;

  const storeSelected = storeApi.getState().getEntitiesByState('selected');
  const selectQuery = selectParam ? `?select=${encodeURIComponent(selectParam)}` : search;
  const selectedEntities =
    storeSelected.length > 0
      ? storeSelected
      : resolveSelectedSystemsFromUrlSelect(
          selectQuery,
          activeCorpus,
          layerIndex,
          loadedLayers,
        );
  const urlExplicitSelectSlugs = useMemo(() => {
    return (selectParam ?? searchParams.get('select') ?? '')
      .split(',')
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0 && !s.includes(':'));
  }, [selectParam, searchParams]);

  const selectedEntityIds = useMemo(() => {
    const ids = new Set(selectedEntities.map((e) => e.id));
    for (const slug of urlExplicitSelectSlugs) {
      ids.add(slug);
    }
    return Array.from(ids);
  }, [selectedEntities, urlExplicitSelectSlugs]);

  usePlanetOutOfScopeGuard({
    urlPlanetSlug,
    activeCorpus,
    urlFocusSlug,
    isFocusInPlanetScope,
    centerParam,
    targetPlanetId,
    orbitingBodyIds,
    systemDetail,
  });

  return {
    focusedDetails,
    systemContextDetails,
    planetEntityDetail,
    focusedDetail,
    canonRecords,
    selectedEntityIds,
    selectedEntities,
    activeCorpus,
    urlPlanetSlug,
    hasExplicitFocus,
    focusedEntity,
  };
}
