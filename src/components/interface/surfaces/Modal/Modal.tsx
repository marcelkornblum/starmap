import { useRef, useEffect, useId, type DialogHTMLAttributes, type ReactNode } from 'react';
import { Stack } from '../../layouts/Stack/Stack';
import { Button } from '../../controls/Button/Button';
import styles from './Modal.module.css';

export interface ModalProps extends Omit<DialogHTMLAttributes<HTMLDialogElement>, 'title' | 'className' | 'style'> {
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

  return (
    <dialog
      ref={dialogRef}
      className={styles.modal}
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
      <div className={styles.modalContent}>
        <Stack gap="default">
          <header className={styles.headerRow}>
            {title && (
              <h3 id={titleId} className={styles.title}>
                {title}
              </h3>
            )}
            <Button
              variant="subtle"
              size="sm"
              onClick={onClose}
              aria-label="Close dialog"
            >
              ✕
            </Button>
          </header>
          <div>{children}</div>
        </Stack>
      </div>
    </dialog>
  );
};
