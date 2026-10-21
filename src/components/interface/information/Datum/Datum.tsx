import type { HTMLAttributes, ReactNode } from 'react';
import { Quantity } from '../Quantity/Quantity';
import { ConfidencePip, type ConfidenceLevel } from '../ConfidencePip/ConfidencePip';
import styles from './Datum.module.css';

export interface DatumProps extends HTMLAttributes<HTMLDivElement> {
  label: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
  status?: 'nominal' | 'caution' | 'critical' | 'info';
  size?: 'sm' | 'md';
  valueTestId?: string;
  confidence?: ConfidenceLevel;
}

export const Datum = ({
  label,
  value,
  unit,
  status,
  size = 'md',
  valueTestId,
  confidence,
  className,
  ...rest
}: DatumProps) => {
  const combinedClassName = className
    ? `${styles.datum} ${className}`
    : styles.datum;

  const valueElement = (
    <Quantity
      value={value}
      unit={unit}
      className={styles.valueWrapper}
      data-testid={valueTestId}
    />
  );

  return (
    <div
      className={combinedClassName}
      data-datum="true"
      data-status={status}
      data-size={size}
      {...rest}
    >
      <span className={styles.label}>{label}</span>
      {confidence ? (
        <span className={styles.valueGroup}>
          {valueElement}
          <ConfidencePip confidence={confidence} size="sm" />
        </span>
      ) : (
        valueElement
      )}
    </div>
  );
};
