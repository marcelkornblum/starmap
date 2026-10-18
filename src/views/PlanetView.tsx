import React, { useEffect, useState } from 'react';
import {
  useSpatialEntityStore,
  useSpatialEntityStoreApi,
} from '../components/canvas/entity/SpatialEntityContext';
import {
  Breadcrumbs,
  DetailsPanel,
  PlanetaryElementsPanel,
  SearchResultItem,
} from '../components/domain';
import { Search } from '../components/search';
import {
  fetchDetailRecord,
  fetchSummaryNode,
  getCachedDetailRecord,
  getCachedSummaryNode,
} from '../data/detailsRepository';
import {
  getCachedCorpusForFilter,
  loadSearchCorpusForFilter,
} from '../data/searchRepository';
import {
  buildFocusedEntityDetails,
  buildPlanetaryElementsSummary,
  buildPlanetViewBreadcrumbs,
  type FocusedEntityDetails,
  type PlanetaryElementsSummary,
} from '../services/detailsService';
import {
  extractUrlPlanetSlug,
  findFocusedEntryInCorpus,
  hasExplicitFocusParam,
} from '../services/searchService';
import type { CompactSearchEntry } from '../utils/compactDataCodec';

export interface PlanetViewProps {
  readonly initialCorpus?: readonly CompactSearchEntry[];
  readonly locationPathname?: string;
  readonly locationSearch?: string;
}

