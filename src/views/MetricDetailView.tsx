import React, { useMemo, useEffect, useSyncExternalStore } from 'react';
import { Breadcrumbs } from '../components/domain/Breadcrumbs';
import { GuideExamplesList } from '../components/domain/GuideExamplesList';
import { GuideSectionNav } from '../components/domain/GuideSectionNav';
import { MetricComparativePanel } from '../components/domain/MetricComparativePanel';
import { SpatialShell } from '../components/domain/SpatialShell';
import {
  Badge,
  Button,
  Cluster,
  CollapsibleSection,
  Datum,
  Heading,
  Stack,
  Unit,
} from '../components/interface';
import { METRICS_GUIDE_PATH } from '../content/guide';
import { extractFocusIdFromSearch } from '../services/guide/guideNavigation';
import { getGuideExamplesForEntry } from '../services/guide/guideCatalogExamples';
import {
  hydrateMetricComparison,
  resolveMetricComparison,
  resolveMetricGuideEntries,
} from '../services/guide/guideMetrics';
import {
  subscribeDetailsRepository,
  getDetailsRepositoryVersion,
} from '../data/detailsRepository';
import {
  useHydratedGuideExamples,
  useReferenceBaselines,
} from '../hooks/useGuideData';
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
  useReferenceBaselines();
  useHydratedGuideExamples();

  useEffect(() => {
    void hydrateMetricComparison(resolvedMetricId, resolvedFocusId)
      .catch(() => undefined);
  }, [resolvedMetricId, resolvedFocusId]);

  const entries = useMemo(() => {
    return resolveMetricGuideEntries(resolvedMetricId);
  }, [resolvedMetricId]);

  const companionMapHref = resolvedFocusId
    ? `/galaxy?focus=${encodeURIComponent(resolvedFocusId)}`
    : undefined;

  return (
    <SpatialShell
      mode="document"
      testId="metric-detail-view-root"
      activeWorkspace="guide"
      companionMapHref={companionMapHref}
      data-metric-id={resolvedMetricId}
    >
      <div className={styles.guideRoot}>
      <GuideSectionNav currentSection="metrics" />
      <Cluster justify="between" align="center" gap="tight">
        <Breadcrumbs
          items={[
            { label: 'Telemetry Metrics', href: METRICS_GUIDE_PATH },
            { label: resolvedMetricId || 'Telemetry Metric' },
          ]}
        />
        <Cluster gap="tight" align="center">
          <Button
            href={METRICS_GUIDE_PATH}
            variant="subtle"
            size="sm"
            data-testid="metrics-list-link"
          >
            All Telemetry Metrics
          </Button>
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
        </Cluster>
      </Cluster>
      <Heading as="h1" size="title">
        {resolvedMetricId
          ? `Telemetry Metric: ${resolvedMetricId}`
          : 'Telemetry Metric'}
      </Heading>

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

                  <CollapsibleSection title="Standard Formulation & Baseline" headingAs="h3">
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
                  </CollapsibleSection>
                </section>

                <GuideExamplesList
                  examples={getGuideExamplesForEntry('metricTypes', entry.id)}
                />
              </React.Fragment>
            );
          })}
        </>
      ) : (
        <p>No guide record found for telemetry metric &quot;{resolvedMetricId}&quot;.</p>
      )}
      </div>
    </SpatialShell>
  );
};
