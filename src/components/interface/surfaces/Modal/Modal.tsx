import { useRef, useEffect, useId, type DialogHTMLAttributes, type ReactNode } from 'react';
import { Stack } from '../../layout/Stack/Stack';
import styles from './Modal.module.css';

export interface ModalProps extends Omit<DialogHTMLAttributes<HTMLDialogElement>, 'title'> {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  children?: ReactNode;
  isModal?: boolean;
}

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  isModal = true,
  className,
  ...rest
}: ModalProps) => {
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

  const combinedClassName = className
    ? `${styles.modal} ${className}`
    : styles.modal;

  return (
    <dialog
      ref={dialogRef}
      className={combinedClassName}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? (rest['aria-labelledby'] || titleId) : rest['aria-labelledby']}
      aria-label={!title && typeof rest['aria-label'] === 'string' ? rest['aria-label'] : undefined}
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
      <div className={styles.modalContent}>
        <Stack gap="default">
          <div className={styles.headerRow}>
            {title && <h2 id={titleId} className={styles.title}>{title}</h2>}
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
      </div>
    </dialog>
  );
};
