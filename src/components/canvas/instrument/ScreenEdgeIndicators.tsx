import React from 'react';
import * as THREE from 'three';
import { useSpatialFrame } from './SpatialFrameProvider';
import { ScreenEdgeCue } from './ScreenEdgeCue';

export interface ScreenEdgeIndicatorsProps {
  /** Origin point of bearing lines in world space */
  origin?: [number, number, number] | THREE.Vector3;
  margin?: number;
  extent?: number;
  /** Distance to system/galactic centre for curved orbital calculation */
  centerDistance?: number;
  /** @deprecated Use centerDistance instead */
  rGc?: number;
  minLineLength?: number;
  /** Explicit override to show/hide Core bearing indicator */
  showCore?: boolean;
  /** Explicit override to show/hide Orbital bearing indicator */
  showOrbital?: boolean;
}

export const ScreenEdgeIndicators: React.FC<ScreenEdgeIndicatorsProps> = ({
  origin,
  margin = 28,
  extent = 2000,
  centerDistance,
  rGc,
  minLineLength = 40,
  showCore = true,
  showOrbital = true,
}) => {
  const { frame } = useSpatialFrame();

  const activeBearings = frame.bearings.filter((b) => {
    if (!b.showEdgeCue) return false;
    if (b.id === 'core' && !showCore) return false;
    if (b.id === 'orbital' && !showOrbital) return false;
    return true;
  });

  return (
    <group name="screen-edge-bearing-indicators">
      {activeBearings.map((b) => (
        <ScreenEdgeCue
          key={`screen-edge-cue-${b.id}`}
          bearing={b}
          origin={origin}
          margin={margin}
          extent={extent}
          centerDistance={centerDistance ?? rGc}
          rGc={rGc}
          minLineLength={minLineLength}
        />
      ))}
    </group>
  );
};
