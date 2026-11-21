import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useLazyRef } from '../../../hooks/useLazyRef';
import type { CelestialOcclusionManager } from '../cartography/celestialOcclusionRegistry';
import type { CelestialFootprint } from '../cartography/occlusionTypes';
import { DEFAULT_RETICLE_SIZE } from '../cartography/reticleGeometry';
import { reticleSizeToScreenPx } from '../engineConfig';
import type { CelestialInteractionState, CelestialClassification, PlanetCensusEntry } from '../../../types/spatial';

export interface UseCelestialEntityOcclusionParams {
  id: string;
  name: string;
  activeState: CelestialInteractionState;
  classification: CelestialClassification;
  multiplicity?: number;
  planets?: PlanetCensusEntry[];
  resolvedPos: THREE.Vector3;
  occlusionManager: CelestialOcclusionManager;
}

export function useCelestialEntityOcclusion({
  id,
  name,
  activeState,
  classification,
  multiplicity = 1,
  planets,
  resolvedPos,
  occlusionManager,
}: UseCelestialEntityOcclusionParams) {
  const invalidate = useThree((s) => s.invalidate);
  const footprintRef = useRef<CelestialFootprint>({
    id,
    name,
    state: activeState,
    worldPos: [resolvedPos.x, resolvedPos.y, resolvedPos.z],
    classification,
    reticleSize: DEFAULT_RETICLE_SIZE,
    multiplicity,
    planets,
    screenX: 0,
    screenY: 0,
    camDist: 0,
    reticleRadius: DEFAULT_RETICLE_SIZE,
    starRadius: 0.035,
    hasReticle: activeState !== 'passive',
    visible: true,
    updatedAt: 0,
  });

  useEffect(() => {
    const fp = footprintRef.current;
    fp.id = id;
    fp.name = name;
    fp.state = activeState;
    fp.hasReticle = activeState !== 'passive';
    fp.reticleSize = DEFAULT_RETICLE_SIZE;
    fp.multiplicity = multiplicity;
    fp.planets = planets;
    fp.classification = classification;
    if (fp.worldPos) {
      fp.worldPos[0] = resolvedPos.x;
      fp.worldPos[1] = resolvedPos.y;
      fp.worldPos[2] = resolvedPos.z;
    } else {
      fp.worldPos = [resolvedPos.x, resolvedPos.y, resolvedPos.z];
    }
    occlusionManager.register(fp);
    invalidate();
    return () => {
      occlusionManager.unregister(id);
      invalidate();
    };
  }, [id, name, activeState, multiplicity, planets, classification, resolvedPos, occlusionManager, invalidate]);

  const scratchNdcRef = useLazyRef(() => new THREE.Vector3());
  const scratchWorldPosRef = useLazyRef(() => new THREE.Vector3());
  const scratchCamSpaceRef = useLazyRef(() => new THREE.Vector3());

  useFrame(({ camera, size }) => {
    if (occlusionManager.isBatchEvaluating()) {
      return;
    }

    scratchWorldPosRef.current.copy(resolvedPos);
    const camDist = Math.max(camera.position.distanceTo(scratchWorldPosRef.current), 1e-4);
    const zNear = ('near' in camera && typeof camera.near === 'number') ? camera.near : 0.1;
    const isBehindCamera = scratchCamSpaceRef.current
      .copy(scratchWorldPosRef.current)
      .applyMatrix4(camera.matrixWorldInverse).z > -zNear;
    const ndc = scratchNdcRef.current.copy(scratchWorldPosRef.current).project(camera);
    const screenX = (ndc.x * 0.5 + 0.5) * size.width;
    const screenY = (-ndc.y * 0.5 + 0.5) * size.height;
    const reticleRadiusPx = reticleSizeToScreenPx(DEFAULT_RETICLE_SIZE, size.height);

    const fp = footprintRef.current;
    fp.screenX = screenX;
    fp.screenY = screenY;
    fp.camDist = camDist;
    fp.reticleRadius = reticleRadiusPx;
    fp.visible = !isBehindCamera;
    fp.updatedAt = performance.now();
  });

  return { footprintRef };
}
