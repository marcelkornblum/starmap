import type { FocusedEntityDetails } from '../../../services/detailsService';
import {
  buildMetricGuideHref,
  buildPlanetTypeGuideHref,
  buildTagGalaxyHref,
} from '../../../services/searchService';
import { resolveAppHref } from '../../../utils/url';
import {
  Badge,
  CelestialBadge,
  Cluster,
  Datum,
  Stack,
  Unit,
} from '../../interface';
import { PlanetCensus } from '../PlanetCensus';
import { HazardSummary, renderSystemSummarySegments } from './detailsPanelHelpers';

export interface DetailsQuickTelemetryProps {
  readonly details: FocusedEntityDetails;
}

export const DetailsQuickTelemetry = ({ details }: DetailsQuickTelemetryProps) => {
  const {
    id,
    focusedKind,
    hazards,
    hazardCount,
    hazardSummaryLabel,
    planetTelemetry,
    starTelemetry,
    minorBodyTelemetry,
    structureTelemetry,
    diskTelemetry,
    planetCount,
    planetCompositionBreakdown,
    hasHabitableCandidate,
    systemSummarySegments,
  } = details;

  const isSystemFocus = focusedKind === 'system';

  const hazardSummaryNode = (
    <HazardSummary
      hazardCount={hazardCount}
      hazards={hazards}
      hazardSummaryLabel={hazardSummaryLabel}
    />
  );

  return (
    <>
      {planetTelemetry ? (
        <Stack gap="none" data-testid="details-focused-entity-peek">
          <Datum
            label="Classification"
            value={
              <Cluster gap="tight" align="center">
                <CelestialBadge
                  type={planetTelemetry.composition}
                  href={buildPlanetTypeGuideHref(planetTelemetry.composition)}
                  data-testid="details-planet-type-link"
                />
                {planetTelemetry.isHabitableCandidate ? (
                  <CelestialBadge
                    type="habitable-zone"
                    href={buildTagGalaxyHref('HabitableCandidate')}
                    data-testid="details-planet-habitable-link"
                  />
                ) : null}
              </Cluster>
            }
          />
          {planetTelemetry.semiMajorAxisAu !== undefined ? (
            <Datum
              label="Semi-Major Axis (a)"
              value={planetTelemetry.semiMajorAxisAu}
              unit={
                <Unit>
                  <a
                    href={buildMetricGuideHref('semi-major-axis', id)}
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
              value={planetTelemetry.periodDays}
              unit={
                <Unit>
                  <a
                    href={buildMetricGuideHref('orbital-period', id)}
                    data-testid="details-metric-unit-link"
                  >
                    d
                  </a>
                </Unit>
              }
            />
          ) : null}
          {planetTelemetry.massMearth !== undefined ? (
            <Datum
              label="Mass"
              value={planetTelemetry.massMearth}
              unit={
                <Unit>
                  <a
                    href={buildMetricGuideHref('planetary-mass', id)}
                    data-testid="details-metric-unit-link"
                  >
                    M⊕
                  </a>
                </Unit>
              }
            />
          ) : null}
          {planetTelemetry.equilibriumTempK !== undefined ? (
            <Datum
              label="Equilibrium Temp"
              value={planetTelemetry.equilibriumTempK}
              unit={
                <Unit>
                  <a
                    href={buildMetricGuideHref('equilibrium-temperature', id)}
                    data-testid="details-metric-unit-link"
                  >
                    K
                  </a>
                </Unit>
              }
            />
          ) : null}
          <Datum label="Hazards" value={hazardSummaryNode} />
        </Stack>
      ) : null}
      {starTelemetry ? (
        <Stack gap="none" data-testid="details-focused-entity-peek">
          <Datum
            label="Component"
            value={`Component ${starTelemetry.componentDesignation}`}
          />
          <Datum
            label="Apparent Magnitude"
            value={starTelemetry.mag}
            unit={
              <Unit>
                <a
                  href={buildMetricGuideHref('stellar-magnitude', id)}
                  data-testid="details-metric-unit-link"
                >
                  V
                </a>
              </Unit>
            }
          />
          <Datum
            label="Absolute Magnitude"
            value={starTelemetry.absmag}
            unit={
              <Unit>
                <a
                  href={buildMetricGuideHref('stellar-magnitude', id)}
                  data-testid="details-metric-unit-link"
                >
                  M_V
                </a>
              </Unit>
            }
          />
          <Datum label="Hazards" value={hazardSummaryNode} />
        </Stack>
      ) : null}
      {minorBodyTelemetry ? (
        <Stack gap="none" data-testid="details-focused-entity-peek">
          <Datum
            label="Classification"
            value={<CelestialBadge type={minorBodyTelemetry.classification} showLabel />}
          />
          {minorBodyTelemetry.parentBodyName ? (
            <Datum
              label="Parent Body"
              value={minorBodyTelemetry.parentBodyName}
            />
          ) : null}
          <Datum label="Hazards" value={hazardSummaryNode} />
        </Stack>
      ) : null}
      {structureTelemetry ? (
        <Stack gap="none" data-testid="details-focused-entity-peek">
          <Datum
            label="Structure Type"
            value={
              <Cluster gap="tight" align="center">
                <CelestialBadge type={structureTelemetry.symbolType} />
                <Badge status="info">{structureTelemetry.structureType}</Badge>
              </Cluster>
            }
          />
        </Stack>
      ) : null}
      {diskTelemetry ? (
        <Stack gap="none" data-testid="details-focused-entity-peek">
          <Datum
            label="Classification"
            value={
              <CelestialBadge
                type={diskTelemetry.classification}
                href={buildMetricGuideHref('semi-major-axis', id)}
                data-testid="details-disk-classification-link"
              />
            }
          />
          <Datum
            label="Radial Span"
            value={`${diskTelemetry.innerRadiusAu}–${diskTelemetry.outerRadiusAu}`}
            unit={
              <Unit>
                <a
                  href={resolveAppHref(buildMetricGuideHref('semi-major-axis', id))}
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
              value={diskTelemetry.tempK}
              unit={
                <Unit>
                  <a
                    href={resolveAppHref(buildMetricGuideHref('equilibrium-temperature', id))}
                    data-testid="details-metric-unit-link"
                  >
                    K
                  </a>
                </Unit>
              }
            />
          ) : null}
          <Datum label="Hazards" value={hazardSummaryNode} />
        </Stack>
      ) : null}
      {isSystemFocus ? (
        <Stack gap="none">
          <Datum
            data-testid="details-planet-composition"
            label="Planets"
            value={
              <PlanetCensus
                planetCount={planetCount}
                breakdown={planetCompositionBreakdown}
                hasHabitableCandidate={hasHabitableCandidate}
                habitableHref={buildTagGalaxyHref('HabitableCandidate')}
                planetTypeHrefBuilder={buildPlanetTypeGuideHref}
                planetTypeTestId="details-summary-planet-type-link"
                habitableTestId="details-habitable-zone-link"
              />
            }
          />
          <Datum label="Hazards" value={hazardSummaryNode} />
        </Stack>
      ) : null}
      <p data-testid="details-system-summary">
        {renderSystemSummarySegments(systemSummarySegments)}
      </p>
    </>
  );
};
