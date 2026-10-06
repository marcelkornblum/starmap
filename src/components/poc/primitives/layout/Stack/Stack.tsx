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
  className,
  ...rest
}: StackProps) => {
  const Tag = as as 'div';
  const combinedClassName = className ? `${styles.stack} ${className}` : styles.stack;

  return (
    <Tag
      className={combinedClassName}
      data-gap={gap}
      data-align={align}
      {...rest}
    >
      {children}
    </Tag>
  );
};
