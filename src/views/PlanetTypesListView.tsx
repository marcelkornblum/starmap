import type React from 'react';
import { Breadcrumbs } from '../components/domain';

export const PlanetTypesListView: React.FC = () => {
  return (
    <main data-testid="planet-types-list-view-root">
      <Breadcrumbs
        items={[
          { label: 'Galaxy', href: '/galaxy' },
          { label: 'Guide' },
          { label: 'Planet Types' },
        ]}
      />
      <h1>Planet Types</h1>
    </main>
  );
};
