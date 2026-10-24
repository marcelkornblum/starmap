import type { HTMLAttributes, ReactNode } from 'react';
import type { BadgeCategory, BadgeStatus } from '../Badge/Badge';
import {
  CelestialSymbol,
  CELESTIAL_SYMBOL_META,
  type CelestialSymbolType,
} from './CelestialSymbol';

export interface CelestialBadgeProps extends HTMLAttributes<HTMLElement> {
  readonly type: CelestialSymbolType;
  readonly href?: string;
  readonly target?: string;
  readonly rel?: string;
  readonly interactive?: boolean;
  readonly showLabel?: boolean;
  readonly tooltipText?: ReactNode;
  readonly size?: 'sm' | 'md' | 'lg';
  readonly status?: BadgeStatus;
  readonly category?: BadgeCategory;
  readonly children?: ReactNode;
  readonly 'data-testid'?: string;
}

export const CelestialBadge = ({
  type,
  href,
  interactive,
  showLabel = false,
  tooltipText,
  size = 'sm',
  status,
  category,
  children,
  ...rest
}: CelestialBadgeProps) => {
  const meta = CELESTIAL_SYMBOL_META[type] ?? {
    type,
    label: type,
  };

  const resolvedHref = href ?? (interactive ? meta.defaultGuideHref : undefined);
  const resolvedCategory = category ?? (status ? undefined : meta.badgeCategory);
  const resolvedStatus = status ?? (resolvedCategory ? undefined : (meta.badgeStatus ?? 'neutral'));

  return (
    <CelestialSymbol
      type={meta.type}
      size={size}
      href={resolvedHref}
      showLabel={showLabel}
      showTooltip={true}
      tooltipText={tooltipText ?? meta.label}
      category={resolvedCategory}
      status={resolvedStatus}
      data-celestial-badge={meta.type}
      data-category={resolvedCategory}
      data-status={resolvedStatus}
      aria-label={meta.label}
      {...rest}
    >
      {children}
    </CelestialSymbol>
  );
};
