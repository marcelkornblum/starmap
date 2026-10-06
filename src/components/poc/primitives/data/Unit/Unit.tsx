import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Unit.module.css';

export interface UnitProps extends HTMLAttributes<HTMLSpanElement> {
  children?: ReactNode;
  /**
   * If true, renders unit surrounded by parentheses, e.g. (AU).
   */
  inParens?: boolean;
}

export const Unit = ({
  children,
  inParens = false,
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

  return (
    <span className={combinedClassName} data-unit="true" {...rest}>
      {content}
    </span>
  );
};

Unit.displayName = 'Unit';
