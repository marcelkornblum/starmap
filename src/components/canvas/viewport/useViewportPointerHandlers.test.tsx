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
  const mockInvalidate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.getState().registerEntity({
      id: 'star-1',
      name: 'Star 1',
      classification: 'star',
      position: [10, 20, 30],
    });
  });

  it('triggers onSelect / onFocusChange on entity click and invalidates canvas', () => {
    const { result } = renderHook(() =>
      useViewportPointerHandlers({
        storeApi: mockStore,
        occlusionManager: mockOcclusionManager,
        transitionTo,
        invalidate: mockInvalidate,
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
    expect(mockInvalidate).toHaveBeenCalledTimes(1);
  });

  it('transitions camera and triggers inspect on entity double click and invalidates canvas', () => {
    const { result } = renderHook(() =>
      useViewportPointerHandlers({
        storeApi: mockStore,
        occlusionManager: mockOcclusionManager,
        transitionTo,
        invalidate: mockInvalidate,
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
    expect(onSelect).not.toHaveBeenCalled();
    expect(onFocusChange).not.toHaveBeenCalled();
    expect(mockInvalidate).toHaveBeenCalledTimes(1);
  });

  it('falls back to onFocusChange or onSelect on double click only when onInspect is absent', () => {
    const { result: withFocus } = renderHook(() =>
      useViewportPointerHandlers({
        storeApi: mockStore,
        occlusionManager: mockOcclusionManager,
        transitionTo,
        invalidate: mockInvalidate,
        onSelect,
        onFocusChange,
      }),
    );

    const mockEvent = {} as ThreeEvent<MouseEvent>;
    act(() => {
      withFocus.current.handleEntityDoubleClick('star-1', mockEvent);
    });
    expect(onFocusChange).toHaveBeenCalledWith('star-1');
    expect(onSelect).not.toHaveBeenCalled();

    vi.clearAllMocks();
    const { result: withSelectOnly } = renderHook(() =>
      useViewportPointerHandlers({
        storeApi: mockStore,
        occlusionManager: mockOcclusionManager,
        transitionTo,
        invalidate: mockInvalidate,
        onSelect,
      }),
    );

    act(() => {
      withSelectOnly.current.handleEntityDoubleClick('star-1', mockEvent);
    });
    expect(onSelect).toHaveBeenCalledWith('star-1');
  });

  it('clears interaction and signals null on pointer missed and invalidates canvas', () => {
    const { result } = renderHook(() =>
      useViewportPointerHandlers({
        storeApi: mockStore,
        occlusionManager: mockOcclusionManager,
        transitionTo,
        invalidate: mockInvalidate,
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
    expect(mockInvalidate).toHaveBeenCalledTimes(1);
  });
});
