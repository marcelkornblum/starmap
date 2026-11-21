import { useEffect, useState } from 'react';
import { REDUCED_MOTION_MEDIA_QUERY, prefersReducedMotion } from '../utils/reducedMotion';

export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => prefersReducedMotion());

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia(REDUCED_MOTION_MEDIA_QUERY);
    if (!mediaQuery || typeof mediaQuery.addEventListener !== 'function') {
      return;
    }

    const handleChange = (event: MediaQueryListEvent): void => {
      setReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return reducedMotion;
}
