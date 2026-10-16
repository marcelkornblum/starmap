import type { ReactNode } from 'react';
import type { BasePrimitiveProps, SpacingScale } from '../types';
import styles from './Imposter.module.css';

export interface ImposterProps extends BasePrimitiveProps {
  fixed?: boolean;
  position?:
    | 'center'
    | 'top-left'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-right'
    | 'top'
    | 'bottom';
  margin?: SpacingScale;
  children?: ReactNode;
}

export const Imposter = ({
  as = 'div',
  fixed = false,
  position = 'center',
  margin = 'default',
  children,
  className,
  ...rest
}: ImposterProps) => {
  const Tag = as as 'div';
  const combinedClassName = className
    ? `${styles.imposter} ${className}`
    : styles.imposter;

  return (
    <Tag
      className={combinedClassName}
      data-fixed={fixed ? 'true' : undefined}
      data-position={position}
      data-margin={margin}
      {...rest}
    >
      {children}
    </Tag>
  );
};
