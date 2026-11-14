import React from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useLazyRef } from '../../../hooks/useLazyRef';
import {
  type SpatialEntityState,
} from './SpatialEntityStore';
import { useSpatialFrameSafe } from '../instrument/spatialFrameContext';
import { FRAME_PRIORITY } from '../engineConfig';
import { getApertureActiveCutoffForViewportWidth } from '../../../services/deviceTierService';
import { useActiveStarsStore } from '../../../stores/useActiveStarsStore';
import { useSpatialEntityStoreApi } from './SpatialEntityContext';

const APERTURE_EPSILON = 0.05;

function commitApertureState(
  state: SpatialEntityState,
  idsChanged: boolean,
  scratch: Set<string>,
  frameChanged: boolean,
  fx: number,
  fy: number,
  fz: number,
  radius: number,
): void {
  if (idsChanged) {
    state.setApertureIds(new Set(scratch));
  }
  if (frameChanged) {
    state.setApertureFrame([fx, fy, fz], radius);
  }
}

/**
 * ApertureEvaluator (§2.1 / §2.2):
 * Runs at FRAME_PRIORITY.entityAperture, right after SpatialFrameProvider computes
 * focusPoint and apertureRadius.
 * Evaluates spatial proximity across all registered entities in the store in a single
 * centralised pass and updates store.apertureIds atomically.
 */
export const ApertureEvaluator: React.FC = () => {
  const frameCtx = useSpatialFrameSafe();
  const store = useSpatialEntityStoreApi();
  const scratchApertureRef = useLazyRef(() => new Set<string>());

  useFrame((r3fState) => {
    if (!frameCtx?.frameRef?.current) return;
    const { focusPoint, apertureRadius } = frameCtx.frameRef.current;
    const rSq = apertureRadius * apertureRadius;
    const state = store.getState();
    const currentAperture = state.apertureIds;
    let idsChanged = false;
    const scratch = scratchApertureRef.current;
    scratch.clear();

    const activeCutoff = getApertureActiveCutoffForViewportWidth(r3fState?.size?.width);
    const starsState = useActiveStarsStore.getState();
    const isHydrated = starsState.isHydrated;
    const streamedInApertureCount = starsState.summaries.length;

    if (isHydrated && streamedInApertureCount <= activeCutoff) {
      const entities = state.entities;
      for (const id in entities) {
        if (!Object.prototype.hasOwnProperty.call(entities, id)) continue;
        const entity = entities[id];
        const pos = entity.position;
        let x = 0;
        let y = 0;
        let z = 0;
        if (pos instanceof THREE.Vector3) {
          x = pos.x;
          y = pos.y;
          z = pos.z;
        } else if (Array.isArray(pos)) {
          x = pos[0];
          y = pos[1];
          z = pos[2];
        }
        const dx = x - focusPoint.x;
        const dy = y - focusPoint.y;
        const dz = z - focusPoint.z;
        const dSq = dx * dx + dy * dy + dz * dz;
        if (dSq <= rSq) {
          scratch.add(id);
        }
      }

      if (scratch.size > activeCutoff) {
        scratch.clear();
      }
    }

    if (scratch.size !== currentAperture.size) {
      idsChanged = true;
    } else {
      for (const id of scratch) {
        if (!currentAperture.has(id)) {
          idsChanged = true;
          break;
        }
      }
    }

    const prevCenter = state.apertureCenter;
    const prevRadius = state.apertureRadius;
    const frameChanged =
      prevCenter === null ||
      prevRadius === null ||
      Math.abs(prevCenter[0] - focusPoint.x) > APERTURE_EPSILON ||
      Math.abs(prevCenter[1] - focusPoint.y) > APERTURE_EPSILON ||
      Math.abs(prevCenter[2] - focusPoint.z) > APERTURE_EPSILON ||
      Math.abs(prevRadius - apertureRadius) > APERTURE_EPSILON;

    if (idsChanged || frameChanged) {
      commitApertureState(
        state,
        idsChanged,
        scratch,
        frameChanged,
        focusPoint.x,
        focusPoint.y,
        focusPoint.z,
        apertureRadius,
      );
    }
  }, FRAME_PRIORITY.entityAperture);

  return null;
};
