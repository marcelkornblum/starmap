import type { ReactNode } from 'react';
import { Badge, type BadgeProps } from '../Badge/Badge';
import { buildStarTypeGuideHref } from '../../../../utils/url';
import { shouldDisplaySpectralBadge } from './spectralBadgeUtils';
import styles from './SpectralBadge.module.css';

export interface SpectralBadgeProps extends Omit<BadgeProps, 'category'> {
  readonly spectralType?: string;
  readonly interactive?: boolean;
  readonly fallback?: ReactNode;
  readonly 'data-testid'?: string;
}

export const SpectralBadge = ({
  spectralType,
  href,
  interactive = true,
  fallback = null,
  children,
  ...rest
}: SpectralBadgeProps) => {
  void styles;
  if (!shouldDisplaySpectralBadge(spectralType)) {
    return <>{fallback}</>;
  }

  const validSpectralType = spectralType as string;
  const resolvedHref = href ?? buildStarTypeGuideHref(validSpectralType);

  return (
    <Badge
      category="star"
      href={interactive ? resolvedHref : undefined}
      data-spectral-badge={validSpectralType}
      {...rest}
    >
      {children ?? validSpectralType}
    </Badge>
  );
};
