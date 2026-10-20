import type { ReactNode } from 'react';
import { Badge, type BadgeProps } from '../Badge/Badge';
import { Tooltip } from '../../surfaces/Tooltip/Tooltip';
import {
  CelestialSymbol,
  CELESTIAL_SYMBOL_META,
  type CelestialSymbolType,
} from './CelestialSymbol';

export interface CelestialBadgeProps extends Omit<BadgeProps, 'category'> {
  readonly type: CelestialSymbolType;
  readonly interactive?: boolean;
  readonly showLabel?: boolean;
  readonly tooltipText?: ReactNode;
  readonly size?: 'sm' | 'md' | 'lg';
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
  children,
  ...rest
}: CelestialBadgeProps) => {
  const meta = CELESTIAL_SYMBOL_META[type] ?? {
    type,
    label: type,
  };

  const resolvedHref = href ?? (interactive ? meta.defaultGuideHref : undefined);
  const resolvedCategory = status ? undefined : meta.badgeCategory;
  const resolvedStatus = status ?? (meta.badgeCategory ? undefined : (meta.badgeStatus ?? 'neutral'));

  const badgeElement = (
    <Badge
      href={resolvedHref}
      category={resolvedCategory}
      status={resolvedStatus}
      data-celestial-badge={meta.type}
      aria-label={meta.label}
      {...rest}
    >
      <CelestialSymbol
        type={meta.type}
        size={size}
        showTooltip={false}
        showLabel={showLabel}
      />
      {children}
    </Badge>
  );

  return (
    <Tooltip text={tooltipText ?? meta.label}>
      {badgeElement}
    </Tooltip>
  );
};
