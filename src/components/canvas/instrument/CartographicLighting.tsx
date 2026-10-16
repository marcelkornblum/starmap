import React from 'react';
import * as THREE from 'three';
import { useSpatialFrameSafe } from './SpatialFrameProvider';
import type { FrameLightingConfig } from './referenceFrame';

export interface CartographicLightingProps {
  ambientIntensity?: number;
  ambientColor?: string | THREE.Color;
  directionalIntensity?: number;
  directionalColor?: string | THREE.Color;
  directionalPosition?: [number, number, number];
  lightingOverride?: Partial<FrameLightingConfig>;
}

/**
 * CartographicLighting: Frame-driven cartographic lighting.
 * Consumes lighting parameters from the active SpatialFrameProvider (e.g. ambient base illumination
 * and directional lighting), with support for explicit props and overrides.
 */
export const CartographicLighting: React.FC<CartographicLightingProps> = ({
  ambientIntensity: propAmbInt,
  ambientColor: propAmbCol,
  directionalIntensity: propDirInt,
  directionalColor: propDirCol,
  directionalPosition: propDirPos,
  lightingOverride,
}) => {
  const frameCtx = useSpatialFrameSafe();
  const frameLighting = frameCtx?.frame?.lighting;

  const ambientIntensity =
    lightingOverride?.ambientIntensity ??
    propAmbInt ??
    frameLighting?.ambientIntensity ??
    0.6;

  const ambientColor =
    lightingOverride?.ambientColor ??
    propAmbCol ??
    frameLighting?.ambientColor ??
    '#ffffff';

  const directionalIntensity =
    lightingOverride?.directionalIntensity ??
    propDirInt ??
    frameLighting?.directionalIntensity ??
    0.4;

  const directionalColor =
    lightingOverride?.directionalColor ??
    propDirCol ??
    frameLighting?.directionalColor ??
    '#ffffff';

  const directionalPosition =
    lightingOverride?.directionalPosition ??
    propDirPos ??
    frameLighting?.directionalPosition ??
    [10, 20, 15];

  return (
    <>
      <ambientLight color={ambientColor} intensity={ambientIntensity} />
      {directionalIntensity > 0 && (
        <directionalLight
          color={directionalColor}
          position={directionalPosition}
          intensity={directionalIntensity}
        />
      )}
    </>
  );
};
