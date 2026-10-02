import { useRef, useEffect, type DialogHTMLAttributes, type ReactNode } from 'react';
import { Stack } from '../../primitives';
import styles from './Modal.module.css';

export interface ModalProps extends Omit<DialogHTMLAttributes<HTMLDialogElement>, 'title'> {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  children?: ReactNode;
}

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  className,
  ...rest
}: ModalProps) => {
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
    ? `${styles.modal} ${className}`
    : styles.modal;

  return (
    <dialog
      ref={dialogRef}
      className={combinedClassName}
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === 'string' ? title : undefined}
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
      {isOpen && (
        <Stack gap="default">
          <div className={styles.headerRow}>
            {title && <h2 className={styles.title}>{title}</h2>}
            <button
              type="button"
              className={styles.closeButton}
              onClick={onClose}
              aria-label="Close dialog"
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
