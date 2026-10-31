import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { resolveAppHref } from '../../../../utils/url';
import styles from './Button.module.css';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'subtle' | 'danger' | 'default';
  size?: 'sm' | 'md' | 'lg';
  children?: ReactNode;
  href?: string;
  target?: string;
  rel?: string;
}

export const Button = ({
  variant = 'default',
  size = 'md',
  type = 'button',
  href,
  target,
  rel,
  children,
  className,
  ...rest
}: ButtonProps) => {
  const combinedClassName = className
    ? `${styles.button} ${className}`
    : styles.button;

  if (href !== undefined) {
    return (
      <a
        href={resolveAppHref(href)}
        target={target}
        rel={rel}
        className={combinedClassName}
        data-variant={variant}
        data-size={size}
        {...(rest as unknown as AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {children}
      </a>
    );
  }

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
