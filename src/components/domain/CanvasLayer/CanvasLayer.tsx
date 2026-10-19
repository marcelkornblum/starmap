import type React from 'react';
import styles from './CanvasLayer.module.css';

export interface CanvasLayerProps {
  readonly scope: 'galaxy' | 'system' | 'planet';
  readonly targetId?: string;
  readonly centerId?: string;
  readonly centerCoordinates?: readonly [number, number, number];
  readonly cameraAzimuthDeg?: number;
  readonly cameraElevationDeg?: number;
  readonly cameraDistance?: number;
}

export const CanvasLayer: React.FC<CanvasLayerProps> = ({
  scope,
  targetId,
  centerId,
  centerCoordinates,
  cameraAzimuthDeg,
  cameraElevationDeg,
  cameraDistance,
}) => {
  return (
    <div
      className={styles.canvasLayer}
      data-testid="canvas-layer"
      data-scope={scope}
      data-target-id={targetId}
      data-center-id={centerId}
      data-center-coords={centerCoordinates ? centerCoordinates.join(',') : undefined}
      data-camera-az={cameraAzimuthDeg}
      data-camera-el={cameraElevationDeg}
      data-camera-dist={cameraDistance}
      aria-label={`${scope} 3D canvas layer`}
    />
  );
};
