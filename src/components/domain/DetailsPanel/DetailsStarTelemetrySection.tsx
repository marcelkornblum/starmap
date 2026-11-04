import type { FocusedStarTelemetry } from '../../../services/detailsService';
import {
  buildMetricGuideHref,
  buildStarTypeGuideHref,
} from '../../../services/searchService';
import { Datum, Heading, SpectralBadge, Stack, Unit } from '../../interface';

export interface DetailsStarTelemetrySectionProps {
  readonly starTelemetry?: FocusedStarTelemetry | null;
  readonly entityId: string;
}

export const DetailsStarTelemetrySection = ({
  starTelemetry,
  entityId,
}: DetailsStarTelemetrySectionProps) => {
  if (!starTelemetry) {
    return null;
  }

  return (
    <section
      aria-labelledby="details-star-telemetry-heading"
      data-testid="details-star-telemetry-section"
    >
      <Heading as="h4" size="eyebrow" id="details-star-telemetry-heading">
        Stellar Telemetry
      </Heading>
      <Stack gap="none" data-testid="details-star-telemetry-list">
        <Datum
          label="Component"
          valueTestId="details-star-telemetry-component"
          value={starTelemetry.componentDesignation}
        />
        <Datum
          label="Spectral Class"
          valueTestId="details-star-telemetry-spectral"
          value={
            <SpectralBadge
              spectralType={starTelemetry.spectralType}
              href={buildStarTypeGuideHref(starTelemetry.spectralType)}
              fallback={starTelemetry.spectralType}
              data-testid="details-star-telemetry-spectral-link"
            />
          }
        />
        <Datum
          label="Apparent Magnitude"
          valueTestId="details-star-telemetry-mag"
          value={starTelemetry.mag}
          unit={
            <Unit>
              <a
                href={buildMetricGuideHref('stellar-magnitude', entityId)}
                data-testid="details-metric-unit-link"
              >
                V
              </a>
            </Unit>
          }
        />
        <Datum
          label="Absolute Magnitude"
          valueTestId="details-star-telemetry-absmag"
          value={starTelemetry.absmag}
          unit={
            <Unit>
              <a
                href={buildMetricGuideHref('stellar-magnitude', entityId)}
                data-testid="details-metric-unit-link"
              >
                M_V
              </a>
            </Unit>
          }
        />
        {starTelemetry.massMsun !== undefined ? (
          <Datum
            label="Mass"
            valueTestId="details-star-telemetry-mass"
            value={starTelemetry.massMsun}
            unit={
              <Unit>
                <a
                  href={buildMetricGuideHref('stellar-mass', entityId)}
                  data-testid="details-metric-unit-link"
                >
                  M☉
                </a>
              </Unit>
            }
          />
        ) : null}
        {starTelemetry.radiusRsun !== undefined ? (
          <Datum
            label="Radius"
            valueTestId="details-star-telemetry-radius"
            value={starTelemetry.radiusRsun}
            unit={
              <Unit>
                <a
                  href={buildMetricGuideHref('stellar-radius', entityId)}
                  data-testid="details-metric-unit-link"
                >
                  R☉
                </a>
              </Unit>
            }
          />
        ) : null}
        {starTelemetry.luminosityLsun !== undefined ? (
          <Datum
            label="Luminosity"
            valueTestId="details-star-telemetry-luminosity"
            value={starTelemetry.luminosityLsun}
            unit={
              <Unit>
                <a
                  href={buildMetricGuideHref('stellar-luminosity', entityId)}
                  data-testid="details-metric-unit-link"
                >
                  L☉
                </a>
              </Unit>
            }
          />
        ) : null}
        {starTelemetry.effectiveTempK !== undefined ? (
          <Datum
            label="Effective Temp"
            valueTestId="details-star-telemetry-temp"
            value={starTelemetry.effectiveTempK}
            unit={
              <Unit>
                <a
                  href={buildMetricGuideHref('effective-temperature', entityId)}
                  data-testid="details-metric-unit-link"
                >
                  K
                </a>
              </Unit>
            }
          />
        ) : null}
      </Stack>
    </section>
  );
};
