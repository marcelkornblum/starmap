import { describe, it, expect } from 'vitest';
import { compareComponentsByMagnitude } from './multiStarConsolidation';

describe('compareComponentsByMagnitude', () => {
  it('orders finite magnitudes with brighter (lower numerical magnitude) stars first', () => {
    const starA = { id: 'star-a', mag: -1.44 };
    const starB = { id: 'star-b', mag: 0.03 };
    const starC = { id: 'star-c', mag: 4.5 };

    expect(compareComponentsByMagnitude(starA, starB)).toBeLessThan(0);
    expect(compareComponentsByMagnitude(starB, starA)).toBeGreaterThan(0);
    expect(compareComponentsByMagnitude(starB, starC)).toBeLessThan(0);
    expect(compareComponentsByMagnitude(starC, starB)).toBeGreaterThan(0);

    const sorted = [starC, starA, starB].sort(compareComponentsByMagnitude);
    expect(sorted.map((s) => s.id)).toEqual(['star-a', 'star-b', 'star-c']);
  });

  it('orders finite magnitudes before undefined, NaN, and infinite magnitudes', () => {
    const finite = { id: 'star-finite', mag: 6.2 };
    const undef = { id: 'star-undef', mag: undefined };
    const nan = { id: 'star-nan', mag: Number.NaN };
    const inf = { id: 'star-inf', mag: Number.POSITIVE_INFINITY };

    expect(compareComponentsByMagnitude(finite, undef)).toBeLessThan(0);
    expect(compareComponentsByMagnitude(undef, finite)).toBeGreaterThan(0);

    expect(compareComponentsByMagnitude(finite, nan)).toBeLessThan(0);
    expect(compareComponentsByMagnitude(nan, finite)).toBeGreaterThan(0);

    expect(compareComponentsByMagnitude(finite, inf)).toBeLessThan(0);
    expect(compareComponentsByMagnitude(inf, finite)).toBeGreaterThan(0);
  });

  it('falls back to deterministic ID tie-breaking when magnitudes are equal or non-finite', () => {
    const compA = { id: 'hip-100', mag: 3.5 };
    const compB = { id: 'hip-200', mag: 3.5 };

    expect(compareComponentsByMagnitude(compA, compB)).toBeLessThan(0);
    expect(compareComponentsByMagnitude(compB, compA)).toBeGreaterThan(0);

    const nonFiniteA = { id: 'alpha', mag: undefined };
    const nonFiniteB = { id: 'beta', mag: Number.NaN };

    expect(compareComponentsByMagnitude(nonFiniteA, nonFiniteB)).toBeLessThan(0);
    expect(compareComponentsByMagnitude(nonFiniteB, nonFiniteA)).toBeGreaterThan(0);

    const identical = { id: 'hip-100', mag: 3.5 };
    expect(compareComponentsByMagnitude(compA, identical)).toBe(0);
  });
});
