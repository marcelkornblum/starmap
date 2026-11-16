import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGalaxyViewCamera, resolveCenterCoords } from './useGalaxyViewCamera';
import { useCameraStore } from '../../../stores/useCameraStore';

describe('useGalaxyViewCamera hook and resolveCenterCoords utility', () => {
  beforeEach(() => {
    useCameraStore.getState().reset();
  });

  it('resolves coordinates correctly from array, object, or undefined', () => {
    expect(resolveCenterCoords()).toEqual([0, 0, 0]);
    expect(resolveCenterCoords([1, 2, 3])).toEqual([1, 2, 3]);
    expect(resolveCenterCoords({ x: 4, y: 5, z: 6 })).toEqual([4, 5, 6]);
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
