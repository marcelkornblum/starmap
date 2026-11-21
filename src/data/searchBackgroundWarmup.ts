import {
  fetchSearchShard,
  registerSearchCacheClearListener,
} from './searchRepository';

let scheduledTimeoutId: ReturnType<typeof setTimeout> | null = null;
let scheduledIdleId: number | null = null;
let hasScheduled = false;
let hasStartedPrimaryWarmup = false;
let hasStartedMinorBodiesWarmup = false;

export const isSaveDataEnabled = (): boolean =>
  typeof navigator !== 'undefined' &&
  (navigator as { connection?: { saveData?: boolean } }).connection?.saveData === true;

const cancelPendingSchedule = (): void => {
  if (scheduledTimeoutId !== null) {
    clearTimeout(scheduledTimeoutId);
    scheduledTimeoutId = null;
  }
  if (
    scheduledIdleId !== null &&
    typeof globalThis.cancelIdleCallback === 'function'
  ) {
    globalThis.cancelIdleCallback(scheduledIdleId);
  }
  scheduledIdleId = null;
};

async function runWarmup(includeMinorBodies: boolean): Promise<void> {
  if (!hasStartedPrimaryWarmup) {
    hasStartedPrimaryWarmup = true;
    await Promise.allSettled([
      fetchSearchShard('stars'),
      fetchSearchShard('planets'),
    ]);
  }
  if (includeMinorBodies && !hasStartedMinorBodiesWarmup) {
    hasStartedMinorBodiesWarmup = true;
    await fetchSearchShard('minor-bodies').catch(() => undefined);
  }
}

/**
 * Schedules post-idle background loading of `stars`, `planets`, and (unless
 * `navigator.connection.saveData` is true) `minor-bodies` after initial hydration settles.
 */
export function scheduleSearchBackgroundWarmup(delayMs = 1500): void {
  if (hasScheduled || hasStartedPrimaryWarmup) {
    return;
  }
  hasScheduled = true;

  const trigger = () => {
    scheduledTimeoutId = null;
    scheduledIdleId = null;
    void runWarmup(!isSaveDataEnabled());
  };

  if (typeof globalThis.requestIdleCallback === 'function') {
    scheduledIdleId = globalThis.requestIdleCallback(trigger, { timeout: delayMs });
  } else {
    scheduledTimeoutId = setTimeout(trigger, delayMs);
  }
}

/**
 * Cancels any pending idle delay and immediately starts background warming
 * (`stars`, `planets`, and optionally `minor-bodies`) when the user interacts with Search.
 */
export function escalateSearchBackgroundWarmup(options?: {
  readonly includeMinorBodies?: boolean;
}): void {
  cancelPendingSchedule();
  hasScheduled = true;
  const includeMinorBodies = options?.includeMinorBodies ?? true;
  void runWarmup(includeMinorBodies);
}

export function resetSearchBackgroundWarmup(): void {
  cancelPendingSchedule();
  hasScheduled = false;
  hasStartedPrimaryWarmup = false;
  hasStartedMinorBodiesWarmup = false;
}

registerSearchCacheClearListener(resetSearchBackgroundWarmup);
