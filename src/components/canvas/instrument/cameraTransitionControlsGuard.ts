import type { TransitionControlsLike } from './cameraTransitionPoseMath';

export interface ControlsFlightGuard {
  readonly getActiveControls: () => TransitionControlsLike | undefined;
  readonly pauseForFlight: (controls: TransitionControlsLike) => void;
  readonly syncActiveControls: (controls: TransitionControlsLike | undefined) => void;
  readonly restoreAndSettle: (
    controls: TransitionControlsLike | undefined,
    settleControls: boolean,
  ) => void;
}

/**
 * Guards OrbitControls-compatible instances during programmatic camera glides
 * by pausing damping and suppressing external per-frame `controls.update()`
 * invocations while `isTransitioning()` is true, then restoring both cleanly.
 */
export function createControlsFlightGuard(
  isTransitioning: () => boolean,
): ControlsFlightGuard {
  let activeControls: TransitionControlsLike | undefined;
  let prevEnableDamping: boolean | undefined;
  let prevControlsUpdate: (() => void) | undefined;

  const restoreWrappedUpdate = (controls: TransitionControlsLike): void => {
    if (prevControlsUpdate !== undefined) {
      controls.update = prevControlsUpdate;
      prevControlsUpdate = undefined;
    }
  };

  const pauseForFlight = (controls: TransitionControlsLike): void => {
    activeControls = controls;
    if (prevEnableDamping === undefined && controls.enableDamping !== undefined) {
      prevEnableDamping = controls.enableDamping;
      controls.enableDamping = false;
    }
    if (prevControlsUpdate === undefined && typeof controls.update === 'function') {
      const originalUpdate = controls.update;
      prevControlsUpdate = originalUpdate;
      controls.update = new Proxy(originalUpdate, {
        apply: (target, thisArg, argArray) => {
          if (isTransitioning()) return;
          return Reflect.apply(target, thisArg, argArray);
        },
      });
    }
  };

  const syncActiveControls = (controls: TransitionControlsLike | undefined): void => {
    if (!controls || activeControls === controls) return;
    if (activeControls) {
      if (prevEnableDamping !== undefined) {
        activeControls.enableDamping = prevEnableDamping;
      }
      restoreWrappedUpdate(activeControls);
    }
    activeControls = undefined;
    prevEnableDamping = undefined;
    prevControlsUpdate = undefined;
    pauseForFlight(controls);
  };

  const restoreAndSettle = (
    controls: TransitionControlsLike | undefined,
    settleControls: boolean,
  ): void => {
    const targetControls = controls ?? activeControls;
    if (targetControls) {
      restoreWrappedUpdate(targetControls);
      if (settleControls) {
        targetControls.update?.();
      }
      if (prevEnableDamping !== undefined) {
        targetControls.enableDamping = prevEnableDamping;
      }
    }
    activeControls = undefined;
    prevEnableDamping = undefined;
    prevControlsUpdate = undefined;
  };

  return {
    getActiveControls: () => activeControls,
    pauseForFlight,
    syncActiveControls,
    restoreAndSettle,
  };
}
