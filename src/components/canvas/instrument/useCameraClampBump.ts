import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ALL_CANVAS_CLAMP_EDGES, useCameraStore } from '../../../stores/useCameraStore';
import { isOrbitControlsLike, type OrbitControlsLike } from './cameraRigZoomAndPan';
import type { CameraRigThreeState } from './useCameraRigProjection';

const ZOOM_OUT_PERSPECTIVE_RATIO = 0.995;
const ZOOM_OUT_ORTHO_RATIO = 1.005;
const WHEEL_LINE_PX = 16;
const WHEEL_PAGE_PX = 240;
const WHEEL_IMPULSE_SCALE_PX = 160;
const WHEEL_MAX_IMPULSE = 0.85;
const PINCH_IMPULSE_SCALE_PX = 60;
const PINCH_MAX_IMPULSE = 0.85;
const PINCH_DELTA_THRESHOLD_PX = 0.5;

/**
 * Returns true when the active camera is parked at (or beyond) its configured
 * zoom-out ceiling (`controls.maxDistance` in perspective, `controls.minZoom` in orthographic).
 */
export function isAtZoomOutCeiling(
  camera: THREE.Camera | null | undefined,
  controls: OrbitControlsLike | undefined,
): boolean {
  if (!camera || !controls) return false;

  if (camera instanceof THREE.OrthographicCamera) {
    const minZoom = controls.minZoom;
    if (typeof minZoom !== 'number' || !Number.isFinite(minZoom) || minZoom <= 0) {
      return false;
    }
    return camera.zoom <= minZoom * ZOOM_OUT_ORTHO_RATIO;
  }

  const maxDistance = controls.maxDistance;
  const target = controls.target;
  if (
    !target ||
    typeof maxDistance !== 'number' ||
    !Number.isFinite(maxDistance) ||
    maxDistance <= 0
  ) {
    return false;
  }

  return camera.position.distanceTo(target) >= maxDistance * ZOOM_OUT_PERSPECTIVE_RATIO;
}

function normalizeWheelImpulse(event: WheelEvent): number {
  let pxDelta = event.deltaY;
  if (event.deltaMode === 1) {
    pxDelta *= WHEEL_LINE_PX;
  } else if (event.deltaMode === 2) {
    pxDelta *= WHEEL_PAGE_PX;
  }
  return Math.min(WHEEL_MAX_IMPULSE, Math.max(0.05, pxDelta / WHEEL_IMPULSE_SCALE_PX));
}

function getTouchPinchDistance(touches: TouchList): number {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}

export interface UseCameraClampBumpOptions {
  domElement?: HTMLElement | null;
  get: () => CameraRigThreeState;
}

/**
 * Detects continuous user zoom-out pressure (mouse wheel or two-finger pinch-in)
 * against the active zoom-out ceiling and feeds rubber-band impulses into `useCameraStore`.
 */
export function useCameraClampBump({ domElement, get }: UseCameraClampBumpOptions): void {
  const prevPinchDistRef = useRef<number | null>(null);
  const pendingRafRef = useRef<number | null>(null);
  const pendingImpulseRef = useRef<number>(0);

  useEffect(() => {
    if (!domElement) return;

    const emitZoomOutPressure = (impulse: number) => {
      useCameraStore.getState().triggerClampBump(ALL_CANVAS_CLAMP_EDGES, 'zoom-out', impulse);
    };

    const checkCeilingNow = (): boolean => {
      const state = get();
      const activeControls = isOrbitControlsLike(state.controls) ? state.controls : undefined;
      return isAtZoomOutCeiling(state.camera, activeControls);
    };

    const schedulePostInputCheck = (impulse: number) => {
      pendingImpulseRef.current = Math.min(WHEEL_MAX_IMPULSE, pendingImpulseRef.current + impulse);
      if (pendingRafRef.current !== null || typeof requestAnimationFrame === 'undefined') return;
      pendingRafRef.current = requestAnimationFrame(() => {
        pendingRafRef.current = null;
        const queued = pendingImpulseRef.current;
        pendingImpulseRef.current = 0;
        if (queued > 0 && checkCeilingNow()) {
          emitZoomOutPressure(queued);
        }
      });
    };

    const handleWheel = (event: WheelEvent) => {
      if (event.deltaY <= 0) return;
      const impulse = normalizeWheelImpulse(event);
      if (checkCeilingNow()) {
        emitZoomOutPressure(impulse);
      } else {
        schedulePostInputCheck(impulse);
      }
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 2) {
        prevPinchDistRef.current = getTouchPinchDistance(event.touches);
      } else {
        prevPinchDistRef.current = null;
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 2) {
        prevPinchDistRef.current = null;
        return;
      }
      const nextDist = getTouchPinchDistance(event.touches);
      const prevDist = prevPinchDistRef.current;
      prevPinchDistRef.current = nextDist;
      if (prevDist !== null && prevDist - nextDist > PINCH_DELTA_THRESHOLD_PX) {
        const impulse = Math.min(
          PINCH_MAX_IMPULSE,
          Math.max(0.05, (prevDist - nextDist) / PINCH_IMPULSE_SCALE_PX),
        );
        if (checkCeilingNow()) {
          emitZoomOutPressure(impulse);
        } else {
          schedulePostInputCheck(impulse);
        }
      }
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (event.touches.length < 2) {
        prevPinchDistRef.current = null;
      }
    };

    domElement.addEventListener('wheel', handleWheel, { passive: true });
    domElement.addEventListener('touchstart', handleTouchStart, { passive: true });
    domElement.addEventListener('touchmove', handleTouchMove, { passive: true });
    domElement.addEventListener('touchend', handleTouchEnd, { passive: true });
    domElement.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      domElement.removeEventListener('wheel', handleWheel);
      domElement.removeEventListener('touchstart', handleTouchStart);
      domElement.removeEventListener('touchmove', handleTouchMove);
      domElement.removeEventListener('touchend', handleTouchEnd);
      domElement.removeEventListener('touchcancel', handleTouchEnd);
      if (pendingRafRef.current !== null && typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(pendingRafRef.current);
        pendingRafRef.current = null;
      }
      pendingImpulseRef.current = 0;
    };
  }, [domElement, get]);
}
