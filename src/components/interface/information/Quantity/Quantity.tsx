import type { HTMLAttributes, ReactNode } from 'react';
import { Unit } from '../Unit/Unit';
import styles from './Quantity.module.css';

export interface QuantityProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'className' | 'style'> {
  /** The numeric or text magnitude of the datum */
  value?: ReactNode;
  /** The unit of measurement (string, symbol, or Unit component) */
  unit?: ReactNode;
  /** Pre-formatted children */
  children?: ReactNode;
  /** If true, omits the gap between value and unit (automatically true for angular symbols °, ′, ″) */
  noGap?: boolean;
  'data-testid'?: string;
}

export const Quantity = ({
  value,
  unit,
  children,
  noGap,
  ...rest
}: QuantityProps) => {
  const isDegreeSymbol =
    typeof unit === 'string' &&
    (unit.trim() === '°' || unit.trim() === '′' || unit.trim() === '″');

  const shouldOmitGap = noGap ?? isDegreeSymbol;

  const renderUnit = () => {
    if (!unit) return null;
    if (
      typeof unit === 'object' &&
      unit !== null &&
      'type' in unit &&
      (unit.type === Unit || (unit.type as any)?.displayName === 'Unit')
    ) {
      return unit;
    }
    return <Unit>{unit}</Unit>;
  };

  return (
    <span
      className={styles.quantity}
      data-quantity="true"
      data-no-gap={shouldOmitGap ? 'true' : undefined}
      {...rest}
    >
      {children ?? (
        <>
          {value !== undefined && <span className={styles.value}>{value}</span>}
          {renderUnit()}
        </>
      )}
    </span>
  );
};

Quantity.displayName = 'Quantity';

export { Quantity as Measurement };
export type { QuantityProps as MeasurementProps };
