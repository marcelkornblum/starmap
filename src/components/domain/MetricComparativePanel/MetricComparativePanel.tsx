import type React from 'react';
import { CelestialSymbol, Cluster, Datum, Heading, Stack } from '../../interface';
import { resolveAppHref } from '../../../utils/url';
import { SOL_REFERENCE_TARGET } from '../../../config/referenceTargets';
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
  const baselineSymbolType =
    comparison.baselineReticleType ??
    (comparison.baselineName === SOL_REFERENCE_TARGET.displayName ? 'star' : 'terrestrial');
  const fallbackTargetSymbolType =
    entry.category === 'Stellar Telemetry' ? 'star' : 'terrestrial';

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
            <Cluster as="span" gap="tight" align="center">
              <span>Baseline</span>
              <CelestialSymbol type={baselineSymbolType} size="sm" showTooltip={false} />
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
              <Cluster as="span" gap="tight" align="center">
                <span>Target</span>
                <CelestialSymbol
                  type={
                    ('reticleType' in target ? target.reticleType : undefined) ??
                    comparison.targetReticleType ??
                    fallbackTargetSymbolType
                  }
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
              <div className={styles.comparisonRatio}>
                <Datum
                  label="Relative Scale"
                  value={target.relativeRatioLabel}
                  data-testid={targets.length <= 1 ? 'metric-comparison-ratio' : undefined}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {targets.length <= 1 && (
        <div className={styles.comparisonRatio}>
          <Datum
            label="Relative Scale"
            value={comparison.relativeRatioLabel}
            data-testid={targets.length <= 1 ? 'metric-comparison-ratio' : undefined}
          />
        </div>
      )}
    </section>
  );
};
