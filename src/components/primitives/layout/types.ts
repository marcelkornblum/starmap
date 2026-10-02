import type { HTMLAttributes, ReactNode } from 'react';

export type SpacingScale =
  | 'none'
  | 'dense'
  | 'tight'
  | 'default'
  | 'loose'
  | 'section'
  | 'fib-1'
  | 'fib-2'
  | 'fib-3'
  | 'fib-4'
  | 'fib-5'
  | 'fib-6'
  | 'fib-7';

export type AlignItems = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
export type JustifyContent = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';

export interface BasePrimitiveProps extends HTMLAttributes<HTMLElement> {
  as?: keyof React.JSX.IntrinsicElements;
  children?: ReactNode;
}
