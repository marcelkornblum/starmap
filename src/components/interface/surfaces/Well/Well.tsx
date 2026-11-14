import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Well.module.css';

export interface WellProps extends Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'style'> {
  padding?: 'none' | 'tight' | 'default' | 'loose';
  tabular?: boolean;
  children?: ReactNode;
}

export const Well = ({
  padding = 'default',
  tabular = false,
  children,
  ...rest
}: WellProps) => {
  return (
    <div
      className={styles.well}
      data-padding={padding}
      data-tabular={tabular ? 'true' : undefined}
      {...rest}
    >
      {children}
    </div>
  );
};
