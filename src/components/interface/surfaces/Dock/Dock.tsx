import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Dock.module.css';

export interface DockProps extends Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'style'> {
  position?: 'top' | 'bottom' | 'left' | 'right' | 'floating';
  padded?: boolean;
  children?: ReactNode;
}

export const Dock = ({
  position = 'floating',
  padded = true,
  children,
  ...rest
}: DockProps) => {
  return (
    <div
      className={styles.dock}
      data-position={position}
      data-padded={padded ? undefined : 'false'}
      {...rest}
    >
      {children}
    </div>
  );
};
