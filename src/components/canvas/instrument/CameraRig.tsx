import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { useSpatialFrame } from './spatialFrameContext';
import { useCameraStore } from '../../../stores/useCameraStore';
import {
  releaseOrthographicLock,
  type OrbitControlsLike,
} from './cameraRigZoomAndPan';
import { useCameraRigProjection } from './useCameraRigProjection';
import { useCameraRigStoreSync } from './useCameraRigStoreSync';

const FALLBACK_TARGET = new THREE.Vector3(0, 0, 0);

export interface CameraRigProps {
  /** Baseline perspective field of view in degrees. Default: frame.camera.baseFov (45) */
  baseFov?: number;
  /** Whether to blend FOV and zoom on approach to cardinal views. Kept for backwards compatibility */
  adaptiveProjection?: boolean;
  /** Whether to snap smoothly to the nearest cardinal axis on pointer drag release. Default: true */
  snapOnRelease?: boolean;
  /** Cardinal capture angle in degrees for snap-on-release. Default: 10 */
  snapThresholdDeg?: number;
  /** Duration in seconds for snap-to-cardinal glide. Default: 0.35 */
  snapDuration?: number;
}

export const CameraRig: React.FC<CameraRigProps> = ({
  baseFov: explicitBaseFov,
  snapOnRelease = true,
  snapThresholdDeg = 10,
  snapDuration = 0.35,
}) => {
  const threeState = useThree() as {
    camera: THREE.Camera;
    controls?: OrbitControlsLike & {
      minDistance?: number;
      maxDistance?: number;
      addEventListener?: (type: string, listener: () => void) => void;
      removeEventListener?: (type: string, listener: () => void) => void;
    };
    size?: { width: number; height: number };
    get?: () => any;
    set?: (state: any) => void;
    invalidate?: () => void;
  };

  const camera = threeState.camera;
  const controls = threeState.controls;
  const sizeWidth = threeState.size?.width;
  const sizeHeight = threeState.size?.height;
  const get = useMemo(() => threeState.get ?? (() => threeState), [threeState]);
  const { frame } = useSpatialFrame();

  const projection = useCameraRigProjection({
    camera,
    controls,
    sizeWidth,
    sizeHeight,
    get,
    frame,
    explicitBaseFov,
    snapThresholdDeg,
    snapDuration,
  });

  useCameraRigStoreSync({
    camera,
    controls,
    get,
    frame,
    configuredBaseFov: projection.configuredBaseFov,
    snapOnRelease,
    snapThresholdRad: projection.snapThresholdRad,
    controllerRef: projection.controllerRef,
    perspCamRef: projection.perspCamRef,
    orthoCamRef: projection.orthoCamRef,
    persistentTargetRef: projection.persistentTargetRef,
    justUnlockedRef: projection.justUnlockedRef,
    isOrthoAllowed: projection.isOrthoAllowed,
    lockToOrthographic: projection.lockToOrthographic,
    unlockFromOrthographic: projection.unlockFromOrthographic,
    glideToCardinal: projection.glideToCardinal,
  });

  useEffect(() => {
    const controller = projection.controllerRef.current;
    const orthoCam = projection.orthoCamRef.current;
    const baseFov = projection.configuredBaseFov;
    const perspCam = projection.perspCamRef;

    return () => {
      controller.cancel();
      if (useCameraStore.getState().isLocked && perspCam.current) {
        const state = get();
        const activeControls = (state as { controls?: OrbitControlsLike }).controls;
        releaseOrthographicLock(
          orthoCam,
          perspCam.current,
          FALLBACK_TARGET,
          baseFov,
          activeControls,
        );
        state.set?.({ camera: perspCam.current });
      }
    };
  }, [get, projection.configuredBaseFov, projection.controllerRef, projection.orthoCamRef, projection.perspCamRef]);

  return null;
};
