import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useUIStore } from '../stores/useUIStore';

interface ForcedResolution<T> {
  readonly forInput: T;
}

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
  const inputToken = useMemo(() => ({ forInput: value }), [value]);
  const [forced, setForced] = useState<ForcedResolution<T> | null>(null);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      import.meta.env.MODE === 'test' ||
      Object.is(deferred, value)
    ) {
      return;
    }

    let unsubscribe: (() => void) | undefined;
    const timer = setTimeout(() => {
      if (!useUIStore.getState().isCameraTransitioning) {
        setForced(inputToken);
        return;
      }
      unsubscribe = useUIStore.subscribe((state) => {
        if (!state.isCameraTransitioning) {
          unsubscribe?.();
          unsubscribe = undefined;
          setForced(inputToken);
        }
      });
    }, maxWaitMs);

    return () => {
      clearTimeout(timer);
      unsubscribe?.();
    };
  }, [value, deferred, maxWaitMs, inputToken]);

  if (typeof window === 'undefined' || import.meta.env.MODE === 'test') {
    return value;
  }

  if (Object.is(deferred, value) || forced === inputToken) {
    return value;
  }

  return deferred;
}
