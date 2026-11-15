import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useViewportPointerHandlers } from './useViewportPointerHandlers';
import { createSpatialEntityStore } from '../entity';
import type { ThreeEvent } from '@react-three/fiber';

describe('useViewportPointerHandlers hook', () => {
  const mockStore = createSpatialEntityStore();

  const mockOcclusionManager = {
    getCyclicSelectionTarget: vi.fn((id: string) => id),
  } as unknown as Parameters<typeof useViewportPointerHandlers>[0]['occlusionManager'];

  const transitionTo = vi.fn();
  const onInspect = vi.fn();
  const onSelect = vi.fn();
  const onFocusChange = vi.fn();
  const onDoubleClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.getState().registerEntity({
      id: 'star-1',
      name: 'Star 1',
      classification: 'star',
      position: [10, 20, 30],
    });
  });

  it('triggers onSelect / onFocusChange on entity click', () => {
    const { result } = renderHook(() =>
      useViewportPointerHandlers({
        storeApi: mockStore,
        occlusionManager: mockOcclusionManager,
        transitionTo,
        onInspect,
        onSelect,
        onFocusChange,
        onDoubleClick,
      }),
    );

    act(() => {
      result.current.handleEntityClick('star-1');
    });

    expect(onFocusChange).toHaveBeenCalled();
  });

  it('transitions camera and triggers inspect on entity double click', () => {
    const { result } = renderHook(() =>
      useViewportPointerHandlers({
        storeApi: mockStore,
        occlusionManager: mockOcclusionManager,
        transitionTo,
        onInspect,
        onSelect,
        onFocusChange,
        onDoubleClick,
      }),
    );

    const mockEvent = {} as ThreeEvent<MouseEvent>;
    act(() => {
      result.current.handleEntityDoubleClick('star-1', mockEvent);
    });

    expect(transitionTo).toHaveBeenCalledWith([10, 20, 30], { duration: 0.8 });
    expect(onInspect).toHaveBeenCalledWith('star-1');
    expect(onDoubleClick).toHaveBeenCalledWith('star-1', mockEvent);
  });

  it('clears interaction and signals null on pointer missed', () => {
    const { result } = renderHook(() =>
      useViewportPointerHandlers({
        storeApi: mockStore,
        occlusionManager: mockOcclusionManager,
        transitionTo,
        onInspect,
        onSelect,
        onFocusChange,
        onDoubleClick,
      }),
    );

    act(() => {
      result.current.handlePointerMissed();
    });

    expect(onSelect).toHaveBeenCalledWith(null);
    expect(onFocusChange).toHaveBeenCalledWith(null);
  });
});
