import type React from 'react';
import { METRICS_GUIDE_PATH } from '../services/searchService';

export interface MetricDetailViewProps {
  readonly metricId?: string;
  readonly locationPathname?: string;
}

export const extractMetricIdFromPathname = (pathname: string): string => {
  const match = /^\/guide\/metrics\/([^/?#]+)/i.exec(pathname.trim());
  return match?.[1] ? decodeURIComponent(match[1]) : '';
};

export const MetricDetailView: React.FC<MetricDetailViewProps> = ({
  metricId: propMetricId,
  locationPathname,
}) => {
  const pathname =
    locationPathname ??
    (typeof window !== 'undefined' ? window.location.pathname : '');
  const resolvedMetricId =
    propMetricId ?? extractMetricIdFromPathname(pathname);

  return (
    <main
      data-testid="metric-detail-view-root"
      data-metric-id={resolvedMetricId}
    >
      <h1>
        {resolvedMetricId
          ? `Telemetry Metric: ${resolvedMetricId}`
          : 'Telemetry Metric'}
      </h1>
      <p>
        <a
          href={METRICS_GUIDE_PATH}
          data-testid="metrics-list-link"
        >
          All Telemetry Metrics
        </a>
      </p>
    </main>
  );
};
