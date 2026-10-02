import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Badge.module.css';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status?: 'nominal' | 'caution' | 'critical' | 'info';
  confidence?: 'confirmed' | 'candidate' | 'projected' | 'unverified';
  category?: 'star' | 'planet' | 'nebula' | 'constellation';
  children?: ReactNode;
}

export const Badge = ({
  status,
  confidence,
  category,
  children,
  className,
  ...rest
}: BadgeProps) => {
  const combinedClassName = className
    ? `${styles.badge} ${className}`
    : styles.badge;

  return (
    <span
      className={combinedClassName}
      data-status={status}
      data-confidence={confidence}
      data-category={category}
      {...rest}
    >
      {children}
    </span>
  );
};
