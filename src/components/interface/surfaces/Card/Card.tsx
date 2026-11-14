import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Card.module.css';

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'style'> {
  status?: 'nominal' | 'caution' | 'critical' | 'info' | 'neutral';
  interactive?: boolean;
  padding?: 'none' | 'tight' | 'default' | 'loose';
  children?: ReactNode;
}

export const Card = ({
  status,
  interactive = false,
  padding = 'default',
  children,
  ...rest
}: CardProps) => {
  return (
    <div
      className={styles.card}
      data-status={status}
      data-interactive={interactive ? 'true' : undefined}
      data-padding={padding}
      {...rest}
    >
      {children}
    </div>
  );
};
