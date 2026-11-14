import type { ReactNode } from 'react';
import type { BasePrimitiveProps, SpacingScale } from '../types';
import styles from './Switcher.module.css';

export interface SwitcherProps extends BasePrimitiveProps {
  threshold?: 'sm' | 'md' | 'lg' | 'xl';
  gap?: SpacingScale;
  limit?: 2 | 3 | 4;
  children?: ReactNode;
}

export const Switcher = ({
  as = 'div',
  threshold = 'md',
  gap = 'default',
  limit,
  children,
  ...rest
}: SwitcherProps) => {
  const Tag = as as 'div';

  return (
    <Tag
      className={styles.switcher}
      data-threshold={threshold}
      data-gap={gap}
      data-limit={limit}
      {...rest}
    >
      {children}
    </Tag>
  );
};
