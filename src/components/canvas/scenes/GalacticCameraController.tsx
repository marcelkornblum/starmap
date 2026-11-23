import type React from 'react';
import { useCallback, useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { useIsomorphicLayoutEffect } from '../../../hooks/useIsomorphicLayoutEffect';
import { useCameraStore } from '../../../stores/useCameraStore';
import { useUIStore } from '../../../stores/useUIStore';
import { useOptionalRouter } from '../../../hooks/useSpaLocation';
import { useOptionalSpatialEntityStoreApi } from '../entity/SpatialEntityContext';
import { consumePendingCrossScaleArrival } from '../instrument/crossScaleArrivalState';
import { useCameraTransition } from '../instrument/useCameraTransition';
import {
  type OrbitControlsLike,
  isControlsTargetWithinEpsilon,
  isOrbitControlsLike,
  resolvePositiveFiniteDistance,
} from './cameraControllerUtils';
import {
  bindGalacticControlsListeners,
  computeCameraPoseSnapshot,
  dispatchPendingSearchFrame,
  formatCenterCoordString,
  persistCameraPoseToStore,
  syncAndPersistGalacticPose,
  syncCameraPoseSnapshotToStore,
} from './galacticCameraHelpers';
import { startCrossScaleArrivalGlide } from './crossScaleArrivalHelpers';
import {
  applyDefaultInitialGalacticPose,
  resolveGalacticLandingPose,
  tryRestoreSavedGalaxyPose,
} from './galacticLandingHelpers';

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
  const outerStore = useOptionalSpatialEntityStoreApi();
  const { transitionTo, transitionToPose } = useCameraTransition();
  const recenterTick = useCameraStore((s) => s.recenterTick);
  const pendingSearchFrame = useCameraStore((s) => s.pendingSearchFrame);

  const prevTargetRef = useRef<[number, number, number]>([Number.NaN, Number.NaN, Number.NaN]);
  const prevDistanceRef = useRef<number>(Number.NaN);
  const prevRecenterTickRef = useRef<number>(-1);
  const prevControlsRef = useRef<OrbitControlsLike | undefined>(undefined);
  const hasRestoredRef = useRef(false);
  const pendingPanTargetRef = useRef<string | null>(null);
  const isArrivalInFlightRef = useRef(false);

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
    return bindGalacticControlsListeners({
      controls,
      persistGalaxyPose,
      router,
      targetPosRef,
      pendingPanTargetRef,
      saveCurrentGalaxyPose,
    });
  }, [controls, persistGalaxyPose, router, saveCurrentGalaxyPose]);

  useEffect(() => {
    if (!pendingSearchFrame || isArrivalInFlightRef.current) return;
    const liveRequest = useCameraStore.getState().pendingSearchFrame;
    if (!liveRequest) return;
    useCameraStore.getState().clearSearchFrame();
    dispatchPendingSearchFrame({
      request: liveRequest,
      camera,
      controls,
      transitionTo,
      saveCurrentGalaxyPose,
      invalidate,
      onSettled: () => {
        hasRestoredRef.current = true;
      },
      prevTargetRef,
      prevDistanceRef,
    });
  }, [pendingSearchFrame, camera, controls, invalidate, saveCurrentGalaxyPose, transitionTo]);

  useIsomorphicLayoutEffect(() => {
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

    if (isArrivalInFlightRef.current && isTargetSame && isDistSame && isTickSame) {
      prevControlsRef.current = controls;
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
      isControlsTargetWithinEpsilon(controls, targetX, targetY, targetZ)
    ) {
      prevRecenterTickRef.current = recenterTick;
      return;
    }

    const saved = persistGalaxyPose ? useCameraStore.getState().savedGalaxyCamera : null;
    const arrival = isInitialMount ? consumePendingCrossScaleArrival('galaxy') : null;

    if (arrival) {
      isArrivalInFlightRef.current = true;
      const landing = resolveGalacticLandingPose(
        saved,
        targetX,
        targetY,
        targetZ,
        distance,
        hasExplicitCenter,
      );
      startCrossScaleArrivalGlide({
        camera,
        controls,
        landingPosition: landing.position,
        landingTarget: landing.target,
        landingUp: landing.up,
        landingZoom: landing.zoom,
        landingFov: landing.fov,
        arrival,
        outerStore,
        transitionToPose,
        invalidate,
        onComplete: () => {
          const liveControls = prevControlsRef.current ?? controls;
          isArrivalInFlightRef.current = false;
          hasRestoredRef.current = Boolean(liveControls);
          syncAndPersistGalacticPose(camera, liveControls, landing.target, persistGalaxyPose);
        },
        onCancel: () => {
          isArrivalInFlightRef.current = false;
        },
      });
      prevTargetRef.current = landing.isTransientZero
        ? [landing.target[0], landing.target[1], landing.target[2]]
        : [targetX, targetY, targetZ];
      prevDistanceRef.current = distance ?? Number.NaN;
      prevRecenterTickRef.current = recenterTick;
      prevControlsRef.current = controls;
      invalidate?.();
      return;
    }

    if (
      !hasRestoredRef.current &&
      !useUIStore.getState().isCameraTransitioning &&
      saved &&
      distance === undefined
    ) {
      const restored = tryRestoreSavedGalaxyPose({
        camera,
        controls,
        saved,
        targetX,
        targetY,
        targetZ,
        hasExplicitCenter,
        saveCurrentGalaxyPose,
      });
      if (restored) {
        if (restored.appliedControls) hasRestoredRef.current = true;
        prevTargetRef.current = restored.resolvedTarget;
        prevDistanceRef.current = distance ?? Number.NaN;
        prevRecenterTickRef.current = recenterTick;
        prevControlsRef.current = controls;
        invalidate?.();
        return;
      }
    }

    if (isInitialMount && !saved) {
      const appliedControls = applyDefaultInitialGalacticPose({
        camera,
        controls,
        targetX,
        targetY,
        targetZ,
        distance,
        saveCurrentGalaxyPose,
      });
      if (appliedControls) hasRestoredRef.current = true;
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

    const resolvedDistance = resolvePositiveFiniteDistance(distance);

    transitionTo([targetX, targetY, targetZ], {
      ...(resolvedDistance !== undefined ? { targetDistance: resolvedDistance } : {}),
      onComplete: () => {
        hasRestoredRef.current = true;
        syncCameraPoseSnapshotToStore(camera, controls, [targetX, targetY, targetZ]);
        saveCurrentGalaxyPose(true);
        invalidate?.();
      },
    });

    prevTargetRef.current = [targetX, targetY, targetZ];
    prevDistanceRef.current = distance ?? Number.NaN;
    prevRecenterTickRef.current = recenterTick;
    prevControlsRef.current = controls;
  }, [
    targetX, targetY, targetZ, distance, hasExplicitCenter, persistGalaxyPose,
    recenterTick, camera, controls, outerStore, invalidate,
    saveCurrentGalaxyPose, transitionTo, transitionToPose,
  ]);

  return null;
};
