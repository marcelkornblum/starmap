import type { ReactNode } from 'react';
import type { BasePrimitiveProps, SpacingScale } from '../types';
import styles from './Switcher.module.css';

export interface SwitcherProps extends BasePrimitiveProps {
  threshold?: 'sm' | 'md' | 'lg' | 'xl';
  limit?: 2 | 3 | 4;
  gap?: SpacingScale;
  children?: ReactNode;
}

export const Switcher = ({
  as = 'div',
  threshold = 'md',
  limit,
  gap = 'default',
  children,
  className,
  ...rest
}: SwitcherProps) => {
  const Tag = as as 'div';
  const combinedClassName = className
    ? `${styles.switcher} ${className}`
    : styles.switcher;

  return (
    <Tag
      className={combinedClassName}
      data-threshold={threshold}
      data-limit={limit}
      data-gap={gap}
      {...rest}
    >
      {children}
    </Tag>
  );
};
