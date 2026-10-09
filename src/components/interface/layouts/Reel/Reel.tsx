import type { ReactNode } from 'react';
import type { BasePrimitiveProps, SpacingScale } from '../types';
import styles from './Reel.module.css';

export interface ReelProps extends BasePrimitiveProps {
  itemWidth?: 'sm' | 'md' | 'lg';
  gap?: SpacingScale;
  snap?: boolean;
  children?: ReactNode;
}

export const Reel = ({
  as = 'div',
  itemWidth = 'md',
  gap = 'default',
  snap = true,
  children,
  className,
  ...rest
}: ReelProps) => {
  const Tag = as as 'div';
  const combinedClassName = className
    ? `${styles.reel} ${className}`
    : styles.reel;

  return (
    <Tag
      className={combinedClassName}
      data-item-width={itemWidth}
      data-gap={gap}
      data-snap={snap ? 'true' : undefined}
      {...rest}
    >
      {children}
    </Tag>
  );
};
