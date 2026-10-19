import type React from 'react';
import type { MinimapOrientationSummary } from '../../../services/detailsService';
import { Badge, Quantity, Unit } from '../../interface/information';
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
      <h2 id="minimap-panel-heading">Minimap</h2>
      <div
        className={styles.viewportSlot}
        data-testid="minimap-viewport-slot"
        data-scope={scope}
        data-anchor-id={anchorId}
      >
        <p className={styles.referenceFrame} data-testid="minimap-reference-frame">
          <strong data-testid="minimap-anchor-name">{anchorName}</strong>{' '}
          <Badge status="info">{scope}</Badge>
          {scope === 'planet' ? ` (${systemName})` : null}
        </p>

        {hasTelemetry ? (
          <p className={styles.telemetry} data-testid="minimap-telemetry">
            {coordinatesPc ? (
              <>
                {`[${coordinatesPc[0]}, ${coordinatesPc[1]}, ${coordinatesPc[2]}] `}
                <Unit href="/guide/metrics/galactic-coordinates">pc</Unit>
                {distanceFromOriginPc !== undefined ? (
                  <>
                    {' · d = '}
                    <Quantity
                      value={distanceFromOriginPc}
                      unit={<Unit href="/guide/metrics/galactic-coordinates">pc</Unit>}
                    />
                  </>
                ) : null}
              </>
            ) : null}

            {outerOrbitalRadiusAu !== undefined ? (
              <>
                {coordinatesPc ? ' · ' : ''}
                {'Outer Orbit: '}
                <Quantity
                  value={outerOrbitalRadiusAu}
                  unit={<Unit href="/guide/metrics/semi-major-axis">AU</Unit>}
                />
              </>
            ) : null}

            {habitableZoneAu ? (
              <>
                {coordinatesPc || outerOrbitalRadiusAu !== undefined ? ' · ' : ''}
                {`CHZ: ${habitableZoneAu[0]}–${habitableZoneAu[1]} AU`}
              </>
            ) : null}

            {parentSemiMajorAxisAu !== undefined ? (
              <>
                {coordinatesPc ||
                outerOrbitalRadiusAu !== undefined ||
                habitableZoneAu ? (
                  ' · '
                ) : (
                  ''
                )}
                {'a = '}
                <Quantity
                  value={parentSemiMajorAxisAu}
                  unit={<Unit href="/guide/metrics/semi-major-axis">AU</Unit>}
                />
              </>
            ) : null}

            {orbitingBodyCount !== undefined ? (
              <>
                {coordinatesPc ||
                outerOrbitalRadiusAu !== undefined ||
                habitableZoneAu ||
                parentSemiMajorAxisAu !== undefined ? (
                  ' · '
                ) : (
                  ''
                )}
                <span data-testid="minimap-orbiting-count">
                  {`${orbitingBodyCount} orbiting bodies`}
                </span>
              </>
            ) : null}
          </p>
        ) : null}

        {markers.length > 0 ? (
          <ul className={styles.markersList} data-testid="minimap-markers-list">
            {markers.map((marker) => (
              <li
                key={`${marker.id}-${marker.role}`}
                className={styles.markerItem}
                data-testid="minimap-marker-item"
                data-marker-id={marker.id}
                data-marker-role={marker.role}
              >
                <a
                  href={marker.href}
                  className={styles.markerLink}
                  data-testid="minimap-marker-link"
                >
                  {marker.name}
                </a>{' '}
                <span
                  className={styles.markerRole}
                  data-testid="minimap-marker-role"
                >
                  {`[${marker.role}]`}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
};