const useResolvedPlanetDetails = (
  { initialCorpus, locationPathname, locationSearch }: PlanetViewProps,
  shouldFetchShards = false,
): {
  readonly focusedDetails: FocusedEntityDetails | null;
  readonly planetaryElements: PlanetaryElementsSummary | null;
  readonly activeCorpus: readonly CompactSearchEntry[];
  readonly urlPlanetSlug: string | null;
  readonly hasExplicitFocus: boolean;
} => {
  const storeApi = useSpatialEntityStoreApi();
  useSpatialEntityStore((state) => state.entities);
  useSpatialEntityStore((state) => state.focusedId);

  const [, setShardTick] = useState<number>(0);

  const pathname =
    locationPathname ??
    (typeof window !== 'undefined' ? window.location.pathname : '/planet/earth');
  const search =
    locationSearch ??
    (typeof window !== 'undefined' ? window.location.search : '');

  const urlPlanetSlug = extractUrlPlanetSlug(pathname);
  const hasExplicitFocus = hasExplicitFocusParam(search);

  const focusedEntity =
    storeApi.getState().getEntitiesByState('focused')[0] ?? null;
  const activeCorpus =
    initialCorpus ??
    getCachedCorpusForFilter('all') ??
    getCachedCorpusForFilter('stars') ??
    [];
  const matchedEntry = focusedEntity
    ? findFocusedEntryInCorpus(focusedEntity.id, activeCorpus)
    : undefined;
  const urlPlanetEntry = urlPlanetSlug
    ? findFocusedEntryInCorpus(urlPlanetSlug, activeCorpus)
    : undefined;
  const targetPlanetId = urlPlanetEntry?.i ?? urlPlanetSlug ?? '';
  const targetSystemId =
    matchedEntry?.s ??
    urlPlanetEntry?.s ??
    urlPlanetEntry?.i ??
    focusedEntity?.id ??
    '';

  useEffect(() => {
    if (
      !shouldFetchShards ||
      !targetSystemId ||
      initialCorpus ||
      typeof window === 'undefined'
    ) {
      return;
    }

    let cancelled = false;
    void Promise.all([
      loadSearchCorpusForFilter('all').catch(() => undefined),
      fetchSummaryNode(targetSystemId).catch(() => undefined),
      fetchDetailRecord(targetSystemId).catch(() => undefined),
      targetPlanetId && targetPlanetId !== targetSystemId
        ? fetchDetailRecord(targetPlanetId).catch(() => undefined)
        : Promise.resolve(undefined),
      focusedEntity &&
      focusedEntity.id !== targetSystemId &&
      focusedEntity.id !== targetPlanetId
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
  }, [
    focusedEntity,
    initialCorpus,
    shouldFetchShards,
    targetPlanetId,
    targetSystemId,
  ]);

  const focusedDetails = buildFocusedEntityDetails({
    focusedEntity,
    corpus: activeCorpus,
    summaryNode: getCachedSummaryNode(targetSystemId),
    systemDetail: getCachedDetailRecord(targetSystemId),
    entityDetail: focusedEntity
      ? getCachedDetailRecord(focusedEntity.id)
      : undefined,
    urlPlanetSlug,
    hasExplicitFocus,
  });

  const planetaryElements = buildPlanetaryElementsSummary({
    details: focusedDetails,
    urlPlanetSlug,
    planetEntityDetail: targetPlanetId
      ? getCachedDetailRecord(targetPlanetId)
      : undefined,
    corpus: activeCorpus,
  });

  return {
    focusedDetails,
    planetaryElements,
    activeCorpus,
    urlPlanetSlug,
    hasExplicitFocus,
  };
};

const PlanetBreadcrumbsRegion: React.FC<PlanetViewProps> = (props) => {
  const {
    focusedDetails,
    planetaryElements,
    urlPlanetSlug,
    hasExplicitFocus,
  } = useResolvedPlanetDetails(props, false);
  const items = buildPlanetViewBreadcrumbs(
    focusedDetails,
    planetaryElements,
    urlPlanetSlug,
    hasExplicitFocus,
  );
  return <Breadcrumbs items={items} />;
};

const PlanetBodiesPanel: React.FC<PlanetViewProps> = (props) => {
  const storeApi = useSpatialEntityStoreApi();
  useSpatialEntityStore((state) => state.entities);
  useSpatialEntityStore((state) => state.focusedId);
  useSpatialEntityStore((state) => state.selectedId);
  useSpatialEntityStore((state) => state.selectedIds);
  useSpatialEntityStore((state) => state.hoveredId);

  const { focusedDetails } = useResolvedPlanetDetails(props);

  const state = storeApi.getState();
  const focusedEntities = state.getEntitiesByState('focused');
  const selectedEntities = state.getEntitiesByState('selected');

  return (
    <section aria-labelledby="bodies-panel-heading" data-testid="bodies-panel">
      <h2 id="bodies-panel-heading">Bodies</h2>
      <section
        aria-labelledby="bodies-focused-heading"
        data-testid="bodies-focused-section"
      >
        <h3 id="bodies-focused-heading">Focused</h3>
        <ul data-testid="bodies-focused-list">
          {focusedEntities.map((entity) => (
            <li
              key={entity.id}
              data-testid="bodies-focused-item"
              data-entity-id={entity.id}
            >
              {focusedDetails && focusedDetails.id === entity.id
                ? focusedDetails.name
                : entity.name}
            </li>
          ))}
        </ul>
      </section>
      <section
        aria-labelledby="bodies-selected-heading"
        data-testid="bodies-selected-section"
      >
        <h3 id="bodies-selected-heading">Selected</h3>
        <ul data-testid="bodies-selected-list">
          {selectedEntities.map((entity) => (
            <li
              key={entity.id}
              data-testid="bodies-selected-item"
              data-entity-id={entity.id}
            >
              {entity.name}
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
};

const PlanetDetailsAndElementsRegion: React.FC<PlanetViewProps> = (props) => {
  const { focusedDetails, planetaryElements } = useResolvedPlanetDetails(
    props,
    true,
  );

  return (
    <>
      <DetailsPanel details={focusedDetails} />
      <PlanetaryElementsPanel elements={planetaryElements} />
    </>
  );
};

export const PlanetView: React.FC<PlanetViewProps> = ({
  initialCorpus,
  locationPathname,
  locationSearch,
}) => {
  return (
    <main data-testid="planet-view-root">
      <PlanetBreadcrumbsRegion
        initialCorpus={initialCorpus}
        locationPathname={locationPathname}
        locationSearch={locationSearch}
      />
      <Search.Root
        limitPerCategory={3}
        initialCorpus={initialCorpus}
        locationPathname={locationPathname}
        locationSearch={locationSearch}
      >
        <Search.Panel />
        <Search.Results
          searchViewPath="/search"
          renderItem={(result) => (
            <SearchResultItem key={result.id} result={result} />
          )}
        />
      </Search.Root>
      <PlanetBodiesPanel
        initialCorpus={initialCorpus}
        locationPathname={locationPathname}
        locationSearch={locationSearch}
      />
      <PlanetDetailsAndElementsRegion
        initialCorpus={initialCorpus}
        locationPathname={locationPathname}
        locationSearch={locationSearch}
      />
    </main>
  );
};
