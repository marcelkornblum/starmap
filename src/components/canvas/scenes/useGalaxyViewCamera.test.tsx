import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGalaxyViewCamera } from './useGalaxyViewCamera';
import { useCameraStore } from '../../../stores/useCameraStore';

describe('useGalaxyViewCamera hook', () => {
  beforeEach(() => {
    useCameraStore.getState().reset();
  });

  it('computes standard camera configuration for galactic scene', () => {
    const { result } = renderHook(() => useGalaxyViewCamera());
    expect(result.current.position).toBeDefined();
    expect(result.current.target).toEqual([0, 0, 0]);
    expect(result.current.up).toEqual([0, 0, 1]);
  });

  it('restores saved camera when saved pose matches target', () => {
    useCameraStore.getState().setSavedGalaxyCamera({
      position: [10, 20, 30],
      target: [0, 0, 0],
      up: [0, 1, 0],
      zoom: 1,
      focalDistance: 28,
      centerKey: '0,0,0',
    });

    const { result } = renderHook(() => useGalaxyViewCamera());
    expect(result.current.position).toEqual([10, 20, 30]);
    expect(result.current.target).toEqual([0, 0, 0]);
    expect(result.current.up).toEqual([0, 1, 0]);
    expect(result.current.fov).toBe(45);
  });
});
