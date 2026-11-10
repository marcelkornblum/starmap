import { useRef, useEffect, useId, type DialogHTMLAttributes, type ReactNode } from 'react';
import { Stack } from '../../layouts/Stack/Stack';
import { Button } from '../../controls/Button/Button';
import styles from './Drawer.module.css';

export interface DrawerProps extends Omit<DialogHTMLAttributes<HTMLDialogElement>, 'title' | 'className' | 'style'> {
  isOpen: boolean;
  onClose: () => void;
  position?: 'left' | 'right' | 'top' | 'bottom';
  title?: ReactNode;
  children?: ReactNode;
  isModal?: boolean;
}

export const Drawer = ({
  isOpen,
  onClose,
  position = 'right',
  title,
  children,
  isModal = true,
  ...rest
}: DrawerProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        if (isModal) {
          dialog.showModal?.();
        } else if (dialog.show) {
          dialog.show();
        } else {
          dialog.setAttribute('open', '');
        }
      }
    } else {
      if (dialog.open) {
        dialog.close?.();
      }
    }
  }, [isOpen, isModal]);

  return (
    <dialog
      ref={dialogRef}
      className={styles.drawer}
      data-position={position}
      aria-labelledby={title ? titleId : undefined}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) {
          onClose();
        }
      }}
      {...rest}
    >
      <div className={styles.container}>
        {title && (
          <header className={styles.header}>
            <h3 id={titleId} className={styles.title}>
              {title}
            </h3>
            <Button
              variant="subtle"
              size="sm"
              onClick={onClose}
              aria-label="Close drawer"
            >
              ✕
            </Button>
          </header>
        )}
        <div className={styles.body}>
          <Stack gap="default">{children}</Stack>
        </div>
      </div>
    </dialog>
  );
};
