import type React from 'react';
import type { FocusedPreviewSummary } from '../../../services/detailsService';
import { buildMetricGuideHref } from '../../../services/searchService';
import { Badge, Quantity, Unit } from '../../interface/information';
import styles from './PreviewPanel.module.css';

export interface PreviewPanelProps {
  readonly preview: FocusedPreviewSummary | null;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({ preview }) => {
  if (!preview) {
    return null;
  }

  const hasPrimaryOrbit =
    preview.primaryInclinationDeg !== undefined ||
    preview.primaryEccentricity !== undefined ||
    preview.primarySemiMajorAxisAu !== undefined;

  return (
    <section
      className={styles.previewPanel}
      aria-labelledby="preview-panel-heading"
      data-testid="preview-panel"
      data-target-id={preview.targetId}
      data-focused-kind={preview.focusedKind}
      data-preview-mode={preview.previewMode}
    >
      <h2 id="preview-panel-heading">Focus Preview</h2>
      <div
        className={styles.canvasSlot}
        data-testid="preview-canvas-slot"
        data-preview-mode={preview.previewMode}
        data-target-id={preview.targetId}
      >
        <p data-testid="preview-target-title">
          <strong data-testid="preview-target-name">{preview.targetName}</strong>{' '}
          <Badge status="info">{preview.previewMode}</Badge>
        </p>

        {hasPrimaryOrbit ? (
          <p data-testid="preview-primary-orbit-telemetry">
            {preview.primarySemiMajorAxisAu !== undefined ? (
              <>
                {'a = '}
                <Quantity
                  value={preview.primarySemiMajorAxisAu}
                  unit={
                    <Unit href={buildMetricGuideHref('semi-major-axis', preview.targetId)}>
                      AU
                    </Unit>
                  }
                />
              </>
            ) : null}
            {preview.primaryEccentricity !== undefined ? (
              <>
                {preview.primarySemiMajorAxisAu !== undefined ? ' · ' : ''}
                {`e = ${preview.primaryEccentricity}`}
              </>
            ) : null}
            {preview.primaryInclinationDeg !== undefined ? (
              <>
                {preview.primarySemiMajorAxisAu !== undefined ||
                preview.primaryEccentricity !== undefined
                  ? ' · '
                  : ''}
                {'i = '}
                <Quantity
                  value={preview.primaryInclinationDeg}
                  unit={
                    <Unit href={buildMetricGuideHref('orbital-inclination', preview.targetId)}>
                      °
                    </Unit>
                  }
                />
              </>
            ) : null}
          </p>
        ) : null}

        {preview.orbitElements.length > 0 ? (
          <ol className={styles.orbitsList} data-testid="preview-orbits-list">
            {preview.orbitElements.map((orb) => (
              <li
                key={orb.id}
                data-testid="preview-orbit-item"
                data-entity-id={orb.id}
                data-kind={orb.kind}
                data-orbit-rank={orb.orbitRank}
                data-in-habitable-zone={orb.inHabitableZone ? 'true' : undefined}
              >
                <strong>{orb.name}</strong>
                {orb.semiMajorAxisAu !== undefined ? (
                  <>
                    {' · a = '}
                    <Quantity
                      value={orb.semiMajorAxisAu}
                      unit={
                        <Unit href={buildMetricGuideHref('semi-major-axis', orb.id)}>
                          AU
                        </Unit>
                      }
                    />
                  </>
                ) : null}
                {orb.eccentricity !== undefined ? (
                  <>
                    {` · e = ${orb.eccentricity}`}
                  </>
                ) : null}
                {orb.inclinationDeg !== undefined ? (
                  <>
                    {' · i = '}
                    <Quantity
                      value={orb.inclinationDeg}
                      unit={
                        <Unit href={buildMetricGuideHref('orbital-inclination', orb.id)}>
                          °
                        </Unit>
                      }
                    />
                  </>
                ) : null}
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </section>
  );
};
