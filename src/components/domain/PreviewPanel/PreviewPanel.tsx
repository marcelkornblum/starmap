import type React from 'react';
import type { FocusedPreviewSummary } from '../../../services/detailsService';
import { buildMetricGuideHref } from '../../../services/searchService';
import {
  Badge,
  Cluster,
  DataTable,
  Datum,
  Heading,
  Quantity,
  Stack,
  Unit,
} from '../../interface';
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
      <Heading as="h2" id="preview-panel-heading" className={styles.srOnly}>
        Focus Preview
      </Heading>
      <div
        className={styles.canvasSlot}
        data-testid="preview-canvas-slot"
        data-preview-mode={preview.previewMode}
        data-target-id={preview.targetId}
      >
        <Cluster gap="tight" align="center" data-testid="preview-target-title">
          <strong data-testid="preview-target-name">{preview.targetName}</strong>
          <Badge status="info">{preview.previewMode}</Badge>
        </Cluster>

        {hasPrimaryOrbit ? (
          <Stack gap="none" data-testid="preview-primary-orbit-telemetry">
            {preview.primarySemiMajorAxisAu !== undefined ? (
              <Datum
                label="Semi-Major Axis (a)"
                value={preview.primarySemiMajorAxisAu}
                unit={
                  <Unit href={buildMetricGuideHref('semi-major-axis', preview.targetId)}>
                    AU
                  </Unit>
                }
              />
            ) : null}
            {preview.primaryEccentricity !== undefined ? (
              <Datum
                label="Eccentricity (e)"
                valueTestId="preview-primary-eccentricity"
                value={preview.primaryEccentricity}
              />
            ) : null}
            {preview.primaryInclinationDeg !== undefined ? (
              <Datum
                label="Inclination (i)"
                value={preview.primaryInclinationDeg}
                unit={
                  <Unit href={buildMetricGuideHref('orbital-inclination', preview.targetId)}>
                    °
                  </Unit>
                }
              />
            ) : null}
          </Stack>
        ) : null}

        {preview.orbitElements.length > 0 ? (
          <DataTable data-testid="preview-orbits-list">
            <DataTable.Head>
              <DataTable.Row>
                <DataTable.HeaderCell>Body</DataTable.HeaderCell>
                <DataTable.HeaderCell align="end" unit={<Unit href="/guide/metrics/semi-major-axis">AU</Unit>}>a</DataTable.HeaderCell>
                <DataTable.HeaderCell align="end">e</DataTable.HeaderCell>
                <DataTable.HeaderCell align="end" unit={<Unit href="/guide/metrics/orbital-inclination">°</Unit>}>i</DataTable.HeaderCell>
              </DataTable.Row>
            </DataTable.Head>
            <DataTable.Body>
              {preview.orbitElements.map((orb) => (
                <DataTable.Row
                  key={orb.id}
                  data-testid="preview-orbit-item"
                  data-entity-id={orb.id}
                  data-kind={orb.kind}
                  data-orbit-rank={orb.orbitRank}
                  data-in-habitable-zone={orb.inHabitableZone ? 'true' : undefined}
                >
                  <DataTable.Cell>
                    <strong>{orb.name}</strong>
                  </DataTable.Cell>
                  <DataTable.Cell numeric>
                    {orb.semiMajorAxisAu !== undefined ? (
                      <Quantity
                        value={orb.semiMajorAxisAu}
                        unit={
                          <Unit href={buildMetricGuideHref('semi-major-axis', orb.id)}>
                            AU
                          </Unit>
                        }
                      />
                    ) : (
                      '—'
                    )}
                  </DataTable.Cell>
                  <DataTable.Cell numeric>
                    {orb.eccentricity !== undefined ? (
                      <Quantity
                        data-testid="preview-orbit-eccentricity"
                        value={orb.eccentricity}
                      />
                    ) : (
                      '—'
                    )}
                  </DataTable.Cell>
                  <DataTable.Cell numeric>
                    {orb.inclinationDeg !== undefined ? (
                      <Quantity
                        value={orb.inclinationDeg}
                        unit={
                          <Unit href={buildMetricGuideHref('orbital-inclination', orb.id)}>
                            °
                          </Unit>
                        }
                      />
                    ) : (
                      '—'
                    )}
                  </DataTable.Cell>
                </DataTable.Row>
              ))}
            </DataTable.Body>
          </DataTable>
        ) : null}
      </div>
    </section>
  );
};
