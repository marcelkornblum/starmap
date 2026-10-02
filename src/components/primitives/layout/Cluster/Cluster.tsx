import type { ReactNode } from 'react';
import type { AlignItems, BasePrimitiveProps, JustifyContent, SpacingScale } from '../types';
import styles from './Cluster.module.css';

export interface ClusterProps extends BasePrimitiveProps {
  gap?: SpacingScale;
  align?: AlignItems;
  justify?: JustifyContent;
  children?: ReactNode;
}

export const Cluster = ({
  as = 'div',
  gap = 'default',
  align = 'center',
  justify = 'start',
  children,
  className,
  ...rest
}: ClusterProps) => {
  const Tag = as as 'div';
  const combinedClassName = className ? `${styles.cluster} ${className}` : styles.cluster;

  return (
    <Tag
      className={combinedClassName}
      data-gap={gap}
      data-align={align}
      data-justify={justify}
      {...rest}
    >
      {children}
    </Tag>
  );
};
