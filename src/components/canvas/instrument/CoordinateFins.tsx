import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useSpatialFrame } from './SpatialFrameProvider';
import { useThreeTokenStore } from '../../../stores/useThreeTokenStore';
import {
  QUADRANTS,
  createQuadrantArcGeometry,
  createQuadrantTickGeometry,
  populateZoomAdaptiveRings,
  type ScaledRingInfo,
} from '../cartography/cartographyMath';

const PLANES = ['xy', 'xz', 'yz'] as const;
const DEFAULT_FIXED_RINGS: readonly number[] = [2.5, 5, 10];

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

  // Memoize unit quadrant arc geometries for each plane
  const quadrantGeoms = useMemo(() => {
    const buildPlaneGeoms = (plane: 'xy' | 'xz' | 'yz') => {
      return QUADRANTS.map((quad) => {
        const geom = createQuadrantArcGeometry(1.0, plane, quad.startAngle, quad.endAngle);
        geom.computeBoundingSphere();
        return geom;
      });
    };
    return {
      xy: buildPlaneGeoms('xy'),
      xz: buildPlaneGeoms('xz'),
      yz: buildPlaneGeoms('yz'),
    };
  }, []);

  // Memoize unit quadrant tick geometries for each plane
  const tickGeoms = useMemo(() => {
    const buildPlaneTicks = (plane: 'xy' | 'xz' | 'yz') => {
      return QUADRANTS.map((quad) => {
        const geom = createQuadrantTickGeometry(1.0, plane, quad.startAngle, 0.035);
        geom.computeBoundingSphere();
        return geom;
      });
    };
    return {
      xy: buildPlaneTicks('xy'),
      xz: buildPlaneTicks('xz'),
      yz: buildPlaneTicks('yz'),
    };
  }, []);

  // Memoize unit quadrant Z=0 baseline border geometries for each plane
  const baselineGeoms = useMemo(() => {
    const buildPlaneBaselines = (plane: 'xy' | 'xz' | 'yz') => {
      return QUADRANTS.map((quad) => {
        let points: THREE.Vector3[] = [];
        if (plane === 'xz') {
          // XZ vertical fin baseline along Z=0: straight line along X-axis
          points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(quad.qx, 0, 0)];
        } else if (plane === 'yz') {
          // YZ vertical fin baseline along Z=0: straight line along Y-axis
          points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, quad.qy, 0)];
        } else {
          // XY horizontal fin is entirely on Z=0: straight quadrant boundaries along both X and Y
          points = [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(quad.qx, 0, 0),
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, quad.qy, 0),
          ];
        }
        const geom = new THREE.BufferGeometry().setFromPoints(points);
        geom.computeBoundingSphere();
        return geom;
      });
    };
    return {
      xy: buildPlaneBaselines('xy'),
      xz: buildPlaneBaselines('xz'),
      yz: buildPlaneBaselines('yz'),
    };
  }, []);

  useEffect(() => {
    return () => {
      PLANES.forEach((p) => {
        quadrantGeoms[p].forEach((g) => g.dispose());
        tickGeoms[p].forEach((g) => g.dispose());
        baselineGeoms[p].forEach((g) => g.dispose());
      });
    };
  }, [quadrantGeoms, tickGeoms, baselineGeoms]);

  // Object references for zero-allocation per-frame mutation
  const perimeterLinesRef = useRef<Record<string, (THREE.LineSegments | null)[]>>({
    xy: [null, null, null, null],
    xz: [null, null, null, null],
    yz: [null, null, null, null],
  });
  const perimeterMatsRef = useRef<Record<string, (THREE.LineBasicMaterial | null)[]>>({
    xy: [null, null, null, null],
    xz: [null, null, null, null],
    yz: [null, null, null, null],
  });

  const baselineLinesRef = useRef<Record<string, (THREE.LineSegments | null)[]>>({
    xy: [null, null, null, null],
    xz: [null, null, null, null],
    yz: [null, null, null, null],
  });
  const baselineMatsRef = useRef<Record<string, (THREE.LineBasicMaterial | null)[]>>({
    xy: [null, null, null, null],
    xz: [null, null, null, null],
    yz: [null, null, null, null],
  });

  const tickLinesRef = useRef<Record<string, (THREE.LineSegments | null)[]>>({
    xy: [null, null, null, null],
    xz: [null, null, null, null],
    yz: [null, null, null, null],
  });
  const tickMatsRef = useRef<Record<string, (THREE.LineBasicMaterial | null)[]>>({
    xy: [null, null, null, null],
    xz: [null, null, null, null],
    yz: [null, null, null, null],
  });

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

  const activeRingsPoolRef = useRef<ScaledRingInfo[]>(
    Array.from({ length: poolSize }, () => ({ radius: 0, isMajor: false, fade: 0 })),
  );

  const ringPoolIndices = useMemo(() => Array.from({ length: poolSize }, (_, i) => i), [poolSize]);

  // Per-frame updates: positioning, grazing fades, and 360° Polar Dial expansion
  useFrame(() => {
    if (!isEnabled || !rootGroupRef.current) return;

    const { apertureRadius, focusPoint, planeWeights, orientation } = frameRef.current;
    rootGroupRef.current.position.copy(focusPoint);
    rootGroupRef.current.quaternion.copy(orientation);

    // Dynamic zoom-adaptive rings or explicit rings
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

    // Update each plane: grazing fade & quadrant weights (Polar Dial expansion)
    for (let pIdx = 0; pIdx < PLANES.length; pIdx++) {
      const plane = PLANES[pIdx];
      const planeWeight = plane === 'xy' ? planeWeights.qwXY : plane === 'xz' ? planeWeights.qwXZ : planeWeights.qwYZ;
      const grazingFade = plane === 'xy' ? planeWeights.fadeXY : plane === 'xz' ? planeWeights.fadeXZ : planeWeights.fadeYZ;

      // 1. Perimeter boundary arcs & ticks
      for (let q = 0; q < 4; q++) {
        const pLine = perimeterLinesRef.current[plane][q];
        const pMat = perimeterMatsRef.current[plane][q];
        const tLine = tickLinesRef.current[plane][q];
        const tMat = tickMatsRef.current[plane][q];

        const qw = planeWeight[q];
        const isVis = grazingFade > 1e-3 && qw > 1e-3;

        if (pLine && pMat) {
          pLine.scale.set(apertureRadius, apertureRadius, apertureRadius);
          pLine.visible = isVis;
          if (isVis) {
            pMat.opacity = finPerimeterAlpha * grazingFade * qw;
            pMat.color.copy(gridSecondaryColor);
          }
        }

        if (tLine && tMat) {
          tLine.scale.set(apertureRadius, apertureRadius, apertureRadius);
          tLine.visible = isVis;
          if (isVis) {
            tMat.opacity = tickAlpha * grazingFade * qw;
            tMat.color.copy(rangeTickColor);
          }
        }

        const bLine = baselineLinesRef.current[plane][q];
        const bMat = baselineMatsRef.current[plane][q];
        if (bLine && bMat) {
          bLine.scale.set(apertureRadius, apertureRadius, apertureRadius);
          bLine.visible = isVis;
          if (isVis) {
            bMat.opacity = finPerimeterAlpha * grazingFade * qw;
            bMat.color.copy(gridSecondaryColor);
          }
        }
      }

      // 2. Concentric quadrant range arcs
      for (let rIdx = 0; rIdx < poolSize; rIdx++) {
        const ring = rIdx < numActive ? activeRingsPoolRef.current[rIdx] : null;

        for (let q = 0; q < 4; q++) {
          const qLine = quadLinesRef.current[plane][rIdx]?.[q];
          const qMat = quadMatsRef.current[plane][rIdx]?.[q];
          if (!qLine || !qMat) continue;

          if (ring) {
            qLine.scale.set(ring.radius, ring.radius, ring.radius);
            if (ring.fade > 1e-3 && grazingFade > 1e-3) {
              const qw = planeWeight[q];
              const isVis = qw > 1e-3;
              qLine.visible = isVis;
              if (isVis) {
                const baseAlpha = ring.isMajor ? ringMajorAlpha : ringMinorAlpha;
                qMat.opacity = baseAlpha * ring.fade * grazingFade * qw;
                qMat.color.copy(gridSecondaryColor);
              }
            } else {
              qLine.visible = false;
            }
          } else {
            qLine.visible = false;
          }
        }
      }
    }
  });

  if (!isEnabled) return null;

  const initialRings = explicitRings ?? frame.rangeRings.fixedRings ?? DEFAULT_FIXED_RINGS;

  return (
    <group ref={rootGroupRef} name="travelling-fins">
      {PLANES.map((plane) => (
        <group key={`fin-${plane}`} name={`fin-${plane}`}>
          {/* Perimeter Boundary Arcs */}
          {QUADRANTS.map((quad, qIdx) => {
            const isInitialVisible = quad.qx === 1 && quad.qy === 1;
            return (
              <lineSegments
                key={`${plane}-perimeter-q${qIdx}`}
                ref={(el) => {
                  perimeterLinesRef.current[plane][qIdx] = el;
                }}
                name={`${plane}-perimeter-q${qIdx}`}
                visible={isInitialVisible}
                scale={[frame.radius, frame.radius, frame.radius]}
                frustumCulled={false}
              >
                <primitive object={quadrantGeoms[plane][qIdx]} attach="geometry" />
                <lineBasicMaterial
                  ref={(el) => {
                    perimeterMatsRef.current[plane][qIdx] = el;
                  }}
                  color={gridSecondaryColor}
                  opacity={finPerimeterAlpha}
                  transparent
                  depthWrite={false}
                />
              </lineSegments>
            );
          })}

          {/* Fin Z=0 Baseline Borders */}
          {QUADRANTS.map((quad, qIdx) => {
            const isInitialVisible = quad.qx === 1 && quad.qy === 1;
            return (
              <lineSegments
                key={`${plane}-baseline-q${qIdx}`}
                ref={(el) => {
                  baselineLinesRef.current[plane][qIdx] = el;
                }}
                name={`${plane}-baseline-q${qIdx}`}
                visible={isInitialVisible}
                scale={[frame.radius, frame.radius, frame.radius]}
                frustumCulled={false}
              >
                <primitive object={baselineGeoms[plane][qIdx]} attach="geometry" />
                <lineBasicMaterial
                  ref={(el) => {
                    baselineMatsRef.current[plane][qIdx] = el;
                  }}
                  color={gridSecondaryColor}
                  opacity={finPerimeterAlpha}
                  transparent
                  depthWrite={false}
                />
              </lineSegments>
            );
          })}

          {/* Perimeter Angular Degree Ticks */}
          {frame.coordinateFins.ticks &&
            QUADRANTS.map((quad, qIdx) => {
              const isInitialVisible = quad.qx === 1 && quad.qy === 1;
              return (
                <lineSegments
                  key={`${plane}-ticks-q${qIdx}`}
                  ref={(el) => {
                    tickLinesRef.current[plane][qIdx] = el;
                  }}
                  name={`${plane}-ticks-q${qIdx}`}
                  visible={isInitialVisible}
                  scale={[frame.radius, frame.radius, frame.radius]}
                  frustumCulled={false}
                >
                  <primitive object={tickGeoms[plane][qIdx]} attach="geometry" />
                  <lineBasicMaterial
                    ref={(el) => {
                      tickMatsRef.current[plane][qIdx] = el;
                    }}
                    color={rangeTickColor}
                    opacity={tickAlpha}
                    transparent
                    depthWrite={false}
                  />
                </lineSegments>
              );
            })}

          {/* Concentric Quadrant Range Arcs */}
          {frame.coordinateFins.rangeArcs &&
            ringPoolIndices.map((rIdx) => {
              const initialRadius = rIdx < initialRings.length ? initialRings[rIdx] : 1.0;
              const arcName =
                rIdx < initialRings.length
                  ? `arc-tier-${initialRings[rIdx]}`
                  : `arc-pool-${rIdx}`;

              return (
                <group key={`${plane}-arc-group-${rIdx}`} name={arcName}>
                  {QUADRANTS.map((quad, qIdx) => {
                    const isInitialVisible =
                      rIdx < initialRings.length && quad.qx === 1 && quad.qy === 1;
                    return (
                      <lineSegments
                        key={`${plane}-ring-${rIdx}-q${qIdx}`}
                        ref={(el) => {
                          if (!quadLinesRef.current[plane][rIdx]) {
                            quadLinesRef.current[plane][rIdx] = [null, null, null, null];
                          }
                          quadLinesRef.current[plane][rIdx][qIdx] = el;
                        }}
                        name={`${plane}-q${qIdx}-r${rIdx}`}
                        visible={isInitialVisible}
                        scale={[initialRadius, initialRadius, initialRadius]}
                        frustumCulled={false}
                      >
                        <primitive object={quadrantGeoms[plane][qIdx]} attach="geometry" />
                        <lineBasicMaterial
                          ref={(el) => {
                            if (!quadMatsRef.current[plane][rIdx]) {
                              quadMatsRef.current[plane][rIdx] = [null, null, null, null];
                            }
                            quadMatsRef.current[plane][rIdx][qIdx] = el;
                          }}
                          color={gridSecondaryColor}
                          opacity={ringMinorAlpha}
                          transparent
                          depthWrite={false}
                        />
                      </lineSegments>
                    );
                  })}
                </group>
              );
            })}
        </group>
      ))}
    </group>
  );
};
