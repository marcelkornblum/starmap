import type { ReactNode } from 'react';
import type { BasePrimitiveProps, SpacingScale } from '../types';
import styles from './Grid.module.css';

export interface GridProps extends BasePrimitiveProps {
  minWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  gap?: SpacingScale;
  children?: ReactNode;
}

export const Grid = ({
  as = 'div',
  minWidth = 'md',
  gap = 'default',
  children,
  className,
  ...rest
}: GridProps) => {
  const Tag = as as 'div';
  const combinedClassName = className
    ? `${styles.grid} ${className}`
    : styles.grid;

  return (
    <Tag
      className={combinedClassName}
      data-min={minWidth}
      data-gap={gap}
      {...rest}
    >
      {children}
    </Tag>
  );
};
