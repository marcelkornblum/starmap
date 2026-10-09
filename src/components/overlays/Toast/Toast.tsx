import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Toast.module.css';

export interface ToastProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title: ReactNode;
  message?: ReactNode;
  status?: 'nominal' | 'caution' | 'critical' | 'info' | 'neutral';
  onClose?: () => void;
}

export const Toast = ({
  title,
  message,
  status = 'info',
  onClose,
  className,
  ...rest
}: ToastProps) => {
  const combinedClassName = className
    ? `${styles.toast} ${className}`
    : styles.toast;

  return (
    <div
      className={combinedClassName}
      data-status={status}
      role="status"
      aria-live="polite"
      {...rest}
    >
      <div className={styles.contentStack}>
        <h4 className={styles.title}>{title}</h4>
        {message && <p className={styles.message}>{message}</p>}
      </div>
      {onClose && (
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Dismiss notification"
        >
          ✕
        </button>
      )}
    </div>
  );
};
