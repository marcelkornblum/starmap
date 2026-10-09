import type React from 'react';
import styles from './RouteSkeleton.module.css';

export interface RouteSkeletonProps {
  label?: string;
}

export const RouteSkeleton: React.FC<RouteSkeletonProps> = ({
  label = 'Loading Target Telemetry...',
}) => {
  return (
    <div data-testid="route-skeleton" className={styles.skeleton}>
      <div className={styles.indicator} aria-hidden="true" />
      <span className={styles.label}>{label}</span>
    </div>
  );
};

