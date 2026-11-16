import { useDeferredValue, useEffect, useState } from 'react';

/**
 * useBoundedDeferredValue:
 * Defers value transitions using React 19's `useDeferredValue`, but imposes a maximum
 * latency bound (`maxWaitMs`). If continuous high-frequency frame tasks (e.g. SwiftShader useFrame loops)
 * starve React's transition lane past `maxWaitMs`, this hook forces the latest value into state.
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

    const timer = setTimeout(() => {
      setForcedValue(value);
    }, maxWaitMs);

    return () => clearTimeout(timer);
  }, [value, deferred, maxWaitMs]);

  if (typeof window === 'undefined' || import.meta.env.MODE === 'test') {
    return value;
  }

  if (deferred === value || forcedValue === value) {
    return value;
  }

  return forcedValue ?? deferred;
}
