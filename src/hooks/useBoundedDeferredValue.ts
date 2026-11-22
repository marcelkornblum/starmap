import { useDeferredValue, useEffect, useState } from 'react';
import { useUIStore } from '../stores/useUIStore';

/**
 * useBoundedDeferredValue:
 * Defers value transitions using React 19's `useDeferredValue`, imposing a maximum
 * latency bound (`maxWaitMs`) while avoiding synchronous flushes mid-camera-glide.
 *
 * In tests or SSR, it resolves `value` immediately.
 */
export function useBoundedDeferredValue<T>(
  value: T,
  initialValue: T | null = value,
  maxWaitMs = 900,
): T | null {
  const deferred = useDeferredValue<T | null>(value, initialValue);
  const [forcedValue, setForcedValue] = useState<T | null>(null);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      import.meta.env.MODE === 'test' ||
      deferred === value
    ) {
      return;
    }

    let unsubscribe: (() => void) | undefined;
    const timer = setTimeout(() => {
      if (!useUIStore.getState().isCameraTransitioning) {
        setForcedValue(value);
        return;
      }
      unsubscribe = useUIStore.subscribe((state) => {
        if (!state.isCameraTransitioning) {
          unsubscribe?.();
          unsubscribe = undefined;
          setForcedValue(value);
        }
      });
    }, maxWaitMs);

    return () => {
      clearTimeout(timer);
      unsubscribe?.();
    };
  }, [value, deferred, maxWaitMs]);

  if (typeof window === 'undefined' || import.meta.env.MODE === 'test') {
    return value;
  }

  if (deferred === value || forcedValue === value) {
    return value;
  }

  return deferred;
}
