import React, { useState } from 'react';
import type { JourneyPlan } from '../../../services/journeyService';
import { DetentSheet, type DetentLevel } from '../../interface/surfaces/DetentSheet';
import { DirectionsPeekSection } from './DirectionsPeekSection';
import { DirectionsPartialSection } from './DirectionsPartialSection';
import { DirectionsFullSection } from './DirectionsFullSection';

export interface DirectionsPanelProps {
  readonly journey: JourneyPlan | null;
  readonly activeDetent?: DetentLevel;
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

  const effectiveOptionId = propOptionId ?? journey.selectedOption?.id;

  const selectedOptionId =
    overrideOption && overrideOption.baseId === effectiveOptionId
      ? overrideOption.optionId
      : effectiveOptionId;

  const selectedOption = selectedOptionId
    ? (journey.options.find((o) => o.id === selectedOptionId) ??
      journey.selectedOption ??
      journey.options[0] ??
      null)
    : (journey.selectedOption ?? null);

  const isComingSoon = journey.status === 'coming-soon';
  const isDetailMode = !isComingSoon && selectedOption !== null;

  const handleSelectOptionId = (optionId: string | null): void => {
    setOverrideOption({ baseId: propOptionId, optionId });
  };

  return (
    <DetentSheet
      testIdPrefix="directions"
      heading="Directions"
      headingId="directions-panel-heading"
      activeDetent={activeDetent}
      peek={
        <DirectionsPeekSection
          journey={journey}
          isComingSoon={isComingSoon}
          isDetailMode={isDetailMode}
          selectedOption={selectedOption}
          propOptionId={propOptionId}
          onOptionSelect={onOptionSelect}
          onSelectOptionId={handleSelectOptionId}
        />
      }
      partial={
        <DirectionsPartialSection
          journey={journey}
          isComingSoon={isComingSoon}
          isDetailMode={isDetailMode}
          selectedOption={selectedOption}
          propOptionId={propOptionId}
          onOptionSelect={onOptionSelect}
          onSelectOptionId={handleSelectOptionId}
        />
      }
      full={
        <DirectionsFullSection
          journey={journey}
          isComingSoon={isComingSoon}
          isDetailMode={isDetailMode}
          selectedOption={selectedOption}
        />
      }
    />
  );
};
