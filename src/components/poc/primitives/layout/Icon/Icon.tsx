import type { ReactNode } from 'react';
import type { BasePrimitiveProps } from '../types';
import styles from './Icon.module.css';

export interface IconProps extends BasePrimitiveProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children?: ReactNode;
}

export const Icon = ({
  as = 'span',
  size = 'md',
  children,
  className,
  ...rest
}: IconProps) => {
  const Tag = as as 'span';
  const combinedClassName = className
    ? `${styles.icon} ${className}`
    : styles.icon;

  return (
    <Tag
      className={combinedClassName}
      data-size={size}
      aria-hidden="true"
      {...rest}
    >
      {children}
    </Tag>
  );
};
