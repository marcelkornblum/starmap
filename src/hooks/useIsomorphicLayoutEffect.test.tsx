import { describe, it, expect } from 'vitest';
import { useEffect, useLayoutEffect } from 'react';
import { useIsomorphicLayoutEffect } from './useIsomorphicLayoutEffect';

describe('useIsomorphicLayoutEffect', () => {
  it('resolves to useLayoutEffect when window is defined', () => {
    expect(typeof window).not.toBe('undefined');
    expect(useIsomorphicLayoutEffect).toBe(useLayoutEffect);
    expect(useIsomorphicLayoutEffect).not.toBe(useEffect);
  });
});
