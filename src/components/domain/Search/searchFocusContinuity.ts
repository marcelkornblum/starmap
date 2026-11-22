let pendingViewTransitionFocus = false;

/**
 * Marks that an imminent cross-scale search navigation should preserve search
 * focus and open results in the incoming view's `<SearchRoot />`.
 */
export function markSearchFocusForViewTransition(): void {
  pendingViewTransitionFocus = true;
}

/**
 * Reads whether a cross-scale search focus transition is pending without consuming it.
 */
export function peekSearchFocusForViewTransition(): boolean {
  return pendingViewTransitionFocus;
}

/**
 * Consumes the one-shot cross-scale search focus continuity flag on mount.
 */
export function consumeSearchFocusForViewTransition(): boolean {
  if (!pendingViewTransitionFocus) {
    return false;
  }
  pendingViewTransitionFocus = false;
  return true;
}

/**
 * Resets cross-scale search focus continuity state (primarily for test isolation).
 */
export function resetSearchFocusContinuity(): void {
  pendingViewTransitionFocus = false;
}
