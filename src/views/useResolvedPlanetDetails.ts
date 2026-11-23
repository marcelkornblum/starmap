import { useCallback, useEffect, useMemo } from 'react';
import {
  useSpatialEntityStore,
  useSpatialEntityStoreApi,
} from '../components/canvas/entity/SpatialEntityContext';
import type { SpatialEntityDefinition } from '../types/spatial';
import {
  EARTH_REFERENCE_TARGET,
  SOL_REFERENCE_TARGET,
} from '../config/referenceTargets';
import type { DecodedDetailRecord } from '../data/detailsRepository';
import {
  escalateSearchBackgroundWarmup,
  scheduleSearchBackgroundWarmup,
} from '../data/searchBackgroundWarmup';
import { useEntityDetails } from '../hooks/useEntityDetails';
import { useSystemData } from '../hooks/useSystemData';
import { useSearchCorpus } from '../hooks/useSearchCorpus';
import { buildFocusedEntityDetails } from '../services/details/focusedEntityDetails';
import { buildPreservedContextSearch } from '../services/details/detailsCamera';
import type { FocusedEntityDetails } from '../services/details/detailsEntityTypes';
import { useParams, useSearch } from '@tanstack/react-router';
import { findFocusedEntryInCorpus } from '../services/search/searchCorpusHelpers';
import { resolveFocusedEntityFromCorpus } from '../services/search/searchSelection';
import { resolveSelectedSystemsFromUrlSelect } from '../services/search/searchUrlSelectionResolvers';
import type { CompactSearchEntry } from '../utils/compactDataTypes';
import { toAnnotationLookupKey, toUrlSlug } from '../utils/datasetLayerSlugs';
import type { DecodedEntityAnnotation } from '../utils/datasetLayerTypes';
import { useEntityAnnotations, useLayerIndex, useLoadedLayerManifests } from '../hooks/useLayerData';
import { useSpaLocation, type StarmapSearchParams } from '../hooks/useSpaLocation';
import { checkIsFocusInPlanetScope, usePlanetOutOfScopeGuard } from './usePlanetOutOfScopeGuard';

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

  const isExplicitLocation = locationPathname !== undefined || locationSearch !== undefined;
  const rawPlanetId = isExplicitLocation
    ? propPlanetId
    : (routeParams?.planetId ?? propPlanetId);
  const fallbackPlanetSlug = pathname.startsWith('/planet/')
    ? toUrlSlug(pathname.slice('/planet/'.length).split('/')[0])
    : null;
  const urlPlanetSlug = toUrlSlug(rawPlanetId ?? '') || fallbackPlanetSlug || null;

  const searchParams = useMemo(() => new URLSearchParams(search), [search]);
  const param = (key: keyof StarmapSearchParams) =>
    (isExplicitLocation ? searchParams.get(key) : (routeSearch?.[key] ?? searchParams.get(key))) ?? undefined;
  const [focusParam, selectParam, centerParam] = (['focus', 'select', 'center'] as const).map(param);
  const urlFocusSlug = focusParam ? toUrlSlug(focusParam) || null : null;
  const hasExplicitFocus = Boolean(focusParam && urlFocusSlug && urlFocusSlug.length > 0);

  const { corpus } = useSearchCorpus('startup', initialCorpus);
  const activeCorpus = corpus ?? EMPTY_CORPUS;

  const urlPlanetEntry = urlPlanetSlug
    ? findFocusedEntryInCorpus(urlPlanetSlug, activeCorpus)
    : undefined;

  useEffect(() => {
    if (initialCorpus || !corpus) return;
    if (urlPlanetSlug && !urlPlanetEntry) {
      escalateSearchBackgroundWarmup();
    } else {
      scheduleSearchBackgroundWarmup();
    }
  }, [initialCorpus, corpus, urlPlanetSlug, urlPlanetEntry]);
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

  const isIdInPlanetScope = useCallback(
    (slug: string | null) =>
      checkIsFocusInPlanetScope(
        slug,
        urlPlanetSlug,
        targetPlanetId,
        systemDetail,
        orbitingBodyIds,
        activeCorpus.length,
      ),
    [urlPlanetSlug, targetPlanetId, systemDetail, orbitingBodyIds, activeCorpus.length],
  );

  const isFocusInPlanetScope = useMemo(
    () => isIdInPlanetScope(urlFocusSlug),
    [isIdInPlanetScope, urlFocusSlug],
  );

  const urlFocusEntity = useMemo(
    () =>
      urlFocusSlug && isFocusInPlanetScope
        ? resolveFocusedEntityFromCorpus(urlFocusSlug, activeCorpus)
        : null,
    [urlFocusSlug, isFocusInPlanetScope, activeCorpus],
  );
  const rawStoreFocused = storeApi.getState().getEntitiesByState('focused')[0] ?? null;
  const isStoreFocusedInPlanetScope = rawStoreFocused
    ? isIdInPlanetScope(toUrlSlug(rawStoreFocused.id))
    : false;
  const storeFocusedEntity = isStoreFocusedInPlanetScope ? rawStoreFocused : null;

  const focusedEntity = urlFocusSlug
    ? (urlFocusEntity ?? (isFocusInPlanetScope ? storeFocusedEntity : null))
    : storeFocusedEntity;

  useEffect(() => {
    if (!urlFocusSlug) {
      const currentFocusedId = storeApi.getState().focusedId;
      if (currentFocusedId && !isIdInPlanetScope(toUrlSlug(currentFocusedId))) {
        storeApi.getState().setFocused(null);
      }
    }
  }, [urlFocusSlug, isIdInPlanetScope, storeApi]);

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
  const preservedContextSearch = useMemo(() => buildPreservedContextSearch(searchParams), [searchParams]);

  const systemContextDetails = useMemo(
    () =>
      buildFocusedEntityDetails({
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
        currentSearch: preservedContextSearch,
      }),
    [
      focusedEntity, activeCorpus, systemSummary, systemDetail, focusedDetail,
      targetSystemId, urlPlanetSlug, effectiveUrlFocusSlug, hasExplicitFocus,
      isFocusInPlanetScope, canonRecords, pathname, preservedContextSearch,
    ],
  );

  const focusedDetails = (focusedEntity && (urlFocusSlug ? isFocusInPlanetScope : true)) ? systemContextDetails : null;

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
