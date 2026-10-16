import type { HTMLAttributes, ReactNode } from 'react';
import { Quantity } from '../Quantity/Quantity';
import styles from './Datum.module.css';

export interface DatumProps extends HTMLAttributes<HTMLDivElement> {
  label: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
  status?: 'nominal' | 'caution' | 'critical' | 'info';
  size?: 'sm' | 'md';
}

export const Datum = ({
  label,
  value,
  unit,
  status,
  size = 'md',
  className,
  ...rest
}: DatumProps) => {
  const combinedClassName = className
    ? `${styles.datum} ${className}`
    : styles.datum;

  return (
    <div
      className={combinedClassName}
      data-status={status}
      data-size={size}
      {...rest}
    >
      <span className={styles.label}>{label}</span>
      <Quantity value={value} unit={unit} className={styles.valueWrapper} />
    </div>
  );
};
