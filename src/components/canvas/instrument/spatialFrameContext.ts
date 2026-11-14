import React, { createContext, useContext } from 'react';
import * as THREE from 'three';
import { type ReferenceFrame } from './referenceFrame';
import {
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

export const DEFAULT_CARDINAL_ALIGNMENT: CardinalAlignment = {
  alphaX: 0,
  alphaY: 0,
  alphaZ: 0,
  maxAlpha: 0,
};

export const DEFAULT_PLANE_WEIGHTS: AllPlaneQuadrantWeights = {
  qwXY: [1, 0, 0, 0],
  qwXZ: [1, 0, 0, 0],
  qwYZ: [1, 0, 0, 0],
  fadeXY: 1.0,
  fadeXZ: 1.0,
  fadeYZ: 1.0,
  maxAlpha: 0,
};

export const SpatialFrameContext = createContext<SpatialFrameContextValue | null>(null);

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

export {
  resolveEntityScreenInvariantScale,
  type EntityScaleFrameState,
} from '../engineConfig';
