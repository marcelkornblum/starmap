import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Card.module.css';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
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
  className,
  ...rest
}: CardProps) => {
  const combinedClassName = className
    ? `${styles.card} ${className}`
    : styles.card;

  return (
    <div
      className={combinedClassName}
      data-status={status}
      data-interactive={interactive ? 'true' : undefined}
      data-padding={padding}
      {...rest}
    >
      {children}
    </div>
  );
};
