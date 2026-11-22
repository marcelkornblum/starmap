import { describe, it, expect, beforeEach } from 'vitest';
import {
  consumeSearchFocusForViewTransition,
  markSearchFocusForViewTransition,
  peekSearchFocusForViewTransition,
  resetSearchFocusContinuity,
} from './searchFocusContinuity';

describe('searchFocusContinuity', () => {
  beforeEach(() => {
    resetSearchFocusContinuity();
  });

  it('returns false initially before any transition is marked', () => {
    expect(consumeSearchFocusForViewTransition()).toBe(false);
  });

  it('peeks without consuming and consumes the marked transition focus flag as a one-shot boolean', () => {
    expect(peekSearchFocusForViewTransition()).toBe(false);
    markSearchFocusForViewTransition();

    expect(peekSearchFocusForViewTransition()).toBe(true);
    expect(peekSearchFocusForViewTransition()).toBe(true);
    expect(consumeSearchFocusForViewTransition()).toBe(true);
    expect(peekSearchFocusForViewTransition()).toBe(false);
    expect(consumeSearchFocusForViewTransition()).toBe(false);
  });

  it('clears a pending flag when resetSearchFocusContinuity is called', () => {
    markSearchFocusForViewTransition();
    resetSearchFocusContinuity();

    expect(consumeSearchFocusForViewTransition()).toBe(false);
  });
});
