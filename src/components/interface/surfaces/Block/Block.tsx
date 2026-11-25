import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Block.module.css';

export interface BlockProps extends Omit<HTMLAttributes<HTMLElement>, 'className' | 'style'> {
  as?: 'div' | 'li' | 'article' | 'section';
  interactive?: boolean;
  selected?: boolean;
  tone?: 'default' | 'sub';
  status?: 'nominal' | 'caution' | 'critical' | 'info' | 'neutral';
  padding?: 'none' | 'tight' | 'default' | 'loose';
  children?: ReactNode;
}

export const Block = ({
  as: Component = 'div',
  interactive = false,
  selected,
  tone,
  status,
  padding = 'default',
  children,
  ...rest
}: BlockProps) => {
  return (
    <Component
      className={styles.block}
      data-block="true"
      data-interactive={interactive ? 'true' : undefined}
      data-selected={selected ? 'true' : undefined}
      data-tone={tone}
      data-status={status}
      data-padding={padding}
      {...rest}
    >
      {children}
    </Component>
  );
};
