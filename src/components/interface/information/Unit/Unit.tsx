import type { AnchorHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { resolveAppHref } from '../../../../utils/url';
import styles from './Unit.module.css';

export interface UnitProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'className' | 'style'> {
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
  'data-testid'?: string;
}

export const Unit = ({
  children,
  inParens = false,
  href,
  target,
  rel,
  ...rest
}: UnitProps) => {
  if (children == null || children === '') {
    return null;
  }

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
        className={styles.unit}
        data-unit="true"
        data-interactive="true"
        {...(rest as unknown as AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {content}
      </a>
    );
  }

  return (
    <span className={styles.unit} data-unit="true" {...rest}>
      {content}
    </span>
  );
};

Unit.displayName = 'Unit';
