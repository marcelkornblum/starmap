import type { ReactNode } from 'react';
import type { BasePrimitiveProps, SpacingScale } from '../types';
import styles from './Imposter.module.css';

export interface ImposterProps extends BasePrimitiveProps {
  position?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top' | 'bottom';
  fixed?: boolean;
  margin?: SpacingScale;
  children?: ReactNode;
}

export const Imposter = ({
  as = 'div',
  position = 'center',
  fixed = false,
  margin = 'default',
  children,
  ...rest
}: ImposterProps) => {
  const Tag = as as 'div';

  return (
    <Tag
      className={styles.imposter}
      data-position={position}
      data-fixed={fixed ? 'true' : undefined}
      data-margin={margin}
      {...rest}
    >
      {children}
    </Tag>
  );
};
