import React, { useEffect, useState } from 'react';
import {
  useSpatialEntityStore,
  useSpatialEntityStoreApi,
} from '../components/canvas/entity/SpatialEntityContext';
import {
  Breadcrumbs,
  DetailsPanel,
  SearchResultItem,
  type BreadcrumbItem,
} from '../components/domain';
import { Search } from '../components/search';
import {
  fetchDetailRecord,
  fetchSummaryNode,
  getCachedDetailRecord,
  getCachedSummaryNode,
} from '../data/detailsRepository';
import { getCachedCorpusForFilter } from '../data/searchRepository';
import { buildFocusedEntityDetails } from '../services/detailsService';
import {
  extractUrlFocusSlug,
  extractUrlSystemSlug,
  findFocusedEntryInCorpus,
  hasExplicitFocusParam,
} from '../services/searchService';
import type { CompactSearchEntry } from '../utils/compactDataCodec';

export interface MainViewProps {
  readonly initialCorpus?: readonly CompactSearchEntry[];
  readonly locationPathname?: string;
  readonly locationSearch?: string;
}

const MainBreadcrumbsRegion: React.FC<{
  readonly locationPathname?: string;
  readonly locationSearch?: string;
}> = ({ locationPathname, locationSearch }) => {
  const storeApi = useSpatialEntityStoreApi();
  useSpatialEntityStore((state) => state.entities);
  useSpatialEntityStore((state) => state.focusedId);

  const pathname =
    locationPathname ??
    (typeof window !== 'undefined' ? window.location.pathname : '/galaxy');
  const search =
    locationSearch ??
    (typeof window !== 'undefined' ? window.location.search : '');

  const focusSlug = extractUrlFocusSlug(pathname, search);
  const focusedEntity =
    storeApi.getState().getEntitiesByState('focused')[0] ?? null;

  const items: BreadcrumbItem[] = focusSlug
    ? [
        { label: 'Galaxy', href: '/galaxy' },
        { label: focusedEntity?.name ?? focusSlug },
      ]
    : [{ label: 'Galaxy' }];

  return <Breadcrumbs items={items} />;
};

export const SystemsPanel: React.FC = () => {
  const storeApi = useSpatialEntityStoreApi();
  useSpatialEntityStore((state) => state.entities);
  useSpatialEntityStore((state) => state.focusedId);
  useSpatialEntityStore((state) => state.selectedId);
  useSpatialEntityStore((state) => state.selectedIds);
  useSpatialEntityStore((state) => state.hoveredId);

  const state = storeApi.getState();
  const focusedEntities = state.getEntitiesByState('focused');
  const selectedEntities = state.getEntitiesByState('selected');

  return (
    <section aria-labelledby="systems-panel-heading" data-testid="systems-panel">
      <h2 id="systems-panel-heading">Systems</h2>
      <section
        aria-labelledby="systems-focused-heading"
        data-testid="systems-focused-section"
      >
        <h3 id="systems-focused-heading">Focused</h3>
        <ul data-testid="systems-focused-list">
          {focusedEntities.map((entity) => (
            <li
              key={entity.id}
              data-testid="systems-focused-item"
              data-entity-id={entity.id}
            >
              {entity.name}
            </li>
          ))}
        </ul>
      </section>
      <section
        aria-labelledby="systems-selected-heading"
        data-testid="systems-selected-section"
      >
        <h3 id="systems-selected-heading">Selected</h3>
        <ul data-testid="systems-selected-list">
          {selectedEntities.map((entity) => (
            <li
              key={entity.id}
              data-testid="systems-selected-item"
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
  });

  return <DetailsPanel details={focusedDetails} />;
};

export const MainView: React.FC<MainViewProps> = ({
  initialCorpus,
  locationPathname,
  locationSearch,
}) => {
  return (
    <main data-testid="clean-slate-root">
      <MainBreadcrumbsRegion
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
      <SystemsPanel />
      <FocusedDetailsRegion
        initialCorpus={initialCorpus}
        locationPathname={locationPathname}
        locationSearch={locationSearch}
      />
    </main>
  );
};
