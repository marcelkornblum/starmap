import type React from 'react';
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
      <h3>Comparative Telemetry & Reference Baseline</h3>
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
          <h4>
            Baseline: <a href={comparison.baselineHref}>{comparison.baselineName}</a>
          </h4>
          <p>
            <strong>{comparison.baselineValue}</strong>
          </p>
          <p>{comparison.baselineFamiliar}</p>
        </div>
        <div
          data-testid="metric-comparison-target"
          className={styles.comparisonColumn}
        >
          <h4>
            Target: <a href={comparison.targetHref}>{comparison.targetName}</a>
          </h4>
          <p>
            <strong>{comparison.targetValue}</strong>
          </p>
          <p>{comparison.targetFamiliar}</p>
        </div>
      </div>

      <div
        data-testid="metric-comparison-ratio"
        className={styles.comparisonRatio}
      >
        {comparison.relativeRatioLabel}
      </div>
    </section>
  );
};
