import type { CelestialClassification } from '../../canvas/cartography/reticleGeometry';
import { buildStarTypeGuideHref } from '../../../services/searchService';
import {
  Badge,
  CelestialTitle,
  Cluster,
  Quantity,
  SpectralBadge,
} from '../../interface';

export interface DetailsIdentityHeaderProps {
  readonly name: string;
  readonly systemName: string;
  readonly reticleType: CelestialClassification;
  readonly focusedKind: string;
  readonly spectralType?: string;
  readonly starCount?: number;
}

export const DetailsIdentityHeader = ({
  name,
  systemName,
  reticleType,
  focusedKind,
  spectralType,
  starCount,
}: DetailsIdentityHeaderProps) => {
  const isSystemFocus = focusedKind === 'system';

  return (
    <Cluster gap="tight" align="center" data-testid="details-peek-header">
      <CelestialTitle
        type={reticleType}
        title={name}
        as="strong"
        titleTestId="details-peek-name"
        symbolTestId="details-reticle-type"
      />
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
    </Cluster>
  );
};
