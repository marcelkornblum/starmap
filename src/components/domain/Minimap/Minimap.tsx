import type React from 'react';
import type { MinimapOrientationSummary } from '../../../services/detailsService';
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
import styles from './Minimap.module.css';

export interface MinimapProps {
  readonly orientation: MinimapOrientationSummary | null;
}

export const Minimap: React.FC<MinimapProps> = ({ orientation }) => {
  if (!orientation) {
    return null;
  }

  const {
    scope,
    anchorId,
    anchorName,
    systemId,
    systemName,
    coordinatesPc,
    distanceFromOriginPc,
    outerOrbitalRadiusAu,
    habitableZoneAu,
    parentSemiMajorAxisAu,
    orbitingBodyCount,
    markers,
  } = orientation;

  const hasTelemetry =
    coordinatesPc !== undefined ||
    distanceFromOriginPc !== undefined ||
    outerOrbitalRadiusAu !== undefined ||
    habitableZoneAu !== undefined ||
    parentSemiMajorAxisAu !== undefined ||
    orbitingBodyCount !== undefined;

  return (
    <section
      className={styles.minimapPanel}
      aria-labelledby="minimap-panel-heading"
      data-testid="minimap-panel"
      data-scope={scope}
      data-anchor-id={anchorId}
      data-system-id={systemId}
    >
      <Heading as="h2" id="minimap-panel-heading" className={styles.srOnly}>
        Minimap
      </Heading>
      <div
        className={styles.viewportSlot}
        data-testid="minimap-viewport-slot"
        data-scope={scope}
        data-anchor-id={anchorId}
      >
        <Cluster gap="tight" align="center" className={styles.referenceFrame} data-testid="minimap-reference-frame">
          <strong data-testid="minimap-anchor-name">{anchorName}</strong>
          <Badge status="info">{scope}</Badge>
          {scope === 'planet' && systemName ? (
            <Badge status="neutral">{systemName}</Badge>
          ) : null}
        </Cluster>

        {hasTelemetry ? (
          <Stack gap="none" className={styles.telemetry} data-testid="minimap-telemetry">
            {coordinatesPc ? (
              <Datum
                label="Coordinates"
                valueTestId="minimap-coordinates"
                value={`${coordinatesPc[0]}, ${coordinatesPc[1]}, ${coordinatesPc[2]}`}
                unit={<Unit href="/guide/metrics/galactic-coordinates">pc</Unit>}
              />
            ) : null}
            {distanceFromOriginPc !== undefined ? (
              <Datum
                label="Distance from Origin"
                value={distanceFromOriginPc}
                unit={<Unit href="/guide/metrics/galactic-coordinates">pc</Unit>}
              />
            ) : null}
            {outerOrbitalRadiusAu !== undefined ? (
              <Datum
                label="Outer Orbit"
                value={outerOrbitalRadiusAu}
                unit={<Unit href="/guide/metrics/semi-major-axis">AU</Unit>}
              />
            ) : null}
            {habitableZoneAu ? (
              <Datum
                label="Habitable Zone (CHZ)"
                valueTestId="minimap-habitable-zone"
                value={`${habitableZoneAu[0]}–${habitableZoneAu[1]}`}
                unit={<Unit href="/guide/metrics/semi-major-axis">AU</Unit>}
              />
            ) : null}
            {parentSemiMajorAxisAu !== undefined ? (
              <Datum
                label="Semi-Major Axis (a)"
                value={parentSemiMajorAxisAu}
                unit={<Unit href="/guide/metrics/semi-major-axis">AU</Unit>}
              />
            ) : null}
            {orbitingBodyCount !== undefined ? (
              <Datum
                label="Orbiting Bodies"
                value={
                  <Quantity
                    data-testid="minimap-orbiting-count"
                    value={orbitingBodyCount}
                    unit="orbiting bodies"
                  />
                }
              />
            ) : null}
          </Stack>
        ) : null}

        {markers.length > 0 ? (
          <DataTable data-testid="minimap-markers-list">
            <DataTable.Head>
              <DataTable.Row>
                <DataTable.HeaderCell>Marker</DataTable.HeaderCell>
                <DataTable.HeaderCell>Role</DataTable.HeaderCell>
              </DataTable.Row>
            </DataTable.Head>
            <DataTable.Body>
              {markers.map((marker) => (
                <DataTable.Row
                  key={`${marker.id}-${marker.role}`}
                  data-testid="minimap-marker-item"
                  data-marker-id={marker.id}
                  data-marker-role={marker.role}
                >
                  <DataTable.Cell>
                    <a
                      href={marker.href}
                      className={styles.markerLink}
                      data-testid="minimap-marker-link"
                    >
                      {marker.name}
                    </a>
                  </DataTable.Cell>
                  <DataTable.Cell>
                    <Badge status="neutral" data-testid="minimap-marker-role">
                      {marker.role}
                    </Badge>
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
