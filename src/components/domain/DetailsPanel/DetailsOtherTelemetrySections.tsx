import type {
  FocusedMinorBodyTelemetry,
  FocusedStructureTelemetry,
} from '../../../services/detailsService';
import { buildMetricGuideHref } from '../../../services/searchService';
import {
  Badge,
  CelestialBadge,
  Cluster,
  Datum,
  Heading,
  Stack,
  Unit,
} from '../../interface';

export interface DetailsMinorBodyTelemetrySectionProps {
  readonly minorBodyTelemetry?: FocusedMinorBodyTelemetry | null;
}

export const DetailsMinorBodyTelemetrySection = ({
  minorBodyTelemetry,
}: DetailsMinorBodyTelemetrySectionProps) => {
  if (!minorBodyTelemetry) {
    return null;
  }

  return (
    <section
      aria-labelledby="details-minor-body-telemetry-heading"
      data-testid="details-minor-body-telemetry-section"
    >
      <Heading as="h4" size="eyebrow" id="details-minor-body-telemetry-heading">
        Body Telemetry
      </Heading>
      <Stack gap="none" data-testid="details-minor-body-telemetry-list">
        <Datum
          label="Classification"
          valueTestId="details-minor-body-telemetry-class"
          value={
            <CelestialBadge
              type={minorBodyTelemetry.classification}
              showLabel
            />
          }
        />
        {minorBodyTelemetry.parentBodyName ? (
          <Datum
            label="Host System"
            valueTestId="details-minor-body-telemetry-parent"
            value={minorBodyTelemetry.parentBodyName}
          />
        ) : null}
      </Stack>
    </section>
  );
};

export interface DetailsStructureTelemetrySectionProps {
  readonly structureTelemetry?: FocusedStructureTelemetry | null;
  readonly entityId: string;
}

export const DetailsStructureTelemetrySection = ({
  structureTelemetry,
  entityId,
}: DetailsStructureTelemetrySectionProps) => {
  if (!structureTelemetry) {
    return null;
  }

  return (
    <section
      aria-labelledby="details-structure-telemetry-heading"
      data-testid="details-structure-telemetry-section"
    >
      <Heading as="h4" size="eyebrow" id="details-structure-telemetry-heading">
        Structure Telemetry
      </Heading>
      <Stack gap="none" data-testid="details-structure-telemetry-list">
        <Datum
          label="Structure Type"
          valueTestId="details-structure-telemetry-type"
          value={
            <Cluster gap="tight" align="center">
              <CelestialBadge type={structureTelemetry.symbolType} />
              <Badge status="info">{structureTelemetry.structureType}</Badge>
            </Cluster>
          }
        />
        {structureTelemetry.radiusPc !== undefined ? (
          <Datum
            label="Radius"
            valueTestId="details-structure-telemetry-radius"
            value={structureTelemetry.radiusPc}
            unit={
              <Unit>
                <a
                  href={buildMetricGuideHref('galactic-coordinates', entityId)}
                  data-testid="details-metric-unit-link"
                >
                  pc
                </a>
              </Unit>
            }
          />
        ) : null}
      </Stack>
    </section>
  );
};
