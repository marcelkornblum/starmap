import React from 'react';
import type { JourneyChordLeg } from '../../canvas/cartography/journeyChordGeometry';
import {
  GalacticViewScene,
  SystemViewScene,
  PlanetaryViewScene,
} from '../../canvas/scenes/SpatialScenes';
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
  readonly onInspect?: (id: string) => void;
  readonly onSelect?: (id: string | null) => void;
}

let webglSupported: boolean | null = null;

export const canMountWebGLCanvas = (): boolean => {
  if (webglSupported !== null) {
    return webglSupported;
  }
  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    /jsdom/i.test(window.navigator?.userAgent ?? '')
  ) {
    webglSupported = false;
    return false;
  }
  try {
    const canvas = document.createElement('canvas');
    webglSupported = Boolean(
      canvas.getContext('webgl2') || canvas.getContext('webgl'),
    );
  } catch {
    webglSupported = false;
  }
  return webglSupported;
};

export const _resetWebGLSupportedForTesting = (): void => {
  webglSupported = null;
};

export const CanvasLayer: React.FC<CanvasLayerProps> = React.memo(({
  scope,
  targetId,
  centerId,
  centerCoordinates,
  cameraAzimuthDeg,
  cameraElevationDeg,
  cameraDistance,
  journeyLegs,
  activeJourneyMethod,
  onInspect,
  onSelect,
}) => {
  const mountCanvas = canMountWebGLCanvas();

  return (
    <div
      className={styles.canvasLayer}
      data-testid="canvas-layer"
      data-scope={scope}
      data-target-id={targetId}
      data-center-id={centerId}
      data-center-coords={
        centerCoordinates ? centerCoordinates.join(',') : undefined
      }
      data-camera-az={cameraAzimuthDeg}
      data-camera-el={cameraElevationDeg}
      data-camera-dist={cameraDistance}
      data-journey-legs-count={
        journeyLegs && journeyLegs.length > 0 ? journeyLegs.length : undefined
      }
      data-journey-method={activeJourneyMethod}
      aria-label={`${scope} 3D canvas layer`}
    >
      {mountCanvas && scope === 'galaxy' && (
        <GalacticViewScene
          variant="fullscreen"
          initialSelectedId={centerId ?? null}
          centerCoordinates={centerCoordinates}
          centerId={centerId}
          onInspectSystem={onInspect}
          onSelectSystem={onSelect}
        />
      )}
      {mountCanvas && scope === 'system' && (
        <SystemViewScene
          variant="fullscreen"
          systemId={targetId ?? 'sol'}
        />
      )}
      {mountCanvas && scope === 'planet' && (
        <PlanetaryViewScene
          variant="fullscreen"
          planetId={targetId ?? 'earth'}
        />
      )}
    </div>
  );
});

CanvasLayer.displayName = 'CanvasLayer';
