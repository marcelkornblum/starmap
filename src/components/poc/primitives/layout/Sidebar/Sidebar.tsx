import type { ReactNode } from 'react';
import type { BasePrimitiveProps, SpacingScale } from '../types';
import styles from './Sidebar.module.css';

export interface SidebarProps extends BasePrimitiveProps {
  side?: 'start' | 'end';
  sideWidth?: 'sm' | 'md' | 'lg';
  contentMin?: '50%' | '60%' | '70%';
  gap?: SpacingScale;
  noStretch?: boolean;
  children?: ReactNode;
}

export const Sidebar = ({
  as = 'div',
  side = 'start',
  sideWidth = 'md',
  contentMin = '50%',
  gap = 'default',
  noStretch = false,
  children,
  className,
  ...rest
}: SidebarProps) => {
  const Tag = as as 'div';
  const combinedClassName = className
    ? `${styles.sidebarContainer} ${className}`
    : styles.sidebarContainer;

  return (
    <Tag
      className={combinedClassName}
      data-side={side}
      data-width={sideWidth}
      data-content-min={contentMin}
      data-gap={gap}
      data-no-stretch={noStretch ? 'true' : undefined}
      {...rest}
    >
      {children}
    </Tag>
  );
};
