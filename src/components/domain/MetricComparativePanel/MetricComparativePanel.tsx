import type React from 'react';
import { Badge, CelestialSymbol, Datum, Heading, Stack } from '../../interface';
import { resolveAppHref } from '../../../utils/url';
import type {
  MetricComparison,
  MetricGuideEntry,
} from '../../../services/guideService';
import { Guide3DPreview } from '../Guide3DPreview';
import styles from './MetricComparativePanel.module.css';

export interface MetricComparativePanelProps {
  readonly entry: MetricGuideEntry;
  readonly comparison: MetricComparison;
}

export const MetricComparativePanel: React.FC<MetricComparativePanelProps> = ({
  entry,
  comparison,
}) => {
  return (
    <section
      data-testid="metric-comparative-3d"
      data-focused-entity={comparison.targetId}
      className={styles.comparativeSection}
    >
      <Heading as="h3">Comparative Telemetry & Reference Baseline</Heading>
      <Guide3DPreview
        kind="metric"
        metricId={entry.id}
        unit={entry.unitSymbol}
        comparisonTarget={comparison.targetId}
        baselineName={comparison.baselineName}
        baselineValue={comparison.baselineValue}
        targetName={comparison.targetName}
        targetValue={comparison.targetValue}
        isDetail
      />

      <div className={styles.comparisonGrid}>
        <div
          data-testid="metric-comparison-baseline"
          className={styles.comparisonColumn}
        >
          <Heading as="h4">
            Baseline:{' '}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2xs, 0.375rem)' }}>
              <CelestialSymbol type="terrestrial" size="sm" showTooltip={false} />
              <a href={resolveAppHref(comparison.baselineHref)}>{comparison.baselineName}</a>
            </span>
          </Heading>
          <Stack gap="none">
            <Datum label="Scientific Value" value={comparison.baselineValue} />
            <Datum label="Familiar Scale" value={comparison.baselineFamiliar} />
          </Stack>
        </div>
        <div
          data-testid="metric-comparison-target"
          className={styles.comparisonColumn}
        >
          <Heading as="h4">
            Target:{' '}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2xs, 0.375rem)' }}>
              <CelestialSymbol type="terrestrial" size="sm" showTooltip={false} />
              <a href={resolveAppHref(comparison.targetHref)}>{comparison.targetName}</a>
            </span>
          </Heading>
          <Stack gap="none">
            <Datum label="Scientific Value" value={comparison.targetValue} />
            <Datum label="Familiar Scale" value={comparison.targetFamiliar} />
          </Stack>
        </div>
      </div>

      <div
        data-testid="metric-comparison-ratio"
        className={styles.comparisonRatio}
      >
        <Badge status="info">{comparison.relativeRatioLabel}</Badge>
      </div>
    </section>
  );
};
