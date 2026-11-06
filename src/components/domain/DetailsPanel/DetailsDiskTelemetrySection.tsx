import type { FocusedDiskTelemetry } from '../../../services/detailsService';
import { buildMetricGuideHref } from '../../../services/searchService';
import {
  Badge,
  type BadgeConfidence,
  CelestialBadge,
  type ConfidenceLevel,
  Datum,
  Heading,
  Stack,
  Unit,
} from '../../interface';

export interface DetailsDiskTelemetrySectionProps {
  readonly diskTelemetry?: FocusedDiskTelemetry | null;
  readonly entityId: string;
}

export const DetailsDiskTelemetrySection = ({
  diskTelemetry,
  entityId,
}: DetailsDiskTelemetrySectionProps) => {
  if (!diskTelemetry) {
    return null;
  }

  return (
    <section
      aria-labelledby="details-disk-telemetry-heading"
      data-testid="details-disk-telemetry-section"
    >
      <Heading as="h4" size="eyebrow" id="details-disk-telemetry-heading">
        Circumstellar Disk Telemetry
      </Heading>
      <Stack gap="none" data-testid="details-disk-telemetry-list">
        <Datum
          label="Classification"
          valueTestId="details-disk-telemetry-classification"
          value={
            <CelestialBadge
              type={diskTelemetry.classification}
              href={buildMetricGuideHref('semi-major-axis', entityId)}
              data-testid="details-disk-classification-link"
            />
          }
        />
        {diskTelemetry.confidence ? (
          <Datum
            label="Observational Confidence"
            valueTestId="details-disk-telemetry-confidence"
            confidence={diskTelemetry.confidence as ConfidenceLevel}
            value={
              <Badge confidence={diskTelemetry.confidence as BadgeConfidence}>
                {diskTelemetry.confidence}
              </Badge>
            }
          />
        ) : null}
        <Datum
          label="Radial Span"
          valueTestId="details-disk-telemetry-span"
          value={
            <>
              <span>{diskTelemetry.innerRadiusAu}</span>
              <span>–</span>
              <span>{diskTelemetry.outerRadiusAu}</span>
            </>
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
        <Datum
          label="Midpoint Radius"
          valueTestId="details-disk-telemetry-midpoint"
          value={diskTelemetry.semiMajorAxisAu}
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
        {diskTelemetry.tempK !== undefined ? (
          <Datum
            label="Estimated Temp"
            valueTestId="details-disk-telemetry-temp"
            value={diskTelemetry.tempK}
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
        <Datum
          label="Composition"
          valueTestId="details-disk-telemetry-composition"
          value={diskTelemetry.composition}
        />
      </Stack>
    </section>
  );
};
