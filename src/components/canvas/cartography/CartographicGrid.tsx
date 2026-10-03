import type React from 'react';
import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useThreeTokenStore } from '../../../stores/useThreeTokenStore';
import {
  QUADRANTS,
  createQuadrantArcGeometry,
  createQuadrantTickGeometry,
  computeCardinalAlignment,
  computeTransitionWeights,
} from './cartographyMath';

export interface CartographicGridProps {
  /** Outer focal aperture radius (R_fin) in scene coordinate units / parsecs. Default: 10 */
  radius?: number;
  /** Concentric range ring radii. Default: [2.5, 5, 10] */
  rangeRings?: number[];
  /** Index in rangeRings designated as major (prominent stroke). Default: 2 (outer) */
  majorRingIndex?: number;
  /** Whether to render the three orthogonal travelling fins and their concentric arcs. Default: true */
  showFins?: boolean;
  /** Whether to render optional full 360-degree datum projection circles on Z=0. Default: false */
  showFullDatumCircle?: boolean;
  /** Whether to render the 3 orthogonal axis lines (+X, +Y extended, +Z to radius). Default: true */
  showAxisLines?: boolean;
  /** Whether to enable dynamic perspective-to-orthographic projection switching when looking along cardinal axes. Default: true */
  adaptiveProjection?: boolean;
  /** Angular threshold (cosine dot product) where transition begins (~20 deg from axis). Default: 0.94 */
  thresholdStart?: number;
  /** Angular threshold (cosine dot product) where transition completes (~10 deg from axis). Default: 0.985 */
  thresholdEnd?: number;
  /** Angular corridor width for double-segment transition when crossing an axis. Default: 0.35 */
  transitionCorridor?: number;
  /** Reference origin position. Default: [0, 0, 0] */
  position?: [number, number, number];
}

/**
 * CartographicGrid: Authoritative 3D spatial coordinate instrument.
 * Renders three mobile travelling orthogonal fins with 90-degree concentric range arcs on all three axes (XY, XZ, YZ).
 *
 * Dynamic Camera Coupling:
 * 1. Mobile Travelling Fins: The 90-degree quadrant bounded by the fins dynamically tracks the octant closest to the camera.
 * 2. Tightened Cardinal Alignment: Only within 20 deg of a cardinal axis does the concentric circle expand, locking at 10 deg.
 * 3. Double-Segment Axis Transition: When transitioning across an axis outside the circle threshold, the incoming segment
 *    renders alongside the current segment, forming a continuous 180-degree span without any sudden switch.
 * 4. Edge-On Grazing Fade: Edge-on fins smoothly fade to 0 opacity during cardinal alignment.
 * 5. Distinct Prominent Bearings: Two extended horizontal bearing lines (+X Core, +Y Orbital) styled prominently.
 * 6. Bordering Fin Rule: Structural axis lines only appear when both bordering fins are rendered (never solo facing camera).
 */
