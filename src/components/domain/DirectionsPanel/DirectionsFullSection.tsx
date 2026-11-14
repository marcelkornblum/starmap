import React from 'react';
import type { JourneyPlan } from '../../../services/journeyService';
import {
  CelestialSymbol,
  Heading,
  Icon,
  Stack,
} from '../../interface';
import {
  renderDirectionsDatum,
} from './directionsQuantityHelpers';
import styles from './DirectionsPanel.module.css';

export interface DirectionsFullSectionProps {
  readonly journey: JourneyPlan;
  readonly isComingSoon: boolean;
  readonly isDetailMode: boolean;
  readonly selectedOption: JourneyPlan['selectedOption'] | null;
}

export const DirectionsFullSection: React.FC<DirectionsFullSectionProps> = ({
  journey,
  isComingSoon,
  isDetailMode,
  selectedOption,
}) => {
  if (isComingSoon) {
    return (
      <div data-testid="directions-coming-soon" className={styles.comingSoonSection}>
        <p className={styles.comingSoonText}>{journey.statusReason}</p>
      </div>
    );
  }

  if (isDetailMode && selectedOption) {
    return (
      <section
        aria-labelledby="directions-flight-steps-heading"
        className={styles.telemetrySection}
      >
        <Heading
          as="h4"
          size="eyebrow"
          id="directions-flight-steps-heading"
        >
          Transit Steps & Timings
        </Heading>
        <Stack as="ol" gap="tight" data-testid="directions-steps-list">
          {selectedOption.stepMetrics.map((stepMetric) => (
            <li
              key={stepMetric.stepId}
              data-testid="directions-step-item"
              className={styles.stepItem}
            >
              <Heading as="h5" size="eyebrow">
                <span className={styles.legEndpoints}>
                  {stepMetric.fromName}
                  <Icon direction="right" size="sm" />
                  {stepMetric.toName}
                </span>
              </Heading>
              <Stack
                gap="none"
                data-testid="directions-step-metrics-list"
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
        </Stack>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="directions-all-steps-heading"
      className={styles.telemetrySection}
    >
      <Heading
        as="h4"
        size="eyebrow"
        id="directions-all-steps-heading"
      >
        Step Details
      </Heading>
      <Stack as="ol" gap="tight" data-testid="directions-steps-list">
        {journey.steps.map((step) => (
          <li
            key={step.id}
            data-testid="directions-step-item"
            className={styles.stepItem}
          >
            <Heading as="h5" size="eyebrow">
              <span className={styles.legEndpoints}>
                <CelestialSymbol type="stellar-system" size="sm" showTooltip={false} />
                {step.from.name}
                <Icon direction="right" size="sm" />
                <CelestialSymbol type="stellar-system" size="sm" showTooltip={false} />
                {step.to.name}
              </span>
            </Heading>
            <Stack
              gap="none"
              data-testid="directions-step-metrics-list"
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
      </Stack>
    </section>
  );
};
