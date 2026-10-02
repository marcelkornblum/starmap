import type { HTMLAttributes, ReactNode } from 'react';
import { Grid } from '../../primitives';
import styles from './MetricStrip.module.css';

export interface MetricStripProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  minWidth?: 'sm' | 'md' | 'lg';
}

export const MetricStrip = ({
  children,
  minWidth = 'sm',
  className,
  ...rest
}: MetricStripProps) => {
  const combinedClassName = className
    ? `${styles.metricStrip} ${className}`
    : styles.metricStrip;

  return (
    <div className={combinedClassName} {...rest}>
      <Grid minWidth={minWidth} gap="default">
        {children}
      </Grid>
    </div>
  );
};
