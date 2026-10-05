import React, { createContext, useContext, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useLazyRef } from '../../../hooks/useLazyRef';
import { FRAME_PRIORITY } from '../engineConfig';
import {
  type ReferenceFrame,
  GALACTIC_FRAME,
} from './referenceFrame';
import {
  computeApertureRadius,
} from '../math/aperture';
import {
  computeCardinalAlignment,
  computeAllPlaneQuadrantWeights,
  type CardinalAlignment,
  type AllPlaneQuadrantWeights,
} from '../math/cardinal';

export interface SpatialFrameState {
  frame: ReferenceFrame;
  focusPoint: THREE.Vector3;
  cameraDistance: number;
  apertureRadius: number;
  cardinalAlignment: CardinalAlignment;
  planeWeights: AllPlaneQuadrantWeights;
  orientation: THREE.Quaternion;
}

export interface SpatialFrameContextValue {
  frame: ReferenceFrame;
  frameRef: React.MutableRefObject<SpatialFrameState>;
}

const DEFAULT_CARDINAL_ALIGNMENT: CardinalAlignment = {
  alphaX: 0,
  alphaY: 0,
  alphaZ: 0,
  maxAlpha: 0,
};

const DEFAULT_PLANE_WEIGHTS: AllPlaneQuadrantWeights = {
  qwXY: [1, 0, 0, 0],
  qwXZ: [1, 0, 0, 0],
  qwYZ: [1, 0, 0, 0],
  fadeXY: 1.0,
  fadeXZ: 1.0,
  fadeYZ: 1.0,
  maxAlpha: 0,
};

const SpatialFrameContext = createContext<SpatialFrameContextValue | null>(null);

export interface SpatialFrameProviderProps {
  frame?: ReferenceFrame;
  focusPoint?: [number, number, number] | THREE.Vector3;
  lockToFocusPoint?: boolean;
  children?: React.ReactNode;
}

