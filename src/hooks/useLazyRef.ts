import { useRef } from 'react';

/**
 * Returns a persistent mutable ref whose value is initialized lazily on mount
 * via the provided factory function. Avoids per-render object instantiation
 * and eliminates non-null assertions or manual null checks in component bodies.
 */
export function useLazyRef<T>(factory: () => T): React.MutableRefObject<T> {
  const ref = useRef<T | null>(null);
  if (ref.current === null) {
    ref.current = factory();
  }
  return ref as React.MutableRefObject<T>;
}
