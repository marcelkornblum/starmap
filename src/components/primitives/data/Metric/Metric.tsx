import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Metric.module.css';

export interface MetricProps extends HTMLAttributes<HTMLDivElement> {
  label: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
  trend?: ReactNode;
  status?: 'nominal' | 'caution' | 'critical' | 'info';
}

export const Metric = ({
  label,
  value,
  unit,
  trend,
  status,
  className,
  ...rest
}: MetricProps) => {
  const combinedClassName = className
    ? `${styles.metric} ${className}`
    : styles.metric;

  return (
    <div
      className={combinedClassName}
      data-status={status}
      {...rest}
    >
      <span className={styles.label}>{label}</span>
      <div className={styles.valueRow}>
        <span className={styles.value}>{value}</span>
        {unit && <span className={styles.unit}>{unit}</span>}
      </div>
      {trend && <span className={styles.trend}>{trend}</span>}
    </div>
  );
};
