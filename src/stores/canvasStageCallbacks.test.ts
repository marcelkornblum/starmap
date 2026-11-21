import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getStageCallbacks,
  setStageCallbacks,
  subscribeStageCallbacks,
  resetStageCallbacks,
} from './canvasStageCallbacks';

describe('canvasStageCallbacks', () => {
  beforeEach(() => {
    resetStageCallbacks();
  });

  it('initialises with empty callbacks and does not attach globals', () => {
    expect(getStageCallbacks()).toEqual({});
    expect('__STARMAP_STAGE_CB__' in globalThis).toBe(false);
    expect('__STARMAP_STAGE_CB_LISTENERS__' in globalThis).toBe(false);
  });

  it('stores and retrieves callbacks in module-level registry', () => {
    const onInspect = vi.fn();
    const onSelect = vi.fn();
    const onFocusChange = vi.fn();

    setStageCallbacks({ onInspect, onSelect, onFocusChange });

    const callbacks = getStageCallbacks();
    expect(callbacks.onInspect).toBe(onInspect);
    expect(callbacks.onSelect).toBe(onSelect);
    expect(callbacks.onFocusChange).toBe(onFocusChange);

    callbacks.onInspect?.('alpha-centauri');
    expect(onInspect).toHaveBeenCalledWith('alpha-centauri');
  });

  it('notifies subscribers when callbacks change and skips redundant updates', () => {
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

  it('resets callbacks to empty and notifies subscribers when non-empty', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeStageCallbacks(listener);

    setStageCallbacks({ onInspect: vi.fn() });
    expect(listener).toHaveBeenCalledTimes(1);

    resetStageCallbacks();
    expect(getStageCallbacks()).toEqual({});
    expect(listener).toHaveBeenCalledTimes(2);

    // Calling resetStageCallbacks again when already empty is a no-op
    resetStageCallbacks();
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
  });
});
