import type React from 'react';
import { Breadcrumbs } from '../components/domain';

export const StarTypesListView: React.FC = () => {
  return (
    <main data-testid="star-types-list-view-root">
      <Breadcrumbs
        items={[
          { label: 'Galaxy', href: '/galaxy' },
          { label: 'Guide' },
          { label: 'Star Types' },
        ]}
      />
      <h1>Star Types</h1>
    </main>
  );
};
