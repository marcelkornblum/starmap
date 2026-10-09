import type { InputHTMLAttributes, Ref } from 'react';
import styles from './Input.module.css';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  status?: 'error' | 'success';
  sizeVariant?: 'sm' | 'md';
  tabular?: boolean;
  ref?: Ref<HTMLInputElement>;
}

export const Input = ({
  status,
  sizeVariant = 'md',
  tabular = false,
  className,
  ref,
  ...rest
}: InputProps) => {
  const combinedClassName = className
    ? `${styles.input} ${className}`
    : styles.input;

  return (
    <input
      ref={ref}
      className={combinedClassName}
      data-status={status}
      data-size={sizeVariant}
      data-tabular={tabular ? 'true' : undefined}
      {...rest}
    />
  );
};
