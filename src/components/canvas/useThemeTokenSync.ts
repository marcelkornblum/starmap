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
  const setTokens = useThreeTokenStore((state) => state.setTokens);

  const resolveTokens = useCallback(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const computed = window.getComputedStyle(document.documentElement);
    const snapshot = extractThreeTokens(computed, theme);
    setTokens(snapshot);
  }, [theme, setTokens]);

  useEffect(() => {
    // 1. Resolve immediately on mount or store theme change
    resolveTokens();

    if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') {
      return;
    }

    // 2. Observe DOM mutations on documentElement (data-theme, class)
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === 'attributes' &&
          (mutation.attributeName === 'data-theme' || mutation.attributeName === 'class')
        ) {
          resolveTokens();
          break;
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class'],
    });

    return () => observer.disconnect();
  }, [resolveTokens]);
}
