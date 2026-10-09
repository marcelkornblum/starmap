import React from 'react';
import { useFrame } from '@react-three/fiber';
import { useOcclusionManager } from './SpatialEntityContext';

export interface OcclusionPassProps {
  enabled?: boolean;
}

/**
 * OcclusionPass: Non-leaky O(n) per-frame occlusion evaluation pass.
 * Calculates dynamic screen-space footprints, priority occlusion masking for geometric reticles,
 * and camera-proximity occlusion for typographic labels.
 */
export const OcclusionPass: React.FC<OcclusionPassProps> = ({ enabled = true }) => {
  const occlusionManager = useOcclusionManager();

  useFrame(({ camera, size }) => {
    if (!enabled) return;
    occlusionManager.evaluate(camera, size);
  });

  return null;
};