export const CartographicGrid: React.FC<CartographicGridProps> = ({
  radius = 10,
  rangeRings = [2.5, 5, 10],
  majorRingIndex = 2,
  showFins = true,
  showFullDatumCircle = false,
  showAxisLines = true,
  adaptiveProjection = true,
  thresholdStart = 0.94,
  thresholdEnd = 0.985,
  transitionCorridor = 0.35,
  position = [0, 0, 0],
}) => {
  const tokens = useThreeTokenStore((state) => state.tokens);
  const { camera } = useThree();

  const baseFovRef = useRef<number | null>(null);

  // Memoize 4 Quadrant Arc Lines for each plane (XY, XZ, YZ)
  const quadrantData = useMemo(() => {
    const buildPlaneArcs = (plane: 'xy' | 'xz' | 'yz') => {
      return rangeRings.map((r, ringIdx) => {
        const isMajor = ringIdx === majorRingIndex;
        const color = isMajor ? tokens.gridPrimaryColor : tokens.rangeRingColor;
        const baseAlpha = isMajor ? tokens.gridPrimaryAlpha * 1.5 : tokens.rangeRingAlpha;

        return QUADRANTS.map((quad) => {
          const geom = createQuadrantArcGeometry(r, plane, quad.startAngle, quad.endAngle);
          // Initial SSR / first-paint setup: Q0 (+1, +1) visible in default perspective view
          const isInitialVisible = quad.qx === 1 && quad.qy === 1;
          const mat = new THREE.LineBasicMaterial({
            color,
            transparent: true,
            depthWrite: false,
            opacity: isInitialVisible ? baseAlpha : 0,
            visible: isInitialVisible,
          });
          const line = new THREE.Line(geom, mat);
          line.frustumCulled = false;
          return { radius: r, qx: quad.qx, qy: quad.qy, geom, mat, line };
        });
      });
    };

    return {
      xy: buildPlaneArcs('xy'),
      xz: buildPlaneArcs('xz'),
      yz: buildPlaneArcs('yz'),
    };
  }, [rangeRings, majorRingIndex, tokens.gridPrimaryColor, tokens.rangeRingColor, tokens.gridPrimaryAlpha, tokens.rangeRingAlpha]);

  // Memoize Quadrant Ticks for each plane
  const tickData = useMemo(() => {
    const tickLen = radius * 0.035;
    const buildPlaneTicks = (plane: 'xy' | 'xz' | 'yz') => {
      return QUADRANTS.map((quad) => {
        const geom = createQuadrantTickGeometry(radius, plane, quad.startAngle, tickLen);
        const isInitialVisible = quad.qx === 1 && quad.qy === 1;
        const mat = new THREE.LineBasicMaterial({
          color: tokens.rangeTickColor,
          transparent: true,
          depthWrite: false,
          opacity: isInitialVisible ? tokens.rangeTickAlpha : 0,
          visible: isInitialVisible,
        });
        const line = new THREE.LineSegments(geom, mat);
        line.frustumCulled = false;
        return { qx: quad.qx, qy: quad.qy, geom, mat, line };
      });
    };

    return {
      xy: buildPlaneTicks('xy'),
      xz: buildPlaneTicks('xz'),
      yz: buildPlaneTicks('yz'),
    };
  }, [radius, tokens.rangeTickColor, tokens.rangeTickAlpha]);

  // Structural Fin Axis Spokes: Only appear when both bordering fins rendered
  const axisSpokes = useMemo(() => {
    const makeSpoke = (endPoint: [number, number, number], initialVisible = false) => {
      const geom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(...endPoint),
      ]);
      geom.computeBoundingSphere();
      const mat = new THREE.LineBasicMaterial({
        color: tokens.axisLineColor,
        linewidth: tokens.axisLineWidth,
        transparent: true,
        depthWrite: false,
        opacity: initialVisible ? tokens.axisLineAlpha : 0,
        visible: initialVisible,
      });
      const line = new THREE.LineSegments(geom, mat);
      line.frustumCulled = false;
      return { geom, mat, line };
    };

    return {
      negX: makeSpoke([-radius, 0, 0], false),
      negY: makeSpoke([0, -radius, 0], false),
      posZ: makeSpoke([0, 0, radius], true),
      negZ: makeSpoke([0, 0, -radius], false),
    };
  }, [radius, tokens.axisLineColor, tokens.axisLineWidth, tokens.axisLineAlpha]);

  // Extended Cardinal Bearing Lines: +X (Galactic Core), +Y (Galactic Orbit)
  const extendedBearings = useMemo(() => {
    const bearingLen = radius * 1.35;
    const makeBearing = (endPoint: [number, number, number]) => {
      const geom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(...endPoint),
      ]);
      geom.computeBoundingSphere();
      const mat = new THREE.LineBasicMaterial({
        color: tokens.bearingLineColor,
        linewidth: tokens.bearingLineWidth,
        transparent: true,
        depthWrite: false,
        opacity: tokens.bearingLineAlpha,
        visible: true,
      });
      const line = new THREE.LineSegments(geom, mat);
      line.frustumCulled = false;
      return { geom, mat, line };
    };

    return {
      core: makeBearing([bearingLen, 0, 0]),
      orbital: makeBearing([0, bearingLen, 0]),
    };
  }, [radius, tokens.bearingLineColor, tokens.bearingLineWidth, tokens.bearingLineAlpha]);

  // Mutable Scene Graph References (Preserving React Compiler optimization)
  const quadrantDataRef = useRef(quadrantData);
  const tickDataRef = useRef(tickData);
  const axisSpokesRef = useRef(axisSpokes);
  const extendedBearingsRef = useRef(extendedBearings);

  useEffect(() => {
    quadrantDataRef.current = quadrantData;
    tickDataRef.current = tickData;
    axisSpokesRef.current = axisSpokes;
    extendedBearingsRef.current = extendedBearings;
  }, [quadrantData, tickData, axisSpokes, extendedBearings]);

  // Clean up geometries and materials on unmount
  useEffect(() => {
    const qData = quadrantDataRef.current;
    const tData = tickDataRef.current;
    const aSpokes = axisSpokesRef.current;
    const eBearings = extendedBearingsRef.current;

    return () => {
      for (const plane of ['xy', 'xz', 'yz'] as const) {
        for (const ringQuads of qData[plane]) {
          for (const item of ringQuads) {
            item.geom.dispose();
            item.mat.dispose();
          }
        }
        for (const tickItem of tData[plane]) {
          tickItem.geom.dispose();
          tickItem.mat.dispose();
        }
      }

      aSpokes.negX.geom.dispose();
      aSpokes.negX.mat.dispose();
      aSpokes.negY.geom.dispose();
      aSpokes.negY.mat.dispose();
      aSpokes.posZ.geom.dispose();
      aSpokes.posZ.mat.dispose();
      aSpokes.negZ.geom.dispose();
      aSpokes.negZ.mat.dispose();

      eBearings.core.geom.dispose();
      eBearings.core.mat.dispose();
      eBearings.orbital.geom.dispose();
      eBearings.orbital.mat.dispose();
    };
  }, []);

  // Restore camera FOV and zoom on unmount
  useEffect(() => {
    return () => {
      if (camera instanceof THREE.PerspectiveCamera && baseFovRef.current !== null) {
        camera.fov = baseFovRef.current;
        camera.zoom = 1.0;
        camera.updateProjectionMatrix();
      }
    };
  }, [camera]);

  // Update base material colors from design tokens
  useEffect(() => {
    const qData = quadrantDataRef.current;
    const tData = tickDataRef.current;
    const aSpokes = axisSpokesRef.current;
    const eBearings = extendedBearingsRef.current;

    for (const plane of ['xy', 'xz', 'yz'] as const) {
      qData[plane].forEach((ringQuads, ringIdx) => {
        const isMajor = ringIdx === majorRingIndex;
        const color = isMajor ? tokens.gridPrimaryColor : tokens.rangeRingColor;
        for (const item of ringQuads) {
          item.mat.color.copy(color);
        }
      });
      for (const tickItem of tData[plane]) {
        tickItem.mat.color.copy(tokens.rangeTickColor);
      }
    }

    for (const spoke of [aSpokes.negX, aSpokes.negY, aSpokes.posZ, aSpokes.negZ]) {
      spoke.mat.color.copy(tokens.axisLineColor);
      spoke.mat.linewidth = tokens.axisLineWidth;
    }

    eBearings.core.mat.color.copy(tokens.bearingLineColor);
    eBearings.core.mat.opacity = tokens.bearingLineAlpha;
    eBearings.core.mat.linewidth = tokens.bearingLineWidth;

    eBearings.orbital.mat.color.copy(tokens.bearingLineColor);
    eBearings.orbital.mat.opacity = tokens.bearingLineAlpha;
    eBearings.orbital.mat.linewidth = tokens.bearingLineWidth;
  }, [tokens, majorRingIndex]);

  // Optional full 360-degree datum circles
  const fullDatumGeometries = useMemo(() => {
    if (!showFullDatumCircle) return [];
    const steps = 128;
    return rangeRings.map((r) => {
      const points: THREE.Vector3[] = [];
      for (let i = 0; i <= steps; i++) {
        const theta = (i / steps) * Math.PI * 2;
        points.push(new THREE.Vector3(r * Math.cos(theta), r * Math.sin(theta), 0));
      }
      const geom = new THREE.BufferGeometry().setFromPoints(points);
      geom.computeBoundingSphere();
      return geom;
    });
  }, [rangeRings, showFullDatumCircle]);

  // Frame Loop: Smooth double-segment axis transitions, tighter cardinal alignment, bordering fin spoke rule, adaptive projection
  useFrame(({ camera: activeCamera }) => {
    if (!showFins) return;

    const qData = quadrantDataRef.current;
    const tData = tickDataRef.current;
    const aSpokes = axisSpokesRef.current;

    // Camera direction relative to instrument origin
    const origin = new THREE.Vector3(...position);
    const camDir = activeCamera.position.clone().sub(origin).normalize();

    // 1. Cardinal alignment factors (with tightened thresholds)
    const { alphaX, alphaY, alphaZ, maxAlpha } = computeCardinalAlignment(
      camDir,
      thresholdStart,
      thresholdEnd,
    );

    // 2. Transition weights across coordinate planes (active when outside circle threshold)
    const { wTransX, wTransY, wTransZ } = computeTransitionWeights(
      camDir,
      transitionCorridor,
      maxAlpha,
    );

    // Signs of primary octant closest to camera
    const sx = camDir.x >= 0 ? 1 : -1;
    const sy = camDir.y >= 0 ? 1 : -1;
    const sz = camDir.z >= 0 ? 1 : -1;

    // 3. Edge-on fin fading
    const fadeXY = 1 - Math.max(alphaX, alphaY);
    const fadeXZ = 1 - Math.max(alphaX, alphaZ);
    const fadeYZ = 1 - Math.max(alphaY, alphaZ);

    // Helper: calculate quadrant weight for a plane
    const calcQuadWeight = (
      qx: number,
      qy: number,
      targetSx: number,
      targetSy: number,
      transX: number,
      transY: number,
      alphaNormal: number,
    ): number => {
      const matchX = qx === targetSx ? 1 : transX;
      const matchY = qy === targetSy ? 1 : transY;
      const segWeight = matchX * matchY;
      return Math.max(segWeight, alphaNormal);
    };

    // Store per-quadrant weights for each plane to feed bordering spoke calculation
    const qwXY: number[] = [];
    const qwXZ: number[] = [];
    const qwYZ: number[] = [];

    // Update Plane XY
    QUADRANTS.forEach((quad, qIdx) => {
      const weight = calcQuadWeight(quad.qx, quad.qy, sx, sy, wTransX, wTransY, alphaZ);
      qwXY.push(weight);
      const effectiveAlpha = weight * fadeXY;

      qData.xy.forEach((ringQuads, ringIdx) => {
        const isMajor = ringIdx === majorRingIndex;
        const baseAlpha = isMajor ? tokens.gridPrimaryAlpha * 1.5 : tokens.rangeRingAlpha;
        const item = ringQuads[qIdx];
        item.mat.opacity = baseAlpha * effectiveAlpha;
        item.mat.visible = item.mat.opacity > 0.001;
      });

      const tickItem = tData.xy[qIdx];
      tickItem.mat.opacity = tokens.rangeTickAlpha * effectiveAlpha;
      tickItem.mat.visible = tickItem.mat.opacity > 0.001;
    });

    // Update Plane XZ
    QUADRANTS.forEach((quad, qIdx) => {
      const weight = calcQuadWeight(quad.qx, quad.qy, sx, sz, wTransX, wTransZ, alphaY);
      qwXZ.push(weight);
      const effectiveAlpha = weight * fadeXZ;

      qData.xz.forEach((ringQuads, ringIdx) => {
        const isMajor = ringIdx === majorRingIndex;
        const baseAlpha = isMajor ? tokens.gridPrimaryAlpha * 1.5 : tokens.rangeRingAlpha;
        const item = ringQuads[qIdx];
        item.mat.opacity = baseAlpha * effectiveAlpha;
        item.mat.visible = item.mat.opacity > 0.001;
      });

      const tickItem = tData.xz[qIdx];
      tickItem.mat.opacity = tokens.rangeTickAlpha * effectiveAlpha;
      tickItem.mat.visible = tickItem.mat.opacity > 0.001;
    });

    // Update Plane YZ
    QUADRANTS.forEach((quad, qIdx) => {
      const weight = calcQuadWeight(quad.qx, quad.qy, sy, sz, wTransY, wTransZ, alphaX);
      qwYZ.push(weight);
      const effectiveAlpha = weight * fadeYZ;

      qData.yz.forEach((ringQuads, ringIdx) => {
        const isMajor = ringIdx === majorRingIndex;
        const baseAlpha = isMajor ? tokens.gridPrimaryAlpha * 1.5 : tokens.rangeRingAlpha;
        const item = ringQuads[qIdx];
        item.mat.opacity = baseAlpha * effectiveAlpha;
        item.mat.visible = item.mat.opacity > 0.001;
      });

      const tickItem = tData.yz[qIdx];
      tickItem.mat.opacity = tokens.rangeTickAlpha * effectiveAlpha;
      tickItem.mat.visible = tickItem.mat.opacity > 0.001;
    });

    // 4. Structural Axis Spokes Rule:
    // "other than the two bearing axis lines, the rest should only appear when both bordering fins are rendered, IE never solo facing the camera."
    // -X spoke bordered by XY (-X) and XZ (-X)
    const presenceXY_negX = Math.max(qwXY[1], qwXY[2]) * fadeXY;
    const presenceXZ_negX = Math.max(qwXZ[1], qwXZ[2]) * fadeXZ;
    const alphaNegX = tokens.axisLineAlpha * Math.min(presenceXY_negX, presenceXZ_negX);
    aSpokes.negX.mat.opacity = alphaNegX;
    aSpokes.negX.mat.visible = alphaNegX > 0.001;

    // -Y spoke bordered by XY (-Y) and YZ (-Y)
    const presenceXY_negY = Math.max(qwXY[2], qwXY[3]) * fadeXY;
    const presenceYZ_negY = Math.max(qwYZ[1], qwYZ[2]) * fadeYZ;
    const alphaNegY = tokens.axisLineAlpha * Math.min(presenceXY_negY, presenceYZ_negY);
    aSpokes.negY.mat.opacity = alphaNegY;
    aSpokes.negY.mat.visible = alphaNegY > 0.001;

    // +Z spoke bordered by XZ (+Z) and YZ (+Z)
    const presenceXZ_posZ = Math.max(qwXZ[0], qwXZ[1]) * fadeXZ;
    const presenceYZ_posZ = Math.max(qwYZ[0], qwYZ[1]) * fadeYZ;
    const alphaPosZ = tokens.axisLineAlpha * Math.min(presenceXZ_posZ, presenceYZ_posZ);
    aSpokes.posZ.mat.opacity = alphaPosZ;
    aSpokes.posZ.mat.visible = alphaPosZ > 0.001;

    // -Z spoke bordered by XZ (-Z) and YZ (-Z)
    const presenceXZ_negZ = Math.max(qwXZ[2], qwXZ[3]) * fadeXZ;
    const presenceYZ_negZ = Math.max(qwYZ[2], qwYZ[3]) * fadeYZ;
    const alphaNegZ = tokens.axisLineAlpha * Math.min(presenceXZ_negZ, presenceYZ_negZ);
    aSpokes.negZ.mat.opacity = alphaNegZ;
    aSpokes.negZ.mat.visible = alphaNegZ > 0.001;

    // 5. Adaptive Orthographic Switch: Narrow FOV and compensate zoom to maintain target footprint
    if (adaptiveProjection && activeCamera instanceof THREE.PerspectiveCamera) {
      if (baseFovRef.current === null) {
        baseFovRef.current = activeCamera.fov;
      }
      const baseFov = baseFovRef.current;
      const targetFov = baseFov * (1 - 0.92 * maxAlpha); // 45 deg -> ~3.6 deg
      const targetZoom =
        Math.tan((targetFov * Math.PI) / 360) / Math.tan((baseFov * Math.PI) / 360);

      activeCamera.fov = targetFov;
      activeCamera.zoom = targetZoom;
      activeCamera.updateProjectionMatrix();
    }
  });

  return (
    <group position={position} data-testid="cartographic-grid">
      {/* Three Orthogonal Travelling Fins with Dynamic Quadrant Range Arcs */}
      {showFins && (
        <group data-testid="travelling-fins">
          {/* XY Fin (Galactic Equator) */}
          <group data-testid="fin-xy">
            {rangeRings.map((r, ringIdx) => (
              <group key={`xy-tier-${r}`} data-testid={`arc-tier-${r}`}>
                {quadrantData.xy[ringIdx].map((q, qIdx) => (
                  <primitive key={`xy-${r}-q${qIdx}`} object={q.line} />
                ))}
              </group>
            ))}
            {tickData.xy.map((qTick, qIdx) => (
              <primitive key={`xy-ticks-q${qIdx}`} object={qTick.line} />
            ))}
          </group>

          {/* XZ Fin (Core Meridian) */}
          <group data-testid="fin-xz">
            {rangeRings.map((r, ringIdx) => (
              <group key={`xz-tier-${r}`} data-testid={`arc-tier-${r}`}>
                {quadrantData.xz[ringIdx].map((q, qIdx) => (
                  <primitive key={`xz-${r}-q${qIdx}`} object={q.line} />
                ))}
              </group>
            ))}
            {tickData.xz.map((qTick, qIdx) => (
              <primitive key={`xz-ticks-q${qIdx}`} object={qTick.line} />
            ))}
          </group>

          {/* YZ Fin (Transverse) */}
          <group data-testid="fin-yz">
            {rangeRings.map((r, ringIdx) => (
              <group key={`yz-tier-${r}`} data-testid={`arc-tier-${r}`}>
                {quadrantData.yz[ringIdx].map((q, qIdx) => (
                  <primitive key={`yz-${r}-q${qIdx}`} object={q.line} />
                ))}
              </group>
            ))}
            {tickData.yz.map((qTick, qIdx) => (
              <primitive key={`yz-ticks-q${qIdx}`} object={qTick.line} />
            ))}
          </group>
        </group>
      )}

      {/* Axis Lines */}
      {showAxisLines && (
        <group data-testid="cardinal-bearings">
          {/* Structural Fin Axis Spokes: Rendered only when both bordering fins rendered */}
          <primitive object={axisSpokes.negX.line} />
          <primitive object={axisSpokes.negY.line} />
          <primitive object={axisSpokes.posZ.line} />
          <primitive object={axisSpokes.negZ.line} />

          {/* Prominent Extended Cardinal Bearing Lines: +X (Galactic Core), +Y (Galactic Orbit) */}
          <primitive object={extendedBearings.core.line} />
          <primitive object={extendedBearings.orbital.line} />
        </group>
      )}

      {/* Optional Full 360-Degree Datum Circles */}
      {showFullDatumCircle &&
        fullDatumGeometries.map((geom, index) => {
          const isMajor = index === majorRingIndex;
          const color = isMajor ? tokens.gridPrimaryColor : tokens.rangeRingColor;
          const opacity = isMajor ? tokens.gridPrimaryAlpha : tokens.rangeRingAlpha;
          return (
            <lineLoop
              key={`full-ring-${rangeRings[index]}`}
              data-testid={`full-ring-${rangeRings[index]}`}
              geometry={geom}
              frustumCulled={false}
            >
              <lineBasicMaterial
                color={color}
                opacity={opacity}
                transparent={opacity < 1.0}
                depthWrite={false}
              />
            </lineLoop>
          );
        })}
    </group>
  );
};
