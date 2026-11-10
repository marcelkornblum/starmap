import type { AnchorHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { resolveAppHref } from '../../../../utils/url';
import styles from './Badge.module.css';

export type BadgeStatus = 'nominal' | 'caution' | 'critical' | 'info' | 'neutral';
export type BadgeConfidence = 'confirmed' | 'candidate' | 'projected' | 'unverified';
export type BadgeCategory = 'star' | 'planet' | 'nebula' | 'constellation';

export interface BadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'className' | 'style'> {
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
  ...rest
}: BadgeProps) => {
  if (href !== undefined) {
    return (
      <a
        href={resolveAppHref(href)}
        target={target}
        rel={rel}
        className={styles.badge}
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
      className={styles.badge}
      data-status={status}
      data-confidence={confidence}
      data-category={category}
      {...rest}
    >
      {children}
    </span>
  );
};
