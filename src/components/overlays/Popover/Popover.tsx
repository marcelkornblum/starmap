import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Popover.module.css';

export interface PopoverProps extends HTMLAttributes<HTMLDivElement> {
  isOpen: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
  children?: ReactNode;
}

export const Popover = ({
  isOpen,
  position = 'bottom',
  children,
  className,
  ...rest
}: PopoverProps) => {
  if (!isOpen) {
    return null;
  }

  const combinedClassName = className
    ? `${styles.popover} ${className}`
    : styles.popover;

  return (
    <div
      className={combinedClassName}
      data-position={position}
      role="region"
      {...rest}
    >
      {children}
    </div>
  );
};
