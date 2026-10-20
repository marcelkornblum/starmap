import type { ReactNode } from 'react';
import { Badge, type BadgeProps } from '../Badge/Badge';
import { buildStarTypeGuideHref } from '../../../../data/guideCatalog';

/**
 * Pure predicate determining whether a stellar spectral type badge should be displayed.
 * Returns false for undefined, blank strings, or placeholder 'Unknown'.
 */
export const shouldDisplaySpectralBadge = (spectralType?: string): boolean =>
  Boolean(spectralType && spectralType.trim().length > 0 && spectralType !== 'Unknown');

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
