import React, { useEffect, useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useThreeTokenStore } from '../../../stores/useThreeTokenStore';
import { useLazyRef } from '../../../hooks/useLazyRef';
import { NOOP_RAYCAST } from '../engineConfig';
import { useEntityDotsBatchRegistry } from './entityDotsBatchContext';
import {
  createBatchBufferState,
  createEntityDotsMaterial,
  syncBatchEntries,
} from './entityDotsBatchBuffers';

export interface EntityDotsBatchProps {
  readonly initialCapacity?: number;
}

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * EntityDotsBatch: Viewport-level instanced/batched `<points>` pass for all `BodyMarker` nodes.
 * Renders every registered celestial node dot in a single WebGL draw call with crisp circular AA.
 */
export const EntityDotsBatch: React.FC<EntityDotsBatchProps> = React.memo(({ initialCapacity }) => {
  const registry = useEntityDotsBatchRegistry();
  const reticleBracketColor = useThreeTokenStore((s) => s.tokens.reticleBracketColor);
  const invalidate = useThree((s) => s.invalidate);

  const batchState = useMemo(
    () => createBatchBufferState(initialCapacity),
    [initialCapacity],
  );
  const material = useMemo(() => createEntityDotsMaterial(), []);

  const tokenColorRef = useLazyRef(() => new THREE.Color(reticleBracketColor));
  const scratchVecRef = useLazyRef(() => new THREE.Vector3());
  const scratchColorRef = useLazyRef(() => new THREE.Color());

  useEffect(() => {
    tokenColorRef.current.set(reticleBracketColor);
    invalidate();
  }, [reticleBracketColor, tokenColorRef, invalidate]);

  useIsomorphicLayoutEffect(() => {
    if (!registry) return;
    const unsub = registry.subscribeVersion(() => {
      invalidate();
    });
    if (registry.size > 0) {
      invalidate();
    }
    return unsub;
  }, [registry, invalidate]);

  useEffect(() => {
    return () => {
      batchState.geometry.dispose();
      material.dispose();
    };
  }, [batchState, material]);

  useFrame(({ gl }) => {
    const pixelRatio = typeof gl.getPixelRatio === 'function' ? gl.getPixelRatio() : 1;
    if (material.uniforms.uPixelRatio.value !== pixelRatio) {
      material.uniforms.uPixelRatio.value = pixelRatio;
    }

    if (!registry) return;
    const entries = registry.getEntriesArray();
    syncBatchEntries(
      batchState,
      entries,
      tokenColorRef.current,
      scratchVecRef.current,
      scratchColorRef.current,
    );
  });

  if (!registry) return null;

  return (
    <points
      name="entity-dots-batch"
      geometry={batchState.geometry}
      material={material}
      raycast={NOOP_RAYCAST}
      frustumCulled={false}
    />
  );
});

EntityDotsBatch.displayName = 'EntityDotsBatch';
