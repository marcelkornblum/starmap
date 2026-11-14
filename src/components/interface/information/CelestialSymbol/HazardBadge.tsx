import type { HTMLAttributes } from 'react';
import { Badge } from '../Badge/Badge';
import styles from './HazardBadge.module.css';

export interface HazardBadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'className' | 'style'> {
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
  void styles;
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
