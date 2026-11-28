import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

/** Runs right after OrbitControls (-1) and before SpatialFrame (-0.5). */
const ORBIT_CONTROLS_GUARD_PRIORITY = -0.95;
const COINCIDENT_TOUCH_THRESHOLD_SQ_PX = 1;

export interface OrbitControlsGuardControlsLike {
  target?: THREE.Vector3;
}

export interface UseOrbitControlsPointerGuardOptions {
  readonly domElement: HTMLElement | null | undefined;
  readonly controls: OrbitControlsGuardControlsLike | undefined;
  readonly camera: THREE.Camera | undefined;
}

interface ActivePointerRecord {
  pageX: number;
  pageY: number;
  pointerType: string;
}

function getEventPageCoords(event: PointerEvent): { pageX: number; pageY: number } {
  const pageX =
    typeof event.pageX === 'number' && Number.isFinite(event.pageX)
      ? event.pageX
      : typeof event.clientX === 'number' && Number.isFinite(event.clientX)
        ? event.clientX
        : 0;
  const pageY =
    typeof event.pageY === 'number' && Number.isFinite(event.pageY)
      ? event.pageY
      : typeof event.clientY === 'number' && Number.isFinite(event.clientY)
        ? event.clientY
        : 0;
  return { pageX, pageY };
}

function createSyntheticPointerCancel(pointerId: number, pointerType: string): Event {
  if (typeof PointerEvent === 'function') {
    const ev = new PointerEvent('pointercancel', {
      pointerId,
      pointerType,
      bubbles: false,
      cancelable: true,
    });
    if (ev.pointerId !== pointerId) {
      Object.defineProperty(ev, 'pointerId', { value: pointerId, configurable: true });
    }
    if (ev.pointerType !== pointerType) {
      Object.defineProperty(ev, 'pointerType', { value: pointerType, configurable: true });
    }
    return ev;
  }
  const ev = new Event('pointercancel', { bubbles: false, cancelable: true }) as Event & {
    pointerId: number;
    pointerType: string;
  };
  ev.pointerId = pointerId;
  ev.pointerType = pointerType;
  return ev;
}

function hasCoincidentActiveTouch(
  activePointers: Map<number, ActivePointerRecord>,
  pointerId: number,
  pageX: number,
  pageY: number,
): boolean {
  for (const [id, pt] of activePointers) {
    if (id !== pointerId && pt.pointerType === 'touch') {
      const dx = pt.pageX - pageX;
      const dy = pt.pageY - pageY;
      if (dx * dx + dy * dy < COINCIDENT_TOUCH_THRESHOLD_SQ_PX) {
        return true;
      }
    }
  }
  return false;
}

function isVec3Finite(v: THREE.Vector3 | undefined): boolean {
  return v === undefined || (Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z));
}

function isQuatFinite(q: THREE.Quaternion): boolean {
  return Number.isFinite(q.x) && Number.isFinite(q.y) && Number.isFinite(q.z) && Number.isFinite(q.w);
}

interface FinitePoseSnapshot {
  px: number;
  py: number;
  pz: number;
  qx: number;
  qy: number;
  qz: number;
  qw: number;
  tx: number;
  ty: number;
  tz: number;
  zoom: number;
}

function syncFiniteSnapshot(
  snap: FinitePoseSnapshot,
  camera: THREE.Camera,
  target: THREE.Vector3 | undefined,
  zoom: number,
): void {
  snap.px = camera.position.x;
  snap.py = camera.position.y;
  snap.pz = camera.position.z;
  snap.qx = camera.quaternion.x;
  snap.qy = camera.quaternion.y;
  snap.qz = camera.quaternion.z;
  snap.qw = camera.quaternion.w;
  if (target) {
    snap.tx = target.x;
    snap.ty = target.y;
    snap.tz = target.z;
  }
  snap.zoom = zoom;
}

function restoreFiniteCameraPose(
  camera: THREE.Camera,
  target: THREE.Vector3 | undefined,
  snap: FinitePoseSnapshot,
): void {
  camera.position.set(snap.px, snap.py, snap.pz);
  camera.quaternion.set(snap.qx, snap.qy, snap.qz, snap.qw);
  target?.set(snap.tx, snap.ty, snap.tz);
  if ('zoom' in camera) {
    const zoomCam = camera as THREE.PerspectiveCamera;
    zoomCam.zoom = snap.zoom;
    zoomCam.updateProjectionMatrix?.();
  }
  camera.updateMatrixWorld();
}

function readCameraZoom(camera: THREE.Camera): number {
  return 'zoom' in camera && typeof (camera as THREE.PerspectiveCamera).zoom === 'number'
    ? (camera as THREE.PerspectiveCamera).zoom
    : 1;
}

/**
 * Guards `three-stdlib` OrbitControls against mobile pointer-lifecycle leaks
 * (off-canvas pointercancel, reused pointerId, window blur) and degenerate
 * 0px multi-touch pinch distances that otherwise corrupt camera pose to NaN.
 */
