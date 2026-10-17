import React, { useEffect, useState } from 'react';
import {
  useSpatialEntityStore,
  useSpatialEntityStoreApi,
} from '../components/canvas/entity/SpatialEntityContext';
import {
  Breadcrumbs,
  DetailsPanel,
  SearchResultItem,
  SystemElementsPanel,
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
  buildSystemElementsSummary,
  buildSystemViewBreadcrumbs,
  type FocusedEntityDetails,
} from '../services/detailsService';
import {
  extractUrlSystemSlug,
  findFocusedEntryInCorpus,
  hasExplicitFocusParam,
} from '../services/searchService';
import type { CompactSearchEntry } from '../utils/compactDataCodec';

export interface SystemViewProps {
  readonly initialCorpus?: readonly CompactSearchEntry[];
  readonly locationPathname?: string;
  readonly locationSearch?: string;
}

const useResolvedSystemDetails = ({
  initialCorpus,
  locationPathname,
  locationSearch,
}: SystemViewProps): {
  readonly focusedDetails: FocusedEntityDetails | null;
  readonly activeCorpus: readonly CompactSearchEntry[];
  readonly urlSystemSlug: string | null;
  readonly hasExplicitFocus: boolean;
} => {
  const storeApi = useSpatialEntityStoreApi();
  useSpatialEntityStore((state) => state.entities);
  useSpatialEntityStore((state) => state.focusedId);

  const [, setShardTick] = useState<number>(0);

  const pathname =
    locationPathname ??
    (typeof window !== 'undefined' ? window.location.pathname : '/system/sol');
  const search =
    locationSearch ??
    (typeof window !== 'undefined' ? window.location.search : '');

  const urlSystemSlug = extractUrlSystemSlug(pathname);
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
    if (!targetSystemId || initialCorpus || typeof window === 'undefined') {
      return;
    }

    let cancelled = false;
    void Promise.all([
      loadSearchCorpusForFilter('all').catch(() => undefined),
      fetchSummaryNode(targetSystemId).catch(() => undefined),
      fetchDetailRecord(targetSystemId).catch(() => undefined),
      focusedEntity && focusedEntity.id !== targetSystemId
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
  });

  return {
    focusedDetails,
    activeCorpus,
    urlSystemSlug,
    hasExplicitFocus,
  };
};

const SystemBreadcrumbsRegion: React.FC<SystemViewProps> = (props) => {
  const { focusedDetails, urlSystemSlug, hasExplicitFocus } =
    useResolvedSystemDetails(props);
  const items = buildSystemViewBreadcrumbs(
    focusedDetails,
    urlSystemSlug,
    hasExplicitFocus,
  );
  return <Breadcrumbs items={items} />;
};

export const BodiesPanel: React.FC<SystemViewProps> = (props) => {
  const storeApi = useSpatialEntityStoreApi();
  useSpatialEntityStore((state) => state.entities);
  useSpatialEntityStore((state) => state.focusedId);
  useSpatialEntityStore((state) => state.selectedId);
  useSpatialEntityStore((state) => state.selectedIds);
  useSpatialEntityStore((state) => state.hoveredId);

  const { focusedDetails } = useResolvedSystemDetails(props);

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

const SystemDetailsAndElementsRegion: React.FC<SystemViewProps> = (props) => {
  const { focusedDetails, activeCorpus } = useResolvedSystemDetails(props);
  const systemElements = buildSystemElementsSummary({
    details: focusedDetails,
    corpus: activeCorpus,
  });

  return (
    <>
      <DetailsPanel details={focusedDetails} />
      <SystemElementsPanel elements={systemElements} />
    </>
  );
};

export const SystemView: React.FC<SystemViewProps> = ({
  initialCorpus,
  locationPathname,
  locationSearch,
}) => {
  return (
    <main data-testid="system-view-root">
      <SystemBreadcrumbsRegion
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
      <BodiesPanel
        initialCorpus={initialCorpus}
        locationPathname={locationPathname}
        locationSearch={locationSearch}
      />
      <SystemDetailsAndElementsRegion
        initialCorpus={initialCorpus}
        locationPathname={locationPathname}
        locationSearch={locationSearch}
      />
    </main>
  );
};
