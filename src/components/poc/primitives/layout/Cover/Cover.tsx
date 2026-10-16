import type { ReactNode } from 'react';
import type { BasePrimitiveProps, SpacingScale } from '../types';
import styles from './Cover.module.css';

export interface CoverProps extends BasePrimitiveProps {
  minHeight?: 'viewport' | 'full';
  gap?: SpacingScale;
  header?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
}

export const Cover = ({
  as = 'div',
  minHeight = 'viewport',
  gap = 'default',
  header,
  footer,
  children,
  className,
  ...rest
}: CoverProps) => {
  const Tag = as as 'div';
  const combinedClassName = className
    ? `${styles.cover} ${className}`
    : styles.cover;

  return (
    <Tag
      className={combinedClassName}
      data-min-height={minHeight}
      data-gap={gap}
      {...rest}
    >
      {header && <div>{header}</div>}
      <div data-principal="true">{children}</div>
      {footer && <div>{footer}</div>}
    </Tag>
  );
};
