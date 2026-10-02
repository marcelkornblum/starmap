import type { HTMLAttributes, ReactNode } from 'react';
import { Stack } from '../../primitives';
import styles from './Modal.module.css';

export interface ModalProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
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
  if (!isOpen) {
    return null;
  }

  const combinedClassName = className
    ? `${styles.modal} ${className}`
    : styles.modal;

  return (
    <div
      className={styles.backdrop}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={combinedClassName}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        {...rest}
        onClick={(e) => {
          e.stopPropagation();
          rest.onClick?.(e);
        }}
      >
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
      </div>
    </div>
  );
};
