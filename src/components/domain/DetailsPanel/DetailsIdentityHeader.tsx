import { memo, type ReactNode } from 'react';
import type { CelestialClassification } from '../../../types/spatial';
import type {
  PlanetCompositionClass,
  SystemSummarySegment,
} from '../../../services/details/detailsEntityTypes';
import {
  buildPlanetTypeGuideHref,
  buildStarTypeGuideHref,
} from '../../../content/guide';
import { buildTagGalaxyHref } from '../../../services/search/searchUrls';
import {
  Badge,
  Block,
  CelestialBadge,
  CelestialTitle,
  Cluster,
  Quantity,
  SpectralBadge,
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
  readonly planetComposition?: PlanetCompositionClass;
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
  planetComposition,
  isHabitableCandidate,
  systemSummarySegments,
  actionControls,
}: DetailsIdentityHeaderProps) {
  const isSystemFocus = focusedKind === 'system';
  const hasHeroBody = systemSummarySegments !== undefined || Boolean(actionControls);

  return (
    <Block padding="loose" data-testid="details-peek-header">
      <div className={styles.heroStack}>
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
          {planetComposition ? (
            <span className={styles.heroExtraBadges} data-hero-extra="true">
              <CelestialBadge
                type={planetComposition}
                href={buildPlanetTypeGuideHref(planetComposition)}
                showLabel
                data-testid="details-planet-type-link"
              />
              {isHabitableCandidate ? (
                <CelestialBadge
                  type="habitable-zone"
                  href={buildTagGalaxyHref('HabitableCandidate')}
                  showLabel
                  data-testid="details-planet-habitable-link"
                />
              ) : null}
            </span>
          ) : null}
        </Cluster>
        {hasHeroBody ? (
          <div className={styles.heroBody} data-hero-body="true">
            {systemSummarySegments !== undefined ? (
              <p className={styles.summaryText} data-testid="details-system-summary">
                {renderSystemSummarySegments(systemSummarySegments)}
              </p>
            ) : null}
            {actionControls}
          </div>
        ) : null}
      </div>
    </Block>
  );
});

DetailsIdentityHeader.displayName = 'DetailsIdentityHeader';
