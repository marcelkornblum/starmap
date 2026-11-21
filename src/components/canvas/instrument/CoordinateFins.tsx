import React, { useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useSpatialFrame } from './spatialFrameContext';
import { useThreeTokenStore } from '../../../stores/useThreeTokenStore';
import { populateZoomAdaptiveRings, type ScaledRingInfo } from '../math';
import {
  PLANES,
  DEFAULT_FIXED_RINGS,
  DEFAULT_FIN_RING_POOL,
  MAX_FIN_RING_POOL,
  clampFinPoolSize,
  buildAllFinGeometries,
  disposeAllFinGeometries,
  createAllFinMaterials,
  disposeAllFinMaterials,
  updateCoordinateFinsFrame,
  type FinPlane,
} from './coordinateFinsGeometry';
import { NOOP_RAYCAST } from '../engineConfig';

export interface CoordinateFinsProps {
  /** Whether to render travelling coordinate fins */
  enabled?: boolean;
  /** Explicit fixed range rings if zoom adaptation is disabled */
  rings?: number[];
  /** Major ring index */
  majorRingIndex?: number;
  /** Pool capacity for dynamic range arcs (default: 8, clamped to 1..16) */
  poolSize?: number;
}

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export const CoordinateFins: React.FC<CoordinateFinsProps> = React.memo(({
  enabled,
  rings: explicitRings,
  majorRingIndex,
  poolSize = DEFAULT_FIN_RING_POOL,
}) => {
  const { frame, frameRef } = useSpatialFrame();
  const invalidate = useThree((s) => s.invalidate);

  const gridSecondaryColor = useThreeTokenStore((s) => s.tokens.gridSecondaryColor);
  const finPerimeterAlpha = useThreeTokenStore((s) => s.tokens.finPerimeterAlpha);
  const tickAlpha = useThreeTokenStore((s) => s.tokens.tickAlpha);
  const rangeTickColor = useThreeTokenStore((s) => s.tokens.rangeTickColor);
  const ringMajorAlpha = useThreeTokenStore((s) => s.tokens.ringMajorAlpha);
  const ringMinorAlpha = useThreeTokenStore((s) => s.tokens.ringMinorAlpha);

  const isEnabled = enabled ?? frame.coordinateFins.enabled;
  const clampedPoolSize = clampFinPoolSize(poolSize);
  const rootGroupRef = useRef<THREE.Group>(null);

  const finGeoms = useMemo(() => buildAllFinGeometries(clampedPoolSize), [clampedPoolSize]);
  const finMaterials = useMemo(() => createAllFinMaterials(), []);

  useEffect(() => () => disposeAllFinGeometries(finGeoms), [finGeoms]);
  useEffect(() => () => disposeAllFinMaterials(finMaterials), [finMaterials]);

  const perimeterLinesRef = useRef<Record<FinPlane, THREE.LineSegments | null>>({ xy: null, xz: null, yz: null });
  const tickLinesRef = useRef<Record<FinPlane, THREE.LineSegments | null>>({ xy: null, xz: null, yz: null });
  const arcLinesRef = useRef<Record<FinPlane, THREE.LineSegments | null>>({ xy: null, xz: null, yz: null });

  const activeRingsPoolRef = useRef<ScaledRingInfo[]>(
    Array.from({ length: MAX_FIN_RING_POOL }, () => ({ radius: 0, isMajor: false, fade: 0 })),
  );

  useIsomorphicLayoutEffect(() => {
    for (let i = 0; i < PLANES.length; i++) {
      const planeMats = finMaterials[PLANES[i]];
      planeMats.perimeter.uniforms.uColor.value.set(gridSecondaryColor);
      planeMats.perimeter.uniforms.uBaseAlpha.value = finPerimeterAlpha;
      planeMats.perimeter.uniforms.uApertureRadius.value = frame.radius;

      planeMats.ticks.uniforms.uColor.value.set(rangeTickColor);
      planeMats.ticks.uniforms.uBaseAlpha.value = tickAlpha;
      planeMats.ticks.uniforms.uApertureRadius.value = frame.radius;

      planeMats.arcs.uniforms.uColor.value.set(gridSecondaryColor);
    }
  }, [finMaterials, gridSecondaryColor, finPerimeterAlpha, rangeTickColor, tickAlpha, frame.radius]);

  useEffect(() => {
    for (let i = 0; i < PLANES.length; i++) {
      const planeMats = finMaterials[PLANES[i]];
      planeMats.perimeter.uniforms.uColor.value.set(gridSecondaryColor);
      planeMats.perimeter.uniforms.uBaseAlpha.value = finPerimeterAlpha;
      planeMats.ticks.uniforms.uColor.value.set(rangeTickColor);
      planeMats.ticks.uniforms.uBaseAlpha.value = tickAlpha;
      planeMats.arcs.uniforms.uColor.value.set(gridSecondaryColor);
    }
    invalidate();
  }, [finMaterials, gridSecondaryColor, finPerimeterAlpha, rangeTickColor, tickAlpha, invalidate]);

  useFrame(() => {
    if (!isEnabled || !rootGroupRef.current?.position) return;
    const { apertureRadius, focusPoint, planeWeights, orientation } = frameRef.current;
    rootGroupRef.current.position.copy(focusPoint);
    rootGroupRef.current.quaternion.copy(orientation);

    let numActive = 0;
    if (frame.screenConstant && !explicitRings) {
      numActive = populateZoomAdaptiveRings(apertureRadius, activeRingsPoolRef.current, clampedPoolSize);
    } else {
      const list = explicitRings ?? frame.rangeRings.fixedRings ?? DEFAULT_FIXED_RINGS;
      numActive = Math.min(list.length, clampedPoolSize);
      for (let i = 0; i < numActive; i++) {
        const item = activeRingsPoolRef.current[i];
        item.radius = list[i];
        item.isMajor = majorRingIndex !== undefined ? i === majorRingIndex : i === list.length - 1;
        item.fade = 1.0;
      }
    }

    updateCoordinateFinsFrame(
      perimeterLinesRef.current,
      tickLinesRef.current,
      arcLinesRef.current,
      finMaterials,
      apertureRadius,
      planeWeights,
      ringMajorAlpha,
      ringMinorAlpha,
      activeRingsPoolRef.current,
      numActive,
      clampedPoolSize,
    );
  });

  if (!isEnabled) return null;

  return (
    <group ref={rootGroupRef} name="travelling-fins">
      {PLANES.map((plane) => (
        <group key={`fin-${plane}`} name={`fin-${plane}`} matrixAutoUpdate={false}>
          <lineSegments
            ref={(el) => { perimeterLinesRef.current[plane] = el; }}
            name={`${plane}-perimeter`}
            geometry={finGeoms.perimeterGeoms[plane]}
            material={finMaterials[plane].perimeter}
            matrixAutoUpdate={false}
            frustumCulled={false}
            raycast={NOOP_RAYCAST}
          />
          {frame.coordinateFins.ticks && (
            <lineSegments
              ref={(el) => { tickLinesRef.current[plane] = el; }}
              name={`${plane}-ticks`}
              geometry={finGeoms.tickGeoms[plane]}
              material={finMaterials[plane].ticks}
              matrixAutoUpdate={false}
              frustumCulled={false}
              raycast={NOOP_RAYCAST}
            />
          )}
          {frame.coordinateFins.rangeArcs && (
            <lineSegments
              ref={(el) => { arcLinesRef.current[plane] = el; }}
              name={`${plane}-arcs`}
              geometry={finGeoms.arcGeoms[plane]}
              material={finMaterials[plane].arcs}
              matrixAutoUpdate={false}
              frustumCulled={false}
              raycast={NOOP_RAYCAST}
            />
          )}
        </group>
      ))}
    </group>
  );
});
