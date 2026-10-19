import type { HTMLAttributes, ReactNode } from 'react';
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
}

export const Unit = ({
  children,
  inParens = false,
  href,
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

  const inner = href ? (
    <a href={href} className={styles.unitLink}>
      {content}
    </a>
  ) : (
    content
  );

  return (
    <span className={combinedClassName} data-unit="true" {...rest}>
      {inner}
    </span>
  );
};

Unit.displayName = 'Unit';
