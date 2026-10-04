import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useSpatialFrame } from './SpatialFrameProvider';
import { useThreeTokenStore } from '../../../stores/useThreeTokenStore';
import { createCircleGeometry } from '../math/rings';
import {
  populateZoomAdaptiveRings,
  type ScaledRingInfo,
} from '../cartography/cartographyMath';

const DEFAULT_FIXED_RINGS: readonly number[] = [2.5, 5, 10];

export interface RangeRingsProps {
  /** Explicit fixed radii to render. When omitted, uses frame.rangeRings or dynamic zoom-adaptive rings. */
  rings?: number[];
  /** Designated major ring index in the rings array */
  majorRingIndex?: number;
  /** Pool capacity for dynamic rings (default: 8) */
  poolSize?: number;
  /** Whether the rings group dynamically locks to the camera focus point. Default: true */
  lockToFocusPoint?: boolean;
  /** Manual position offset when nested or placed statically */
  position?: [number, number, number] | THREE.Vector3;
}

export const RangeRings: React.FC<RangeRingsProps> = ({
  rings: explicitRings,
  majorRingIndex,
  poolSize = 8,
  lockToFocusPoint = true,
  position,
}) => {
  const { frame, frameRef } = useSpatialFrame();
  const ringMajorAlpha = useThreeTokenStore((state) => state.tokens.ringMajorAlpha);
  const ringMinorAlpha = useThreeTokenStore((state) => state.tokens.ringMinorAlpha);
  const rangeRingColor = useThreeTokenStore((state) => state.tokens.rangeRingColor);

  const ringsList = explicitRings ?? frame.rangeRings.fixedRings ?? DEFAULT_FIXED_RINGS;
  const unitCircleGeom = useMemo(() => createCircleGeometry(1.0, 128), []);

  useEffect(() => {
    return () => {
      unitCircleGeom.dispose();
    };
  }, [unitCircleGeom]);

  const groupRef = useRef<THREE.Group>(null);
  const ringMeshesRef = useRef<(THREE.LineLoop | null)[]>([]);
  const ringMaterialsRef = useRef<(THREE.LineBasicMaterial | null)[]>([]);

  const activeRingsPoolRef = useRef<ScaledRingInfo[]>(
    Array.from({ length: poolSize }, () => ({ radius: 0, isMajor: false, fade: 0 })),
  );

  const indices = useMemo(() => Array.from({ length: poolSize }, (_, i) => i), [poolSize]);

  useFrame(() => {
    const { apertureRadius, focusPoint, planeWeights, cardinalAlignment } = frameRef.current;
    const fadeXY = planeWeights?.fadeXY ?? Math.max(0, 1.0 - Math.max(cardinalAlignment.alphaX, cardinalAlignment.alphaY));

    if (groupRef.current && lockToFocusPoint && !position) {
      groupRef.current.position.set(focusPoint.x, focusPoint.y, 0);
    }

    if (frame.screenConstant && !explicitRings) {
      // Dynamic zoom-adaptive logarithmic rings
      const numActive = populateZoomAdaptiveRings(apertureRadius, activeRingsPoolRef.current, poolSize);

      for (let i = 0; i < poolSize; i++) {
        const mesh = ringMeshesRef.current[i];
        const mat = ringMaterialsRef.current[i];
        if (!mesh || !mat) continue;

        if (i < numActive && fadeXY > 1e-3) {
          const ring = activeRingsPoolRef.current[i];
          mesh.visible = true;
          mesh.scale.set(ring.radius, ring.radius, 1);
          const baseAlpha = ring.isMajor ? ringMajorAlpha : ringMinorAlpha;
          mat.opacity = baseAlpha * ring.fade * fadeXY;
          mat.color.copy(rangeRingColor);
        } else {
          mesh.visible = false;
        }
      }
    } else {
      // Explicit fixed rings
      for (let i = 0; i < poolSize; i++) {
        const mesh = ringMeshesRef.current[i];
        const mat = ringMaterialsRef.current[i];
        if (!mesh || !mat) continue;

        if (i < ringsList.length && fadeXY > 1e-3) {
          const r = ringsList[i];
          const isMajor = majorRingIndex !== undefined ? i === majorRingIndex : i === ringsList.length - 1;
          mesh.visible = true;
          mesh.scale.set(r, r, 1);
          mat.opacity = (isMajor ? ringMajorAlpha : ringMinorAlpha) * fadeXY;
          mat.color.copy(rangeRingColor);
        } else {
          mesh.visible = false;
        }
      }
    }
  });

  return (
    <group ref={groupRef} position={position} name="range-rings">
      {indices.map((idx) => {
        const initialRadius = idx < ringsList.length ? ringsList[idx] : 1.0;
        const ringName = idx < ringsList.length ? `full-ring-${ringsList[idx]}` : `full-ring-tier-${idx}`;
        return (
          <lineLoop
            key={`range-ring-${idx}`}
            ref={(el) => {
              ringMeshesRef.current[idx] = el;
            }}
            scale={[initialRadius, initialRadius, 1]}
            name={ringName}
            frustumCulled={false}
          >
            <primitive object={unitCircleGeom} attach="geometry" />
            <lineBasicMaterial
              ref={(el) => {
                ringMaterialsRef.current[idx] = el;
              }}
              color={rangeRingColor}
              opacity={ringMinorAlpha}
              transparent
              depthWrite={false}
            />
          </lineLoop>
        );
      })}
    </group>
  );
};
