import type React from 'react';
import { useCallback, useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { useCameraStore } from '../../../stores/useCameraStore';
import { useUIStore } from '../../../stores/useUIStore';
import { useOptionalRouter } from '../../../hooks/useSpaLocation';
import { useCameraTransition } from '../instrument/useCameraTransition';
import {
  getStandardInitialCamera,
  STANDARD_CAMERA_DISTANCES,
} from '../cartography';
import {
  type OrbitControlsLike,
  isOrbitControlsLike,
  getCameraZoom,
} from './cameraControllerUtils';
import {
  applyImmediateCameraPose,
  computeCameraPoseSnapshot,
  formatCenterCoordString,
  navigatePanCenterToRouter,
  persistCameraPoseToStore,
} from './galacticCameraHelpers';

export type { OrbitControlsLike };

export interface GalacticCameraControllerProps {
  readonly target: [number, number, number];
  readonly distance?: number;
  readonly hasExplicitCenter?: boolean;
  readonly persistGalaxyPose?: boolean;
}

export const GalacticCameraController: React.FC<GalacticCameraControllerProps> = ({
  target,
  distance,
  hasExplicitCenter = true,
  persistGalaxyPose = true,
}) => {
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const rawControls = useThree((s) => s.controls);
  const controls = isOrbitControlsLike(rawControls) ? rawControls : undefined;
  const router = useOptionalRouter();
  const { transitionTo } = useCameraTransition();
  const recenterTick = useCameraStore((s) => s.recenterTick);

  const prevTargetRef = useRef<[number, number, number]>([Number.NaN, Number.NaN, Number.NaN]);
  const prevDistanceRef = useRef<number>(Number.NaN);
  const prevRecenterTickRef = useRef<number>(-1);
  const prevControlsRef = useRef<OrbitControlsLike | undefined>(undefined);
  const hasRestoredRef = useRef(false);
  const pendingPanTargetRef = useRef<string | null>(null);

  const [targetX, targetY, targetZ] = target;
  const targetPosRef = useRef({ x: targetX, y: targetY, z: targetZ });
  useEffect(() => {
    targetPosRef.current = { x: targetX, y: targetY, z: targetZ };
  }, [targetX, targetY, targetZ]);

  const saveCurrentGalaxyPose = useCallback(
    (force = false) => {
      const snapshot = computeCameraPoseSnapshot(camera, controls, [
        targetPosRef.current.x,
        targetPosRef.current.y,
        targetPosRef.current.z,
      ]);
      persistCameraPoseToStore(snapshot, persistGalaxyPose, force);
    },
    [camera, controls, persistGalaxyPose],
  );

  useEffect(() => {
    if (!persistGalaxyPose) return;
    if (!controls?.addEventListener || !controls?.removeEventListener) return;

    const handleChange = () => {
      if (useUIStore.getState().isCameraTransitioning) return;
      saveCurrentGalaxyPose(false);
    };

    const handleEnd = () => {
      if (useUIStore.getState().isCameraTransitioning) return;
      saveCurrentGalaxyPose(true);
      navigatePanCenterToRouter(router, controls, targetPosRef.current, pendingPanTargetRef);
    };

    controls.addEventListener('change', handleChange);
    controls.addEventListener('end', handleEnd);
    return () => {
      saveCurrentGalaxyPose(true);
      controls.removeEventListener?.('change', handleChange);
      controls.removeEventListener?.('end', handleEnd);
    };
  }, [controls, persistGalaxyPose, router, saveCurrentGalaxyPose]);

  useEffect(() => {
    const prev = prevTargetRef.current;
    const prevDist = prevDistanceRef.current;
    const prevTick = prevRecenterTickRef.current;
    const isTargetSame = prev[0] === targetX && prev[1] === targetY && prev[2] === targetZ;
    const isDistSame = distance === prevDist || (distance === undefined && Number.isNaN(prevDist));
    const isTickSame = recenterTick === prevTick;
    const isControlsSame = controls === prevControlsRef.current;
    const isInitialMount = Number.isNaN(prev[0]);

    if (isTargetSame && isDistSame && isTickSame && isControlsSame) {
      return;
    }

    const incomingCoordStr = formatCenterCoordString(targetX, targetY, targetZ);
    if (
      pendingPanTargetRef.current === incomingCoordStr &&
      isDistSame &&
      isTickSame &&
      isControlsSame
    ) {
      pendingPanTargetRef.current = null;
      prevTargetRef.current = [targetX, targetY, targetZ];
      return;
    }

    if (!isInitialMount && !hasExplicitCenter && isDistSame) {
      if (!hasRestoredRef.current && controls && isTargetSame && isTickSame) {
        controls.target.set(targetX, targetY, targetZ);
        controls.update?.();
        hasRestoredRef.current = true;
        invalidate?.();
      }
      prevControlsRef.current = controls;
      return;
    }

    if (
      !isInitialMount &&
      isTargetSame &&
      isDistSame &&
      isControlsSame &&
      controls?.target &&
      Math.hypot(
        controls.target.x - targetX,
        controls.target.y - targetY,
        controls.target.z - targetZ,
      ) < 1e-3
    ) {
      prevRecenterTickRef.current = recenterTick;
      return;
    }

    const saved = persistGalaxyPose ? useCameraStore.getState().savedGalaxyCamera : null;

    if (!hasRestoredRef.current && saved && distance === undefined) {
      const isMatch =
        Math.hypot(
          saved.target[0] - targetX,
          saved.target[1] - targetY,
          saved.target[2] - targetZ,
        ) < 0.05;
      const isTransientZero =
        targetX === 0 &&
        targetY === 0 &&
        targetZ === 0 &&
        (saved.target[0] !== 0 || saved.target[1] !== 0 || saved.target[2] !== 0);

      if (isMatch || isTransientZero) {
        const appliedControls = applyImmediateCameraPose(
          camera,
          controls,
          saved.position,
          saved.target,
          saved.up,
          saved.zoom,
        );
        if (appliedControls) hasRestoredRef.current = true;

        useCameraStore.getState().setCameraPose({
          position: saved.position,
          target: saved.target,
          up: saved.up,
          zoom: getCameraZoom(camera),
          focalDistance: saved.focalDistance,
        });

        if (controls && isMatch) saveCurrentGalaxyPose(true);
        prevTargetRef.current = isTransientZero
          ? [saved.target[0], saved.target[1], saved.target[2]]
          : [targetX, targetY, targetZ];
        prevDistanceRef.current = distance ?? Number.NaN;
        prevRecenterTickRef.current = recenterTick;
        prevControlsRef.current = controls;
        invalidate?.();
        return;
      }
    }

    if (isInitialMount && !saved) {
      const initialDistSetting =
        typeof distance === 'number' && Number.isFinite(distance) && distance > 0
          ? distance
          : STANDARD_CAMERA_DISTANCES.galactic;
      const initialCam = getStandardInitialCamera(
        initialDistSetting,
        [targetX, targetY, targetZ],
      );
      const appliedControls = applyImmediateCameraPose(
        camera,
        controls,
        initialCam.position,
        [targetX, targetY, targetZ],
        initialCam.up,
        1,
      );
      if (appliedControls) hasRestoredRef.current = true;

      const initialDist = Math.hypot(
        camera.position.x - targetX,
        camera.position.y - targetY,
        camera.position.z - targetZ,
      );
      useCameraStore.getState().setCameraPose({
        position: [camera.position.x, camera.position.y, camera.position.z],
        target: [targetX, targetY, targetZ],
        up: [initialCam.up[0], initialCam.up[1], initialCam.up[2]],
        zoom: 1,
        focalDistance: initialDist,
      });

      if (controls) saveCurrentGalaxyPose(true);
      prevTargetRef.current = [targetX, targetY, targetZ];
      prevDistanceRef.current = distance ?? Number.NaN;
      prevRecenterTickRef.current = recenterTick;
      prevControlsRef.current = controls;
      invalidate?.();
      return;
    }

    if (!isInitialMount && !hasRestoredRef.current && controls && isTargetSame && isDistSame && isTickSame) {
      controls.target.set(targetX, targetY, targetZ);
      controls.update?.();
      hasRestoredRef.current = true;
      prevControlsRef.current = controls;
      invalidate?.();
      return;
    }

    const resolvedDistance =
      typeof distance === 'number' && Number.isFinite(distance) && distance > 0
        ? distance
        : undefined;

    transitionTo([targetX, targetY, targetZ], {
      ...(resolvedDistance !== undefined ? { targetDistance: resolvedDistance } : {}),
      onComplete: () => {
        controls?.update?.();
        hasRestoredRef.current = true;
        const snapshot = computeCameraPoseSnapshot(camera, controls, [targetX, targetY, targetZ]);
        useCameraStore.getState().setCameraPose({
          position: snapshot.position,
          target: snapshot.target,
          up: snapshot.up,
          zoom: snapshot.zoom,
          focalDistance: snapshot.focalDistance,
        });
        saveCurrentGalaxyPose(true);
        invalidate?.();
      },
    });

    prevTargetRef.current = [targetX, targetY, targetZ];
    prevDistanceRef.current = distance ?? Number.NaN;
    prevRecenterTickRef.current = recenterTick;
    prevControlsRef.current = controls;
  }, [
    targetX,
    targetY,
    targetZ,
    distance,
    hasExplicitCenter,
    persistGalaxyPose,
    recenterTick,
    camera,
    controls,
    invalidate,
    saveCurrentGalaxyPose,
    transitionTo,
  ]);

  return null;
};
