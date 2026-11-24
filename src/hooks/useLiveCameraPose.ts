import { useEffect, useRef, useState } from 'react';
import { useCameraStore, type CameraState } from '../stores/useCameraStore';

export interface LiveCameraPose {
  readonly position: readonly [number, number, number];
  readonly target: readonly [number, number, number];
  readonly up: readonly [number, number, number];
  readonly focalDistance: number;
  readonly zoom: number;
}

function readPoseSnapshot(state: CameraState): LiveCameraPose {
  return {
    position: state.position,
    target: state.target,
    up: state.up,
    focalDistance: state.focalDistance,
    zoom: state.zoom,
  };
}

function tupleChanged(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
): boolean {
  return a[0] !== b[0] || a[1] !== b[1] || a[2] !== b[2];
}

function hasPoseChanged(a: LiveCameraPose, b: LiveCameraPose): boolean {
  return (
    tupleChanged(a.position, b.position) ||
    tupleChanged(a.target, b.target) ||
    tupleChanged(a.up, b.up) ||
    a.focalDistance !== b.focalDistance ||
    a.zoom !== b.zoom
  );
}

/**
 * Subscribes to `useCameraStore` via `requestAnimationFrame` coalescing so rapid
 * OrbitControls / transition updates yield at most one React re-render per frame.
 */
export function useLiveCameraPose(enabled = true): LiveCameraPose {
  const [pose, setPose] = useState<LiveCameraPose>(() =>
    readPoseSnapshot(useCameraStore.getState()),
  );
  const committedRef = useRef<LiveCameraPose>(pose);
  const pendingRef = useRef<LiveCameraPose | null>(null);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const scheduleFlush = (next: LiveCameraPose) => {
      pendingRef.current = next;
      if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
        committedRef.current = next;
        pendingRef.current = null;
        setPose(next);
        return;
      }
      if (rafIdRef.current !== null) {
        return;
      }
      rafIdRef.current = window.requestAnimationFrame(() => {
        rafIdRef.current = null;
        const latest = pendingRef.current;
        pendingRef.current = null;
        if (latest && hasPoseChanged(committedRef.current, latest)) {
          committedRef.current = latest;
          setPose(latest);
        }
      });
    };

    const current = readPoseSnapshot(useCameraStore.getState());
    if (hasPoseChanged(committedRef.current, current)) {
      committedRef.current = current;
      setPose(current);
    }

    const unsubscribe = useCameraStore.subscribe((state) => {
      const next = readPoseSnapshot(state);
      const baseline = pendingRef.current ?? committedRef.current;
      if (hasPoseChanged(baseline, next)) {
        scheduleFlush(next);
      }
    });

    return () => {
      unsubscribe();
      pendingRef.current = null;
      if (
        rafIdRef.current !== null &&
        typeof window !== 'undefined' &&
        typeof window.cancelAnimationFrame === 'function'
      ) {
        window.cancelAnimationFrame(rafIdRef.current);
      }
      rafIdRef.current = null;
    };
  }, [enabled]);

  return pose;
}
