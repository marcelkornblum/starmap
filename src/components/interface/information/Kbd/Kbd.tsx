import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Kbd.module.css';

export interface KbdProps extends HTMLAttributes<HTMLElement> {
  children?: ReactNode;
}

export const Kbd = ({ children, className, ...rest }: KbdProps) => {
  const combinedClassName = className
    ? `${styles.kbd} ${className}`
    : styles.kbd;

  return (
    <kbd className={combinedClassName} data-kbd="true" {...rest}>
      {children}
    </kbd>
  );
};
