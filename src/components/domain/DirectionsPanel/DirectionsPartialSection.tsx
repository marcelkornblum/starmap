import React from 'react';
import type { JourneyPlan } from '../../../services/journeyService';
import {
  Badge,
  Button,
  CelestialSymbol,
  DataTable,
  Heading,
  Icon,
  Stack,
} from '../../interface';
import {
  renderDirectionsDatum,
  renderStructuredQuantity,
} from './directionsQuantityHelpers';
import styles from './DirectionsPanel.module.css';

export interface DirectionsPartialSectionProps {
  readonly journey: JourneyPlan;
  readonly isComingSoon: boolean;
  readonly isDetailMode: boolean;
  readonly selectedOption: JourneyPlan['selectedOption'] | null;
  readonly propOptionId: string | null;
  readonly onOptionSelect?: (optionId: string | null) => void;
  readonly onSelectOptionId: (optionId: string | null) => void;
}

export const DirectionsPartialSection: React.FC<DirectionsPartialSectionProps> = ({
  journey,
  isComingSoon,
  isDetailMode,
  selectedOption,
  onOptionSelect,
  onSelectOptionId,
}) => {
  if (isComingSoon) {
    return (
      <div data-testid="directions-coming-soon" className={styles.comingSoonSection}>
        <Heading as="h4" size="eyebrow">
          Directions coming soon
        </Heading>
        <p className={styles.comingSoonText}>{journey.statusReason}</p>
      </div>
    );
  }

  if (isDetailMode && selectedOption) {
    return (
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
          <Heading as="h4" size="eyebrow" id="directions-profile-heading">
            Flight Profile
          </Heading>
          <Stack gap="none" data-testid="directions-option-telemetry-list">
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
    );
  }

  return (
    <div className={styles.telemetrySection}>
      <Stack as="ul" gap="tight" data-testid="directions-options-list">
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
                onClick={(e) => {
                  if (onOptionSelect) {
                    e.preventDefault();
                    onOptionSelect(option.id);
                  }
                  onSelectOptionId(option.id);
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
      </Stack>

      <section
        aria-labelledby="directions-geometry-heading"
        className={styles.telemetrySection}
      >
        <Heading as="h4" size="eyebrow" id="directions-geometry-heading">
          Route Geometry
        </Heading>
        <DataTable data-testid="directions-geometry-list">
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
                    <Icon direction="right" size="sm" />
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
};
