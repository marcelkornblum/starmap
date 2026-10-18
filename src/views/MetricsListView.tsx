import type React from 'react';
import { Breadcrumbs } from '../components/domain';

export const MetricsListView: React.FC = () => {
  return (
    <main data-testid="metrics-list-view-root">
      <Breadcrumbs
        items={[
          { label: 'Galaxy', href: '/galaxy' },
          { label: 'Guide' },
          { label: 'Telemetry Metrics' },
        ]}
      />
      <h1>Telemetry Metrics</h1>
    </main>
  );
};
