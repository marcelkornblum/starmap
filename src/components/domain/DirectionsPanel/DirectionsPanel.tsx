import React, { useState } from 'react';
import type { JourneyPlan } from '../../../services/journeyService';
import { DetentSheet, type DetentLevel } from '../../interface/surfaces/DetentSheet';
import { Badge } from '../../interface/information';
import styles from './DirectionsPanel.module.css';

export interface DirectionsPanelProps {
  readonly journey: JourneyPlan | null;
  readonly activeDetent?: DetentLevel;
  readonly className?: string;
  readonly onOptionSelect?: (optionId: string | null) => void;
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
        <strong data-testid="directions-route-title" className={styles.routeTitle}>
          {journey.title}
        </strong>
        {isComingSoon ? (
          <span data-testid="directions-coming-soon" className={styles.comingSoonBadge}>
            Coming soon
          </span>
        ) : isDetailMode && selectedOption ? (
          <Badge status="info">{selectedOption.methodBadge}</Badge>
        ) : null}
      </div>

      {isComingSoon ? (
        <p className={styles.comingSoonText}>{journey.statusReason}</p>
      ) : isDetailMode && selectedOption ? (
        <div>
          <span
            data-testid="directions-selected-option-title"
            className={styles.optionSelectLink}
          >
            {selectedOption.title}
          </span>
          {' · '}
          <span data-testid="directions-selected-option-time">
            {selectedOption.topSummaryTime}
          </span>
        </div>
      ) : (
        <div>
          <span data-testid="directions-total-distance">
            {journey.totalDistanceLabel}
          </span>
          {' · '}
          <span data-testid="directions-comms-peek">
            {`One-way light time: ${journey.totalCommsOneWayLabel} · Round-trip comms lag: ${journey.totalCommsRoundTripLabel}`}
          </span>
        </div>
      )}

      <div data-testid="directions-actions" className={styles.actions}>
        {isDetailMode ? (
          <a
            href={journey.clearOptionHref}
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
          </a>
        ) : null}
        <a
          href={journey.closeHref}
          data-testid="directions-close-button"
          className={styles.closeLink}
        >
          Close
        </a>
      </div>
    </div>
  );

  // --------------------------------------------------------------------------
  // Partial Detent
  // --------------------------------------------------------------------------
  const partialContent = isComingSoon ? (
    <div data-testid="directions-coming-soon" className={styles.comingSoonSection}>
      <h4>Directions coming soon</h4>
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
        <h4 id="directions-profile-heading" className={styles.telemetryHeading}>
          Flight Profile
        </h4>
        <dl
          data-testid="directions-option-telemetry-list"
          className={styles.telemetryList}
        >
          <dt>Ship Time (Proper)</dt>
          <dd data-testid="directions-option-ship-time">
            {selectedOption.stats.shipTimeLabel}
          </dd>
          <dt>Coordinate Time</dt>
          <dd data-testid="directions-option-coord-time">
            {selectedOption.stats.coordinateTimeLabel}
          </dd>
          <dt>Peak Velocity</dt>
          <dd data-testid="directions-option-peak-velocity">
            {selectedOption.stats.peakVelocityLabel}
          </dd>
          {selectedOption.stats.lorentzFactorLabel ? (
            <>
              <dt>Time Dilation (γ)</dt>
              <dd data-testid="directions-option-gamma">
                {selectedOption.stats.lorentzFactorLabel}
              </dd>
            </>
          ) : null}
          {selectedOption.stats.turnaroundPointLabel ? (
            <>
              <dt>Turnaround Point</dt>
              <dd data-testid="directions-option-turnaround">
                {selectedOption.stats.turnaroundPointLabel}
              </dd>
            </>
          ) : null}
          {selectedOption.stats.deltaVLabel ? (
            <>
              <dt>Delta-V</dt>
              <dd data-testid="directions-option-deltav">
                {selectedOption.stats.deltaVLabel}
              </dd>
            </>
          ) : null}
          {selectedOption.stats.synodicPeriodLabel ? (
            <>
              <dt>Synodic Period</dt>
              <dd data-testid="directions-option-synodic">
                {selectedOption.stats.synodicPeriodLabel}
              </dd>
            </>
          ) : null}
          <dt>Propulsion</dt>
          <dd data-testid="directions-option-propulsion">
            {selectedOption.stats.propulsionProfile}
          </dd>
        </dl>
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
              <a
                href={option.selectHref}
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
              </a>
              <span
                data-testid="directions-option-time"
                className={styles.optionTime}
              >
                {option.topSummaryTime}
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
        <h4 id="directions-geometry-heading" className={styles.telemetryHeading}>
          Route Geometry
        </h4>
        <ol
          data-testid="directions-geometry-list"
          className={styles.geometryList}
        >
          {journey.steps.map((step) => (
            <li
              key={step.id}
              data-testid="directions-geometry-leg"
              className={styles.geometryItem}
            >
              <span>{`${step.from.name} → ${step.to.name}`}</span>
              <span>{`${step.primaryDistanceLabel} (${step.secondaryGeometryLabel})`}</span>
            </li>
          ))}
        </ol>
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
      <h4 id="directions-flight-steps-heading" className={styles.telemetryHeading}>
        Transit Steps & Timings
      </h4>
      <ol data-testid="directions-steps-list" className={styles.stepsList}>
        {selectedOption.stepMetrics.map((stepMetric) => (
          <li
            key={stepMetric.stepId}
            data-testid="directions-step-item"
            className={styles.stepItem}
          >
            <h5 className={styles.stepHeading}>
              {`${stepMetric.fromName} → ${stepMetric.toName}`}
            </h5>
            <dl
              data-testid="directions-step-metrics-list"
              className={styles.stepMetricsList}
            >
              <dt>Distance</dt>
              <dd>{stepMetric.distanceLabel}</dd>
              <dt>Ship Time</dt>
              <dd>{stepMetric.shipTimeLabel}</dd>
              <dt>Coordinate Time</dt>
              <dd>{stepMetric.coordinateTimeLabel}</dd>
              <dt>One-Way Comms</dt>
              <dd>{stepMetric.oneWayCommsLabel}</dd>
            </dl>
          </li>
        ))}
      </ol>
    </section>
  ) : (
    <section
      aria-labelledby="directions-all-steps-heading"
      className={styles.telemetrySection}
    >
      <h4 id="directions-all-steps-heading" className={styles.telemetryHeading}>
        Step Details
      </h4>
      <ol data-testid="directions-steps-list" className={styles.stepsList}>
        {journey.steps.map((step) => (
          <li
            key={step.id}
            data-testid="directions-step-item"
            className={styles.stepItem}
          >
            <h5 className={styles.stepHeading}>
              {`${step.from.name} → ${step.to.name}`}
            </h5>
            <dl
              data-testid="directions-step-metrics-list"
              className={styles.stepMetricsList}
            >
              <dt>Distance</dt>
              <dd>{step.primaryDistanceLabel}</dd>
              <dt>Geometry</dt>
              <dd>{step.secondaryGeometryLabel}</dd>
              <dt>One-Way Comms</dt>
              <dd>{step.oneWayLightTimeLabel}</dd>
              <dt>Round-Trip Comms</dt>
              <dd>{step.roundTripLightTimeLabel}</dd>
            </dl>
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
