import { Fragment, type ReactNode } from 'react';
import type {
  EntityHazardItem,
  SystemSummarySegment,
} from '../../../services/detailsService';
import {
  buildPlanetTypeGuideHref,
  buildStarTypeGuideHref,
  buildTagGalaxyHref,
} from '../../../services/searchService';
import {
  buildHazardGuideHref,
  HAZARDS_GUIDE_PATH,
} from '../../../services/guideService';
import {
  CelestialBadge,
  HazardBadge,
  Quantity,
  SpectralBadge,
  Unit,
} from '../../interface';

export interface HazardSummaryProps {
  readonly hazardCount: number;
  readonly hazards: readonly EntityHazardItem[];
  readonly hazardSummaryLabel?: string;
}

export const HazardSummary = ({
  hazardCount,
  hazards,
  hazardSummaryLabel = `${hazardCount} ${hazardCount === 1 ? 'hazard' : 'hazards'}`,
}: HazardSummaryProps) => {
  const hazardBadgeStatus: 'critical' | 'caution' | 'nominal' =
    hazardCount > 0
      ? hazards.some((h) => h.severity === 'critical')
        ? 'critical'
        : 'caution'
      : 'nominal';

  if (hazardCount === 0) {
    return (
      <span data-testid="details-hazard-summary">
        <Quantity
          value={0}
          unit={
            <Unit>
              <a
                href={HAZARDS_GUIDE_PATH}
                data-testid="details-hazard-summary-link"
              >
                hazards
              </a>
            </Unit>
          }
        />
      </span>
    );
  }

  return (
    <span data-testid="details-hazard-summary">
      <HazardBadge
        label={hazardSummaryLabel}
        severity={hazardBadgeStatus === 'critical' ? 'critical' : 'caution'}
        href={
          hazards.length === 1
            ? buildHazardGuideHref(hazards[0]?.code)
            : HAZARDS_GUIDE_PATH
        }
        data-testid="details-hazard-summary-link"
      />
    </span>
  );
};

export const renderSystemSummarySegments = (
  segments: readonly SystemSummarySegment[],
): ReactNode =>
  segments.map((seg, idx) => {
    if (seg.kind === 'spectral-badge') {
      return (
        <SpectralBadge
          key={idx}
          spectralType={seg.spectralType}
          href={buildStarTypeGuideHref(seg.spectralType)}
          fallback={seg.spectralType}
          data-testid="details-summary-spectral-link"
        />
      );
    }
    if (seg.kind === 'planet-type-badge') {
      return (
        <CelestialBadge
          key={idx}
          type={seg.composition}
          href={buildPlanetTypeGuideHref(seg.composition)}
          data-testid="details-summary-planet-type-link"
        />
      );
    }
    if (seg.kind === 'habitable-badge') {
      return (
        <CelestialBadge
          key={idx}
          type="habitable-zone"
          href={buildTagGalaxyHref('HabitableCandidate')}
          data-testid="details-summary-habitable-link"
        />
      );
    }
    return <Fragment key={idx}>{seg.text}</Fragment>;
  });
