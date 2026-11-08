import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  useCanvasStageStore,
  setStageCallbacks,
  getStageCallbacks,
  subscribeStageCallbacks,
  type CanvasStageData,
} from './useCanvasStageStore';

describe('useCanvasStageStore', () => {
  beforeEach(() => {
    useCanvasStageStore.getState().resetCanvasStageStore();
  });

  it('initialises with default stage state and empty callbacks', () => {
    const state = useCanvasStageStore.getState();
    expect(state.isRootCanvasMounted).toBe(false);
    expect(state.activeSlotCount).toBe(0);
    expect(state.stageProps).toBeNull();
    expect(getStageCallbacks()).toEqual({});
  });

  it('updates mounted status and slot counts correctly', () => {
    const store = useCanvasStageStore.getState();
    store.setRootCanvasMounted(true);
    expect(useCanvasStageStore.getState().isRootCanvasMounted).toBe(true);

    store.mountSlot();
    store.mountSlot();
    expect(useCanvasStageStore.getState().activeSlotCount).toBe(2);

    store.unmountSlot();
    expect(useCanvasStageStore.getState().activeSlotCount).toBe(1);

    store.unmountSlot();
    store.unmountSlot();
    expect(useCanvasStageStore.getState().activeSlotCount).toBe(0);
  });

  it('stores strictly serialisable stageProps and strips callback functions', () => {
    const onInspect = vi.fn();
    const onSelect = vi.fn();

    const rawPropsWithFunctions = {
      scope: 'galaxy' as const,
      targetId: 'sol',
      centerId: 'sol',
      centerCoordinates: [0, 0, 0] as const,
      cameraDistance: 100,
      testId: 'custom-id',
      isRootHost: false,
      onInspect,
      onSelect,
    };

    useCanvasStageStore.getState().setStageProps(rawPropsWithFunctions);

    const stageProps = useCanvasStageStore.getState().stageProps;
    expect(stageProps).not.toBeNull();
    expect(stageProps?.scope).toBe('galaxy');
    expect(stageProps?.targetId).toBe('sol');
    expect(stageProps?.centerId).toBe('sol');
    expect(stageProps?.cameraDistance).toBe(100);

    // Assert callbacks and host flags are stripped from stageProps
    expect('onInspect' in (stageProps ?? {})).toBe(false);
    expect('onSelect' in (stageProps ?? {})).toBe(false);
    expect('isRootHost' in (stageProps ?? {})).toBe(false);
    expect('testId' in (stageProps ?? {})).toBe(false);

    // Verify strict serialisability
    const serialised = JSON.stringify(stageProps);
    const parsed = JSON.parse(serialised) as CanvasStageData;
    expect(parsed).toEqual(stageProps);
  });

  it('isolates stage callbacks in module-level getter/setter', () => {
    const onInspect = vi.fn();
    const onSelect = vi.fn();

    setStageCallbacks({ onInspect, onSelect });
    const callbacks = getStageCallbacks();
    expect(callbacks.onInspect).toBe(onInspect);
    expect(callbacks.onSelect).toBe(onSelect);

    callbacks.onInspect?.('alpha-centauri');
    expect(onInspect).toHaveBeenCalledWith('alpha-centauri');
  });

  it('clears stageProps and resets callbacks on clearStageProps and resetCanvasStageStore', () => {
    setStageCallbacks({ onInspect: vi.fn(), onSelect: vi.fn() });
    useCanvasStageStore.getState().setStageProps({ scope: 'system', targetId: 'tau-ceti' });

    useCanvasStageStore.getState().clearStageProps();
    expect(useCanvasStageStore.getState().stageProps).toBeNull();
    expect(getStageCallbacks()).toEqual({});

    setStageCallbacks({ onInspect: vi.fn() });
    useCanvasStageStore.getState().setRootCanvasMounted(true);
    useCanvasStageStore.getState().resetCanvasStageStore();
    expect(useCanvasStageStore.getState().isRootCanvasMounted).toBe(false);
    expect(getStageCallbacks()).toEqual({});
  });

  it('notifies subscribers when stage callbacks change and skips redundant notifications', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeStageCallbacks(listener);
    const onInspect = vi.fn();

    setStageCallbacks({ onInspect });
    expect(listener).toHaveBeenCalledTimes(1);

    setStageCallbacks({ onInspect });
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    setStageCallbacks({});
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
