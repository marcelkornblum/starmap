import type React from 'react';
import { useCallback, useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { useCameraStore } from '../../../stores/useCameraStore';
import { useUIStore } from '../../../stores/useUIStore';
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

export interface SystemCameraControllerProps {
  readonly position: readonly [number, number, number];
  readonly target: readonly [number, number, number];
  readonly up: readonly [number, number, number];
  readonly hasExplicitCenter?: boolean;
}

export const SystemCameraController: React.FC<SystemCameraControllerProps> = ({
  position,
  target,
  up,
  hasExplicitCenter = true,
}) => {
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const rawControls = useThree((s) => s.controls);
  const controls = isOrbitControlsLike(rawControls) ? rawControls : undefined;
  const { transitionToPose } = useCameraTransition();
  const recenterTick = useCameraStore((s) => s.recenterTick);

  const prevPosRef = useRef<[number, number, number]>([Number.NaN, Number.NaN, Number.NaN]);
  const prevTargetRef = useRef<[number, number, number]>([Number.NaN, Number.NaN, Number.NaN]);
  const prevUpRef = useRef<[number, number, number]>([Number.NaN, Number.NaN, Number.NaN]);
  const prevTickRef = useRef<number>(-1);
  const prevControlsRef = useRef<OrbitControlsLike | undefined>(undefined);
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

  useEffect(() => {
    const prevPos = prevPosRef.current;
    const prevTarget = prevTargetRef.current;
    const prevUp = prevUpRef.current;
    const isInitialMount = Number.isNaN(prevTarget[0]);
    const isPoseSame =
      prevPos[0] === posX &&
      prevPos[1] === posY &&
      prevPos[2] === posZ &&
      prevTarget[0] === tgtX &&
      prevTarget[1] === tgtY &&
      prevTarget[2] === tgtZ &&
      prevUp[0] === upX &&
      prevUp[1] === upY &&
      prevUp[2] === upZ;
    const isTickSame = recenterTick === prevTickRef.current;
    const isControlsSame = controls === prevControlsRef.current;

    if (isPoseSame && isTickSame && isControlsSame) {
      return;
    }

    if (!isInitialMount && !hasExplicitCenter && isTickSame && isControlsSame) {
      return;
    }

    if (
      isInitialMount ||
      (!hasAppliedControlsRef.current && controls && isPoseSame && isTickSame)
    ) {
      const applied = applyImmediateCameraPose(
        camera,
        controls,
        [posX, posY, posZ],
        [tgtX, tgtY, tgtZ],
        [upX, upY, upZ],
        getCameraZoom(camera),
      );
      if (applied) hasAppliedControlsRef.current = true;
      syncPoseToStore([tgtX, tgtY, tgtZ]);
      prevPosRef.current = [posX, posY, posZ];
      prevTargetRef.current = [tgtX, tgtY, tgtZ];
      prevUpRef.current = [upX, upY, upZ];
      prevTickRef.current = recenterTick;
      prevControlsRef.current = controls;
      invalidate?.();
      return;
    }

    transitionToPose(
      {
        target: [tgtX, tgtY, tgtZ],
        position: [posX, posY, posZ],
        up: [upX, upY, upZ],
      },
      {
        onComplete: () => {
          controls?.update?.();
          hasAppliedControlsRef.current = Boolean(controls);
          syncPoseToStore([tgtX, tgtY, tgtZ]);
          invalidate?.();
        },
      },
    );

    prevPosRef.current = [posX, posY, posZ];
    prevTargetRef.current = [tgtX, tgtY, tgtZ];
    prevUpRef.current = [upX, upY, upZ];
    prevTickRef.current = recenterTick;
    prevControlsRef.current = controls;
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
    hasExplicitCenter,
    recenterTick,
    camera,
    controls,
    invalidate,
    syncPoseToStore,
    transitionToPose,
  ]);

  return null;
};
