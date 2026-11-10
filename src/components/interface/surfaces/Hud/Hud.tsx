import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Hud.module.css';

export interface HudProps extends Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'style'> {
  position?: 'top' | 'bottom' | 'floating' | 'static';
  padded?: boolean;
  children?: ReactNode;
}

export const Hud = ({
  position = 'top',
  padded = true,
  children,
  ...rest
}: HudProps) => {
  return (
    <header
      className={styles.hud}
      data-position={position}
      data-padded={padded ? undefined : 'false'}
      {...rest}
    >
      {children}
    </header>
  );
};
