import { useEffect, useCallback } from 'react';
import { useSettingsStore, type UITheme } from '../../stores/useSettingsStore';
import { useThreeTokenStore } from '../../stores/useThreeTokenStore';
import { classifyDeviceTier, subscribeDeviceTier } from '../../services/deviceTierService';
import { extractThreeTokens } from '../../utils/extractThreeTokens';
import { syncThemeColorMeta } from '../../styles/tokens/paletteTheme';

function syncDocumentAttributes(theme: UITheme, palette: string): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (root.getAttribute('data-theme') !== theme) {
    root.setAttribute('data-theme', theme);
  }
  if (root.getAttribute('data-palette') !== palette) {
    root.setAttribute('data-palette', palette);
  }
  syncThemeColorMeta(theme);
}

function syncDeviceTierAttribute(): void {
  if (typeof document === 'undefined') return;
  const tier = classifyDeviceTier();
  if (document.documentElement.dataset.deviceTier !== tier) {
    document.documentElement.dataset.deviceTier = tier;
  }
}

/**
 * Hook synchronising DOM theme tokens, palette attributes, and device performance tier
 * with the settings and Three.js token stores.
 * Performs a single-pass DOM read on theme change or DOM mutation,
 * avoiding per-frame layout thrashing.
 */
export function useThemeTokenSync(): void {
  const setTokens = useThreeTokenStore((state) => state.setTokens);

  const resolveTokens = useCallback(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const computed = window.getComputedStyle(document.documentElement);
    const theme = useSettingsStore.getState().theme;
    const snapshot = extractThreeTokens(computed, theme);
    setTokens(snapshot);
  }, [setTokens]);

  useEffect(() => {
    // 1. Sync initial DOM attributes & device tier, then resolve tokens
    const initialState = useSettingsStore.getState();
    syncDocumentAttributes(initialState.theme, initialState.palette);
    syncDeviceTierAttribute();
    resolveTokens();

    // 2. Subscribe to store theme/palette changes
    const unsubscribeSettings = useSettingsStore.subscribe((state, prevState) => {
      if (state.theme !== prevState.theme || state.palette !== prevState.palette) {
        syncDocumentAttributes(state.theme, state.palette);
        resolveTokens();
      }
    });

    // 3. Subscribe to runtime device tier updates
    const unsubscribeDeviceTier = subscribeDeviceTier(() => {
      syncDeviceTierAttribute();
    });

    // 4. Observe DOM mutations on documentElement (data-theme, data-palette, class)
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

    // 5. Listen to prefers-reduced-motion changes
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
      unsubscribeSettings();
      unsubscribeDeviceTier();
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
