import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Badge.module.css';

export type BadgeStatus = 'nominal' | 'caution' | 'critical' | 'info' | 'neutral';
export type BadgeConfidence = 'confirmed' | 'candidate' | 'projected' | 'unverified';
export type BadgeCategory = 'star' | 'planet' | 'nebula' | 'constellation';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status?: BadgeStatus;
  confidence?: BadgeConfidence;
  category?: BadgeCategory;
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
