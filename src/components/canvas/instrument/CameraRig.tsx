import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useSpatialFrame } from './SpatialFrameProvider';
import { FRAME_PRIORITY } from '../engineConfig';

export interface CameraRigProps {
  /** Baseline perspective field of view in degrees. Default: frame.camera.baseFov (45) */
  baseFov?: number;
  /** Whether to blend FOV and zoom on approach to cardinal views. Default: frame.camera.adaptiveProjection (true) */
  adaptiveProjection?: boolean;
}

export const CameraRig: React.FC<CameraRigProps> = ({
  baseFov: explicitBaseFov,
  adaptiveProjection: explicitAdaptive,
}) => {
  const threeState = useThree() as { camera: THREE.Camera; controls?: { minDistance?: number; maxDistance?: number } };
  const camera = threeState.camera;
  const controls = threeState.controls;
  const { frame, frameRef } = useSpatialFrame();

  const isAdaptive = explicitAdaptive ?? frame.camera.adaptiveProjection ?? true;
  const configuredBaseFov = explicitBaseFov ?? frame.camera.baseFov;

  // Synchronise controls distances
  if (controls) {
    if (typeof frame.camera.minDistance === 'number' && controls.minDistance !== frame.camera.minDistance) {
      controls.minDistance = frame.camera.minDistance;
    }
    if (typeof frame.camera.maxDistance === 'number' && controls.maxDistance !== frame.camera.maxDistance) {
      controls.maxDistance = frame.camera.maxDistance;
    }
  }

  const baseFovRef = useRef<number | null>(null);

  useEffect(() => {
    if (!controls) return;
    const prevMin = controls.minDistance;
    const prevMax = controls.maxDistance;

    if (typeof frame.camera.minDistance === 'number') {
      controls.minDistance = frame.camera.minDistance;
    }
    if (typeof frame.camera.maxDistance === 'number') {
      controls.maxDistance = frame.camera.maxDistance;
    }

    return () => {
      if (controls) {
        if (prevMin !== undefined) controls.minDistance = prevMin;
        if (prevMax !== undefined) controls.maxDistance = prevMax;
      }
    };
  }, [controls, frame.camera.minDistance, frame.camera.maxDistance]);

  useFrame(() => {
    if (!isAdaptive || !(camera instanceof THREE.PerspectiveCamera)) return;

    if (baseFovRef.current === null) {
      baseFovRef.current = configuredBaseFov ?? (camera.fov < 15 ? 45 : camera.fov);
    }

    const { cardinalAlignment } = frameRef.current;
    const maxAlpha = cardinalAlignment.maxAlpha;
    const baseFov = baseFovRef.current;

    if (maxAlpha > 0.001) {
      const targetFov = baseFov * (1 - 0.92 * maxAlpha); // 45 deg -> ~3.6 deg (ortho illusion)
      const targetZoom =
        Math.tan((targetFov * Math.PI) / 360) / Math.tan((baseFov * Math.PI) / 360);

      if (
        Math.abs(camera.fov - targetFov) > 1e-4 ||
        Math.abs(camera.zoom - targetZoom) > 1e-4
      ) {
        camera.fov = targetFov;
        camera.zoom = targetZoom;
        camera.updateProjectionMatrix();
      }
    } else if (
      Math.abs(camera.fov - baseFov) > 1e-4 ||
      Math.abs(camera.zoom - 1.0) > 1e-4
    ) {
      camera.fov = baseFov;
      camera.zoom = 1.0;
      camera.updateProjectionMatrix();
    }
  }, FRAME_PRIORITY.cameraRig);

  // Clean restoration when adaptiveProjection unmounts or toggles off
  useEffect(() => {
    return () => {
      if (camera instanceof THREE.PerspectiveCamera && baseFovRef.current !== null) {
        camera.fov = baseFovRef.current;
        camera.zoom = 1.0;
        camera.updateProjectionMatrix();
        baseFovRef.current = null;
      }
    };
  }, [camera]);

  return null;
};
