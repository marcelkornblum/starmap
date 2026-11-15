import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useSpatialFrame } from './spatialFrameContext';
import { useThreeTokenStore } from '../../../stores/useThreeTokenStore';
import { QUADRANTS } from '../cartography/cartographyFinsAndTicks';
import { populateZoomAdaptiveRings, type ScaledRingInfo } from '../math';
import {
  PLANES,
  DEFAULT_FIXED_RINGS,
  buildAllFinGeometries,
  disposeAllFinGeometries,
  updateCoordinateFinsFrame,
} from './coordinateFinsGeometry';

export interface CoordinateFinsProps {
  /** Whether to render travelling coordinate fins */
  enabled?: boolean;
  /** Explicit fixed range rings if zoom adaptation is disabled */
  rings?: number[];
  /** Major ring index */
  majorRingIndex?: number;
  /** Pool capacity for dynamic range arcs (default: 8) */
  poolSize?: number;
}

export const CoordinateFins: React.FC<CoordinateFinsProps> = ({
  enabled,
  rings: explicitRings,
  majorRingIndex,
  poolSize = 8,
}) => {
  const { frame, frameRef } = useSpatialFrame();
  const gridSecondaryColor = useThreeTokenStore((s) => s.tokens.gridSecondaryColor);
  const finPerimeterAlpha = useThreeTokenStore((s) => s.tokens.finPerimeterAlpha);
  const tickAlpha = useThreeTokenStore((s) => s.tokens.tickAlpha);
  const rangeTickColor = useThreeTokenStore((s) => s.tokens.rangeTickColor);
  const ringMajorAlpha = useThreeTokenStore((s) => s.tokens.ringMajorAlpha);
  const ringMinorAlpha = useThreeTokenStore((s) => s.tokens.ringMinorAlpha);

  const isEnabled = enabled ?? frame.coordinateFins.enabled;
  const rootGroupRef = useRef<THREE.Group>(null);

  const finGeoms = useMemo(() => buildAllFinGeometries(), []);
  useEffect(() => () => disposeAllFinGeometries(finGeoms), [finGeoms]);

  const perimeterLinesRef = useRef<Record<string, (THREE.LineSegments | null)[]>>({ xy: [null, null, null, null], xz: [null, null, null, null], yz: [null, null, null, null] });
  const perimeterMatsRef = useRef<Record<string, (THREE.LineBasicMaterial | null)[]>>({ xy: [null, null, null, null], xz: [null, null, null, null], yz: [null, null, null, null] });
  const baselineLinesRef = useRef<Record<string, (THREE.LineSegments | null)[]>>({ xy: [null, null, null, null], xz: [null, null, null, null], yz: [null, null, null, null] });
  const baselineMatsRef = useRef<Record<string, (THREE.LineBasicMaterial | null)[]>>({ xy: [null, null, null, null], xz: [null, null, null, null], yz: [null, null, null, null] });
  const tickLinesRef = useRef<Record<string, (THREE.LineSegments | null)[]>>({ xy: [null, null, null, null], xz: [null, null, null, null], yz: [null, null, null, null] });
  const tickMatsRef = useRef<Record<string, (THREE.LineBasicMaterial | null)[]>>({ xy: [null, null, null, null], xz: [null, null, null, null], yz: [null, null, null, null] });
  const quadLinesRef = useRef<Record<string, (THREE.LineSegments | null)[][]>>({
    xy: Array.from({ length: poolSize }, () => [null, null, null, null]),
    xz: Array.from({ length: poolSize }, () => [null, null, null, null]),
    yz: Array.from({ length: poolSize }, () => [null, null, null, null]),
  });
  const quadMatsRef = useRef<Record<string, (THREE.LineBasicMaterial | null)[][]>>({
    xy: Array.from({ length: poolSize }, () => [null, null, null, null]),
    xz: Array.from({ length: poolSize }, () => [null, null, null, null]),
    yz: Array.from({ length: poolSize }, () => [null, null, null, null]),
  });

  const activeRingsPoolRef = useRef<ScaledRingInfo[]>(Array.from({ length: poolSize }, () => ({ radius: 0, isMajor: false, fade: 0 })));
  const ringPoolIndices = useMemo(() => Array.from({ length: poolSize }, (_, i) => i), [poolSize]);

  useFrame(() => {
    if (!isEnabled || !rootGroupRef.current?.position) return;
    const { apertureRadius, focusPoint, planeWeights, orientation } = frameRef.current;
    rootGroupRef.current.position.copy(focusPoint);
    rootGroupRef.current.quaternion.copy(orientation);

    let numActive = 0;
    if (frame.screenConstant && !explicitRings) {
      numActive = populateZoomAdaptiveRings(apertureRadius, activeRingsPoolRef.current, poolSize);
    } else {
      const list = explicitRings ?? frame.rangeRings.fixedRings ?? DEFAULT_FIXED_RINGS;
      numActive = list.length;
      for (let i = 0; i < list.length; i++) {
        const item = activeRingsPoolRef.current[i];
        item.radius = list[i];
        item.isMajor = majorRingIndex !== undefined ? i === majorRingIndex : i === list.length - 1;
        item.fade = 1.0;
      }
    }

    updateCoordinateFinsFrame(
      perimeterLinesRef.current,
      perimeterMatsRef.current,
      baselineLinesRef.current,
      baselineMatsRef.current,
      tickLinesRef.current,
      tickMatsRef.current,
      quadLinesRef.current,
      quadMatsRef.current,
      apertureRadius,
      planeWeights,
      finPerimeterAlpha,
      tickAlpha,
      ringMajorAlpha,
      ringMinorAlpha,
      activeRingsPoolRef.current,
      numActive,
      poolSize,
    );
  });

  useEffect(() => {
    for (const plane of PLANES) {
      for (let q = 0; q < 4; q++) {
        perimeterMatsRef.current[plane]?.[q]?.color.set(gridSecondaryColor);
        baselineMatsRef.current[plane]?.[q]?.color.set(gridSecondaryColor);
        tickMatsRef.current[plane]?.[q]?.color.set(rangeTickColor);
      }
      for (let rIdx = 0; rIdx < poolSize; rIdx++) {
        for (let q = 0; q < 4; q++) {
          quadMatsRef.current[plane]?.[rIdx]?.[q]?.color.set(gridSecondaryColor);
        }
      }
    }
  }, [gridSecondaryColor, rangeTickColor, poolSize]);

  if (!isEnabled) return null;
  const initialRings = explicitRings ?? frame.rangeRings.fixedRings ?? DEFAULT_FIXED_RINGS;

  return (
    <group ref={rootGroupRef} name="travelling-fins">
      {PLANES.map((plane) => (
        <group key={`fin-${plane}`} name={`fin-${plane}`}>
          {QUADRANTS.map((quad, qIdx) => (
            <lineSegments
              key={`${plane}-perimeter-q${qIdx}`}
              ref={(el) => { perimeterLinesRef.current[plane][qIdx] = el; }}
              name={`${plane}-perimeter-q${qIdx}`}
              visible={quad.qx === 1 && quad.qy === 1}
              scale={[frame.radius, frame.radius, frame.radius]}
              frustumCulled={false}
            >
              <primitive object={finGeoms.quadrantGeoms[plane][qIdx]} attach="geometry" />
              <lineBasicMaterial
                ref={(el) => { perimeterMatsRef.current[plane][qIdx] = el; }}
                color={gridSecondaryColor}
                opacity={finPerimeterAlpha}
                transparent
                depthWrite={false}
              />
            </lineSegments>
          ))}

          {QUADRANTS.map((quad, qIdx) => (
            <lineSegments
              key={`${plane}-baseline-q${qIdx}`}
              ref={(el) => { baselineLinesRef.current[plane][qIdx] = el; }}
              name={`${plane}-baseline-q${qIdx}`}
              visible={quad.qx === 1 && quad.qy === 1}
              scale={[frame.radius, frame.radius, frame.radius]}
              frustumCulled={false}
            >
              <primitive object={finGeoms.baselineGeoms[plane][qIdx]} attach="geometry" />
              <lineBasicMaterial
                ref={(el) => { baselineMatsRef.current[plane][qIdx] = el; }}
                color={gridSecondaryColor}
                opacity={finPerimeterAlpha}
                transparent
                depthWrite={false}
              />
            </lineSegments>
          ))}

          {frame.coordinateFins.ticks &&
            QUADRANTS.map((quad, qIdx) => (
              <lineSegments
                key={`${plane}-ticks-q${qIdx}`}
                ref={(el) => { tickLinesRef.current[plane][qIdx] = el; }}
                name={`${plane}-ticks-q${qIdx}`}
                visible={quad.qx === 1 && quad.qy === 1}
                scale={[frame.radius, frame.radius, frame.radius]}
                frustumCulled={false}
              >
                <primitive object={finGeoms.tickGeoms[plane][qIdx]} attach="geometry" />
                <lineBasicMaterial
                  ref={(el) => { tickMatsRef.current[plane][qIdx] = el; }}
                  color={rangeTickColor}
                  opacity={tickAlpha}
                  transparent
                  depthWrite={false}
                />
              </lineSegments>
            ))}

          {frame.coordinateFins.rangeArcs &&
            ringPoolIndices.map((rIdx) => (
              <group key={`${plane}-arc-group-${rIdx}`} name={rIdx < initialRings.length ? `arc-tier-${initialRings[rIdx]}` : `arc-pool-${rIdx}`}>
                {QUADRANTS.map((quad, qIdx) => (
                  <lineSegments
                    key={`${plane}-ring-${rIdx}-q${qIdx}`}
                    ref={(el) => {
                      if (!quadLinesRef.current[plane][rIdx]) quadLinesRef.current[plane][rIdx] = [null, null, null, null];
                      quadLinesRef.current[plane][rIdx][qIdx] = el;
                    }}
                    name={`${plane}-q${qIdx}-r${rIdx}`}
                    visible={rIdx < initialRings.length && quad.qx === 1 && quad.qy === 1}
                    scale={[rIdx < initialRings.length ? initialRings[rIdx] : 1.0, rIdx < initialRings.length ? initialRings[rIdx] : 1.0, rIdx < initialRings.length ? initialRings[rIdx] : 1.0]}
                    frustumCulled={false}
                  >
                    <primitive object={finGeoms.quadrantGeoms[plane][qIdx]} attach="geometry" />
                    <lineBasicMaterial
                      ref={(el) => {
                        if (!quadMatsRef.current[plane][rIdx]) quadMatsRef.current[plane][rIdx] = [null, null, null, null];
                        quadMatsRef.current[plane][rIdx][qIdx] = el;
                      }}
                      color={gridSecondaryColor}
                      opacity={ringMinorAlpha}
                      transparent
                      depthWrite={false}
                    />
                  </lineSegments>
                ))}
              </group>
            ))}
        </group>
      ))}
    </group>
  );
};
