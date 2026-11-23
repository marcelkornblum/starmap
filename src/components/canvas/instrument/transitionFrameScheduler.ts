import { isConstrainedGpuRenderer } from '../../../services/deviceTierProfiles';
import { getRegisteredWebGLGpuTelemetry } from '../../../services/deviceTierService';

export const CONSTRAINED_GPU_FRAME_INTERVAL_MS = 64;

export interface TransitionFrameScheduler {
  readonly requestInitial: (invalidate: (() => void) | undefined) => void;
  readonly requestNext: (
    invalidate: (() => void) | undefined,
    isStillTransitioning: () => boolean,
  ) => void;
  readonly cancelPending: () => void;
}

/**
 * Coordinates demand-mode canvas invalidation across camera transitions,
 * pacing frame requests on constrained software GPUs (such as SwiftShader)
 * so the renderer main thread does not queue a deep command-buffer backlog.
 */
export function createTransitionFrameScheduler(
  intervalMs = CONSTRAINED_GPU_FRAME_INTERVAL_MS,
): TransitionFrameScheduler {
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let lastInvalidateAt = -Infinity;

  const cancelPending = (): void => {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
  };

  const requestInitial = (invalidate: (() => void) | undefined): void => {
    cancelPending();
    if (typeof invalidate !== 'function') return;
    lastInvalidateAt = performance.now();
    invalidate();
  };

  const requestNext = (
    invalidate: (() => void) | undefined,
    isStillTransitioning: () => boolean,
  ): void => {
    if (typeof invalidate !== 'function' || !isStillTransitioning()) {
      cancelPending();
      return;
    }

    const gpuRenderer = getRegisteredWebGLGpuTelemetry()?.gpuRenderer;
    if (!isConstrainedGpuRenderer(gpuRenderer)) {
      cancelPending();
      lastInvalidateAt = performance.now();
      invalidate();
      return;
    }

    const now = performance.now();
    const remainingMs = intervalMs - (now - lastInvalidateAt);
    if (remainingMs <= 0) {
      cancelPending();
      lastInvalidateAt = now;
      invalidate();
      return;
    }

    if (timerId !== null) return;
    timerId = setTimeout(() => {
      timerId = null;
      if (!isStillTransitioning()) return;
      lastInvalidateAt = performance.now();
      invalidate();
    }, remainingMs);
  };

  return {
    requestInitial,
    requestNext,
    cancelPending,
  };
}
