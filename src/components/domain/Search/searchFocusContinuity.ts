export interface PreSearchOrigin {
  readonly pathname: string;
  readonly search: string;
  readonly target: readonly [number, number, number];
  readonly distance: number;
}

let pendingViewTransitionFocus = false;
let preSearchOrigin: PreSearchOrigin | null = null;

/**
 * Stores the pre-search spatial origin (route + camera pose) across cross-scale view transitions.
 */
export function setPreSearchOrigin(origin: PreSearchOrigin): void {
  preSearchOrigin = {
    pathname: origin.pathname,
    search: origin.search,
    target: [origin.target[0], origin.target[1], origin.target[2]],
    distance: origin.distance,
  };
}

/**
 * Reads the saved pre-search origin if one is currently active.
 */
export function getPreSearchOrigin(): PreSearchOrigin | null {
  return preSearchOrigin;
}

/**
 * Clears any saved pre-search origin.
 */
export function clearPreSearchOrigin(): void {
  preSearchOrigin = null;
}

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
  preSearchOrigin = null;
}
