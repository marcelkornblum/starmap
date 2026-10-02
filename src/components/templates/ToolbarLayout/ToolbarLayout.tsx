import type { HTMLAttributes, ReactNode } from 'react';
import styles from './ToolbarLayout.module.css';

export interface ToolbarLayoutProps extends HTMLAttributes<HTMLDivElement> {
  start?: ReactNode;
  center?: ReactNode;
  end?: ReactNode;
}

export const ToolbarLayout = ({
  start,
  center,
  end,
  className,
  ...rest
}: ToolbarLayoutProps) => {
  const combinedClassName = className
    ? `${styles.toolbar} ${className}`
    : styles.toolbar;

  return (
    <header className={combinedClassName} {...rest}>
      <div className={styles.slotStart}>{start}</div>
      {center && <div className={styles.slotCenter}>{center}</div>}
      <div className={styles.slotEnd}>{end}</div>
    </header>
  );
};
