import type { ReactNode } from 'react';
import type { AlignItems, BasePrimitiveProps, SpacingScale } from '../types';
import styles from './Stack.module.css';

export interface StackProps extends BasePrimitiveProps {
  gap?: SpacingScale;
  align?: AlignItems;
  children?: ReactNode;
}

export const Stack = ({
  as = 'div',
  gap = 'default',
  align = 'stretch',
  children,
  ...rest
}: StackProps) => {
  const Tag = as as 'div';

  return (
    <Tag
      className={styles.stack}
      data-gap={gap}
      data-align={align}
      {...rest}
    >
      {children}
    </Tag>
  );
};
