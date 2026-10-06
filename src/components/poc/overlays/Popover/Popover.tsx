import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Popover.module.css';

export interface PopoverProps extends HTMLAttributes<HTMLDivElement> {
  isOpen: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
  trigger?: ReactNode;
  children?: ReactNode;
  role?: string;
}

export const Popover = ({
  isOpen,
  position = 'bottom',
  trigger,
  children,
  role,
  className,
  ...rest
}: PopoverProps) => {
  const combinedClassName = className
    ? `${styles.popover} ${className}`
    : styles.popover;

  const resolvedRole = role ?? (rest['aria-label'] || rest['aria-labelledby'] ? 'region' : undefined);

  const popoverElement = isOpen ? (
    <div
      className={combinedClassName}
      data-position={position}
      role={resolvedRole}
      {...rest}
    >
      {children}
    </div>
  ) : null;

  if (trigger) {
    return (
      <div className={styles.popoverWrapper}>
        {trigger}
        {popoverElement}
      </div>
    );
  }

  return popoverElement;
};
