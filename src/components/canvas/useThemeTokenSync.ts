import { useEffect, useCallback } from 'react';
import { useSettingsStore } from '../../stores/useSettingsStore';
import {
  useThreeTokenStore,
  extractThreeTokens,
} from '../../stores/useThreeTokenStore';

/**
 * Hook synchronising DOM theme tokens with the Three.js token store.
 * Performs a single-pass DOM read on theme change or DOM mutation,
 * avoiding per-frame layout thrashing.
 */
export function useThemeTokenSync(): void {
  const theme = useSettingsStore((state) => state.theme);
  const palette = useSettingsStore((state) => state.palette);
  const setTokens = useThreeTokenStore((state) => state.setTokens);

  const resolveTokens = useCallback(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const computed = window.getComputedStyle(document.documentElement);
    const snapshot = extractThreeTokens(computed, theme);
    setTokens(snapshot);
  }, [theme, palette, setTokens]);

  useEffect(() => {
    // 1. Resolve immediately on mount or store theme change
    resolveTokens();

    // 2. Observe DOM mutations on documentElement (data-theme, data-palette, class)
    let observer: MutationObserver | undefined;
    if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
      observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (
            mutation.type === 'attributes' &&
            (mutation.attributeName === 'data-theme' ||
              mutation.attributeName === 'data-palette' ||
              mutation.attributeName === 'class')
          ) {
            resolveTokens();
            break;
          }
        }
      });

      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme', 'data-palette', 'class'],
      });
    }

    // 3. Listen to prefers-reduced-motion changes
    let mql: MediaQueryList | undefined;
    const handleMotionChange = () => resolveTokens();
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      mql = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (typeof mql.addEventListener === 'function') {
        mql.addEventListener('change', handleMotionChange);
      } else if (typeof (mql as unknown as { addListener: (cb: () => void) => void }).addListener === 'function') {
        (mql as unknown as { addListener: (cb: () => void) => void }).addListener(handleMotionChange);
      }
    }

    return () => {
      observer?.disconnect();
      if (mql) {
        if (typeof mql.removeEventListener === 'function') {
          mql.removeEventListener('change', handleMotionChange);
        } else if (typeof (mql as unknown as { removeListener: (cb: () => void) => void }).removeListener === 'function') {
          (mql as unknown as { removeListener: (cb: () => void) => void }).removeListener(handleMotionChange);
        }
      }
    };
  }, [resolveTokens]);
}
