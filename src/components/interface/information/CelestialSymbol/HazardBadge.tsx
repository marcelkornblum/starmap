import type { HTMLAttributes } from 'react';
import { Badge } from '../Badge/Badge';

export interface HazardBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  readonly code?: string;
  readonly label: string;
  readonly severity: 'warning' | 'critical' | 'caution';
  readonly href?: string;
  readonly 'data-testid'?: string;
}

export const HazardBadge = ({
  code,
  label,
  severity,
  href,
  'data-testid': dataTestId,
  children,
  ...rest
}: HazardBadgeProps) => {
  const status = severity === 'critical' ? 'critical' : 'caution';

  return (
    <Badge
      status={status}
      href={href}
      data-hazard-badge={code ?? 'summary'}
      data-testid={dataTestId}
      {...rest}
    >
      {children ?? label}
    </Badge>
  );
};
