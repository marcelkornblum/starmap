import type React from 'react';
import { useCallback, useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useCameraStore } from '../../../stores/useCameraStore';
import { useLazyRef } from '../../../hooks/useLazyRef';
import { appRouter, type StarmapSearchParams } from '../../../hooks/useSpaLocation';
import {
  getStandardInitialCamera,
  STANDARD_CAMERA_DISTANCES,
} from '../cartography';
import {
  type OrbitControlsLike,
  isOrbitControlsLike,
  applyCameraSavedZoom,
  getCameraZoom,
} from './cameraControllerUtils';

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
  const three = useThree();
  const camera = three.camera;
  const controls =
    'controls' in three && isOrbitControlsLike(three.controls) ? three.controls : undefined;
  const recenterTick = useCameraStore((s) => s.recenterTick);
  const prevTargetRef = useRef<[number, number, number]>([Number.NaN, Number.NaN, Number.NaN]);
  const prevDistanceRef = useRef<number>(Number.NaN);
  const prevRecenterTickRef = useRef<number>(-1);
  const prevControlsRef = useRef<OrbitControlsLike | undefined>(undefined);
  const hasRestoredRef = useRef(false);

  const scratchNewTargetRef = useLazyRef(() => new THREE.Vector3());
  const scratchPrevTargetRef = useLazyRef(() => new THREE.Vector3());
  const scratchDeltaRef = useLazyRef(() => new THREE.Vector3());
  const scratchOffsetRef = useLazyRef(() => new THREE.Vector3());

  const [targetX, targetY, targetZ] = target;
  const targetPosRef = useRef({ x: targetX, y: targetY, z: targetZ });
  useEffect(() => {
    targetPosRef.current = { x: targetX, y: targetY, z: targetZ };
  }, [targetX, targetY, targetZ]);

  const saveCurrentGalaxyPose = useCallback((force = false) => {
    if (!persistGalaxyPose) return;
    const cur = targetPosRef.current;
    const tgt: [number, number, number] = controls?.target
      ? [controls.target.x, controls.target.y, controls.target.z]
      : [cur.x, cur.y, cur.z];
    const pos: [number, number, number] = [camera.position.x, camera.position.y, camera.position.z];
    const up: [number, number, number] = [camera.up.x, camera.up.y, camera.up.z];
    const focalDistance = controls?.target
      ? camera.position.distanceTo(controls.target)
      : camera.position.length();

    const store = useCameraStore.getState();
    const posDiff = Math.hypot(
      pos[0] - store.position[0],
      pos[1] - store.position[1],
      pos[2] - store.position[2],
    );
    const targetDiff = Math.hypot(
      tgt[0] - store.target[0],
      tgt[1] - store.target[1],
      tgt[2] - store.target[2],
    );
    const distDiff = Math.abs(focalDistance - store.focalDistance);

    if (force || posDiff > 0.05 || targetDiff > 0.05 || distDiff > 0.05) {
      store.setSavedGalaxyCamera({
        position: pos,
        target: tgt,
        up,
        zoom: getCameraZoom(camera),
        focalDistance,
        centerKey: `${tgt[0]},${tgt[1]},${tgt[2]}`,
      });
      store.setCameraPose({
        position: pos,
        target: tgt,
        up,
        zoom: getCameraZoom(camera),
        focalDistance,
      });
    }
  }, [camera, controls, persistGalaxyPose]);

  useEffect(() => {
    if (!persistGalaxyPose) return;
    if (controls?.addEventListener && controls?.removeEventListener) {
      const handleChange = () => saveCurrentGalaxyPose(false);
      const handleEnd = () => {
        saveCurrentGalaxyPose(true);
        if (controls && appRouter?.navigate && typeof window !== 'undefined') {
          const tgt = controls.target;
          const searchParams = new URLSearchParams(window.location.search);
          const centerParam = searchParams.get('center');
          if (centerParam) {
            const cur = targetPosRef.current;
            const currentDistFromTarget = Math.hypot(tgt.x - cur.x, tgt.y - cur.y, tgt.z - cur.z);
            if (currentDistFromTarget > 0.05) {
              const coordStr = `${tgt.x.toFixed(1)},${tgt.y.toFixed(1)},${tgt.z.toFixed(1)}`;
              if (centerParam !== coordStr) {
                void appRouter.navigate({
                  search: (prev: StarmapSearchParams = {}) => ({ ...prev, center: coordStr }),
                  replace: true,
                });
              }
            }
          }
        }
      };
      controls.addEventListener('change', handleChange);
      controls.addEventListener('end', handleEnd);
      return () => {
        saveCurrentGalaxyPose(true);
        controls.removeEventListener?.('change', handleChange);
        controls.removeEventListener?.('end', handleEnd);
      };
    }
  }, [controls, persistGalaxyPose, saveCurrentGalaxyPose]);

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

    if (!isInitialMount && !hasExplicitCenter && isDistSame && isTickSame && isControlsSame) {
      return;
    }

    const saved = persistGalaxyPose ? useCameraStore.getState().savedGalaxyCamera : null;

    if (!hasRestoredRef.current && saved && distance === undefined) {
      const isMatch = Math.hypot(
        saved.target[0] - targetX,
        saved.target[1] - targetY,
        saved.target[2] - targetZ,
      ) < 0.05;
      const isTransientZero =
        targetX === 0 && targetY === 0 && targetZ === 0 &&
        (saved.target[0] !== 0 || saved.target[1] !== 0 || saved.target[2] !== 0);

      if (isMatch || isTransientZero) {
        camera.position.set(saved.position[0], saved.position[1], saved.position[2]);
        camera.up.set(saved.up[0], saved.up[1], saved.up[2]);
        applyCameraSavedZoom(camera, saved.zoom);

        if (controls) {
          controls.target.set(saved.target[0], saved.target[1], saved.target[2]);
          controls.update?.();
          hasRestoredRef.current = true;
        } else {
          camera.lookAt(saved.target[0], saved.target[1], saved.target[2]);
        }

        useCameraStore.getState().setCameraPose({
          position: saved.position,
          target: saved.target,
          up: saved.up,
          zoom: getCameraZoom(camera),
          focalDistance: saved.focalDistance,
        });

        if (controls && isMatch) saveCurrentGalaxyPose();
        prevTargetRef.current = isTransientZero
          ? [saved.target[0], saved.target[1], saved.target[2]]
          : [targetX, targetY, targetZ];
        prevDistanceRef.current = distance ?? Number.NaN;
        prevRecenterTickRef.current = recenterTick;
        prevControlsRef.current = controls;
        return;
      }
    }

    if (isInitialMount && !saved && distance === undefined) {
      const initialCam = getStandardInitialCamera(
        STANDARD_CAMERA_DISTANCES.galactic,
        [targetX, targetY, targetZ],
      );
      camera.position.set(initialCam.position[0], initialCam.position[1], initialCam.position[2]);
      camera.up.set(initialCam.up[0], initialCam.up[1], initialCam.up[2]);
      applyCameraSavedZoom(camera, 1);

      if (controls) {
        controls.target.set(targetX, targetY, targetZ);
        controls.update?.();
        hasRestoredRef.current = true;
      } else {
        camera.lookAt(targetX, targetY, targetZ);
      }

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

      if (controls) saveCurrentGalaxyPose();
      prevTargetRef.current = [targetX, targetY, targetZ];
      prevDistanceRef.current = distance ?? Number.NaN;
      prevRecenterTickRef.current = recenterTick;
      prevControlsRef.current = controls;
      return;
    }

    const newTarget = scratchNewTargetRef.current.set(targetX, targetY, targetZ);
    const prevTarget = Number.isFinite(prev[0])
      ? scratchPrevTargetRef.current.set(prev[0], prev[1], prev[2])
      : controls?.target
        ? scratchPrevTargetRef.current.copy(controls.target)
        : scratchPrevTargetRef.current.set(0, 0, 0);
    const delta = scratchDeltaRef.current.copy(newTarget).sub(prevTarget);

    camera.position.add(delta);
    camera.lookAt(newTarget);
    if (controls) controls.target.copy(newTarget);

    if (typeof distance === 'number' && Number.isFinite(distance) && distance > 0) {
      const offset = scratchOffsetRef.current.copy(camera.position).sub(newTarget);
      if (offset.lengthSq() > 1e-6) {
        offset.setLength(distance);
        camera.position.copy(newTarget).add(offset);
      }
    }

    if (controls) {
      controls.update?.();
      hasRestoredRef.current = true;
    }

    const finalTarget: [number, number, number] = controls?.target
      ? [controls.target.x, controls.target.y, controls.target.z]
      : [targetX, targetY, targetZ];
    const finalPos: [number, number, number] = [camera.position.x, camera.position.y, camera.position.z];
    const finalDist = Math.hypot(
      finalPos[0] - finalTarget[0],
      finalPos[1] - finalTarget[1],
      finalPos[2] - finalTarget[2],
    );
    useCameraStore.getState().setCameraPose({
      position: finalPos,
      target: finalTarget,
      up: [camera.up.x, camera.up.y, camera.up.z],
      zoom: getCameraZoom(camera),
      focalDistance: finalDist,
    });
    saveCurrentGalaxyPose();

    prevTargetRef.current = [targetX, targetY, targetZ];
    prevDistanceRef.current = distance ?? Number.NaN;
    prevRecenterTickRef.current = recenterTick;
    prevControlsRef.current = controls;
  }, [
    targetX, targetY, targetZ, distance,
    hasExplicitCenter, persistGalaxyPose, recenterTick,
    camera, controls, saveCurrentGalaxyPose,
    scratchNewTargetRef, scratchPrevTargetRef, scratchDeltaRef, scratchOffsetRef,
  ]);

  return null;
};
