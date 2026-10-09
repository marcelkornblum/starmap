import React, { createContext, useContext, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useLazyRef } from '../../../../hooks/useLazyRef';
import {
  FRAME_PRIORITY,
  REFERENCE_FOV_DEG,
  REFERENCE_INSTRUMENT_FOOTPRINT,
  SCREEN_HEIGHT_REFERENCE_SCALE,
} from '../engineConfig';
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
  /** Invariant instrument footprint radius in scene units at the reference camera distance */
  referenceFootprint: number;
  /** Baseline reference field of view in degrees */
  referenceFovDeg: number;
  /** Screen height reference scale divisor */
  screenHeightReferenceScale: number;
  /** Perspective FOV scaling factor relative to reference FOV */
  fovFactor: number;
  /** Centralised screen-invariant scaling factor at the focus point */
  screenScale: number;
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
    referenceFootprint: REFERENCE_INSTRUMENT_FOOTPRINT,
    referenceFovDeg: frame.camera.baseFov ?? REFERENCE_FOV_DEG,
    screenHeightReferenceScale: SCREEN_HEIGHT_REFERENCE_SCALE,
    fovFactor: 1.0,
    screenScale: 1.0,
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

    // Centralised screen-scale constants & frame-evaluated dynamic factors
    s.referenceFootprint = REFERENCE_INSTRUMENT_FOOTPRINT;
    s.referenceFovDeg = frame.camera.baseFov ?? REFERENCE_FOV_DEG;
    s.screenHeightReferenceScale = SCREEN_HEIGHT_REFERENCE_SCALE;

    const fov =
      camera && typeof camera === 'object' && 'fov' in camera && typeof (camera as { fov: unknown }).fov === 'number'
        ? (camera as { fov: number }).fov
        : s.referenceFovDeg;
    const isPersp =
      camera &&
      typeof camera === 'object' &&
      'isPerspectiveCamera' in camera &&
      (camera as { isPerspectiveCamera: boolean }).isPerspectiveCamera;
    const fovFactor =
      isPersp && fov !== undefined
        ? Math.tan((fov * Math.PI) / 360) / Math.tan((s.referenceFovDeg * Math.PI) / 360)
        : 1.0;
    s.fovFactor = fovFactor;
    s.screenScale = (camDist / s.referenceFootprint) * fovFactor;

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

    // 5. Orthonormal Basis & Orientation
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

    // Tilt is never independently configurable; it exists iff the frame declares a core bearing
    // and follows that bearing's target. Orbital bearing is independent of the core bearing.
    const coreBearing = frame.bearings.find((b) => b.id === 'core');

    if (coreBearing) {
      let targetX = frame.centerDistance ?? coreBearing.extent ?? 2000;
      let targetY = 0;
      let targetZ = 0;
      if (coreBearing.target) {
        if (coreBearing.target instanceof THREE.Vector3) {
          targetX = coreBearing.target.x;
          targetY = coreBearing.target.y;
          targetZ = coreBearing.target.z;
        } else if (Array.isArray(coreBearing.target)) {
          targetX = coreBearing.target[0];
          targetY = coreBearing.target[1];
          targetZ = coreBearing.target[2];
        }
      }

      const vCore = scratchVCore.current.set(
        targetX - s.focusPoint.x,
        targetY - s.focusPoint.y,
        targetZ - s.focusPoint.z,
      );
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
    } else {
      scratchTiltQuat.current.identity();
      if (hasBaseOrientation) {
        s.orientation.copy(scratchBaseQuat.current);
      } else {
        s.orientation.identity();
      }
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

/**
 * Safe hook to access the active SpatialFrame state reference, returning null if outside a provider.
 */
export function useSpatialFrameSafe(): SpatialFrameContextValue | null {
  return useContext(SpatialFrameContext);
}

