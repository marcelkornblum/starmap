import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Well.module.css';

export interface WellProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'tight' | 'default' | 'loose';
  tabular?: boolean;
  children?: ReactNode;
}

export const Well = ({
  padding = 'default',
  tabular = false,
  children,
  className,
  ...rest
}: WellProps) => {
  const combinedClassName = className
    ? `${styles.well} ${className}`
    : styles.well;

  return (
    <div
      className={combinedClassName}
      data-padding={padding}
      data-tabular={tabular ? 'true' : undefined}
      {...rest}
    >
      {children}
    </div>
  );
};