export const SpatialFrameProvider: React.FC<SpatialFrameProviderProps> = ({
  frame = GALACTIC_FRAME,
  focusPoint: explicitFocusPoint,
  lockToFocusPoint = true,
  children,
}) => {
  const stateRef = useLazyRef<SpatialFrameState>(() => ({
    frame,
    focusPoint: new THREE.Vector3(
      Array.isArray(explicitFocusPoint) ? explicitFocusPoint[0] : explicitFocusPoint?.x ?? 0,
      Array.isArray(explicitFocusPoint) ? explicitFocusPoint[1] : explicitFocusPoint?.y ?? 0,
      Array.isArray(explicitFocusPoint) ? explicitFocusPoint[2] : explicitFocusPoint?.z ?? 0,
    ),
    cameraDistance: 35,
    apertureRadius: frame.radius,
    cardinalAlignment: DEFAULT_CARDINAL_ALIGNMENT,
    planeWeights: DEFAULT_PLANE_WEIGHTS,
    orientation: new THREE.Quaternion(0, 0, 0, 1),
  }));

  const scratchCamDir = useLazyRef(() => new THREE.Vector3());
  const scratchVCore = useLazyRef(() => new THREE.Vector3());
  const scratchUCore = useLazyRef(() => new THREE.Vector3());
  const scratchVOrbital = useLazyRef(() => new THREE.Vector3());
  const scratchUOrbital = useLazyRef(() => new THREE.Vector3());
  const scratchUZenith = useLazyRef(() => new THREE.Vector3());
  const scratchBasisMatrix = useLazyRef(() => new THREE.Matrix4());
  const scratchEuler = useLazyRef(() => new THREE.Euler());
  const scratchBaseQuat = useLazyRef(() => new THREE.Quaternion());
  const scratchTiltQuat = useLazyRef(() => new THREE.Quaternion());

  const coreBearingExtent = useMemo(() => {
    for (let i = 0; i < frame.bearings.length; i++) {
      if (frame.bearings[i].id === 'core') return frame.bearings[i].extent ?? 2000;
    }
    return 2000;
  }, [frame.bearings]);

  useFrame((state) => {
    const s = stateRef.current;
    s.frame = frame;
    const camera = state.camera;
    // Runs after drei OrbitControls (FRAME_PRIORITY.spatialFrame), so camera and target are already settled.
    const controls = (state as unknown as { controls?: { target?: THREE.Vector3 } }).controls;

    // 1. Resolve Focus Point
    if (lockToFocusPoint) {
      if (controls?.target) {
        s.focusPoint.copy(controls.target);
      } else if (explicitFocusPoint) {
        if (explicitFocusPoint instanceof THREE.Vector3) {
          s.focusPoint.copy(explicitFocusPoint);
        } else {
          s.focusPoint.set(explicitFocusPoint[0], explicitFocusPoint[1], explicitFocusPoint[2]);
        }
      }
    } else if (explicitFocusPoint) {
      if (explicitFocusPoint instanceof THREE.Vector3) {
        s.focusPoint.copy(explicitFocusPoint);
      } else {
        s.focusPoint.set(explicitFocusPoint[0], explicitFocusPoint[1], explicitFocusPoint[2]);
      }
    }

    // 2. Camera distance & Direction
    const camDist = Math.max(camera.position.distanceTo(s.focusPoint), 1e-4);
    s.cameraDistance = camDist;

    const camDir = scratchCamDir.current.copy(camera.position).sub(s.focusPoint).divideScalar(camDist);

    // 3. Aperture Radius
    const refDist = frame.radius * frame.referenceDistanceMultiplier;
    s.apertureRadius = computeApertureRadius(
      camDist,
      frame.radius,
      refDist,
      frame.screenConstant,
      3.5,
    );

    // 4. Cardinal alignment & Plane Quadrant weights
    const startThresh = frame.camera.thresholdStart ?? 0.94;
    const endThresh = frame.camera.thresholdEnd ?? 0.985;
    s.cardinalAlignment = computeCardinalAlignment(camDir, startThresh, endThresh);
    s.planeWeights = computeAllPlaneQuadrantWeights(camDir, startThresh, endThresh);

    // 5. Orthonormal Basis & Orientation Tilted toward Galactic Core Node (+rGc, 0, 0)
    // Resolve any specified frame base orientation (e.g. planetary axial tilt or invariable plane):
    let hasBaseOrientation = false;
    if (frame.orientation) {
      if (frame.orientation instanceof THREE.Quaternion) {
        scratchBaseQuat.current.copy(frame.orientation);
        hasBaseOrientation = true;
      } else if (frame.orientation instanceof THREE.Euler) {
        scratchBaseQuat.current.setFromEuler(frame.orientation);
        hasBaseOrientation = true;
      } else if (Array.isArray(frame.orientation)) {
        if (frame.orientation.length === 4) {
          scratchBaseQuat.current.set(
            frame.orientation[0],
            frame.orientation[1],
            frame.orientation[2],
            frame.orientation[3],
          );
          hasBaseOrientation = true;
        } else if (frame.orientation.length === 3) {
          scratchEuler.current.set(
            frame.orientation[0],
            frame.orientation[1],
            frame.orientation[2],
          );
          scratchBaseQuat.current.setFromEuler(scratchEuler.current);
          hasBaseOrientation = true;
        }
      }
    }

    // As the instrument moves away from Z=0 (z != 0), its Core Axis tilts directly toward Galactic Core
    const rGc = coreBearingExtent;
    const vCore = scratchVCore.current.set(rGc - s.focusPoint.x, -s.focusPoint.y, -s.focusPoint.z);
    if (vCore.lengthSq() < 1e-6) {
      vCore.set(1, 0, 0);
    }
    const uCore = scratchUCore.current.copy(vCore).normalize();

    // Orbital vector: horizontal in reference plane (Z=0), perpendicular to Core vector:
    const vOrbital = scratchVOrbital.current.set(-uCore.y, uCore.x, 0);
    if (vOrbital.lengthSq() < 1e-6) {
      vOrbital.set(0, 1, 0);
    }
    const uOrbital = scratchUOrbital.current.copy(vOrbital).normalize();

    // Zenith vector: orthogonal to both Core and Orbital:
    const uZenith = scratchUZenith.current.crossVectors(uCore, uOrbital).normalize();

    scratchBasisMatrix.current.makeBasis(uCore, uOrbital, uZenith);
    scratchTiltQuat.current.setFromRotationMatrix(scratchBasisMatrix.current);

    if (hasBaseOrientation) {
      s.orientation.copy(scratchBaseQuat.current).multiply(scratchTiltQuat.current);
    } else {
      s.orientation.copy(scratchTiltQuat.current);
    }
  }, FRAME_PRIORITY.spatialFrame);

  const contextValue = useMemo<SpatialFrameContextValue>(
    () => ({ frame, frameRef: stateRef }),
    [frame, stateRef],
  );

  return (
    <SpatialFrameContext.Provider value={contextValue}>
      {children}
    </SpatialFrameContext.Provider>
  );
};

/**
 * Hook to access the active SpatialFrame state reference and configuration frame.
 * Throws outside a `SpatialFrameProvider`: a silent fallback would render with a static,
 * never-updated frame and hide wiring errors.
 */
export function useSpatialFrame(): SpatialFrameContextValue {
  const ctx = useContext(SpatialFrameContext);
  if (!ctx) {
    throw new Error(
      'useSpatialFrame must be used within a SpatialFrameProvider (normally mounted by SpatialViewport).',
    );
  }
  return ctx;
}
