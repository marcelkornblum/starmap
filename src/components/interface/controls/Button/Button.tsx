import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { resolveAppHref } from '../../../../utils/url';
import { handleSpaNavigation } from '../../../../hooks/spaNavigation';
import styles from './Button.module.css';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'style'> {
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
  ...rest
}: ButtonProps) => {
  if (href !== undefined) {
    const { onClick, ...anchorRest } = rest;
    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>): void => {
      (onClick as React.MouseEventHandler<HTMLAnchorElement> | undefined)?.(e);
      handleSpaNavigation(e, href);
    };

    return (
      <a
        href={resolveAppHref(href)}
        target={target}
        rel={rel}
        className={styles.button}
        data-variant={variant}
        data-size={size}
        {...(anchorRest as AnchorHTMLAttributes<HTMLAnchorElement>)}
        onClick={handleClick}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      type={type}
      className={styles.button}
      data-variant={variant}
      data-size={size}
      {...rest}
    >
      {children}
    </button>
  );
};
