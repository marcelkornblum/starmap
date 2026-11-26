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
  actionControls,
}: DetailsIdentityHeaderProps) {
  const isSystemFocus = focusedKind === 'system';
  const hasHeroBody = systemSummarySegments !== undefined || Boolean(actionControls);

  return (
    <Block padding="loose" data-testid="details-peek-header">
      <Stack gap="fib-3">
        <Cluster gap="tight" align="center">
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
            <Cluster as="span" gap="tight" align="center" data-hero-extra="true">
              <CelestialBadge
                type="habitable-zone"
                href={buildTagGalaxyHref('HabitableCandidate')}
                showLabel
                data-testid="details-planet-habitable-link"
              />
            </Cluster>
          ) : null}
        </Cluster>
        {hasHeroBody ? (
          <Stack gap="fib-3" data-hero-body="true">
            {systemSummarySegments !== undefined ? (
              <p className={styles.summaryText} data-testid="details-system-summary">
                {renderSystemSummarySegments(systemSummarySegments)}
              </p>
            ) : null}
            {actionControls}
          </Stack>
        ) : null}
      </Stack>
    </Block>
  );
});

DetailsIdentityHeader.displayName = 'DetailsIdentityHeader';
