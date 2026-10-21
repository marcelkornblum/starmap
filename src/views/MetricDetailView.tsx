import React, { useMemo } from 'react';
import {
  Breadcrumbs,
  GuideExamplesList,
  GuideSectionNav,
  MetricComparativePanel,
} from '../components/domain';
import {
  Badge,
  Button,
  Datum,
  Heading,
  Stack,
  Unit,
} from '../components/interface';
import {
  METRICS_GUIDE_PATH,
  resolveMetricComparison,
  resolveMetricGuideEntry,
} from '../services/guideService';
import { useSpaLocation } from '../router';
import styles from './GuideViews.module.css';

export interface MetricDetailViewProps {
  readonly metricId?: string;
  readonly locationPathname?: string;
  readonly locationSearch?: string;
  readonly focusedEntityId?: string;
}

export const extractMetricIdFromPathname = (pathname: string): string => {
  const match = /^\/guide\/metrics\/([^/?#]+)/i.exec(pathname.trim());
  return match?.[1] ? decodeURIComponent(match[1]) : '';
};

export const extractFocusIdFromSearch = (search: string): string => {
  const match = /[?&]focus=([^&#]+)/i.exec(search.trim());
  return match?.[1] ? decodeURIComponent(match[1]) : '';
};

export const MetricDetailView: React.FC<MetricDetailViewProps> = ({
  metricId: propMetricId,
  locationPathname,
  locationSearch,
  focusedEntityId,
}) => {
  const { pathname, search } = useSpaLocation(
    locationPathname,
    locationSearch,
    '',
  );

  const resolvedMetricId =
    propMetricId ?? extractMetricIdFromPathname(pathname);
  const resolvedFocusId =
    focusedEntityId ?? extractFocusIdFromSearch(search);

  const entry = useMemo(
    () => resolveMetricGuideEntry(resolvedMetricId),
    [resolvedMetricId],
  );

  const comparison = useMemo(
    () => resolveMetricComparison(resolvedMetricId, resolvedFocusId),
    [resolvedMetricId, resolvedFocusId],
  );

  return (
    <main
      data-testid="metric-detail-view-root"
      data-metric-id={resolvedMetricId}
      className={styles.guideRoot}
    >
      <Breadcrumbs
        items={[
          { label: 'Guide', href: '/guide/star-types' },
          { label: 'Telemetry Metrics', href: METRICS_GUIDE_PATH },
          { label: resolvedMetricId || 'Telemetry Metric' },
        ]}
      />
      <GuideSectionNav currentSection="metrics" />
      <Heading as="h1">
        {resolvedMetricId
          ? `Telemetry Metric: ${resolvedMetricId}`
          : 'Telemetry Metric'}
      </Heading>
      <p>
        <Button
          href={METRICS_GUIDE_PATH}
          variant="subtle"
          size="sm"
          data-testid="metrics-list-link"
        >
          All Telemetry Metrics
        </Button>
      </p>

      {entry ? (
        <>
          {comparison && (
            <MetricComparativePanel entry={entry} comparison={comparison} />
          )}

          <section className={styles.cardItem}>
            <div>
              <strong>{entry.title}</strong>{' '}
              <Unit inParens>{entry.unitSymbol}</Unit>{' '}
              <Badge status="neutral">{entry.category}</Badge>
            </div>

            <p
              data-testid="metric-familiar-conversion"
              className={styles.familiarConversion}
            >
              {entry.familiarConversion}
            </p>

            <p data-testid="guide-detail-summary">{entry.summary}</p>

            <Heading as="h3">Standard Formulation & Baseline</Heading>
            <Stack gap="none" data-testid="guide-detail-telemetry">
              <Datum label="Unit Symbol" value={entry.unitSymbol} />
              <Datum label="Category" value={entry.category} />
              <Datum label="Physical Definition" value={entry.physicalDefinition} />
              <Datum label="Reference Baseline" value={entry.referenceBaseline} />
            </Stack>
          </section>

          <GuideExamplesList examples={entry.examples} />
        </>
      ) : (
        <p>No guide record found for telemetry metric &quot;{resolvedMetricId}&quot;.</p>
      )}
    </main>
  );
};
