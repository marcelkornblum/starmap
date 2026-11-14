import type { ReactNode } from 'react';
import type { BasePrimitiveProps } from '../types';
import styles from './Icon.module.css';

export interface IconProps extends BasePrimitiveProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  direction?: 'left' | 'right' | 'up' | 'down';
  children?: ReactNode;
}

const renderDirectionArrow = (direction: 'left' | 'right' | 'up' | 'down'): ReactNode => {
  let pathD = '';
  switch (direction) {
    case 'right':
      pathD = 'M4 2.5L7.5 6L4 9.5';
      break;
    case 'left':
      pathD = 'M8 2.5L4.5 6L8 9.5';
      break;
    case 'up':
      pathD = 'M2.5 8L6 4.5L9.5 8';
      break;
    case 'down':
      pathD = 'M2.5 4L6 7.5L9.5 4';
      break;
  }

  return (
    <svg
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      data-direction={direction}
    >
      <path d={pathD} />
    </svg>
  );
};

export const Icon = ({
  as = 'span',
  size = 'md',
  direction,
  children,
  ...rest
}: IconProps) => {
  const Tag = as as 'span';
  const content = direction ? renderDirectionArrow(direction) : children;

  return (
    <Tag
      className={styles.icon}
      data-size={size}
      aria-hidden="true"
      {...rest}
    >
      {content}
    </Tag>
  );
};
