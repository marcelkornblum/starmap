import type { InputHTMLAttributes, Ref } from 'react';
import styles from './Input.module.css';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'style'> {
  status?: 'error' | 'success';
  sizeVariant?: 'sm' | 'md';
  tabular?: boolean;
  ref?: Ref<HTMLInputElement>;
}

export const Input = ({
  status,
  sizeVariant = 'md',
  tabular = false,
  ref,
  ...rest
}: InputProps) => {
  return (
    <input
      ref={ref}
      className={styles.input}
      data-status={status}
      data-size={sizeVariant}
      data-tabular={tabular ? 'true' : undefined}
      {...rest}
    />
  );
};
