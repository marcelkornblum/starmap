import React, { useEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { useSpatialFrame } from './spatialFrameContext';
import { useCameraStore } from '../../../stores/useCameraStore';
import {
  isOrbitControlsLike,
  releaseOrthographicLock,
} from './cameraRigZoomAndPan';
import { useCameraRigProjection } from './useCameraRigProjection';
import { useCameraRigStoreSync } from './useCameraRigStoreSync';
import { useCameraRigViewOffset } from './useCameraRigViewOffset';
import { useCameraClampBump } from './useCameraClampBump';
import { useOrbitControlsPointerGuard } from './useOrbitControlsPointerGuard';

const FALLBACK_TARGET = new THREE.Vector3(0, 0, 0);

export interface CameraRigProps {
  /** Baseline perspective field of view in degrees. Default: frame.camera.baseFov (45) */
  baseFov?: number;
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
  const camera = useThree((s) => s.camera);
  const rawControls = useThree((s) => s.controls);
  const controls = isOrbitControlsLike(rawControls) ? rawControls : undefined;
  const sizeWidth = useThree((s) => s.size?.width);
  const sizeHeight = useThree((s) => s.size?.height);
  const invalidate = useThree((s) => s.invalidate);
  const gl = useThree((s) => s.gl);
  const get = useThree((s) => s.get);
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
    perspCamRef: projection.perspCamRef,
    orthoCamRef: projection.orthoCamRef,
    persistentTargetRef: projection.persistentTargetRef,
    justUnlockedRef: projection.justUnlockedRef,
    isOrthoAllowed: projection.isOrthoAllowed,
    lockToOrthographic: projection.lockToOrthographic,
    unlockFromOrthographic: projection.unlockFromOrthographic,
    glideToCardinal: projection.glideToCardinal,
  });

  useCameraRigViewOffset({
    perspCamRef: projection.perspCamRef,
    orthoCamRef: projection.orthoCamRef,
    sizeWidth,
    sizeHeight,
    invalidate,
  });

  useCameraClampBump({
    domElement: gl?.domElement,
    get,
  });

  useOrbitControlsPointerGuard({
    domElement: gl?.domElement,
    controls,
    camera,
  });

  useEffect(() => {
    const orthoCam = projection.orthoCamRef.current;
    const baseFov = projection.configuredBaseFov;
    const perspCam = projection.perspCamRef;

    return () => {
      const cameraStore = useCameraStore.getState();
      if (cameraStore.isLocked) {
        if (perspCam.current) {
          const state = get();
          const activeControls = isOrbitControlsLike(state.controls) ? state.controls : undefined;
          releaseOrthographicLock(
            orthoCam,
            perspCam.current,
            FALLBACK_TARGET,
            baseFov,
            activeControls,
          );
          state.set?.({ camera: perspCam.current });
        }
        cameraStore.setLocked(false);
        cameraStore.setActiveCardinal(null);
        cameraStore.setMode('perspective');
      }
    };
  }, [get, projection.configuredBaseFov, projection.orthoCamRef, projection.perspCamRef]);

  return null;
};
