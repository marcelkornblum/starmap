import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Tooltip.module.css';

export interface TooltipProps extends HTMLAttributes<HTMLDivElement> {
  text: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  children?: ReactNode;
}

export const Tooltip = ({
  text,
  position = 'top',
  children,
  className,
  ...rest
}: TooltipProps) => {
  const combinedClassName = className
    ? `${styles.tooltip} ${className}`
    : styles.tooltip;

  return (
    <div className={styles.tooltipWrapper}>
      {children}
      <div
        className={combinedClassName}
        data-position={position}
        role="tooltip"
        {...rest}
      >
        {text}
      </div>
    </div>
  );
};
