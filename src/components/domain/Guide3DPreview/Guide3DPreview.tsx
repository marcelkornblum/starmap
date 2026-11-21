import type React from 'react';
import { SOL_REFERENCE_TARGET } from '../../../config/referenceTargets';
import styles from './Guide3DPreview.module.css';

export interface GuideStarPreviewProps {
  readonly kind: 'star';
  readonly spectralClass?: string;
  readonly spectralLetter?: string;
  readonly luminosityClass?: string;
  readonly radiusRsun?: number;
  readonly tempK?: number;
  readonly chromaticityToken?: string;
  readonly isDetail?: boolean;
}

export interface GuidePlanetPreviewProps {
  readonly kind: 'planet';
  readonly composition?: string;
  readonly radiusRearth?: number;
  readonly textureTheme?: string;
  readonly isDetail?: boolean;
}

export interface GuideMetricPreviewProps {
  readonly kind: 'metric';
  readonly metricId?: string;
  readonly unit?: string;
  readonly baselineId?: string;
  readonly baselineKind?: 'star' | 'planet';
  readonly baselineName?: string;
  readonly baselineValue?: string;
  readonly comparisonTarget?: string;
  readonly targetName?: string;
  readonly targetValue?: string;
  readonly isDetail?: boolean;
}

export interface GuideHazardPreviewProps {
  readonly kind: 'hazard';
  readonly hazardId?: string;
  readonly domain?: 'stellar' | 'planetary';
  readonly severity?: 'warning' | 'critical';
  readonly isDetail?: boolean;
}

export type Guide3DPreviewProps =
  | GuideStarPreviewProps
  | GuidePlanetPreviewProps
  | GuideMetricPreviewProps
  | GuideHazardPreviewProps;

export const Guide3DPreview: React.FC<Guide3DPreviewProps> = (props) => {
  const detailAttr = props.isDetail ? 'true' : undefined;

  if (props.kind === 'star') {
    return (
      <div
        data-testid="guide-3d-preview"
        data-preview-kind="star"
        data-detail={detailAttr}
        data-spectral-class={props.spectralClass}
        data-spectral-letter={props.spectralLetter}
        data-luminosity-class={props.luminosityClass}
        data-radius-rsun={props.radiusRsun}
        data-temp-k={props.tempK}
        data-chromaticity-token={props.chromaticityToken}
        className={styles.previewSlot}
      >
        <div
          className={styles.sphereVisual}
          data-kind="star"
          data-chromaticity={props.chromaticityToken}
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
        data-detail={detailAttr}
        data-composition={props.composition}
        data-radius-rearth={props.radiusRearth}
        data-texture-theme={props.textureTheme}
        className={styles.previewSlot}
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

  if (props.kind === 'hazard') {
    return (
      <div
        data-testid="guide-3d-preview"
        data-preview-kind="hazard"
        data-detail={detailAttr}
        data-hazard-id={props.hazardId}
        data-hazard-domain={props.domain}
        data-hazard-severity={props.severity}
        className={styles.previewSlot}
      >
        <div
          className={styles.sphereVisual}
          data-kind="hazard"
          data-domain={props.domain}
          data-severity={props.severity}
        >
          <span className={styles.sphereCore} />
        </div>
      </div>
    );
  }

  const baselineKind =
    props.baselineKind ??
    (props.baselineId === SOL_REFERENCE_TARGET.id ||
    props.baselineName?.toLowerCase() === SOL_REFERENCE_TARGET.id
      ? 'star'
      : 'planet');

  return (
    <div
      data-testid="guide-3d-preview"
      data-preview-kind="metric"
      data-detail={detailAttr}
      data-metric-id={props.metricId}
      data-unit={props.unit}
      data-comparison-target={props.comparisonTarget}
      className={styles.previewSlot}
    >
      <div className={styles.metricComparisonStage}>
        <div className={styles.metricEntityStage}>
          <div
            className={styles.sphereVisual}
            data-kind={baselineKind}
            data-baseline-kind={baselineKind}
            data-baseline={props.baselineId ?? props.baselineName}
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
