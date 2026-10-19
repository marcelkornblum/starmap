import React, { useEffect, useMemo, useState } from 'react';
import {
  useSpatialEntityStore,
  useSpatialEntityStoreApi,
} from '../components/canvas/entity/SpatialEntityContext';
import {
  Breadcrumbs,
  CanvasLayer,
  ControlBar,
  DetailsPanel,
  Minimap,
  PreviewPanel,
  SearchResultItem,
} from '../components/domain';
import { Search } from '../components/search';
import {
  fetchDetailRecord,
  fetchSummaryNode,
  getCachedDetailRecord,
  getCachedSummaryNode,
} from '../data/detailsRepository';
import { getCachedCorpusForFilter } from '../data/searchRepository';
import {
  buildFocusedEntityDetails,
  buildFocusedPreviewSummary,
  buildGalaxyMinimapOrientation,
  extractUrlSceneCameraState,
} from '../services/detailsService';
import {
  extractUrlSystemSlug,
  findFocusedEntryInCorpus,
  hasExplicitFocusParam,
} from '../services/searchService';
import type { CompactSearchEntry } from '../utils/compactDataCodec';

export interface GalaxyViewProps {
  readonly initialCorpus?: readonly CompactSearchEntry[];
  readonly locationPathname?: string;
  readonly locationSearch?: string;
}

const GalaxyBreadcrumbsRegion: React.FC<{
  readonly locationPathname?: string;
  readonly locationSearch?: string;
}> = () => {
  return <Breadcrumbs items={[{ label: 'Galaxy' }]} />;
};

interface FocusedDetailsRegionProps {
  readonly initialCorpus?: readonly CompactSearchEntry[];
  readonly locationPathname?: string;
  readonly locationSearch?: string;
}

const FocusedDetailsRegion: React.FC<FocusedDetailsRegionProps> = ({
  initialCorpus,
  locationPathname,
  locationSearch,
}) => {
  const storeApi = useSpatialEntityStoreApi();
  useSpatialEntityStore((state) => state.entities);
  useSpatialEntityStore((state) => state.focusedId);
  useSpatialEntityStore((state) => state.selectedId);

  const [, setShardTick] = useState<number>(0);

  const pathname =
    locationPathname ??
    (typeof window !== 'undefined' ? window.location.pathname : '/galaxy');
  const search =
    locationSearch ??
    (typeof window !== 'undefined' ? window.location.search : '');

  const urlSystemSlug = extractUrlSystemSlug(pathname);
  const hasExplicitFocus = hasExplicitFocusParam(search);

  const focusedEntity =
    storeApi.getState().getEntitiesByState('focused')[0] ?? null;
  const selectedEntities = storeApi.getState().getEntitiesByState('selected');
  const activeCorpus = initialCorpus ?? getCachedCorpusForFilter('all') ?? [];
  const matchedEntry = focusedEntity
    ? findFocusedEntryInCorpus(focusedEntity.id, activeCorpus)
    : undefined;
  const urlSystemEntry = urlSystemSlug
    ? findFocusedEntryInCorpus(urlSystemSlug, activeCorpus)
    : undefined;
  const targetSystemId =
    matchedEntry?.s ??
    urlSystemEntry?.s ??
    urlSystemEntry?.i ??
    focusedEntity?.id ??
    '';

  useEffect(() => {
    if (!focusedEntity || initialCorpus || typeof window === 'undefined') {
      return;
    }

    let cancelled = false;
    void Promise.all([
      fetchSummaryNode(targetSystemId).catch(() => undefined),
      fetchDetailRecord(targetSystemId).catch(() => undefined),
      focusedEntity.id !== targetSystemId
        ? fetchDetailRecord(focusedEntity.id).catch(() => undefined)
        : Promise.resolve(undefined),
    ]).then(() => {
      if (!cancelled) {
        setShardTick((n) => n + 1);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [focusedEntity, initialCorpus, targetSystemId]);

  const focusedDetails = buildFocusedEntityDetails({
    focusedEntity,
    corpus: activeCorpus,
    summaryNode: getCachedSummaryNode(targetSystemId),
    systemDetail: getCachedDetailRecord(targetSystemId),
    entityDetail: focusedEntity
      ? getCachedDetailRecord(focusedEntity.id)
      : undefined,
    urlSystemSlug,
    hasExplicitFocus,
    viewScope: 'galaxy',
  });

  const focusedPreview = buildFocusedPreviewSummary(
    focusedDetails,
    focusedEntity ? getCachedDetailRecord(focusedEntity.id) : undefined,
  );

  const cameraState = useMemo(() => extractUrlSceneCameraState(search), [search]);
  const centerEntity = cameraState.center
    ? (storeApi.getState().entities[cameraState.center] ?? null)
    : null;

  const minimapOrientation = useMemo(
    () =>
      buildGalaxyMinimapOrientation(
        focusedEntity,
        selectedEntities,
        focusedDetails,
        cameraState,
        centerEntity,
      ),
    [focusedEntity, selectedEntities, focusedDetails, cameraState, centerEntity],
  );

  return (
    <>
      <DetailsPanel details={focusedDetails} />
      <PreviewPanel preview={focusedPreview} />
      <Minimap orientation={minimapOrientation} />
    </>
  );
};

export const GalaxyView: React.FC<GalaxyViewProps> = ({
  initialCorpus,
  locationPathname,
  locationSearch,
}) => {
  const search =
    locationSearch ??
    (typeof window !== 'undefined' ? window.location.search : '');
  const cameraState = extractUrlSceneCameraState(search);

  return (
    <main data-testid="galaxy-view-root">
      <CanvasLayer
        scope="galaxy"
        centerId={cameraState.center}
        centerCoordinates={
          cameraState.x !== undefined && cameraState.y !== undefined && cameraState.z !== undefined
            ? [cameraState.x, cameraState.y, cameraState.z]
            : undefined
        }
        cameraAzimuthDeg={cameraState.az}
        cameraElevationDeg={cameraState.el}
        cameraDistance={cameraState.dist}
      />
      <GalaxyBreadcrumbsRegion
        locationPathname={locationPathname}
        locationSearch={locationSearch}
      />
      <ControlBar scope="galaxy" />
      <Search.Root
        limitPerCategory={3}
        initialCorpus={initialCorpus}
        locationPathname={locationPathname}
        locationSearch={locationSearch}
      >
        <Search.Panel scope="galaxy" />
        <Search.Results
          searchViewPath="/search"
          renderItem={(result) => (
            <SearchResultItem key={result.id} result={result} />
          )}
        />
      </Search.Root>
      <FocusedDetailsRegion
        initialCorpus={initialCorpus}
        locationPathname={locationPathname}
        locationSearch={locationSearch}
      />
    </main>
  );
};
