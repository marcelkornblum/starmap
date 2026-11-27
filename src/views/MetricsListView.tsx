import type React from 'react';
import { Guide3DPreview } from '../components/domain/Guide3DPreview';
import { GuideSectionNav } from '../components/domain/GuideSectionNav';
import { SpatialShell } from '../components/domain/SpatialShell';
import { Badge, Block, Cluster, Datum, Grid, Heading, Unit } from '../components/interface';
import { SOL_REFERENCE_TARGET } from '../config/referenceTargets';
import { METRIC_GUIDE_ENTRIES } from '../content/guide';
import { useSpaLinkClick } from '../hooks/spaNavigation';
import { useReferenceBaselines } from '../hooks/useGuideData';
import { formatSlugFallbackTitle } from '../utils/starNaming';
import { resolveAppHref } from '../utils/url';
import styles from './GuideViews.module.css';

export const MetricsListView: React.FC = () => {
  const baselines = useReferenceBaselines();
  const handleSpaLinkClick = useSpaLinkClick();

  return (
    <SpatialShell
      mode="document"
      testId="metrics-list-view-root"
      activeWorkspace="guide"
    >
      <div className={styles.guideRoot}>
      <GuideSectionNav currentSection="metrics" />
      <Heading as="h1" size="title">Telemetry Metrics</Heading>
      <Grid as="ul" minWidth="md" gap="default" data-testid="metrics-guide-list">
        {METRIC_GUIDE_ENTRIES.map((entry) => {
          const metricBaseline = baselines?.metrics[entry.id];
          const baselineName =
            metricBaseline?.baselineName ??
            formatSlugFallbackTitle(entry.comparisonBaselineId);
          const baselineValue = metricBaseline?.value ?? '—';
          const baselineKind =
            entry.comparisonBaselineId === SOL_REFERENCE_TARGET.id
              ? 'star'
              : 'planet';

          return (
            <Block
              as="li"
              interactive
              padding="loose"
              key={entry.id}
              data-testid="metrics-guide-item"
              data-metric-id={entry.id}
            >
              <a
                href={resolveAppHref(entry.href)}
                data-testid="metrics-guide-link"
                className={styles.cardLink}
                onClick={(e) => {
                  handleSpaLinkClick(e, entry.href);
                }}
              >
                <Guide3DPreview
                  kind="metric"
                  metricId={entry.id}
                  unit={entry.unitSymbol}
                  baselineId={entry.comparisonBaselineId}
                  baselineKind={baselineKind}
                  baselineName={baselineName}
                  baselineValue={baselineValue}
                />
                <Cluster gap="tight" align="center">
                  <strong>{entry.title}</strong>
                  <Unit inParens>{entry.unitSymbol}</Unit>
                  <Badge status="neutral">{entry.category}</Badge>
                </Cluster>
                <Datum
                  data-testid="metric-familiar-conversion"
                  label="Familiar Scale"
                  value={entry.familiarConversion}
                />
                <p>{entry.summary}</p>
              </a>
            </Block>
          );
        })}
      </Grid>
      </div>
    </SpatialShell>
  );
};
