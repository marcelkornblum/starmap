import type { FocusedPlanetTelemetry } from '../../../services/detailsService';
import {
  buildMetricGuideHref,
  buildPlanetTypeGuideHref,
} from '../../../services/searchService';
import {
  Badge,
  CelestialBadge,
  Cluster,
  ConfidencePip,
  Datum,
  Heading,
  Quantity,
  Stack,
  Unit,
} from '../../interface';

export interface DetailsPlanetTelemetrySectionProps {
  readonly planetTelemetry?: FocusedPlanetTelemetry | null;
  readonly entityId: string;
}

export const DetailsPlanetTelemetrySection = ({
  planetTelemetry,
  entityId,
}: DetailsPlanetTelemetrySectionProps) => {
  if (!planetTelemetry) {
    return null;
  }

  return (
    <section
      aria-labelledby="details-planet-telemetry-heading"
      data-testid="details-planet-telemetry-section"
    >
      <Heading as="h4" size="eyebrow" id="details-planet-telemetry-heading">
        Planetary Telemetry
      </Heading>
      <Stack gap="none" data-testid="details-planet-telemetry-list">
        <Datum
          label="Composition"
          valueTestId="details-planet-telemetry-composition"
          value={
            <CelestialBadge
              type={planetTelemetry.composition}
              href={buildPlanetTypeGuideHref(planetTelemetry.composition)}
              data-testid="details-planet-telemetry-type-link"
            />
          }
        />
        <Datum
          data-testid="details-planet-telemetry-habitable"
          label="Habitability"
          valueTestId="details-planet-telemetry-habitability"
          value={
            planetTelemetry.isHabitableCandidate ? (
              <CelestialBadge
                type="habitable-zone"
                href="/guide/planet-types/habitable-zone"
                data-testid="details-planet-telemetry-habitable-link"
              />
            ) : (
              'Outside optimistic zone'
            )
          }
        />
        {planetTelemetry.semiMajorAxisAu !== undefined ? (
          <Datum
            label="Semi-Major Axis (a)"
            valueTestId="details-planet-telemetry-axis"
            value={
              planetTelemetry.isTheoreticalOrbit ? (
                <Cluster as="span" gap="tight" align="center">
                  <Quantity value={planetTelemetry.semiMajorAxisAu} />
                  <ConfidencePip
                    confidence="theoretical"
                    data-level="theoretical"
                  />
                </Cluster>
              ) : (
                planetTelemetry.semiMajorAxisAu
              )
            }
            unit={
              <Unit>
                <a
                  href={buildMetricGuideHref('semi-major-axis', entityId)}
                  data-testid="details-metric-unit-link"
                >
                  AU
                </a>
              </Unit>
            }
          />
        ) : null}
        {planetTelemetry.periodDays !== undefined ? (
          <Datum
            label="Orbital Period (P)"
            valueTestId="details-planet-telemetry-period"
            value={planetTelemetry.periodDays}
            unit={
              <Unit>
                <a
                  href={buildMetricGuideHref('orbital-period', entityId)}
                  data-testid="details-metric-unit-link"
                >
                  d
                </a>
              </Unit>
            }
          />
        ) : null}
        {planetTelemetry.eccentricity !== undefined ? (
          <Datum
            label="Eccentricity"
            valueTestId="details-planet-telemetry-eccentricity"
            value={planetTelemetry.eccentricity}
          />
        ) : null}
        {planetTelemetry.inclinationDeg !== undefined ? (
          <Datum
            label="Inclination (i)"
            valueTestId="details-planet-telemetry-inclination"
            value={planetTelemetry.inclinationDeg}
            unit={
              <Unit>
                <a
                  href={buildMetricGuideHref('orbital-inclination', entityId)}
                  data-testid="details-metric-unit-link"
                >
                  °
                </a>
              </Unit>
            }
          />
        ) : null}
        {planetTelemetry.massMearth !== undefined ? (
          <Datum
            label="Mass"
            valueTestId="details-planet-telemetry-mass"
            value={planetTelemetry.massMearth}
            unit={
              <Unit>
                <a
                  href={buildMetricGuideHref('planetary-mass', entityId)}
                  data-testid="details-metric-unit-link"
                >
                  M⊕
                </a>
              </Unit>
            }
          />
        ) : null}
        {planetTelemetry.radiusRearth !== undefined ? (
          <Datum
            label="Radius"
            valueTestId="details-planet-telemetry-radius"
            value={planetTelemetry.radiusRearth}
            unit={
              <Unit>
                <a
                  href={buildMetricGuideHref('planetary-radius', entityId)}
                  data-testid="details-metric-unit-link"
                >
                  R⊕
                </a>
              </Unit>
            }
          />
        ) : null}
        {planetTelemetry.surfaceGravityG !== undefined ? (
          <Datum
            label="Surface Gravity"
            valueTestId="details-planet-telemetry-gravity"
            value={planetTelemetry.surfaceGravityG}
            unit={
              <Unit>
                <a
                  href={buildMetricGuideHref('surface-gravity', entityId)}
                  data-testid="details-metric-unit-link"
                >
                  g
                </a>
              </Unit>
            }
          />
        ) : null}
        {planetTelemetry.equilibriumTempK !== undefined ? (
          <Datum
            label="Equilibrium Temp"
            valueTestId="details-planet-telemetry-temp"
            value={planetTelemetry.equilibriumTempK}
            unit={
              <Unit>
                <a
                  href={buildMetricGuideHref(
                    'equilibrium-temperature',
                    entityId,
                  )}
                  data-testid="details-metric-unit-link"
                >
                  K
                </a>
              </Unit>
            }
          />
        ) : null}
        {planetTelemetry.esi !== undefined ? (
          <Datum
            label="Earth Similarity Index (ESI)"
            valueTestId="details-planet-telemetry-esi"
            value={planetTelemetry.esi.toFixed(2)}
          />
        ) : null}
        <Datum
          data-testid="details-planet-telemetry-tidal-status"
          label="Tidal Status"
          valueTestId="details-planet-telemetry-tidal"
          value={
            planetTelemetry.isTidallyLocked ? (
              <Badge status="caution">
                Tidally locked (synchronous)
              </Badge>
            ) : (
              'Free rotation'
            )
          }
        />
        {planetTelemetry.discoveryYear !== undefined ||
        planetTelemetry.discoveryMethod ? (
          <Datum
            label="Discovery"
            valueTestId="details-planet-telemetry-discovery"
            value={[
              planetTelemetry.discoveryYear,
              planetTelemetry.discoveryMethod,
            ]
              .filter(Boolean)
              .join(' · ')}
          />
        ) : null}
      </Stack>
    </section>
  );
};
