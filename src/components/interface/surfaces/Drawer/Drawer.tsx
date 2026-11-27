import {
  useRef,
  useEffect,
  useId,
  type DialogHTMLAttributes,
  type ReactNode,
  type TouchEventHandler,
} from 'react';
import { Stack } from '../../layouts/Stack/Stack';
import { Button } from '../../controls/Button/Button';
import styles from './Drawer.module.css';

export interface DrawerProps extends Omit<DialogHTMLAttributes<HTMLDialogElement>, 'title' | 'className' | 'style'> {
  isOpen: boolean;
  onClose: () => void;
  position?: 'left' | 'right' | 'top' | 'bottom';
  title?: ReactNode;
  headerExtra?: ReactNode;
  children?: ReactNode;
  isModal?: boolean;
}

const SWIPE_DISMISS_THRESHOLD_PX = 48;
const SWIPE_AXIS_DOMINANCE_RATIO = 1.5;

export const Drawer = ({
  isOpen,
  onClose,
  position = 'right',
  title,
  headerExtra,
  children,
  isModal = true,
  onTouchStart,
  onTouchEnd,
  ...rest
}: DrawerProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
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

  const handleTouchStart: TouchEventHandler<HTMLDialogElement> = (e) => {
    onTouchStart?.(e);
    if (position !== 'left' && position !== 'right') {
      touchStartRef.current = null;
      return;
    }
    const touch = e.touches[0] ?? e.changedTouches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd: TouchEventHandler<HTMLDialogElement> = (e) => {
    onTouchEnd?.(e);
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    const touch = e.changedTouches[0] ?? e.touches[0];
    if (!touch) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) <= Math.abs(deltaY) * SWIPE_AXIS_DOMINANCE_RATIO) {
      return;
    }

    if (position === 'right' && deltaX > SWIPE_DISMISS_THRESHOLD_PX) {
      onClose();
    } else if (position === 'left' && deltaX < -SWIPE_DISMISS_THRESHOLD_PX) {
      onClose();
    }
  };

  const hasHeader = Boolean(title || headerExtra);

  return (
    <dialog
      ref={dialogRef}
      className={styles.drawer}
      data-position={position}
      role="dialog"
      aria-modal={isModal ? 'true' : undefined}
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
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      {...rest}
    >
      <div className={styles.drawerContent}>
        {hasHeader && (
          <header className={styles.headerRow}>
            {title && (
              <h3 id={titleId} className={styles.title}>
                {title}
              </h3>
            )}
            {headerExtra && (
              <div className={styles.headerExtra}>{headerExtra}</div>
            )}
            <Button
              variant="subtle"
              size="sm"
              onClick={onClose}
              aria-label="Close drawer"
              data-testid="drawer-close-button"
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
