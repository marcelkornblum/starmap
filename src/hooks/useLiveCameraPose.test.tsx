import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCameraStore } from '../stores/useCameraStore';
import { useLiveCameraPose } from './useLiveCameraPose';

describe('useLiveCameraPose', () => {
  let rafQueue: Array<{ id: number; cb: FrameRequestCallback }>;
  let nextRafId: number;
  let rafSpy: ReturnType<typeof vi.spyOn>;
  let cancelSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    useCameraStore.getState().reset();
    rafQueue = [];
    nextRafId = 1;
    rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      const id = nextRafId++;
      rafQueue.push({ id, cb });
      return id;
    });
    cancelSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
      rafQueue = rafQueue.filter((item) => item.id !== id);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function flushNextFrame() {
    const batch = rafQueue.splice(0, rafQueue.length);
    for (const item of batch) {
      item.cb(performance.now());
    }
  }

  it('returns the initial camera pose and coalesces multiple store updates into one rAF update', () => {
    let renderCount = 0;
    const { result } = renderHook(() => {
      renderCount += 1;
      return useLiveCameraPose(true);
    });

    expect(result.current.position).toEqual([0, 0, 10]);
    expect(result.current.up).toEqual([0, 1, 0]);
    const initialRenders = renderCount;

    act(() => {
      useCameraStore.getState().setCameraPose({
        position: [1, 2, 3],
        target: [0, 0, 0],
        up: [0, 0, 1],
      });
      useCameraStore.getState().setCameraPose({
        position: [4, 5, 6],
        target: [1, 0, 0],
        up: [0, 0, 1],
      });
      useCameraStore.getState().setCameraPose({
        position: [-14, -22, 15],
        target: [0, 0, 0],
        up: [0, 0, 1],
      });
    });

    expect(rafSpy).toHaveBeenCalledTimes(1);
    expect(renderCount).toBe(initialRenders);

    act(() => {
      flushNextFrame();
    });

    expect(renderCount).toBe(initialRenders + 1);
    expect(result.current.position).toEqual([-14, -22, 15]);
    expect(result.current.target).toEqual([0, 0, 0]);
    expect(result.current.up).toEqual([0, 0, 1]);
  });

  it('does not subscribe or schedule rAF updates when enabled is false', () => {
    const { result } = renderHook(() => useLiveCameraPose(false));

    act(() => {
      useCameraStore.getState().setCameraPose({
        position: [10, 20, 30],
        target: [0, 0, 0],
        up: [0, 0, 1],
      });
    });

    expect(rafSpy).not.toHaveBeenCalled();
    expect(result.current.position).toEqual([0, 0, 10]);
  });

  it('cancels pending rAF callback on unmount', () => {
    const { unmount } = renderHook(() => useLiveCameraPose(true));

    act(() => {
      useCameraStore.getState().setCameraPose({
        position: [5, 5, 5],
        target: [0, 0, 0],
        up: [0, 0, 1],
      });
    });

    expect(rafQueue.length).toBe(1);
    const pendingId = rafQueue[0].id;
    unmount();

    expect(cancelSpy).toHaveBeenCalledWith(pendingId);
    expect(rafQueue.length).toBe(0);
  });
});
