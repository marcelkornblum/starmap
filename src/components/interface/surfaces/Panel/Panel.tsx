import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Panel.module.css';

export interface PanelProps extends Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'style'> {
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
  ...rest
}: PanelProps) => {
  return (
    <div
      className={styles.panel}
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
