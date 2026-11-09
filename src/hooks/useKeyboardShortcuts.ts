import { useEffect } from 'react';
import { useCameraStore } from '../stores/useCameraStore';
import { useUIStore } from '../stores/useUIStore';

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
            try {
              if (typeof window !== 'undefined') {
                const searchParams = new URLSearchParams(window.location.search);
                if (searchParams.has('focus')) {
                  searchParams.delete('focus');
                  const newQs = searchParams.toString();
                  const newUrl = `${window.location.pathname}${newQs ? `?${newQs}` : ''}${window.location.hash}`;
                  window.history.replaceState(window.history.state, '', newUrl);
                  window.dispatchEvent(new Event('starmap:locationchange'));
                }
              }
            } catch {
              // noop
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
  }, [options]);
}
