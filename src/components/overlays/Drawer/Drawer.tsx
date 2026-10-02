import type { HTMLAttributes, ReactNode } from 'react';
import { Stack } from '../../primitives';
import styles from './Drawer.module.css';

export interface DrawerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  isOpen: boolean;
  onClose: () => void;
  position?: 'left' | 'right' | 'top' | 'bottom';
  title?: ReactNode;
  children?: ReactNode;
}

export const Drawer = ({
  isOpen,
  onClose,
  position = 'right',
  title,
  children,
  className,
  ...rest
}: DrawerProps) => {
  if (!isOpen) {
    return null;
  }

  const combinedClassName = className
    ? `${styles.drawer} ${className}`
    : styles.drawer;

  return (
    <>
      <div
        className={styles.backdrop}
        onClick={onClose}
        role="presentation"
      />
      <div
        className={combinedClassName}
        data-position={position}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        {...rest}
      >
        <Stack gap="default">
          <div className={styles.headerRow}>
            {title && <h2 className={styles.title}>{title}</h2>}
            <button
              type="button"
              className={styles.closeButton}
              onClick={onClose}
              aria-label="Close drawer"
            >
              ✕
            </button>
          </div>
          <div>{children}</div>
        </Stack>
      </div>
    </>
  );
};
