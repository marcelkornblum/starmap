import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useViewportPointerHandlers } from './useViewportPointerHandlers';
import { createSpatialEntityStore } from '../entity';
import { resetStageCallbacks, setStageCallbacks } from '../../../stores/canvasStageCallbacks';
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
    resetStageCallbacks();
    mockStore.getState().setFocused(null);
    mockStore.getState().setSelected(null);
    mockStore.getState().registerEntity({
      id: 'star-1',
      name: 'Star 1',
      classification: 'star',
      position: [10, 20, 30],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetStageCallbacks();
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

  it('transitions camera using adaptive duration when focusTransitionDuration is omitted and triggers inspect on double click', () => {
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

    expect(transitionTo).toHaveBeenCalledWith([10, 20, 30], undefined);
    expect(onInspect).toHaveBeenCalledWith('star-1');
    expect(onDoubleClick).toHaveBeenCalledWith('star-1', mockEvent);
    expect(onSelect).not.toHaveBeenCalled();
    expect(onFocusChange).not.toHaveBeenCalled();
    expect(mockInvalidate).toHaveBeenCalledTimes(1);
  });

  it('forwards explicit focusTransitionDuration when provided', () => {
    const { result } = renderHook(() =>
      useViewportPointerHandlers({
        storeApi: mockStore,
        occlusionManager: mockOcclusionManager,
        transitionTo,
        invalidate: mockInvalidate,
        focusTransitionDuration: 0.6,
        onInspect,
      }),
    );

    const mockEvent = {} as ThreeEvent<MouseEvent>;
    act(() => {
      result.current.handleEntityDoubleClick('star-1', mockEvent);
    });

    expect(transitionTo).toHaveBeenCalledWith([10, 20, 30], { duration: 0.6 });
  });

  it('skips toggling focus off on click #2 (detail >= 2) so double-click glides cleanly without unmounting details', () => {
    mockStore.getState().setFocused('star-1');
    const { result } = renderHook(() =>
      useViewportPointerHandlers({
        storeApi: mockStore,
        occlusionManager: mockOcclusionManager,
        transitionTo,
        invalidate: mockInvalidate,
        onInspect,
        onSelect,
        onFocusChange,
      }),
    );

    act(() => {
      result.current.handleEntityClick('star-1', { detail: 2 } as unknown as ThreeEvent<MouseEvent>);
    });
    expect(mockStore.getState().focusedId).toBe('star-1');
    expect(onFocusChange).not.toHaveBeenCalled();
    expect(mockInvalidate).not.toHaveBeenCalled();

    act(() => {
      result.current.handleEntityClick('star-1', {
        nativeEvent: { detail: 2 },
      } as unknown as ThreeEvent<MouseEvent>);
    });
    expect(mockStore.getState().focusedId).toBe('star-1');
    expect(onFocusChange).not.toHaveBeenCalled();
    expect(mockInvalidate).not.toHaveBeenCalled();
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

  it('defers clearInteraction on touch miss when onTouchPointerMissed consumes the tap, and clears when it returns false', () => {
    mockStore.getState().setFocused('star-1');
    const onTouchPointerMissed = vi
      .fn<() => boolean>()
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);

    const { result } = renderHook(() =>
      useViewportPointerHandlers({
        storeApi: mockStore,
        occlusionManager: mockOcclusionManager,
        transitionTo,
        invalidate: mockInvalidate,
        onSelect,
        onFocusChange,
        onTouchPointerMissed,
      }),
    );

    const touchEvent = { pointerType: 'touch' } as unknown as PointerEvent;

    // Step 1: onTouchPointerMissed returns true -> retains focus
    act(() => {
      result.current.handlePointerMissed(touchEvent);
    });

    expect(onTouchPointerMissed).toHaveBeenCalledTimes(1);
    expect(mockStore.getState().focusedId).toBe('star-1');
    expect(onSelect).not.toHaveBeenCalled();
    expect(onFocusChange).not.toHaveBeenCalled();
    expect(mockInvalidate).toHaveBeenCalledTimes(1);

    // Step 2: onTouchPointerMissed returns false -> clears focus and signals null
    act(() => {
      result.current.handlePointerMissed(touchEvent);
    });

    expect(onTouchPointerMissed).toHaveBeenCalledTimes(2);
    expect(mockStore.getState().focusedId).toBeNull();
    expect(onSelect).toHaveBeenCalledWith(null);
    expect(onFocusChange).toHaveBeenCalledWith(null);
    expect(mockInvalidate).toHaveBeenCalledTimes(2);
  });

  it('falls back to stageCallbacks.onTouchPointerMissed when onTouchPointerMissed prop is omitted', () => {
    mockStore.getState().setFocused('star-1');
    const stageTouchMiss = vi.fn(() => true);
    setStageCallbacks({ onTouchPointerMissed: stageTouchMiss });

    const { result } = renderHook(() =>
      useViewportPointerHandlers({
        storeApi: mockStore,
        occlusionManager: mockOcclusionManager,
        transitionTo,
        invalidate: mockInvalidate,
        onSelect,
        onFocusChange,
      }),
    );

    const touchEvent = { pointerType: 'touch' } as unknown as PointerEvent;
    act(() => {
      result.current.handlePointerMissed(touchEvent);
    });

    expect(stageTouchMiss).toHaveBeenCalledTimes(1);
    expect(mockStore.getState().focusedId).toBe('star-1');
    expect(onSelect).not.toHaveBeenCalled();
    expect(onFocusChange).not.toHaveBeenCalled();
  });

  it('immediately clears interaction on mouse pointer missed without invoking onTouchPointerMissed', () => {
    mockStore.getState().setFocused('star-1');
    const onTouchPointerMissed = vi.fn(() => true);

    const { result } = renderHook(() =>
      useViewportPointerHandlers({
        storeApi: mockStore,
        occlusionManager: mockOcclusionManager,
        transitionTo,
        invalidate: mockInvalidate,
        onSelect,
        onFocusChange,
        onTouchPointerMissed,
      }),
    );

    const mouseEvent = { pointerType: 'mouse' } as unknown as PointerEvent;
    act(() => {
      result.current.handlePointerMissed(mouseEvent);
    });

    expect(onTouchPointerMissed).not.toHaveBeenCalled();
    expect(mockStore.getState().focusedId).toBeNull();
    expect(onSelect).toHaveBeenCalledWith(null);
    expect(onFocusChange).toHaveBeenCalledWith(null);
  });

  it('uses last pointerdown pointerType and suppresses camera drags exceeding touch tap slop', () => {
    mockStore.getState().setFocused('star-1');
    const onTouchPointerMissed = vi.fn(() => true);

    const { result } = renderHook(() =>
      useViewportPointerHandlers({
        storeApi: mockStore,
        occlusionManager: mockOcclusionManager,
        transitionTo,
        invalidate: mockInvalidate,
        onSelect,
        onFocusChange,
        onTouchPointerMissed,
      }),
    );

    // 1. Touch drag > 14px should NOT invoke onTouchPointerMissed or clear focus
    act(() => {
      result.current.recordPointerDown({ pointerType: 'touch', clientX: 100, clientY: 100 });
      result.current.handlePointerMissed({ clientX: 130, clientY: 100 } as unknown as MouseEvent);
    });

    expect(onTouchPointerMissed).not.toHaveBeenCalled();
    expect(mockStore.getState().focusedId).toBe('star-1');
    expect(onSelect).not.toHaveBeenCalled();

    // 2. Touch tap <= 14px (with synthetic MouseEvent lacking pointerType) invokes onTouchPointerMissed
    act(() => {
      result.current.recordPointerDown({ pointerType: 'touch', clientX: 100, clientY: 100 });
      result.current.handlePointerMissed({ clientX: 108, clientY: 104 } as unknown as MouseEvent);
    });

    expect(onTouchPointerMissed).toHaveBeenCalledTimes(1);
    expect(mockStore.getState().focusedId).toBe('star-1');
    expect(onSelect).not.toHaveBeenCalled();
  });
});
