import type { ReactNode } from 'react';
import type { BasePrimitiveProps, SpacingScale } from '../types';
import styles from './Center.module.css';

export interface CenterProps extends BasePrimitiveProps {
  max?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  andText?: boolean;
  gutter?: SpacingScale;
  intrinsic?: boolean;
  children?: ReactNode;
}

export const Center = ({
  as = 'div',
  max = 'md',
  andText = false,
  gutter = 'default',
  intrinsic = false,
  children,
  className,
  ...rest
}: CenterProps) => {
  const Tag = as as 'div';
  const combinedClassName = className
    ? `${styles.center} ${className}`
    : styles.center;

  return (
    <Tag
      className={combinedClassName}
      data-max={max}
      data-and-text={andText ? 'true' : undefined}
      data-gutter={gutter}
      data-intrinsic={intrinsic ? 'true' : undefined}
      {...rest}
    >
      {children}
    </Tag>
  );
};
