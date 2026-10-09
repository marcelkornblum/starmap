import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.css';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'highlight' | 'subtle' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children?: ReactNode;
}

export const Button = ({
  variant = 'secondary',
  size = 'md',
  type = 'button',
  children,
  className,
  ...rest
}: ButtonProps) => {
  const combinedClassName = className
    ? `${styles.button} ${className}`
    : styles.button;

  return (
    <button
      type={type}
      className={combinedClassName}
      data-variant={variant}
      data-size={size}
      {...rest}
    >
      {children}
    </button>
  );
};
