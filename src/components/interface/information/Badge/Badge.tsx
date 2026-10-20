import type { AnchorHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import styles from './Badge.module.css';

export type BadgeStatus = 'nominal' | 'caution' | 'critical' | 'info' | 'neutral';
export type BadgeConfidence = 'confirmed' | 'candidate' | 'projected' | 'unverified';
export type BadgeCategory = 'star' | 'planet' | 'nebula' | 'constellation';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status?: BadgeStatus;
  confidence?: BadgeConfidence;
  category?: BadgeCategory;
  href?: string;
  target?: string;
  rel?: string;
  children?: ReactNode;
}

export const Badge = ({
  status,
  confidence,
  category,
  href,
  target,
  rel,
  children,
  className,
  ...rest
}: BadgeProps) => {
  const combinedClassName = className
    ? `${styles.badge} ${className}`
    : styles.badge;

  if (href !== undefined) {
    return (
      <a
        href={href}
        target={target}
        rel={rel}
        className={combinedClassName}
        data-status={status}
        data-confidence={confidence}
        data-category={category}
        {...(rest as unknown as AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {children}
      </a>
    );
  }

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
