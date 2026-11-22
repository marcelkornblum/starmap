import type React from 'react';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { useCameraStore } from '../../../stores/useCameraStore';
import { useUIStore } from '../../../stores/useUIStore';
import { useOptionalSpatialEntityStoreApi } from '../entity/SpatialEntityContext';
import { consumePendingCrossScaleArrival } from '../instrument/crossScaleArrivalState';
import { useCameraTransition } from '../instrument/useCameraTransition';
import {
  type OrbitControlsLike,
  isOrbitControlsLike,
  getCameraZoom,
} from './cameraControllerUtils';
import {
  applyImmediateCameraPose,
  computeCameraPoseSnapshot,
} from './galacticCameraHelpers';
import { startCrossScaleArrivalGlide } from './crossScaleArrivalHelpers';

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export interface SystemCameraControllerProps {
  readonly scope?: 'system' | 'planet';
  readonly position: readonly [number, number, number];
  readonly target: readonly [number, number, number];
  readonly up: readonly [number, number, number];
  readonly fov?: number;
  readonly hasExplicitCenter?: boolean;
}

export const SystemCameraController: React.FC<SystemCameraControllerProps> = ({
  scope = 'system',
  position,
  target,
  up,
  fov,
  hasExplicitCenter = true,
}) => {
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const rawControls = useThree((s) => s.controls);
  const controls = isOrbitControlsLike(rawControls) ? rawControls : undefined;
  const outerStore = useOptionalSpatialEntityStoreApi();
  const { transitionTo, transitionToPose } = useCameraTransition();
  const recenterTick = useCameraStore((s) => s.recenterTick);

  const prevTargetRef = useRef<[number, number, number]>([Number.NaN, Number.NaN, Number.NaN]);
  const prevTickRef = useRef<number>(-1);
  const prevControlsRef = useRef<OrbitControlsLike | undefined>(undefined);
  const prevHasExplicitCenterRef = useRef<boolean>(hasExplicitCenter);
  const hasAppliedControlsRef = useRef(false);

  const [posX, posY, posZ] = position;
  const [tgtX, tgtY, tgtZ] = target;
  const [upX, upY, upZ] = up;
  const targetRef = useRef<[number, number, number]>([tgtX, tgtY, tgtZ]);
  useEffect(() => {
    targetRef.current = [tgtX, tgtY, tgtZ];
  }, [tgtX, tgtY, tgtZ]);

  const syncPoseToStore = useCallback(
    (fallbackTarget: readonly [number, number, number]) => {
      const snapshot = computeCameraPoseSnapshot(camera, controls, fallbackTarget);
      useCameraStore.getState().setCameraPose({
        position: snapshot.position,
        target: snapshot.target,
        up: snapshot.up,
        zoom: getCameraZoom(camera),
        focalDistance: snapshot.focalDistance,
      });
    },
    [camera, controls],
  );

  useEffect(() => {
    if (!controls?.addEventListener || !controls?.removeEventListener) return;
    const handleEnd = () => {
      if (useUIStore.getState().isCameraTransitioning) return;
      syncPoseToStore(targetRef.current);
    };
    controls.addEventListener('end', handleEnd);
    return () => {
      controls.removeEventListener?.('end', handleEnd);
    };
  }, [controls, syncPoseToStore]);

  useIsomorphicLayoutEffect(() => {
    const prevTarget = prevTargetRef.current;
    const isInitialMount = Number.isNaN(prevTarget[0]);
    const isTargetSame =
      prevTarget[0] === tgtX &&
      prevTarget[1] === tgtY &&
      prevTarget[2] === tgtZ;
    const isTickSame = recenterTick === prevTickRef.current;
    const isControlsSame = controls === prevControlsRef.current;
    const didExplicitCenterBecomeTrue =
      !isInitialMount && !prevHasExplicitCenterRef.current && hasExplicitCenter;

    if (isTargetSame && isTickSame && isControlsSame && !didExplicitCenterBecomeTrue) {
      prevHasExplicitCenterRef.current = hasExplicitCenter;
      return;
    }

    if (!isInitialMount && !hasExplicitCenter && isControlsSame) {
      prevTickRef.current = recenterTick;
      prevHasExplicitCenterRef.current = hasExplicitCenter;
      return;
    }

    if (
      !isInitialMount &&
      (isTargetSame || didExplicitCenterBecomeTrue) &&
      isControlsSame &&
      controls?.target &&
      Math.hypot(
        controls.target.x - tgtX,
        controls.target.y - tgtY,
        controls.target.z - tgtZ,
      ) < 1e-3
    ) {
      prevTickRef.current = recenterTick;
      prevHasExplicitCenterRef.current = hasExplicitCenter;
      return;
    }

    const arrival = isInitialMount ? consumePendingCrossScaleArrival(scope) : null;
    if (arrival) {
      startCrossScaleArrivalGlide({
        camera,
        controls,
        landingPosition: [posX, posY, posZ],
        landingTarget: [tgtX, tgtY, tgtZ],
        landingUp: [upX, upY, upZ],
        landingZoom: 1,
        landingFov: fov,
        arrival,
        outerStore,
        transitionToPose,
        invalidate,
        onComplete: () => {
          hasAppliedControlsRef.current = Boolean(controls);
          syncPoseToStore([tgtX, tgtY, tgtZ]);
        },
      });
      prevTargetRef.current = [tgtX, tgtY, tgtZ];
      prevTickRef.current = recenterTick;
      prevControlsRef.current = controls;
      prevHasExplicitCenterRef.current = hasExplicitCenter;
      invalidate?.();
      return;
    }

    if (
      isInitialMount ||
      (!hasAppliedControlsRef.current &&
        !useUIStore.getState().isCameraTransitioning &&
        controls &&
        isTargetSame &&
        isTickSame)
    ) {
      const applied = applyImmediateCameraPose(
        camera,
        controls,
        [posX, posY, posZ],
        [tgtX, tgtY, tgtZ],
        [upX, upY, upZ],
        isInitialMount ? 1 : getCameraZoom(camera),
        fov,
      );
      if (applied) hasAppliedControlsRef.current = true;
      syncPoseToStore([tgtX, tgtY, tgtZ]);
      prevTargetRef.current = [tgtX, tgtY, tgtZ];
      prevTickRef.current = recenterTick;
      prevControlsRef.current = controls;
      prevHasExplicitCenterRef.current = hasExplicitCenter;
      invalidate?.();
      return;
    }

    transitionTo([tgtX, tgtY, tgtZ], {
      onComplete: () => {
        hasAppliedControlsRef.current = Boolean(controls);
        syncPoseToStore([tgtX, tgtY, tgtZ]);
        invalidate?.();
      },
    });

    prevTargetRef.current = [tgtX, tgtY, tgtZ];
    prevTickRef.current = recenterTick;
    prevControlsRef.current = controls;
    prevHasExplicitCenterRef.current = hasExplicitCenter;
  }, [
    posX,
    posY,
    posZ,
    tgtX,
    tgtY,
    tgtZ,
    upX,
    upY,
    upZ,
    fov,
    scope,
    hasExplicitCenter,
    recenterTick,
    camera,
    controls,
    outerStore,
    invalidate,
    syncPoseToStore,
    transitionTo,
    transitionToPose,
  ]);

  return null;
};
