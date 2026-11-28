import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUIStore } from '../stores/useUIStore';
import { usePanelsReadyAfterTransition } from './usePanelsReadyAfterTransition';

describe('usePanelsReadyAfterTransition', () => {
  beforeEach(() => {
    useUIStore.getState().resetUI();
  });

  it('returns true immediately when no camera transition is active', () => {
    const { result } = renderHook(() => usePanelsReadyAfterTransition());
    expect(result.current).toBe(true);
  });

  it('waits until isCameraTransitioning becomes false before returning true', () => {
    useUIStore.setState({ isCameraTransitioning: true });
    const { result } = renderHook(() => usePanelsReadyAfterTransition());
    expect(result.current).toBe(false);

    act(() => {
      useUIStore.getState().setCameraTransitioning(false);
    });
    expect(result.current).toBe(true);
  });
});