export function useOrbitControlsPointerGuard({
  domElement,
  controls,
  camera,
}: UseOrbitControlsPointerGuardOptions): void {
  const flushAllRef = useRef<(() => void) | null>(null);
  const poseRef = useRef<FinitePoseSnapshot>({
    px: 0, py: 0, pz: 10, qx: 0, qy: 0, qz: 0, qw: 1, tx: 0, ty: 0, tz: 0, zoom: 1,
  });

  useEffect(() => {
    if (!camera) return;
    const zoom = readCameraZoom(camera);
    const target = controls?.target;
    if (isVec3Finite(camera.position) && isQuatFinite(camera.quaternion) && isVec3Finite(target) && Number.isFinite(zoom)) {
      syncFiniteSnapshot(poseRef.current, camera, target, zoom);
    }
  }, [camera, controls]);

  useEffect(() => {
    if (!domElement || typeof domElement.addEventListener !== 'function') {
      flushAllRef.current = null;
      return;
    }

    const ownerDoc = domElement.ownerDocument ?? document;
    const ownerWin = ownerDoc.defaultView ?? (typeof window !== 'undefined' ? window : null);
    const activePointers = new Map<number, ActivePointerRecord>();
    const syntheticCancelEvents = new WeakSet<Event>();

    const dispatchSyntheticCancel = (pointerId: number, pointerType: string) => {
      const ev = createSyntheticPointerCancel(pointerId, pointerType);
      syntheticCancelEvents.add(ev);
      domElement.dispatchEvent(ev);
    };

    const flushAllActivePointers = () => {
      if (activePointers.size === 0) return;
      const entries = Array.from(activePointers.entries());
      activePointers.clear();
      for (const [pointerId, record] of entries) {
        dispatchSyntheticCancel(pointerId, record.pointerType);
      }
    };

    flushAllRef.current = flushAllActivePointers;

    const onDomPointerDown = (event: PointerEvent) => {
      if (syntheticCancelEvents.has(event)) return;

      const stale = activePointers.get(event.pointerId);
      if (stale) {
        activePointers.delete(event.pointerId);
        dispatchSyntheticCancel(event.pointerId, stale.pointerType);
      }

      const { pageX, pageY } = getEventPageCoords(event);
      const pointerType = event.pointerType || 'mouse';

      if (pointerType === 'touch' && hasCoincidentActiveTouch(activePointers, event.pointerId, pageX, pageY)) {
        event.stopImmediatePropagation();
        return;
      }

      activePointers.set(event.pointerId, { pageX, pageY, pointerType });
      try {
        domElement.setPointerCapture?.(event.pointerId);
      } catch {
        // Synthetic or detached elements may not support pointer capture
      }
    };

    const onDocPointerMove = (event: PointerEvent) => {
      const active = activePointers.get(event.pointerId);
      if (!active) return;

      const { pageX, pageY } = getEventPageCoords(event);
      if (
        (event.pointerType || active.pointerType) === 'touch' &&
        hasCoincidentActiveTouch(activePointers, event.pointerId, pageX, pageY)
      ) {
        event.stopImmediatePropagation();
        return;
      }

      active.pageX = pageX;
      active.pageY = pageY;
    };

    const onDocPointerUp = (event: PointerEvent) => {
      activePointers.delete(event.pointerId);
    };

    const onDocPointerCancel = (event: PointerEvent) => {
      if (syntheticCancelEvents.has(event)) return;
      const record = activePointers.get(event.pointerId);
      if (!record) return;
      activePointers.delete(event.pointerId);
      if (event.target !== domElement) {
        dispatchSyntheticCancel(event.pointerId, event.pointerType || record.pointerType);
      }
    };

    const onWindowBlur = () => {
      flushAllActivePointers();
    };

    const onVisibilityChange = () => {
      if (ownerDoc.visibilityState === 'hidden') {
        flushAllActivePointers();
      }
    };

    domElement.addEventListener('pointerdown', onDomPointerDown, true);
    ownerDoc.addEventListener('pointermove', onDocPointerMove, true);
    ownerDoc.addEventListener('pointerup', onDocPointerUp, true);
    ownerDoc.addEventListener('pointercancel', onDocPointerCancel, true);
    ownerDoc.addEventListener('visibilitychange', onVisibilityChange);
    ownerWin?.addEventListener('blur', onWindowBlur);

    return () => {
      domElement.removeEventListener('pointerdown', onDomPointerDown, true);
      ownerDoc.removeEventListener('pointermove', onDocPointerMove, true);
      ownerDoc.removeEventListener('pointerup', onDocPointerUp, true);
      ownerDoc.removeEventListener('pointercancel', onDocPointerCancel, true);
      ownerDoc.removeEventListener('visibilitychange', onVisibilityChange);
      ownerWin?.removeEventListener('blur', onWindowBlur);
      activePointers.clear();
      flushAllRef.current = null;
    };
  }, [domElement]);

  useFrame(({ camera: frameCamera }) => {
    const activeCamera = camera ?? frameCamera;
    if (!activeCamera) return;

    const zoom = readCameraZoom(activeCamera);
    const target = controls?.target;

    if (
      isVec3Finite(activeCamera.position) &&
      isQuatFinite(activeCamera.quaternion) &&
      isVec3Finite(target) &&
      Number.isFinite(zoom)
    ) {
      syncFiniteSnapshot(poseRef.current, activeCamera, target, zoom);
      return;
    }

    restoreFiniteCameraPose(activeCamera, target, poseRef.current);
    flushAllRef.current?.();
  }, ORBIT_CONTROLS_GUARD_PRIORITY);
}
