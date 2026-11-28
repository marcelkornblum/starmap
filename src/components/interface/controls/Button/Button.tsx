import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { resolveAppHref } from '../../../../utils/url';
import { useSpaLinkClick } from '../../../../hooks/spaNavigation';
import styles from './Button.module.css';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'style'> {
  variant?: 'primary' | 'subtle' | 'danger' | 'default';
  size?: 'sm' | 'md' | 'lg';
  selected?: boolean;
  children?: ReactNode;
  href?: string;
  target?: string;
  rel?: string;
}

export const Button = ({
  variant = 'default',
  size = 'md',
  selected = false,
  disabled = false,
  type = 'button',
  href,
  target,
  rel,
  children,
  ...rest
}: ButtonProps) => {
  const handleSpaLinkClick = useSpaLinkClick();

  if (href !== undefined) {
    const { onClick, tabIndex, role, 'aria-disabled': ariaDisabled, ...anchorRest } = rest;
    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>): void => {
      if (disabled) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      (onClick as React.MouseEventHandler<HTMLAnchorElement> | undefined)?.(e);
      handleSpaLinkClick(e, href);
    };

    return (
      <a
        href={disabled ? undefined : resolveAppHref(href)}
        role={disabled ? (role ?? 'link') : role}
        target={target}
        rel={rel}
        className={styles.button}
        data-variant={variant}
        data-size={size}
        data-selected={selected ? 'true' : undefined}
        data-disabled={disabled ? 'true' : undefined}
        aria-disabled={disabled ? 'true' : ariaDisabled}
        tabIndex={disabled ? -1 : tabIndex}
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
      data-selected={selected ? 'true' : undefined}
      data-disabled={disabled ? 'true' : undefined}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
};
