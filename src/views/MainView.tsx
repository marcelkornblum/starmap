import type React from 'react';
import {
  useSpatialEntityStore,
  useSpatialEntityStoreApi,
} from '../components/canvas/entity/SpatialEntityContext';
import { SearchResultItem } from '../components/domain';
import { Search } from '../components/search';
import type { CompactSearchEntry } from '../utils/compactDataCodec';

export interface MainViewProps {
  readonly initialCorpus?: readonly CompactSearchEntry[];
  readonly locationPathname?: string;
  readonly locationSearch?: string;
}

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

export const MainView: React.FC<MainViewProps> = ({
  initialCorpus,
  locationPathname,
  locationSearch,
}) => {
  return (
    <main data-testid="clean-slate-root">
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
    </main>
  );
};
