import type {
  FocusedMinorBodyTelemetry,
  FocusedStructureTelemetry,
} from '../../../services/details/detailsTelemetryTypes';
import { buildMetricGuideHref } from '../../../content/guide';
import {
  Badge,
  Block,
  CelestialBadge,
  Cluster,
  CollapsibleSection,
  Datum,
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
    <CollapsibleSection
      title="Body Telemetry"
      headingId="details-minor-body-telemetry-heading"
      data-testid="details-minor-body-telemetry-section"
    >
      <Block padding="tight">
        <Stack gap="fib-1" data-testid="details-minor-body-telemetry-list">
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
      </Block>
    </CollapsibleSection>
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
    <CollapsibleSection
      title="Structure Telemetry"
      headingId="details-structure-telemetry-heading"
      data-testid="details-structure-telemetry-section"
    >
      <Block padding="tight">
        <Stack gap="fib-1" data-testid="details-structure-telemetry-list">
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
      </Block>
    </CollapsibleSection>
  );
};
