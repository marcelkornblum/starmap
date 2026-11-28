import React from 'react';
import type { JourneyPlan } from '../../../services/journey/journeyTypes';
import {
  Badge,
  Button,
  CelestialTitle,
  Cluster,
  Datum,
  Icon,
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
        <Cluster gap="tight" align="center">
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
        </Cluster>
        <Button
          href={journey.closeHref}
          size="sm"
          variant="subtle"
          aria-label="Close directions"
          data-testid="directions-close-button"
        >
          <Icon size="sm">
            <svg
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <path d="M3 3L9 9M9 3L3 9" />
            </svg>
          </Icon>
        </Button>
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

      {isDetailMode ? (
        <Cluster gap="dense" data-testid="directions-actions">
          <Button
            href={journey.clearOptionHref}
            size="sm"
            variant="default"
            data-testid="directions-back-to-options"
            onClick={(e) => {
              if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
                return;
              }
              if (onOptionSelect) {
                e.preventDefault();
                onOptionSelect(null);
              }
              onSelectOptionId(null);
            }}
          >
            Back to options
          </Button>
        </Cluster>
      ) : null}
    </div>
  );
};
