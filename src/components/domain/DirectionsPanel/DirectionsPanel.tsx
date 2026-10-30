import React, { useState, type ReactNode } from 'react';
import type { JourneyPlan, StructuredQuantity } from '../../../services/journeyService';
import { DetentSheet, type DetentLevel } from '../../interface/surfaces/DetentSheet';
import {
  Badge,
  Button,
  CelestialSymbol,
  CelestialTitle,
  Cluster,
  DataTable,
  Datum,
  Heading,
  Quantity,
  Stack,
  Unit,
} from '../../interface';
import styles from './DirectionsPanel.module.css';

export interface DirectionsPanelProps {
  readonly journey: JourneyPlan | null;
  readonly activeDetent?: DetentLevel;
  readonly className?: string;
  readonly onOptionSelect?: (optionId: string | null) => void;
}

export function renderStructuredQuantity(
  q: StructuredQuantity | undefined | null,
  testId?: string,
): ReactNode {
  if (!q) return null;
  const unitText =
    q.secondaryValue !== undefined && q.secondaryUnit
      ? `${q.unit ? `${q.unit} ` : ''}(${q.secondaryValue} ${q.secondaryUnit})`.trim()
      : q.unit;

  return (
    <Quantity
      data-testid={testId}
      value={q.value}
      unit={unitText ? <Unit>{unitText}</Unit> : undefined}
    />
  );
}

function renderDirectionsDatum(
  label: string,
  quantityOrStr: StructuredQuantity | string | undefined | null,
  statTestId: string,
  legacyTestId?: string,
): ReactNode {
  if (!quantityOrStr) return null;
  if (typeof quantityOrStr === 'string') {
    return (
      <Datum
        label={label}
        value={quantityOrStr}
        valueTestId={statTestId}
        data-testid={legacyTestId}
      />
    );
  }
  const unitText =
    quantityOrStr.secondaryValue !== undefined && quantityOrStr.secondaryUnit
      ? `${quantityOrStr.unit ? `${quantityOrStr.unit} ` : ''}(${quantityOrStr.secondaryValue} ${quantityOrStr.secondaryUnit})`.trim()
      : quantityOrStr.unit;

  return (
    <Datum
      label={label}
      value={quantityOrStr.value}
      unit={unitText ? <Unit>{unitText}</Unit> : undefined}
      valueTestId={statTestId}
      data-testid={legacyTestId}
    />
  );
}

/**
 * Domain Component (`<DirectionsPanel>`):
 * Single-pane progressive disclosure directions sheet with dual operational modes:
 * 1. Options List Mode: Overview of available transit modes, total distances, comms lags, and geometry legs.
 * 2. Option Details Mode: Deep flight telemetry (proper ship time, coordinate time, gamma dilation, peak velocity, delta-v)
 *    and step-by-step waypoint breakdown.
 */
