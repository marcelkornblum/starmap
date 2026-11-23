import { useEffect, useLayoutEffect } from 'react';

/**
 * Resolves to `useLayoutEffect` in browser environments and `useEffect` during SSR.
 */
export const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;
