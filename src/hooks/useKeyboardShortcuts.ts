import { useEffect } from 'react';
import { useCameraStore } from '../stores/useCameraStore';
import { useUIStore } from '../stores/useUIStore';
import { useOptionalRouter, type StarmapSearchParams } from './useSpaLocation';

export interface UseKeyboardShortcutsOptions {
  readonly onTogglePlay?: () => void;
  readonly onSearchFocus?: () => void;
  readonly onRecenter?: () => void;
  readonly onClearFocus?: () => void;
}

export function isTypingInInputElement(target: EventTarget | null): boolean {
  if (!target || typeof target !== 'object') {
    return false;
  }
  const el = target as Partial<HTMLElement>;
  if (!el.tagName || typeof el.tagName !== 'string') {
    return false;
  }
  const tagName = el.tagName.toLowerCase();
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    return true;
  }
  if (el.isContentEditable) {
    return true;
  }
  if (el.contentEditable === 'true' || el.contentEditable === '') {
    return true;
  }
  if (typeof el.getAttribute === 'function') {
    const attr = el.getAttribute('contenteditable');
    if (attr === 'true' || attr === '') {
      return true;
    }
  }
  return false;
}

export function useKeyboardShortcuts(options?: UseKeyboardShortcutsOptions): void {
  const router = useOptionalRouter();

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      // 1. '/' focuses search input when not typing in an input
      if (event.key === '/') {
        if (!isTypingInInputElement(event.target)) {
          event.preventDefault();
          const searchInput = document.querySelector<HTMLInputElement>(
            '[data-testid="search-input"], input[type="search"], #starmap-search-input',
          );
          if (searchInput) {
            searchInput.focus();
            searchInput.select?.();
          }
          options?.onSearchFocus?.();
        }
        return;
      }

      // 2. 'Space' toggles simulation play/pause when not typing in an input
      if (event.key === ' ' || event.code === 'Space') {
        if (!isTypingInInputElement(event.target)) {
          event.preventDefault();
          if (options?.onTogglePlay) {
            options.onTogglePlay();
          } else {
            const playBtn = document.querySelector<HTMLButtonElement>(
              '[data-testid="control-bar-play-pause"]',
            );
            playBtn?.click();
          }
        }
        return;
      }

      // 3. 'r' or 'R' triggers recenter when not typing in an input
      if (event.key === 'r' || event.key === 'R') {
        if (!isTypingInInputElement(event.target)) {
          event.preventDefault();
          useCameraStore.getState().triggerRecenter();
          options?.onRecenter?.();
        }
        return;
      }

      // 4. 'Escape' closes active drawer or clears focus
      if (event.key === 'Escape') {
        const activeDrawer = useUIStore.getState().activeDrawer;
        if (activeDrawer !== null) {
          event.preventDefault();
          useUIStore.getState().setActiveDrawer(null);
        } else {
          if (options?.onClearFocus) {
            options.onClearFocus();
          } else {
            useCameraStore.getState().clearCanvasFocus();
            useCameraStore.getState().setPendingCenterSlug(null);
            const hasRouterFocus = Boolean(
              router?.state?.location?.search?.focus ||
                router?.state?.location?.searchStr?.includes('focus'),
            );
            if (router && typeof router.navigate === 'function' && hasRouterFocus) {
              useCameraStore.getState().setInFlightFocusSlug(null);
              const navPromise = router.navigate({
                to: '.',
                search: (prev: StarmapSearchParams = {}) => {
                  const next = { ...prev };
                  delete next.focus;
                  return next;
                },
                replace: true,
              });
              if (navPromise && typeof navPromise.then === 'function') {
                void navPromise.catch(() => {}).finally(() => {
                  if (useCameraStore.getState().inFlightFocusSlug === null) {
                    useCameraStore.getState().setInFlightFocusSlug(undefined);
                  }
                });
              } else {
                useCameraStore.getState().setInFlightFocusSlug(undefined);
              }
            } else {
              useCameraStore.getState().setInFlightFocusSlug(undefined);
            }
            if (document.activeElement instanceof HTMLElement) {
              document.activeElement.blur();
            }
          }
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [options, router]);
}