export const DirectionsPanel: React.FC<DirectionsPanelProps> = ({
  journey,
  activeDetent,
  className,
  onOptionSelect,
}) => {
  const propOptionId = journey?.selectedOption?.id ?? null;
  const [overrideOption, setOverrideOption] = useState<{
    readonly baseId: string | null;
    readonly optionId: string | null;
  } | null>(null);

  if (!journey) {
    return null;
  }

  const selectedOptionId =
    overrideOption && overrideOption.baseId === propOptionId
      ? overrideOption.optionId
      : propOptionId;

  const selectedOption = selectedOptionId
    ? (journey.options.find((o) => o.id === selectedOptionId) ??
      journey.selectedOption ??
      journey.options[0] ??
      null)
    : null;

  const isComingSoon = journey.status === 'coming-soon';
  const isDetailMode = !isComingSoon && selectedOption !== null;

  // --------------------------------------------------------------------------
  // Peek Detent
  // --------------------------------------------------------------------------
  const peekContent = (
    <div className={styles.peekMetadata}>
      <div className={styles.headerRow}>
        <CelestialTitle
          type="stellar-system"
          title={journey.title}
          as="strong"
          size="sm"
          showTooltip={false}
          titleTestId="directions-route-title"
          className={styles.routeTitle}
        />
        {isComingSoon ? (
          <Badge status="caution" role="alert" data-testid="directions-coming-soon">
            Coming soon
          </Badge>
        ) : isDetailMode && selectedOption ? (
          <Badge status="info">{selectedOption.methodBadge}</Badge>
        ) : null}
      </div>

      {isComingSoon ? (
        <p className={styles.comingSoonText}>{journey.statusReason}</p>
      ) : isDetailMode && selectedOption ? (
        <Stack gap="none">
          <Datum
            label="Option"
            valueTestId="directions-selected-option-title"
            value={selectedOption.title}
          />
          <Datum
            label="Transit Time"
            value={renderStructuredQuantity(
              selectedOption.topSummaryTime,
              'directions-selected-option-time',
            )}
          />
        </Stack>
      ) : (
        <Stack gap="none">
          <Datum
            label="Total Distance"
            value={renderStructuredQuantity(
              journey.totalDistance,
              'directions-total-distance',
            )}
          />
          <div data-testid="directions-comms-peek">
            <Datum
              label="One-Way Light Time"
              value={renderStructuredQuantity(journey.totalCommsOneWay)}
            />
            <Datum
              label="Round-Trip Comms Lag"
              value={renderStructuredQuantity(journey.totalCommsRoundTrip)}
            />
          </div>
        </Stack>
      )}

      <Cluster gap="dense" data-testid="directions-actions" className={styles.actions}>
        {isDetailMode ? (
          <Button
            href={journey.clearOptionHref}
            size="sm"
            variant="subtle"
            data-testid="directions-back-to-options"
            className={styles.actionButton}
            onClick={(e) => {
              if (onOptionSelect) {
                e.preventDefault();
                onOptionSelect(null);
              }
              setOverrideOption({ baseId: propOptionId, optionId: null });
            }}
          >
            Back to options
          </Button>
        ) : null}
        <Button
          href={journey.closeHref}
          size="sm"
          variant="default"
          data-testid="directions-close-button"
          className={styles.closeLink}
        >
          Close
        </Button>
      </Cluster>
    </div>
  );

  // --------------------------------------------------------------------------
  // Partial Detent
  // --------------------------------------------------------------------------
  const partialContent = isComingSoon ? (
    <div data-testid="directions-coming-soon" className={styles.comingSoonSection}>
      <Heading as="h4" size="eyebrow">
        Directions coming soon
      </Heading>
      <p className={styles.comingSoonText}>{journey.statusReason}</p>
    </div>
  ) : isDetailMode && selectedOption ? (
    <div className={styles.telemetrySection}>
      <p
        data-testid="directions-selected-option-summary"
        className={styles.selectedOptionSummary}
      >
        {selectedOption.shortDescription}
      </p>

      <section
        data-testid="directions-option-profile"
        aria-labelledby="directions-profile-heading"
        className={styles.telemetrySection}
      >
        <Heading
          as="h4"
          size="eyebrow"
          id="directions-profile-heading"
          className={styles.telemetryHeading}
        >
          Flight Profile
        </Heading>
        <Stack
          gap="none"
          data-testid="directions-option-telemetry-list"
          className={styles.telemetryList}
        >
          {renderDirectionsDatum(
            'Ship Time (Proper)',
            selectedOption.stats.shipTime,
            'directions-stat-ship-time',
            'directions-option-ship-time',
          )}
          {renderDirectionsDatum(
            'Coordinate Time',
            selectedOption.stats.coordinateTime,
            'directions-stat-coord-time',
            'directions-option-coord-time',
          )}
          {renderDirectionsDatum(
            'Peak Velocity',
            selectedOption.stats.peakVelocity,
            'directions-stat-peak-velocity',
            'directions-option-peak-velocity',
          )}
          {renderDirectionsDatum(
            'Time Dilation (γ)',
            selectedOption.stats.lorentzFactor,
            'directions-stat-lorentz-gamma',
            'directions-option-gamma',
          )}
          {renderDirectionsDatum(
            'Turnaround Point',
            selectedOption.stats.turnaroundPoint,
            'directions-stat-turnaround',
            'directions-option-turnaround',
          )}
          {renderDirectionsDatum(
            'Delta-V',
            selectedOption.stats.deltaV,
            'directions-stat-delta-v',
            'directions-option-deltav',
          )}
          {renderDirectionsDatum(
            'Synodic Period',
            selectedOption.stats.synodicPeriod,
            'directions-stat-synodic-period',
            'directions-option-synodic',
          )}
          {renderDirectionsDatum(
            'Propulsion',
            selectedOption.stats.propulsionProfile,
            'directions-stat-propulsion',
            'directions-option-propulsion',
          )}
        </Stack>
      </section>
    </div>
  ) : (
    <div className={styles.telemetrySection}>
      <ul data-testid="directions-options-list" className={styles.optionsList}>
        {journey.options.map((option) => (
          <li
            key={option.id}
            data-testid="directions-option-item"
            data-option-id={option.id}
            className={styles.optionItem}
          >
            <div className={styles.optionHeader}>
              <Badge status="info">{option.methodBadge}</Badge>
              <Button
                href={option.selectHref}
                size="sm"
                variant="subtle"
                data-testid="directions-option-select"
                className={styles.optionSelectLink}
                onClick={(e) => {
                  if (onOptionSelect) {
                    e.preventDefault();
                    onOptionSelect(option.id);
                  }
                  setOverrideOption({ baseId: propOptionId, optionId: option.id });
                }}
              >
                {option.title}
              </Button>
              <span
                data-testid="directions-option-time"
                className={styles.optionTime}
              >
                {renderStructuredQuantity(option.topSummaryTime)}
              </span>
            </div>
            <p
              data-testid="directions-option-summary"
              className={styles.optionSummary}
            >
              {option.shortDescription}
            </p>
          </li>
        ))}
      </ul>

      <section
        aria-labelledby="directions-geometry-heading"
        className={styles.telemetrySection}
      >
        <Heading
          as="h4"
          size="eyebrow"
          id="directions-geometry-heading"
          className={styles.telemetryHeading}
        >
          Route Geometry
        </Heading>
        <DataTable
          data-testid="directions-geometry-list"
          className={styles.geometryList}
        >
          <DataTable.Head>
            <DataTable.Row>
              <DataTable.HeaderCell>Leg</DataTable.HeaderCell>
              <DataTable.HeaderCell align="end">Distance</DataTable.HeaderCell>
              <DataTable.HeaderCell>Geometry</DataTable.HeaderCell>
            </DataTable.Row>
          </DataTable.Head>
          <DataTable.Body>
            {journey.steps.map((step) => (
              <DataTable.Row key={step.id} data-testid="directions-geometry-leg">
                <DataTable.Cell>
                  <span className={styles.legEndpoints}>
                    <CelestialSymbol type="stellar-system" size="sm" showTooltip={false} />
                    {step.from.name}
                    {' → '}
                    <CelestialSymbol type="stellar-system" size="sm" showTooltip={false} />
                    {step.to.name}
                  </span>
                </DataTable.Cell>
                <DataTable.Cell numeric>
                  {renderStructuredQuantity(step.primaryDistance)}
                </DataTable.Cell>
                <DataTable.Cell>{step.secondaryGeometryLabel}</DataTable.Cell>
              </DataTable.Row>
            ))}
          </DataTable.Body>
        </DataTable>
      </section>
    </div>
  );

  // --------------------------------------------------------------------------
  // Full Detent
  // --------------------------------------------------------------------------
  const fullContent = isComingSoon ? (
    <div data-testid="directions-coming-soon" className={styles.comingSoonSection}>
      <p className={styles.comingSoonText}>{journey.statusReason}</p>
    </div>
  ) : isDetailMode && selectedOption ? (
    <section
      aria-labelledby="directions-flight-steps-heading"
      className={styles.telemetrySection}
    >
      <Heading
        as="h4"
        size="eyebrow"
        id="directions-flight-steps-heading"
        className={styles.telemetryHeading}
      >
        Transit Steps & Timings
      </Heading>
      <ol data-testid="directions-steps-list" className={styles.stepsList}>
        {selectedOption.stepMetrics.map((stepMetric) => (
          <li
            key={stepMetric.stepId}
            data-testid="directions-step-item"
            className={styles.stepItem}
          >
            <Heading as="h5" size="eyebrow" className={styles.stepHeading}>
              {`${stepMetric.fromName} → ${stepMetric.toName}`}
            </Heading>
            <Stack
              gap="none"
              data-testid="directions-step-metrics-list"
              className={styles.stepMetricsList}
            >
              {renderDirectionsDatum(
                'Distance',
                stepMetric.distance,
                'directions-stat-distance',
              )}
              {renderDirectionsDatum(
                'Ship Time',
                stepMetric.shipTime,
                'directions-stat-ship-time',
              )}
              {renderDirectionsDatum(
                'Coordinate Time',
                stepMetric.coordinateTime,
                'directions-stat-coord-time',
              )}
              {renderDirectionsDatum(
                'One-Way Comms',
                stepMetric.oneWayComms,
                'directions-stat-comms-one-way',
              )}
            </Stack>
          </li>
        ))}
      </ol>
    </section>
  ) : (
    <section
      aria-labelledby="directions-all-steps-heading"
      className={styles.telemetrySection}
    >
      <Heading
        as="h4"
        size="eyebrow"
        id="directions-all-steps-heading"
        className={styles.telemetryHeading}
      >
        Step Details
      </Heading>
      <ol data-testid="directions-steps-list" className={styles.stepsList}>
        {journey.steps.map((step) => (
          <li
            key={step.id}
            data-testid="directions-step-item"
            className={styles.stepItem}
          >
            <Heading as="h5" size="eyebrow" className={styles.stepHeading}>
              <span className={styles.legEndpoints}>
                <CelestialSymbol type="stellar-system" size="sm" showTooltip={false} />
                {step.from.name}
                {' → '}
                <CelestialSymbol type="stellar-system" size="sm" showTooltip={false} />
                {step.to.name}
              </span>
            </Heading>
            <Stack
              gap="none"
              data-testid="directions-step-metrics-list"
              className={styles.stepMetricsList}
            >
              {renderDirectionsDatum(
                'Distance',
                step.primaryDistance,
                'directions-stat-distance',
              )}
              {renderDirectionsDatum(
                'Geometry',
                step.secondaryGeometryLabel,
                'directions-stat-geometry',
              )}
              {renderDirectionsDatum(
                'One-Way Comms',
                step.oneWayLightTime,
                'directions-stat-comms-one-way',
              )}
              {renderDirectionsDatum(
                'Round-Trip Comms',
                step.roundTripLightTime,
                'directions-stat-comms-round-trip',
              )}
            </Stack>
          </li>
        ))}
      </ol>
    </section>
  );

  return (
    <DetentSheet
      testIdPrefix="directions"
      heading="Directions"
      headingId="directions-panel-heading"
      activeDetent={activeDetent}
      className={className}
      peek={peekContent}
      partial={partialContent}
      full={fullContent}
    />
  );
};
