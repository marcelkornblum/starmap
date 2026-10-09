import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Hud.module.css';

export interface HudProps extends HTMLAttributes<HTMLDivElement> {
  position?: 'top' | 'bottom' | 'floating' | 'static';
  padded?: boolean;
  children?: ReactNode;
}

export const Hud = ({
  position = 'top',
  padded = true,
  children,
  className,
  ...rest
}: HudProps) => {
  const combinedClassName = className
    ? `${styles.hud} ${className}`
    : styles.hud;

  return (
    <header
      className={combinedClassName}
      data-position={position}
      data-padded={padded ? undefined : 'false'}
      {...rest}
    >
      {children}
    </header>
  );
};
