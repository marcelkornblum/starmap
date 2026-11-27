import { memo, type ReactNode } from 'react';
import type { CelestialClassification } from '../../../types/spatial';
import type { SystemSummarySegment } from '../../../services/details/detailsEntityTypes';
import { buildStarTypeGuideHref } from '../../../content/guide';
import { buildTagGalaxyHref } from '../../../services/search/searchUrls';
import {
  Badge,
  Block,
  CelestialBadge,
  CelestialTitle,
  Cluster,
  DetentSheetMidStage,
  Quantity,
  SpectralBadge,
  Stack,
} from '../../interface';
import { renderSystemSummarySegments } from './systemSummarySegments';
import styles from './DetailsIdentityHeader.module.css';

export interface DetailsIdentityHeaderProps {
  readonly name: string;
  readonly systemName: string;
  readonly reticleType: CelestialClassification;
  readonly focusedKind: string;
  readonly spectralType?: string;
  readonly starCount?: number;
  readonly isHabitableCandidate?: boolean;
  readonly systemSummarySegments?: readonly SystemSummarySegment[];
  readonly preview?: ReactNode;
  readonly actionControls?: ReactNode;
}

export const DetailsIdentityHeader = memo(function DetailsIdentityHeader({
  name,
  systemName,
  reticleType,
  focusedKind,
  spectralType,
  starCount,
  isHabitableCandidate,
  systemSummarySegments,
  preview,
  actionControls,
}: DetailsIdentityHeaderProps) {
  const isSystemFocus = focusedKind === 'system';
  const hasMidStage = systemSummarySegments !== undefined || Boolean(preview);

  return (
    <Block padding="loose" data-testid="details-peek-header">
      <Stack gap="fib-3">
        <Cluster gap="tight" align="center" data-overview-title-row="true">
          <span className={styles.entityTitle}>
            <CelestialTitle
              type={reticleType}
              title={name}
              as="strong"
              size="md"
              titleTestId="details-peek-name"
              symbolTestId="details-reticle-type"
            />
          </span>
          {name !== systemName ? (
            <Badge status="neutral" data-testid="details-peek-system-name">
              {systemName}
            </Badge>
          ) : null}
          {(isSystemFocus || focusedKind === 'star') && spectralType ? (
            <SpectralBadge
              spectralType={spectralType}
              href={buildStarTypeGuideHref(spectralType)}
              data-testid="details-spectral-badge"
            />
          ) : null}
          {isSystemFocus ? (
            <Quantity
              data-testid="details-star-count"
              value={starCount}
              unit={starCount === 1 ? 'star' : 'stars'}
            />
          ) : null}
          {isHabitableCandidate ? (
            <CelestialBadge
              type="habitable-zone"
              href={buildTagGalaxyHref('HabitableCandidate')}
              showLabel
              data-testid="details-planet-habitable-link"
            />
          ) : null}
        </Cluster>
        {hasMidStage ? (
          <DetentSheetMidStage testId="details-overview-mid-stage">
            <Stack gap="fib-3">
              {systemSummarySegments !== undefined ? (
                <p className={styles.summaryText} data-testid="details-system-summary">
                  {renderSystemSummarySegments(systemSummarySegments)}
                </p>
              ) : null}
              {preview}
            </Stack>
          </DetentSheetMidStage>
        ) : null}
        {actionControls ? (
          <div className={styles.actionsSlot}>{actionControls}</div>
        ) : null}
      </Stack>
    </Block>
  );
});

DetailsIdentityHeader.displayName = 'DetailsIdentityHeader';
