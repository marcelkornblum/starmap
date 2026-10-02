import type { HTMLAttributes, ReactNode } from 'react';

export type SpacingScale =
  | 'none'
  | 'tight'
  | 'default'
  | 'loose'
  | 'space-1'
  | 'space-2'
  | 'space-3'
  | 'space-4'
  | 'space-5'
  | 'space-6'
  | 'space-7'
  | 'space-8'
  | 'space-9';

export type AlignItems = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
export type JustifyContent = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';

export interface BasePrimitiveProps extends HTMLAttributes<HTMLElement> {
  as?: keyof React.JSX.IntrinsicElements;
  children?: ReactNode;
}
