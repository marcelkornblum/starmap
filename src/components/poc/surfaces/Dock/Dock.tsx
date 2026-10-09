import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Dock.module.css';

export interface DockProps extends HTMLAttributes<HTMLDivElement> {
  position?: 'top' | 'bottom' | 'left' | 'right' | 'floating';
  padded?: boolean;
  children?: ReactNode;
}

export const Dock = ({
  position = 'floating',
  padded = true,
  children,
  className,
  ...rest
}: DockProps) => {
  const combinedClassName = className
    ? `${styles.dock} ${className}`
    : styles.dock;

  return (
    <div
      className={combinedClassName}
      data-position={position}
      data-padded={padded ? undefined : 'false'}
      {...rest}
    >
      {children}
    </div>
  );
};
