import type { ReactNode } from 'react';
import type { BasePrimitiveProps, SpacingScale } from '../types';
import styles from './Box.module.css';

export interface BoxProps extends BasePrimitiveProps {
  padding?: SpacingScale;
  border?: 'none' | 'subtle' | 'default' | 'accent';
  background?: 'canvas' | 'sunken' | 'panel' | 'dock' | 'overlay';
  children?: ReactNode;
}

export const Box = ({
  as = 'div',
  padding = 'default',
  border = 'none',
  background,
  children,
  ...rest
}: BoxProps) => {
  const Tag = as as 'div';

  return (
    <Tag
      className={styles.box}
      data-padding={padding}
      data-border={border}
      data-background={background}
      {...rest}
    >
      {children}
    </Tag>
  );
};
