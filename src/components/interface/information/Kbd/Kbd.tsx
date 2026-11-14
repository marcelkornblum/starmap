import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Kbd.module.css';

export interface KbdProps extends Omit<HTMLAttributes<HTMLElement>, 'className' | 'style'> {
  children?: ReactNode;
}

export const Kbd = ({ children, ...rest }: KbdProps) => {
  return (
    <kbd className={styles.kbd} data-kbd="true" {...rest}>
      {children}
    </kbd>
  );
};
