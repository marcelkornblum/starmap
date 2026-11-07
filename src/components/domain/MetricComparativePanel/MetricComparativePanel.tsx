import type React from 'react';
import { Badge, CelestialSymbol, Cluster, Datum, Heading, Stack } from '../../interface';
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
  const targets =
    comparison.targets && comparison.targets.length > 0
      ? comparison.targets
      : [comparison];

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
            <Cluster as="span" gap="tight" align="center">
              <CelestialSymbol type="terrestrial" size="sm" showTooltip={false} />
              <a href={resolveAppHref(comparison.baselineHref)}>{comparison.baselineName}</a>
            </Cluster>
          </Heading>
          <Stack gap="none">
            <Datum label="Scientific Value" value={comparison.baselineValue} />
            <Datum label="Familiar Scale" value={comparison.baselineFamiliar} />
          </Stack>
        </div>

        {targets.map((target, idx) => (
          <div
            key={target.targetId || idx}
            data-testid={
              idx === 0
                ? 'metric-comparison-target'
                : `metric-comparison-target-${idx}`
            }
            className={styles.comparisonColumn}
          >
            <Heading as="h4">
              Target:{' '}
              <Cluster as="span" gap="tight" align="center">
                <CelestialSymbol
                  type="terrestrial"
                  size="sm"
                  showTooltip={false}
                />
                <a href={resolveAppHref(target.targetHref)}>
                  {target.targetName}
                </a>
              </Cluster>
            </Heading>
            <Stack gap="none">
              <Datum label="Scientific Value" value={target.targetValue} />
              <Datum label="Familiar Scale" value={target.targetFamiliar} />
            </Stack>
            {targets.length > 1 && (
              <div>
                <Badge
                  status={target.isCatalogued === false ? 'neutral' : 'info'}
                >
                  {target.relativeRatioLabel}
                </Badge>
              </div>
            )}
          </div>
        ))}
      </div>

      <div
        data-testid="metric-comparison-ratio"
        className={styles.comparisonRatio}
      >
        <Badge status={comparison.isCatalogued === false ? 'neutral' : 'info'}>
          {comparison.relativeRatioLabel}
        </Badge>
      </div>
    </section>
  );
};
