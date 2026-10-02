import { useRef, useEffect, type DialogHTMLAttributes, type ReactNode } from 'react';
import { Stack } from '../../primitives';
import styles from './Drawer.module.css';

export interface DrawerProps extends Omit<DialogHTMLAttributes<HTMLDialogElement>, 'title'> {
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
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal?.();
      }
    } else {
      if (dialog.open) {
        dialog.close?.();
      }
    }
  }, [isOpen]);

  const combinedClassName = className
    ? `${styles.drawer} ${className}`
    : styles.drawer;

  return (
    <dialog
      ref={dialogRef}
      className={combinedClassName}
      data-position={position}
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === 'string' ? title : undefined}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        const rect = dialog.getBoundingClientRect();
        const isClickInside =
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom;
        if (!isClickInside) {
          onClose();
        }
      }}
      {...rest}
    >
      {isOpen && (
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
      )}
    </dialog>
  );
};
