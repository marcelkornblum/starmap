import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Popover.module.css';

export interface PopoverProps extends HTMLAttributes<HTMLDivElement> {
  isOpen: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
  children?: ReactNode;
  role?: string;
}

export const Popover = ({
  isOpen,
  position = 'bottom',
  children,
  role,
  className,
  ...rest
}: PopoverProps) => {
  if (!isOpen) {
    return null;
  }

  const combinedClassName = className
    ? `${styles.popover} ${className}`
    : styles.popover;

  const resolvedRole = role ?? (rest['aria-label'] || rest['aria-labelledby'] ? 'region' : undefined);

  return (
    <div
      className={combinedClassName}
      data-position={position}
      role={resolvedRole}
      {...rest}
    >
      {children}
    </div>
  );
};
