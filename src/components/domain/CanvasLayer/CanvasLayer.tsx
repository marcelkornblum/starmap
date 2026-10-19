import type React from 'react';
import type { JourneyChordLeg } from '../../canvas/cartography/journeyChordGeometry';
import styles from './CanvasLayer.module.css';

export interface CanvasLayerProps {
  readonly scope: 'galaxy' | 'system' | 'planet';
  readonly targetId?: string;
  readonly centerId?: string;
  readonly centerCoordinates?: readonly [number, number, number];
  readonly cameraAzimuthDeg?: number;
  readonly cameraElevationDeg?: number;
  readonly cameraDistance?: number;
  readonly journeyLegs?: readonly JourneyChordLeg[];
  readonly activeJourneyMethod?: string;
}

export const CanvasLayer: React.FC<CanvasLayerProps> = ({
  scope,
  targetId,
  centerId,
  centerCoordinates,
  cameraAzimuthDeg,
  cameraElevationDeg,
  cameraDistance,
  journeyLegs,
  activeJourneyMethod,
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
      data-journey-legs-count={journeyLegs && journeyLegs.length > 0 ? journeyLegs.length : undefined}
      data-journey-method={activeJourneyMethod}
      aria-label={`${scope} 3D canvas layer`}
    />
  );
};
