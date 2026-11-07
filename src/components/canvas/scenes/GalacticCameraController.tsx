import type React from 'react';
import { useCallback, useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useCameraStore } from '../../../stores/useCameraStore';
import { useLazyRef } from '../../../hooks/useLazyRef';

export interface OrbitControlsLike {
  target: THREE.Vector3;
  update?: () => void;
  addEventListener?: (type: string, listener: (event: unknown) => void) => void;
  removeEventListener?: (type: string, listener: (event: unknown) => void) => void;
}

function isOrbitControlsLike(value: unknown): value is OrbitControlsLike {
  return (
    typeof value === 'object' &&
    value !== null &&
    'target' in value &&
    value.target instanceof THREE.Vector3
  );
}

function applyCameraSavedZoom(cam: THREE.Camera, zoom: number): void {
  const cameraWithZoom = cam as THREE.Camera & {
    zoom?: number;
    updateProjectionMatrix?: () => void;
  };
  cameraWithZoom.zoom = zoom;
  cameraWithZoom.updateProjectionMatrix?.();
}

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
    'controls' in three && isOrbitControlsLike(three.controls)
      ? three.controls
      : undefined;
  const recenterTick = useCameraStore((s) => s.recenterTick);
  const prevTargetRef = useRef<[number, number, number]>([
    Number.NaN,
    Number.NaN,
    Number.NaN,
  ]);
  const prevDistanceRef = useRef<number>(Number.NaN);
  const prevRecenterTickRef = useRef<number>(-1);
  const prevControlsRef = useRef<OrbitControlsLike | undefined>(undefined);
  const hasRestoredRef = useRef(false);

  const scratchNewTargetRef = useLazyRef(() => new THREE.Vector3());
  const scratchPrevTargetRef = useLazyRef(() => new THREE.Vector3());
  const scratchDeltaRef = useLazyRef(() => new THREE.Vector3());
  const scratchOffsetRef = useLazyRef(() => new THREE.Vector3());

  const targetX = target[0];
  const targetY = target[1];
  const targetZ = target[2];

  const saveCurrentGalaxyPose = useCallback(() => {
    if (!persistGalaxyPose) return;
    const tgt: [number, number, number] = controls?.target
      ? [controls.target.x, controls.target.y, controls.target.z]
      : [targetX, targetY, targetZ];
    const pos: [number, number, number] = [camera.position.x, camera.position.y, camera.position.z];
    const up: [number, number, number] = [camera.up.x, camera.up.y, camera.up.z];
    const focalDistance = controls?.target
      ? camera.position.distanceTo(controls.target)
      : camera.position.length();

    useCameraStore.getState().setSavedGalaxyCamera({
      position: pos,
      target: tgt,
      up,
      zoom: 'zoom' in camera && typeof camera.zoom === 'number' ? camera.zoom : 1,
      focalDistance,
      centerKey: `${tgt[0]},${tgt[1]},${tgt[2]}`,
    });
  }, [camera, controls, persistGalaxyPose, targetX, targetY, targetZ]);

  useEffect(() => {
    if (!persistGalaxyPose) return;
    if (controls?.addEventListener && controls?.removeEventListener) {
      const handleChange = () => {
        saveCurrentGalaxyPose();
      };
      controls.addEventListener('change', handleChange);
      controls.addEventListener('end', handleChange);
      return () => {
        controls.removeEventListener?.('change', handleChange);
        controls.removeEventListener?.('end', handleChange);
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

    if (
      isTargetSame &&
      isDistSame &&
      isTickSame &&
      isControlsSame &&
      (!persistGalaxyPose || hasRestoredRef.current || !useCameraStore.getState().savedGalaxyCamera)
    ) {
      return;
    }

    const isInitialMount = Number.isNaN(prev[0]);
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
          zoom: camera.zoom,
          focalDistance: saved.focalDistance,
        });

        if (controls && isMatch) {
          saveCurrentGalaxyPose();
        }

        prevTargetRef.current = [targetX, targetY, targetZ];
        prevDistanceRef.current = distance ?? Number.NaN;
        prevRecenterTickRef.current = recenterTick;
        prevControlsRef.current = controls;
        return;
      }
    }

    if (isInitialMount && saved && distance === undefined) {
      const relOffsetX = saved.position[0] - saved.target[0];
      const relOffsetY = saved.position[1] - saved.target[1];
      const relOffsetZ = saved.position[2] - saved.target[2];

      camera.position.set(targetX + relOffsetX, targetY + relOffsetY, targetZ + relOffsetZ);
      camera.up.set(saved.up[0], saved.up[1], saved.up[2]);
      applyCameraSavedZoom(camera, saved.zoom);

      if (controls) {
        controls.target.set(targetX, targetY, targetZ);
        controls.update?.();
        hasRestoredRef.current = true;
      } else {
        camera.lookAt(targetX, targetY, targetZ);
      }

      useCameraStore.getState().setCameraPose({
        position: [camera.position.x, camera.position.y, camera.position.z],
        target: [targetX, targetY, targetZ],
        up: saved.up,
        zoom: camera.zoom,
        focalDistance: Math.hypot(relOffsetX, relOffsetY, relOffsetZ),
      });

      if (controls) {
        saveCurrentGalaxyPose();
      }

      prevTargetRef.current = [targetX, targetY, targetZ];
      prevDistanceRef.current = distance ?? Number.NaN;
      prevRecenterTickRef.current = recenterTick;
      prevControlsRef.current = controls;
      return;
    }

    const newTarget = scratchNewTargetRef.current.set(targetX, targetY, targetZ);
    const prevTarget = controls?.target
      ? scratchPrevTargetRef.current.copy(controls.target)
      : Number.isFinite(prev[0])
        ? scratchPrevTargetRef.current.set(prev[0], prev[1], prev[2])
        : scratchPrevTargetRef.current.set(0, 0, 0);
    const delta = scratchDeltaRef.current.copy(newTarget).sub(prevTarget);

    camera.position.add(delta);
    camera.lookAt(newTarget);

    if (controls) {
      controls.target.copy(newTarget);
    }

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
    const finalUp: [number, number, number] = [camera.up.x, camera.up.y, camera.up.z];
    const finalDist = Math.hypot(
      finalPos[0] - finalTarget[0],
      finalPos[1] - finalTarget[1],
      finalPos[2] - finalTarget[2],
    );
    useCameraStore.getState().setCameraPose({
      position: finalPos,
      target: finalTarget,
      up: finalUp,
      zoom: camera.zoom,
      focalDistance: finalDist,
    });
    saveCurrentGalaxyPose();

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
    saveCurrentGalaxyPose,
    scratchNewTargetRef,
    scratchPrevTargetRef,
    scratchDeltaRef,
    scratchOffsetRef,
  ]);

  return null;
};
