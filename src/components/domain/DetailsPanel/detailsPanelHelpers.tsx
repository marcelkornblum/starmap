import type { EntityHazardItem } from '../../../services/detailsService';
import {
  buildHazardGuideHref,
  HAZARDS_GUIDE_PATH,
} from '../../../services/guideService';
import {
  HazardBadge,
  Quantity,
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
