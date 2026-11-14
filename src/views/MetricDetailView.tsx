import React, { useMemo, useEffect, useSyncExternalStore } from 'react';
import {
  Breadcrumbs,
  GuideExamplesList,
  GuideSectionNav,
  MetricComparativePanel,
} from '../components/domain';
import {
  Badge,
  Button,
  Cluster,
  Datum,
  Heading,
  Stack,
  Unit,
} from '../components/interface';
import {
  METRICS_GUIDE_PATH,
  extractFocusIdFromSearch,
  hydrateMetricComparison,
  resolveMetricComparison,
  resolveMetricGuideEntries,
} from '../services/guideService';
import {
  subscribeDetailsRepository,
  getDetailsRepositoryVersion,
} from '../data/detailsRepository';
import { useParams } from '@tanstack/react-router';
import { useSpaLocation } from '../hooks/useSpaLocation';
import styles from './GuideViews.module.css';

export interface MetricDetailViewProps {
  readonly metricId?: string;
  readonly locationPathname?: string;
  readonly locationSearch?: string;
  readonly focusedEntityId?: string;
}

export const MetricDetailView: React.FC<MetricDetailViewProps> = ({
  metricId: propMetricId,
  locationPathname,
  locationSearch,
  focusedEntityId,
}) => {
  const routeParams = useParams({ strict: false }) as Record<string, string | undefined> | undefined;
  const { search } = useSpaLocation(
    locationPathname,
    locationSearch,
    '',
  );

  const resolvedMetricId =
    routeParams?.metricId ?? propMetricId ?? '';
  const resolvedFocusId =
    focusedEntityId ?? extractFocusIdFromSearch(search);

  useSyncExternalStore(
    subscribeDetailsRepository,
    getDetailsRepositoryVersion,
    getDetailsRepositoryVersion,
  );

  useEffect(() => {
    void hydrateMetricComparison(resolvedMetricId, resolvedFocusId)
      .catch(() => undefined);
  }, [resolvedMetricId, resolvedFocusId]);

  const entries = useMemo(() => {
    return resolveMetricGuideEntries(resolvedMetricId);
  }, [resolvedMetricId]);

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
        companionHref={
          resolvedFocusId
            ? `/galaxy?focus=${encodeURIComponent(resolvedFocusId)}`
            : undefined
        }
      />
      <GuideSectionNav currentSection="metrics" />
      <Heading as="h1">
        {resolvedMetricId
          ? `Telemetry Metric: ${resolvedMetricId}`
          : 'Telemetry Metric'}
      </Heading>

      {resolvedFocusId && (
        <div data-testid="guide-focus-context">
          <Button
            href={`/system/${encodeURIComponent(resolvedFocusId)}?focus=${encodeURIComponent(resolvedFocusId)}`}
            variant="subtle"
            size="sm"
          >
            Return to {resolvedFocusId}
          </Button>
        </div>
      )}

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

      {entries.length > 0 ? (
        <>
          {entries.map((entry) => {
            const comparison = resolveMetricComparison(
              entry.id,
              resolvedFocusId,
            );
            return (
              <React.Fragment key={entry.id}>
                {comparison && (
                  <MetricComparativePanel
                    entry={entry}
                    comparison={comparison}
                  />
                )}

                <section className={styles.cardItem}>
                  <Cluster gap="tight" align="center">
                    <strong>{entry.title}</strong>{' '}
                    <Unit inParens>{entry.unitSymbol}</Unit>{' '}
                    <Badge status="neutral">{entry.category}</Badge>
                  </Cluster>

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
                    <Datum
                      label="Physical Definition"
                      value={entry.physicalDefinition}
                    />
                    <Datum
                      label="Reference Baseline"
                      value={entry.referenceBaseline}
                    />
                  </Stack>
                </section>

                <GuideExamplesList examples={entry.examples} />
              </React.Fragment>
            );
          })}
        </>
      ) : (
        <p>No guide record found for telemetry metric &quot;{resolvedMetricId}&quot;.</p>
      )}
    </main>
  );
};
