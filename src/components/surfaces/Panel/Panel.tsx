import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Panel.module.css';

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  header?: ReactNode;
  footer?: ReactNode;
  status?: 'nominal' | 'caution' | 'critical' | 'info' | 'neutral';
  padding?: 'none' | 'tight' | 'default' | 'loose';
  children?: ReactNode;
}

export const Panel = ({
  header,
  footer,
  status,
  padding = 'default',
  children,
  className,
  ...rest
}: PanelProps) => {
  const combinedClassName = className
    ? `${styles.panel} ${className}`
    : styles.panel;

  return (
    <div
      className={combinedClassName}
      data-status={status}
      data-padding={padding}
      {...rest}
    >
      {header && <div className={styles.header}>{header}</div>}
      <div className={styles.body}>{children}</div>
      {footer && <div className={styles.footer}>{footer}</div>}
    </div>
  );
};
