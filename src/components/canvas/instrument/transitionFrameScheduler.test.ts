import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  CONSTRAINED_GPU_FRAME_INTERVAL_MS,
  createTransitionFrameScheduler,
} from './transitionFrameScheduler';
import {
  registerWebGLGpuTelemetry,
  resetDeviceTierRuntimeState,
} from '../../../services/deviceTierService';

describe('transitionFrameScheduler', () => {
  afterEach(() => {
    resetDeviceTierRuntimeState();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('invalidates immediately per frame on unconstrained hardware GPUs', () => {
    registerWebGLGpuTelemetry({ gpuRenderer: 'Apple M3 Pro' });
    const scheduler = createTransitionFrameScheduler();
    const invalidate = vi.fn<() => void>();

    scheduler.requestInitial(invalidate);
    expect(invalidate).toHaveBeenCalledTimes(1);

    scheduler.requestNext(invalidate, () => true);
    expect(invalidate).toHaveBeenCalledTimes(2);
  });

  it('paces invalidate calls on constrained software GPUs and cancels pending timers', () => {
    vi.useFakeTimers();
    registerWebGLGpuTelemetry({ gpuRenderer: 'ANGLE (Google, SwiftShader)' });
    let nowMs = 500;
    vi.spyOn(performance, 'now').mockImplementation(() => nowMs);
    const scheduler = createTransitionFrameScheduler();
    const invalidate = vi.fn<() => void>();

    scheduler.requestInitial(invalidate);
    expect(invalidate).toHaveBeenCalledTimes(1);

    nowMs = 516;
    scheduler.requestNext(invalidate, () => true);
    expect(invalidate).toHaveBeenCalledTimes(1);

    nowMs = 500 + CONSTRAINED_GPU_FRAME_INTERVAL_MS;
    vi.advanceTimersByTime(CONSTRAINED_GPU_FRAME_INTERVAL_MS);
    expect(invalidate).toHaveBeenCalledTimes(2);

    nowMs += 10;
    scheduler.requestNext(invalidate, () => true);
    scheduler.cancelPending();
    vi.advanceTimersByTime(200);
    expect(invalidate).toHaveBeenCalledTimes(2);
  });
});
