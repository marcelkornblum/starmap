import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGalacticCeilingDistance } from './useGalacticCeilingDistance';

describe('useGalacticCeilingDistance hook', () => {
  it('returns a finite maxSafeDistance and setter', () => {
    const { result } = renderHook(() => useGalacticCeilingDistance());
    const [maxDistance, setCeilingRadius] = result.current;

    expect(Number.isFinite(maxDistance)).toBe(true);
    expect(maxDistance).toBeGreaterThan(0);

    act(() => {
      setCeilingRadius(50);
    });

    const [updatedDistance] = result.current;
    expect(Number.isFinite(updatedDistance)).toBe(true);
  });
});
