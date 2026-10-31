import type { AnchorHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { resolveAppHref } from '../../../../utils/url';
import styles from './Unit.module.css';

export interface UnitProps extends HTMLAttributes<HTMLSpanElement> {
  children?: ReactNode;
  /**
   * If true, renders unit surrounded by parentheses, e.g. (AU).
   */
  inParens?: boolean;
  /**
   * Optional URL linking the unit to its metric guide definition.
   */
  href?: string;
  target?: string;
  rel?: string;
}

export const Unit = ({
  children,
  inParens = false,
  href,
  target,
  rel,
  className,
  ...rest
}: UnitProps) => {
  if (children == null || children === '') {
    return null;
  }

  const combinedClassName = className
    ? `${styles.unit} ${className}`
    : styles.unit;

  const content = inParens
    ? typeof children === 'string' || typeof children === 'number'
      ? `(${children})`
      : <>({children})</>
    : children;

  if (href !== undefined) {
    return (
      <a
        href={resolveAppHref(href)}
        target={target}
        rel={rel}
        className={`${combinedClassName} ${styles.unitLink}`}
        data-unit="true"
        {...(rest as unknown as AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {content}
      </a>
    );
  }

  return (
    <span className={combinedClassName} data-unit="true" {...rest}>
      {content}
    </span>
  );
};

Unit.displayName = 'Unit';
