import type { HTMLAttributes, ReactNode } from 'react';
import { Stack } from '../../primitives';
import styles from './DossierLayout.module.css';

export interface DossierLayoutProps extends HTMLAttributes<HTMLDivElement> {
  header: ReactNode;
  metrics?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
}

export const DossierLayout = ({
  header,
  metrics,
  children,
  actions,
  className,
  ...rest
}: DossierLayoutProps) => {
  const combinedClassName = className
    ? `${styles.dossierContainer} ${className}`
    : styles.dossierContainer;

  return (
    <div className={combinedClassName} {...rest}>
      <Stack gap="section">
        <div className={styles.headerSlot}>{header}</div>
        {metrics && <div className={styles.metricsSlot}>{metrics}</div>}
        <div className={styles.contentSlot}>{children}</div>
        {actions && <div className={styles.actionsSlot}>{actions}</div>}
      </Stack>
    </div>
  );
};
