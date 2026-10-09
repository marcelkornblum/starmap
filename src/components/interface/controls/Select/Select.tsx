import type { SelectHTMLAttributes } from 'react';
import styles from './Select.module.css';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> {
  options: SelectOption[];
  value: string;
  onChange: (val: string) => void;
  sizeVariant?: 'sm' | 'md';
}

export const Select = ({
  options,
  value,
  onChange,
  sizeVariant = 'md',
  className,
  ...rest
}: SelectProps) => {
  const combinedClassName = className
    ? `${styles.select} ${className}`
    : styles.select;

  return (
    <select
      className={combinedClassName}
      value={value}
      data-size={sizeVariant}
      onChange={(e) => onChange(e.target.value)}
      {...rest}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
};
