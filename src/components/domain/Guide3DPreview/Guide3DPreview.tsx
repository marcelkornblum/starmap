import type React from 'react';
import styles from './Guide3DPreview.module.css';

export interface GuideStarPreviewProps {
  readonly kind: 'star';
  readonly spectralClass?: string;
  readonly spectralLetter?: string;
  readonly luminosityClass?: string;
  readonly radiusRsun?: number;
  readonly tempK?: number;
  readonly chromaticityHex?: string;
  readonly isDetail?: boolean;
  readonly className?: string;
}

export interface GuidePlanetPreviewProps {
  readonly kind: 'planet';
  readonly composition?: string;
  readonly radiusRearth?: number;
  readonly textureTheme?: string;
  readonly isDetail?: boolean;
  readonly className?: string;
}

export interface GuideMetricPreviewProps {
  readonly kind: 'metric';
  readonly metricId?: string;
  readonly unit?: string;
  readonly baselineName?: string;
  readonly baselineValue?: string;
  readonly comparisonTarget?: string;
  readonly targetName?: string;
  readonly targetValue?: string;
  readonly isDetail?: boolean;
  readonly className?: string;
}

export type Guide3DPreviewProps =
  | GuideStarPreviewProps
  | GuidePlanetPreviewProps
  | GuideMetricPreviewProps;

export const Guide3DPreview: React.FC<Guide3DPreviewProps> = (props) => {
  const rootClass = [
    styles.previewSlot,
    props.isDetail ? styles.detailPreviewSlot : undefined,
    props.className,
  ]
    .filter(Boolean)
    .join(' ');

  if (props.kind === 'star') {
    return (
      <div
        data-testid="guide-3d-preview"
        data-preview-kind="star"
        data-spectral-class={props.spectralClass}
        data-spectral-letter={props.spectralLetter}
        data-luminosity-class={props.luminosityClass}
        data-radius-rsun={props.radiusRsun}
        data-temp-k={props.tempK}
        data-chromaticity-hex={props.chromaticityHex}
        className={rootClass}
      >
        <div
          className={styles.sphereVisual}
          data-kind="star"
          data-chromaticity={props.chromaticityHex}
        >
          <span className={styles.sphereCore} />
        </div>
      </div>
    );
  }

  if (props.kind === 'planet') {
    return (
      <div
        data-testid="guide-3d-preview"
        data-preview-kind="planet"
        data-composition={props.composition}
        data-radius-rearth={props.radiusRearth}
        data-texture-theme={props.textureTheme}
        className={rootClass}
      >
        <div
          className={styles.sphereVisual}
          data-kind="planet"
          data-theme={props.textureTheme}
        >
          <span className={styles.sphereCore} />
        </div>
      </div>
    );
  }

  const baselineKind = props.baselineName === 'Sol' ? 'star' : 'planet';

  return (
    <div
      data-testid="guide-3d-preview"
      data-preview-kind="metric"
      data-metric-id={props.metricId}
      data-unit={props.unit}
      data-comparison-target={props.comparisonTarget}
      className={rootClass}
    >
      <div className={styles.metricComparisonStage}>
        <div className={styles.metricEntityStage}>
          <div
            className={styles.sphereVisual}
            data-kind={baselineKind}
            data-baseline={props.baselineName}
          >
            <span className={styles.sphereCore} />
          </div>
          {props.baselineName && (
            <span className={styles.stageCaption}>
              {props.baselineName}
              {props.baselineValue ? `: ${props.baselineValue}` : ''}
            </span>
          )}
        </div>
        <div className={styles.metricVisual}>
          <span>{props.unit}</span>
        </div>
        {props.comparisonTarget && (
          <div className={styles.metricEntityStage}>
            <div
              className={styles.sphereVisual}
              data-kind={baselineKind}
              data-target="true"
            >
              <span className={styles.sphereCore} />
            </div>
            <span className={styles.stageCaption}>
              {props.targetName ?? props.comparisonTarget}: {props.targetValue}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
