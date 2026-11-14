import React from 'react';
import type { JourneyPlan } from '../../../services/journeyService';
import {
  Badge,
  Button,
  CelestialTitle,
  Cluster,
  Datum,
  Stack,
} from '../../interface';
import { renderStructuredQuantity } from './directionsQuantityHelpers';
import styles from './DirectionsPanel.module.css';

export interface DirectionsPeekSectionProps {
  readonly journey: JourneyPlan;
  readonly isComingSoon: boolean;
  readonly isDetailMode: boolean;
  readonly selectedOption: JourneyPlan['selectedOption'] | null;
  readonly propOptionId: string | null;
  readonly onOptionSelect?: (optionId: string | null) => void;
  readonly onSelectOptionId: (optionId: string | null) => void;
}

export const DirectionsPeekSection: React.FC<DirectionsPeekSectionProps> = ({
  journey,
  isComingSoon,
  isDetailMode,
  selectedOption,
  onOptionSelect,
  onSelectOptionId,
}) => {
  return (
    <div className={styles.peekMetadata}>
      <div className={styles.headerRow}>
        <CelestialTitle
          type="stellar-system"
          title={journey.title}
          as="strong"
          size="sm"
          showTooltip={false}
          titleTestId="directions-route-title"
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

      <Cluster gap="dense" data-testid="directions-actions">
        {isDetailMode ? (
          <Button
            href={journey.clearOptionHref}
            size="sm"
            variant="subtle"
            data-testid="directions-back-to-options"
            onClick={(e) => {
              if (onOptionSelect) {
                e.preventDefault();
                onOptionSelect(null);
              }
              onSelectOptionId(null);
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
        >
          Close
        </Button>
      </Cluster>
    </div>
  );
};
