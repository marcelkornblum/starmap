import type { ReactNode } from 'react';
import type { BasePrimitiveProps } from '../types';
import styles from './Frame.module.css';

export interface FrameProps extends BasePrimitiveProps {
  ratio?: '1:1' | '16:9' | '4:3' | '21:9';
  children?: ReactNode;
}

export const Frame = ({
  as = 'div',
  ratio = '16:9',
  children,
  className,
  ...rest
}: FrameProps) => {
  const Tag = as as 'div';
  const combinedClassName = className
    ? `${styles.frame} ${className}`
    : styles.frame;

  return (
    <Tag
      className={combinedClassName}
      data-ratio={ratio}
      {...rest}
    >
      {children}
    </Tag>
  );
};
