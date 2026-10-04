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
  computeZoomAdaptiveRings,
} from './cartographyMath';

/**
 * Creates BufferGeometry for a full 360-degree circle in the XY plane.
 */
function createCircleGeometry(radius: number, steps = 128): THREE.BufferGeometry {
  const buffer = new Float32Array((steps + 1) * 3);
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * Math.PI * 2;
    buffer[i * 3] = radius * Math.cos(theta);
    buffer[i * 3 + 1] = radius * Math.sin(theta);
    buffer[i * 3 + 2] = 0;
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(buffer, 3));
  geom.computeBoundingSphere();
  return geom;
}

export interface CartographicGridProps {
  /** Outer focal aperture radius (R_fin) in scene coordinate units / parsecs. Default: 10 */
  radius?: number;
  /** Concentric range ring radii (used when screenConstant is false). Default: [2.5, 5, 10] */
  rangeRings?: number[];
  /** Index in rangeRings designated as major (prominent stroke). Default: 2 (outer) */
  majorRingIndex?: number;
  /** Whether to render the three orthogonal travelling fins and their concentric arcs. Default: true */
  showFins?: boolean;
  /** Whether to render the horizontal Galactic Equator (Z=0) datum plane beneath the camera focus. Default: true */
  showGalacticPlane?: boolean;
  /** Deprecated alias for showGalacticPlane. Default: true */
  showFullDatumCircle?: boolean;
  /** Whether to render the 3 orthogonal axis lines (+X, +Y extended, +Z to radius). Default: true */
  showAxisLines?: boolean;
  /** Whether to enable dynamic perspective-to-orthographic projection switching when looking along cardinal axes. Default: true */
  adaptiveProjection?: boolean;
  /** Whether the instrument maintains an invariant visual footprint on screen while real-world scale and concentric rings adapt dynamically to zoom. Default: false */
  screenConstant?: boolean;
  /** Reference camera distance at which aperture equals radius. Default: 3.49 * radius */
  referenceDistance?: number;
  /** Angular threshold (cosine dot product) where transition begins (~20 deg from axis). Default: 0.94 */
  thresholdStart?: number;
  /** Angular threshold (cosine dot product) where transition completes (~10 deg from axis). Default: 0.985 */
  thresholdEnd?: number;
  /** Angular corridor width for double-segment transition when crossing an axis. Default: 0.35 */
  transitionCorridor?: number;
  /** Whether the grid origin dynamically locks to the camera focus point (e.g. OrbitControls target). Default: true */
  lockToFocusPoint?: boolean;
  /** Reference origin position fallback or manual position when lockToFocusPoint is false. Default: [0, 0, 0] */
  position?: [number, number, number] | THREE.Vector3;
  /** Optional explicit focus target to lock origin to (Vector3, object with position, or ref). */
  focusTarget?: THREE.Vector3 | React.RefObject<THREE.Vector3 | THREE.Object3D | null>;
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
 * 5. Distinct Prominent Bearings: Galactic Centre (+X Core) styled in golden accent token; Galactic Orbit (+Y) in bearing token.
 * 6. Bordering Fin Rule: Structural axis lines only appear when both bordering fins are rendered (never solo facing camera).
 * 7. Zoom-Adaptive Scaling: When screenConstant is true, visual screen footprint is invariant, while real-world scale
 *    modulates dynamically with logarithmic 1-2-5 range rings (Significant vs Insignificant visual hierarchy).
 * 8. Camera Focus Lock: Origin remains dynamically locked to the camera focus point (OrbitControls target).
 */
export const CartographicGrid: React.FC<CartographicGridProps> = ({
  radius = 10,
  rangeRings = [2, 4, 6, 8],
  majorRingIndex,
  showFins = true,
  showGalacticPlane,
  showFullDatumCircle,
  showAxisLines = true,
  adaptiveProjection = true,
  screenConstant = false,
  referenceDistance,
  thresholdStart = 0.94,
  thresholdEnd = 0.985,
  transitionCorridor = 0.35,
  lockToFocusPoint = true,
  position = [0, 0, 0],
  focusTarget,
}) => {
  const tokens = useThreeTokenStore((state) => state.tokens);
  const { camera } = useThree();

  const isDatumPlaneVisible = showGalacticPlane !== undefined
    ? showGalacticPlane
    : showFullDatumCircle !== undefined
      ? showFullDatumCircle
      : true;

  const baseFovRef = useRef<number | null>(null);
  const rootGroupRef = useRef<THREE.Group>(null);
  const datumGroupRef = useRef<THREE.Group>(null);
  const datumFillRef = useRef<THREE.Mesh>(null);
  const scratchOrigin = useRef(new THREE.Vector3());
  const scratchCamDir = useRef(new THREE.Vector3());

  // Auto-calculated reference distance ensuring instrument fits comfortably in viewport (~93% vertical span)
  const effectiveRefDist = referenceDistance ?? radius * 3.49;

  const initialPosition = useMemo<[number, number, number]>(() => {
    if (position instanceof THREE.Vector3) {
      return [position.x, position.y, position.z];
    }
    return position;
  }, [position]);

  // Pool size: allocates either the explicit rangeRings count or 8 rings for dynamic zoom adaptation
  const poolSize = screenConstant ? Math.max(rangeRings.length, 8) : rangeRings.length;
  const ringPoolIndices = useMemo(() => Array.from({ length: poolSize }, (_, i) => i), [poolSize]);

  // Memoize 4 Quadrant Arc Lines for each plane (XY, XZ, YZ) using unit arc geometry scaled per ring
  const quadrantData = useMemo(() => {
    const buildPlaneArcs = (plane: 'xy' | 'xz' | 'yz') => {
      return ringPoolIndices.map((ringIdx) => {
        const isExplicit = ringIdx < rangeRings.length;
        const initialR = isExplicit ? rangeRings[ringIdx] : radius * ((ringIdx + 1) / poolSize);
        const isMajor = majorRingIndex !== undefined ? ringIdx === majorRingIndex : ringIdx % 2 === 1;
        const color = isMajor ? tokens.gridPrimaryColor : tokens.gridSecondaryColor;
        const width = isMajor ? tokens.gridPrimaryWidth : tokens.gridSecondaryWidth;
        const baseAlpha = isMajor ? tokens.gridPrimaryAlpha * 1.3 : tokens.gridSecondaryAlpha * 1.1;

        return QUADRANTS.map((quad) => {
          const geom = createQuadrantArcGeometry(1.0, plane, quad.startAngle, quad.endAngle);
          // Initial SSR / first-paint setup: Q0 (+1, +1) visible in default perspective view
          const isInitialVisible = isExplicit && quad.qx === 1 && quad.qy === 1;
          const mat = new THREE.LineBasicMaterial({
            color,
            linewidth: width,
            transparent: true,
            depthWrite: false,
            opacity: isInitialVisible ? baseAlpha : 0,
            visible: isInitialVisible,
          });
          const line = new THREE.Line(geom, mat);
          line.scale.set(initialR, initialR, initialR);
          line.frustumCulled = false;
          return { radius: initialR, qx: quad.qx, qy: quad.qy, geom, mat, line };
        });
      });
    };

    return {
      xy: buildPlaneArcs('xy'),
      xz: buildPlaneArcs('xz'),
      yz: buildPlaneArcs('yz'),
    };
  }, [
    ringPoolIndices,
    rangeRings,
    radius,
    poolSize,
    majorRingIndex,
    tokens.gridPrimaryColor,
    tokens.gridSecondaryColor,
    tokens.gridPrimaryAlpha,
    tokens.gridSecondaryAlpha,
    tokens.gridPrimaryWidth,
    tokens.gridSecondaryWidth,
  ]);

  // Memoize Perimeter Boundary Arcs for each fin using unit arc geometry scaled to active radius
  const perimeterArcData = useMemo(() => {
    const buildPlanePerimeter = (plane: 'xy' | 'xz' | 'yz') => {
      return QUADRANTS.map((quad) => {
        const geom = createQuadrantArcGeometry(1.0, plane, quad.startAngle, quad.endAngle);
        const isInitialVisible = quad.qx === 1 && quad.qy === 1;
        const mat = new THREE.LineBasicMaterial({
          color: tokens.gridPrimaryColor,
          linewidth: tokens.gridSecondaryWidth,
          transparent: true,
          depthWrite: false,
          opacity: isInitialVisible ? tokens.gridPrimaryAlpha * 0.7 : 0,
          visible: isInitialVisible,
        });
        const line = new THREE.Line(geom, mat);
        line.scale.set(radius, radius, radius);
        line.frustumCulled = false;
        return { qx: quad.qx, qy: quad.qy, geom, mat, line };
      });
    };

    return {
      xy: buildPlanePerimeter('xy'),
      xz: buildPlanePerimeter('xz'),
      yz: buildPlanePerimeter('yz'),
    };
  }, [radius, tokens.gridPrimaryColor, tokens.gridSecondaryWidth, tokens.gridPrimaryAlpha]);

  // Memoize Quadrant Ticks for each plane using unit tick geometry scaled to active radius
  const tickData = useMemo(() => {
    const buildPlaneTicks = (plane: 'xy' | 'xz' | 'yz') => {
      return QUADRANTS.map((quad) => {
        const geom = createQuadrantTickGeometry(1.0, plane, quad.startAngle, 0.035);
        const isInitialVisible = quad.qx === 1 && quad.qy === 1;
        const mat = new THREE.LineBasicMaterial({
          color: tokens.rangeTickColor,
          linewidth: tokens.rangeTickWidth,
          transparent: true,
          depthWrite: false,
          opacity: isInitialVisible ? tokens.rangeTickAlpha : 0,
          visible: isInitialVisible,
        });
        const line = new THREE.LineSegments(geom, mat);
        line.scale.set(radius, radius, radius);
        line.frustumCulled = false;
        return { qx: quad.qx, qy: quad.qy, geom, mat, line };
      });
    };

    return {
      xy: buildPlaneTicks('xy'),
      xz: buildPlaneTicks('xz'),
      yz: buildPlaneTicks('yz'),
    };
  }, [radius, tokens.rangeTickColor, tokens.rangeTickWidth, tokens.rangeTickAlpha]);

  // Structural Fin Axis Spokes: Only appear when both bordering fins rendered
  const axisSpokes = useMemo(() => {
    const makeSpoke = (direction: [number, number, number], initialVisible = false) => {
      const geom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(...direction),
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
      line.scale.set(radius, radius, radius);
      line.frustumCulled = false;
      return { geom, mat, line };
    };

    return {
      negX: makeSpoke([-1, 0, 0], false),
      negY: makeSpoke([0, -1, 0], false),
      posZ: makeSpoke([0, 0, 1], true),
      negZ: makeSpoke([0, 0, -1], false),
    };
  }, [radius, tokens.axisLineColor, tokens.axisLineWidth, tokens.axisLineAlpha]);

  // Extended Cardinal Bearing Lines: +X Galactic Centre (Core Accent), +Y Galactic Orbit (Bearing Line)
  const extendedBearings = useMemo(() => {
    const makeBearing = (
      direction: [number, number, number],
      color: THREE.Color,
      alpha: number,
      width: number,
      style: 'solid' | 'dashed' | 'dotted' = 'solid',
    ) => {
      let points: THREE.Vector3[];
      if (style === 'dashed') {
        points = [];
        const numDashes = 28;
        const dir = new THREE.Vector3(...direction);
        for (let i = 0; i < numDashes; i++) {
          const tStart = i / numDashes;
          const tEnd = (i + 0.6) / numDashes;
          points.push(
            dir.clone().multiplyScalar(tStart),
            dir.clone().multiplyScalar(tEnd),
          );
        }
      } else {
        points = [
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(...direction),
        ];
      }
      const geom = new THREE.BufferGeometry().setFromPoints(points);
      geom.computeBoundingSphere();
      const mat = new THREE.LineBasicMaterial({
        color,
        linewidth: width,
        transparent: true,
        depthWrite: false,
        opacity: alpha,
        visible: true,
      });
      const line = new THREE.LineSegments(geom, mat);
      const bearingLen = radius * 1.35;
      line.scale.set(bearingLen, bearingLen, bearingLen);
      line.frustumCulled = false;
      return { geom, mat, line };
    };

    const orbitalColor = tokens.bearingOrbitalColor ?? tokens.bearingLineColor;
    const orbitalAlpha = tokens.bearingOrbitalAlpha ?? tokens.bearingLineAlpha;
    const orbitalWidth = tokens.bearingOrbitalWidth ?? tokens.bearingLineWidth;
    const orbitalStyle = tokens.bearingOrbitalStyle ?? tokens.bearingLineStyle;

    return {
      core: makeBearing(
        [1, 0, 0],
        tokens.bearingCoreColor,
        tokens.bearingCoreAlpha,
        tokens.bearingCoreWidth,
        tokens.bearingCoreStyle,
      ),
      orbital: makeBearing(
        [0, 1, 0],
        orbitalColor,
        orbitalAlpha,
        orbitalWidth,
        orbitalStyle,
      ),
    };
  }, [
    radius,
    tokens.bearingCoreColor,
    tokens.bearingCoreAlpha,
    tokens.bearingCoreWidth,
    tokens.bearingCoreStyle,
    tokens.bearingLineColor,
    tokens.bearingLineAlpha,
    tokens.bearingLineWidth,
    tokens.bearingLineStyle,
    tokens.bearingOrbitalColor,
    tokens.bearingOrbitalAlpha,
    tokens.bearingOrbitalWidth,
    tokens.bearingOrbitalStyle,
  ]);

  // Memoize Datum Plane Outermost Projected Aperture Boundary Circle
  const datumBoundaryData = useMemo(() => {
    const geom = createCircleGeometry(1.0, 128);
    const mat = new THREE.LineBasicMaterial({
      color: tokens.datumPlaneColor,
      linewidth: tokens.datumPlaneWidth,
      transparent: true,
      depthWrite: false,
      opacity: tokens.datumPlaneAlpha,
      visible: true,
    });
    const line = new THREE.Line(geom, mat);
    line.scale.set(radius, radius, 1);
    line.frustumCulled = false;
    return { geom, mat, line };
  }, [radius, tokens.datumPlaneColor, tokens.datumPlaneWidth, tokens.datumPlaneAlpha]);

  // Memoize Datum Plane Concentric Range Rings (unit circle scaled dynamically in useFrame)
  const datumRingData = useMemo(() => {
    return ringPoolIndices.map((ringIdx) => {
      const isExplicit = ringIdx < rangeRings.length;
      const initialR = isExplicit ? rangeRings[ringIdx] : radius * ((ringIdx + 1) / poolSize);
      const isMajor = majorRingIndex !== undefined ? ringIdx === majorRingIndex : ringIdx % 2 === 1;
      const color = isMajor ? tokens.datumPlaneMajorColor : tokens.datumPlaneMinorColor;
      const width = tokens.datumPlaneWidth;
      const alpha = isMajor ? tokens.datumPlaneMajorAlpha : tokens.datumPlaneMinorAlpha;
      const geom = createCircleGeometry(1.0, 128);
      const mat = new THREE.LineBasicMaterial({
        color,
        linewidth: width,
        transparent: true,
        depthWrite: false,
        opacity: isExplicit ? alpha : 0,
        visible: isExplicit,
      });
      const line = new THREE.Line(geom, mat);
      line.scale.set(initialR, initialR, 1);
      line.frustumCulled = false;
      return { geom, mat, line };
    });
  }, [
    ringPoolIndices,
    rangeRings,
    radius,
    poolSize,
    majorRingIndex,
    tokens.datumPlaneMajorColor,
    tokens.datumPlaneMinorColor,
    tokens.datumPlaneMajorAlpha,
    tokens.datumPlaneMinorAlpha,
    tokens.datumPlaneWidth,
  ]);

  // Mutable Scene Graph References (Preserving React Compiler optimization)
  const quadrantDataRef = useRef(quadrantData);
  const perimeterArcDataRef = useRef(perimeterArcData);
  const tickDataRef = useRef(tickData);
  const axisSpokesRef = useRef(axisSpokes);
  const extendedBearingsRef = useRef(extendedBearings);
  const datumBoundaryDataRef = useRef(datumBoundaryData);
  const datumRingDataRef = useRef(datumRingData);

  useEffect(() => {
    quadrantDataRef.current = quadrantData;
    perimeterArcDataRef.current = perimeterArcData;
    tickDataRef.current = tickData;
    axisSpokesRef.current = axisSpokes;
    extendedBearingsRef.current = extendedBearings;
    datumBoundaryDataRef.current = datumBoundaryData;
    datumRingDataRef.current = datumRingData;
  }, [quadrantData, perimeterArcData, tickData, axisSpokes, extendedBearings, datumBoundaryData, datumRingData]);

  // Clean up geometries and materials on unmount
  useEffect(() => {
    const qData = quadrantDataRef.current;
    const pData = perimeterArcDataRef.current;
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
        for (const pItem of pData[plane]) {
          pItem.geom.dispose();
          pItem.mat.dispose();
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

      datumBoundaryDataRef.current.geom.dispose();
      datumBoundaryDataRef.current.mat.dispose();
      for (const item of datumRingDataRef.current) {
        item.geom.dispose();
        item.mat.dispose();
      }
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
    const pData = perimeterArcDataRef.current;
    const tData = tickDataRef.current;
    const aSpokes = axisSpokesRef.current;
    const eBearings = extendedBearingsRef.current;
    const dBoundary = datumBoundaryDataRef.current;
    const dRings = datumRingDataRef.current;

    for (const plane of ['xy', 'xz', 'yz'] as const) {
      pData[plane].forEach((pItem) => {
        pItem.mat.color.copy(tokens.gridPrimaryColor);
        pItem.mat.linewidth = tokens.gridSecondaryWidth;
      });
      qData[plane].forEach((ringQuads, ringIdx) => {
        const isMajor = majorRingIndex !== undefined ? ringIdx === majorRingIndex : ringIdx % 2 === 1;
        const color = isMajor ? tokens.gridPrimaryColor : tokens.gridSecondaryColor;
        const width = isMajor ? tokens.gridPrimaryWidth : tokens.gridSecondaryWidth;
        for (const item of ringQuads) {
          item.mat.color.copy(color);
          item.mat.linewidth = width;
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

    // Galactic Centre Bearing: Solarized yellow accent token
    eBearings.core.mat.color.copy(tokens.bearingCoreColor);
    eBearings.core.mat.opacity = tokens.bearingCoreAlpha;
    eBearings.core.mat.linewidth = tokens.bearingCoreWidth;

    // Galactic Orbital Bearing: Solarized red dashed token
    eBearings.orbital.mat.color.copy(tokens.bearingOrbitalColor ?? tokens.bearingLineColor);
    eBearings.orbital.mat.opacity = tokens.bearingOrbitalAlpha ?? tokens.bearingLineAlpha;
    eBearings.orbital.mat.linewidth = tokens.bearingOrbitalWidth ?? tokens.bearingLineWidth;

    // Galactic Equator Datum Plane tokens
    dBoundary.mat.color.copy(tokens.datumPlaneColor);
    dBoundary.mat.linewidth = tokens.datumPlaneWidth;
    dBoundary.mat.opacity = tokens.datumPlaneAlpha;

    dRings.forEach((item, ringIdx) => {
      const isMajor = majorRingIndex !== undefined ? ringIdx === majorRingIndex : ringIdx % 2 === 1;
      const color = isMajor ? tokens.datumPlaneMajorColor : tokens.datumPlaneMinorColor;
      const alpha = isMajor ? tokens.datumPlaneMajorAlpha : tokens.datumPlaneMinorAlpha;
      item.mat.color.copy(color);
      item.mat.linewidth = tokens.datumPlaneWidth;
      item.mat.opacity = alpha;
    });
  }, [tokens, majorRingIndex]);

  // Frame Loop: Dynamic zoom adaptation, smooth double-segment transitions, tighter cardinal alignment, camera focus lock
  useFrame((state) => {
    const activeCamera = state.camera;
    const activeControls = state.controls as { target?: THREE.Vector3 } | undefined;

    // Resolve camera focus point / origin
    const origin = scratchOrigin.current;
    if (position instanceof THREE.Vector3) {
      origin.copy(position);
    } else {
      origin.set(position[0], position[1], position[2]);
    }

    if (focusTarget) {
      if (focusTarget instanceof THREE.Vector3) {
        origin.copy(focusTarget);
      } else if ('current' in focusTarget && focusTarget.current) {
        if (focusTarget.current instanceof THREE.Vector3) {
          origin.copy(focusTarget.current);
        } else if ('position' in focusTarget.current) {
          origin.copy(focusTarget.current.position);
        }
      }
    } else if (lockToFocusPoint) {
      if (activeControls && activeControls.target instanceof THREE.Vector3) {
        origin.copy(activeControls.target);
      } else if ((activeCamera as any).target instanceof THREE.Vector3) {
        origin.copy((activeCamera as any).target);
      }
    }

    // Keep instrument origin locked to camera focus point
    if (rootGroupRef.current) {
      rootGroupRef.current.position.copy(origin);
    }

    const qData = quadrantDataRef.current;
    const pArcData = perimeterArcDataRef.current;
    const tData = tickDataRef.current;
    const aSpokes = axisSpokesRef.current;
    const eBearings = extendedBearingsRef.current;

    // Camera direction and distance relative to instrument origin
    const camDist = activeCamera.position.distanceTo(origin);
    const camDir = scratchCamDir.current.copy(activeCamera.position).sub(origin);
    if (camDist > 0.0001) {
      camDir.divideScalar(camDist);
    } else {
      camDir.set(0, 0, 1);
    }

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

    // 4. Determine active aperture radius and concentric ring radii (static vs screenConstant)
    let currentRadius = radius;
    let activeRings: Array<{ radius: number; isMajor: boolean; fade: number }> = [];

    if (screenConstant) {
      // Screen-constant scaling: aperture radius scales with distance to keep visual footprint invariant
      // Clamp distance so instrument never collapses below 3.5 pc or causes near-plane occlusion
      const clampedCamDist = Math.max(camDist, 3.5);
      currentRadius = radius * (clampedCamDist / effectiveRefDist);
      activeRings = computeZoomAdaptiveRings(currentRadius, poolSize);
    } else {
      currentRadius = radius;
      activeRings = rangeRings.map((r, idx) => ({
        radius: r,
        isMajor: majorRingIndex !== undefined ? idx === majorRingIndex : idx % 2 === 1,
        fade: 1.0,
      }));
    }

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

    // Calculate quadrant weights for each plane
    const qwXY = QUADRANTS.map((quad) =>
      calcQuadWeight(quad.qx, quad.qy, sx, sy, wTransX, wTransY, alphaZ),
    );
    const qwXZ = QUADRANTS.map((quad) =>
      calcQuadWeight(quad.qx, quad.qy, sx, sz, wTransX, wTransZ, alphaY),
    );
    const qwYZ = QUADRANTS.map((quad) =>
      calcQuadWeight(quad.qx, quad.qy, sy, sz, wTransY, wTransZ, alphaX),
    );

    // 5. Update Fin Perimeter Boundary Arcs with current aperture radius (Subtle perimeter boundary)
    if (showFins) {
      for (const plane of ['xy', 'xz', 'yz'] as const) {
        const pArcs = pArcData[plane];
        const fadePlane = plane === 'xy' ? fadeXY : plane === 'xz' ? fadeXZ : fadeYZ;
        const qwList = plane === 'xy' ? qwXY : plane === 'xz' ? qwXZ : qwYZ;

        pArcs.forEach((pItem, qIdx) => {
          pItem.line.scale.set(currentRadius, currentRadius, currentRadius);
          pItem.mat.color.copy(tokens.gridPrimaryColor);
          pItem.mat.linewidth = tokens.gridSecondaryWidth;
          pItem.mat.opacity = tokens.gridPrimaryAlpha * 0.7 * qwList[qIdx] * fadePlane;
          pItem.mat.visible = pItem.mat.opacity > 0.001;
        });
      }

      // 6. Update Concentric Range Rings across all planes (Alternating Brighter vs Dimmer hierarchy)
      for (let ringIdx = 0; ringIdx < poolSize; ringIdx++) {
        const ringActive = ringIdx < activeRings.length;
        const ringInfo = ringActive ? activeRings[ringIdx] : null;

        if (ringInfo) {
          const r = ringInfo.radius;
          const isMajor = ringInfo.isMajor;
          const color = isMajor ? tokens.gridPrimaryColor : tokens.gridSecondaryColor;
          const width = isMajor ? tokens.gridPrimaryWidth : tokens.gridSecondaryWidth;
          const baseAlpha = isMajor
            ? Math.max(tokens.gridPrimaryAlpha * 1.3, 0.38)
            : Math.max(tokens.gridSecondaryAlpha * 1.1, 0.18);
          const ringFade = ringInfo.fade;

          for (const plane of ['xy', 'xz', 'yz'] as const) {
            const quads = qData[plane][ringIdx];
            const fadePlane = plane === 'xy' ? fadeXY : plane === 'xz' ? fadeXZ : fadeYZ;
            const qwList = plane === 'xy' ? qwXY : plane === 'xz' ? qwXZ : qwYZ;

            quads.forEach((item, qIdx) => {
              item.line.scale.set(r, r, r);
              item.mat.color.copy(color);
              item.mat.linewidth = width;
              item.mat.opacity = baseAlpha * ringFade * qwList[qIdx] * fadePlane;
              item.mat.visible = item.mat.opacity > 0.001;
            });
          }
        } else {
          // Inactive ring in pool
          for (const plane of ['xy', 'xz', 'yz'] as const) {
            const quads = qData[plane][ringIdx];
            quads.forEach((item) => {
              item.mat.opacity = 0;
              item.mat.visible = false;
            });
          }
        }
      }

      // 7. Update perimeter ticks with current aperture radius
      for (const plane of ['xy', 'xz', 'yz'] as const) {
        const ticks = tData[plane];
        const fadePlane = plane === 'xy' ? fadeXY : plane === 'xz' ? fadeXZ : fadeYZ;
        const qwList = plane === 'xy' ? qwXY : plane === 'xz' ? qwXZ : qwYZ;

        ticks.forEach((tickItem, qIdx) => {
          tickItem.line.scale.set(currentRadius, currentRadius, currentRadius);
          tickItem.mat.opacity = Math.max(tokens.rangeTickAlpha * 1.6, 0.35) * qwList[qIdx] * fadePlane;
          tickItem.mat.visible = tickItem.mat.opacity > 0.001;
        });
      }
    }

    // 8. Structural Axis Spokes Rule:
    // Matches the bearings luminance (axisLineAlpha 0.35)
    if (showAxisLines) {
      const spokeBaseAlpha = tokens.axisLineAlpha;
      // -X spoke bordered by XY (-X) and XZ (-X)
      const presenceXY_negX = Math.max(qwXY[1], qwXY[2]) * fadeXY;
      const presenceXZ_negX = Math.max(qwXZ[1], qwXZ[2]) * fadeXZ;
      const alphaNegX = spokeBaseAlpha * Math.min(presenceXY_negX, presenceXZ_negX);
      aSpokes.negX.line.scale.set(currentRadius, currentRadius, currentRadius);
      aSpokes.negX.mat.opacity = alphaNegX;
      aSpokes.negX.mat.visible = alphaNegX > 0.001;

      // -Y spoke bordered by XY (-Y) and YZ (-Y)
      const presenceXY_negY = Math.max(qwXY[2], qwXY[3]) * fadeXY;
      const presenceYZ_negY = Math.max(qwYZ[1], qwYZ[2]) * fadeYZ;
      const alphaNegY = spokeBaseAlpha * Math.min(presenceXY_negY, presenceYZ_negY);
      aSpokes.negY.line.scale.set(currentRadius, currentRadius, currentRadius);
      aSpokes.negY.mat.opacity = alphaNegY;
      aSpokes.negY.mat.visible = alphaNegY > 0.001;

      // +Z spoke bordered by XZ (+Z) and YZ (+Z)
      const presenceXZ_posZ = Math.max(qwXZ[0], qwXZ[1]) * fadeXZ;
      const presenceYZ_posZ = Math.max(qwYZ[0], qwYZ[1]) * fadeYZ;
      const alphaPosZ = spokeBaseAlpha * Math.min(presenceXZ_posZ, presenceYZ_posZ);
      aSpokes.posZ.line.scale.set(currentRadius, currentRadius, currentRadius);
      aSpokes.posZ.mat.opacity = alphaPosZ;
      aSpokes.posZ.mat.visible = alphaPosZ > 0.001;

      // -Z spoke bordered by XZ (-Z) and YZ (-Z)
      const presenceXZ_negZ = Math.max(qwXZ[2], qwXZ[3]) * fadeXZ;
      const presenceYZ_negZ = Math.max(qwYZ[2], qwYZ[3]) * fadeYZ;
      const alphaNegZ = spokeBaseAlpha * Math.min(presenceXZ_negZ, presenceYZ_negZ);
      aSpokes.negZ.line.scale.set(currentRadius, currentRadius, currentRadius);
      aSpokes.negZ.mat.opacity = alphaNegZ;
      aSpokes.negZ.mat.visible = alphaNegZ > 0.001;

      // 9. Extended Bearing Lines
      const bearingLen = currentRadius * 1.35;
      eBearings.core.line.scale.set(bearingLen, bearingLen, bearingLen);
      eBearings.core.mat.color.copy(tokens.bearingCoreColor);
      eBearings.core.mat.opacity = tokens.bearingCoreAlpha;
      eBearings.core.mat.linewidth = tokens.bearingCoreWidth;
      eBearings.core.mat.visible = true;

      eBearings.orbital.line.scale.set(bearingLen, bearingLen, bearingLen);
      eBearings.orbital.mat.color.copy(tokens.bearingOrbitalColor ?? tokens.bearingLineColor);
      eBearings.orbital.mat.opacity = tokens.bearingOrbitalAlpha ?? tokens.bearingLineAlpha;
      eBearings.orbital.mat.linewidth = tokens.bearingOrbitalWidth ?? tokens.bearingLineWidth;
      eBearings.orbital.mat.visible = true;
    }

    // 10. Datum Plane Update (Galactic Equator Z=0)
    if (datumGroupRef.current) {
      datumGroupRef.current.position.set(0, 0, -origin.z);
    }

    if (isDatumPlaneVisible) {
      const dBoundary = datumBoundaryDataRef.current;
      dBoundary.line.scale.set(currentRadius, currentRadius, 1);
      dBoundary.mat.color.copy(tokens.datumPlaneColor);
      dBoundary.mat.opacity = tokens.datumPlaneAlpha;
      dBoundary.mat.visible = tokens.datumPlaneAlpha > 0.001;

      for (let ringIdx = 0; ringIdx < poolSize; ringIdx++) {
        const ringActive = ringIdx < activeRings.length;
        const ringInfo = ringActive ? activeRings[ringIdx] : null;
        const ringItem = datumRingDataRef.current[ringIdx];
        if (ringItem) {
          if (ringInfo) {
            const r = ringInfo.radius;
            const isMajor = ringInfo.isMajor;
            const color = isMajor ? tokens.datumPlaneMajorColor : tokens.datumPlaneMinorColor;
            const alpha = (isMajor ? tokens.datumPlaneMajorAlpha : tokens.datumPlaneMinorAlpha) * ringInfo.fade;
            ringItem.line.scale.set(r, r, 1);
            ringItem.mat.color.copy(color);
            ringItem.mat.opacity = alpha;
            ringItem.mat.visible = alpha > 0.001;
          } else {
            ringItem.mat.opacity = 0;
            ringItem.mat.visible = false;
          }
        }
      }

      if (datumFillRef.current) {
        datumFillRef.current.scale.set(currentRadius, currentRadius, 1);
        const fillMat = datumFillRef.current.material as THREE.MeshBasicMaterial;
        if (fillMat) {
          fillMat.color.copy(tokens.datumPlaneFillColor);
          fillMat.opacity = tokens.datumPlaneFillAlpha;
        }
      }
    }

    // 11. Adaptive Orthographic Switch: Narrow FOV and compensate zoom to maintain target footprint
    if (adaptiveProjection && activeCamera instanceof THREE.PerspectiveCamera) {
      if (baseFovRef.current === null) {
        baseFovRef.current = activeCamera.fov < 15 ? 45 : activeCamera.fov;
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
    <group ref={rootGroupRef} position={initialPosition} name="cartographic-grid">
      {/* Three Orthogonal Travelling Fins with Dynamic Quadrant Range Arcs */}
      {showFins && (
        <group name="travelling-fins">
          {/* XY Fin (Galactic Equator) */}
          <group name="fin-xy">
            {perimeterArcData.xy.map((pItem, qIdx) => (
              <primitive key={`xy-perimeter-q${qIdx}`} object={pItem.line} name={`xy-perimeter-q${qIdx}`} />
            ))}
            {ringPoolIndices.map((ringIdx) => {
              const testId =
                ringIdx < rangeRings.length ? `arc-tier-${rangeRings[ringIdx]}` : `arc-tier-pool-${ringIdx}`;
              return (
                <group key={`xy-tier-${ringIdx}`} name={testId}>
                  {quadrantData.xy[ringIdx].map((q, qIdx) => (
                    <primitive key={`xy-${ringIdx}-q${qIdx}`} object={q.line} />
                  ))}
                </group>
              );
            })}
            {tickData.xy.map((qTick, qIdx) => (
              <primitive key={`xy-ticks-q${qIdx}`} object={qTick.line} />
            ))}
          </group>

          {/* XZ Fin (Core Meridian) */}
          <group name="fin-xz">
            {perimeterArcData.xz.map((pItem, qIdx) => (
              <primitive key={`xz-perimeter-q${qIdx}`} object={pItem.line} name={`xz-perimeter-q${qIdx}`} />
            ))}
            {ringPoolIndices.map((ringIdx) => {
              const testId =
                ringIdx < rangeRings.length ? `arc-tier-${rangeRings[ringIdx]}` : `arc-tier-pool-${ringIdx}`;
              return (
                <group key={`xz-tier-${ringIdx}`} name={testId}>
                  {quadrantData.xz[ringIdx].map((q, qIdx) => (
                    <primitive key={`xz-${ringIdx}-q${qIdx}`} object={q.line} />
                  ))}
                </group>
              );
            })}
            {tickData.xz.map((qTick, qIdx) => (
              <primitive key={`xz-ticks-q${qIdx}`} object={qTick.line} />
            ))}
          </group>

          {/* YZ Fin (Transverse) */}
          <group name="fin-yz">
            {perimeterArcData.yz.map((pItem, qIdx) => (
              <primitive key={`yz-perimeter-q${qIdx}`} object={pItem.line} name={`yz-perimeter-q${qIdx}`} />
            ))}
            {ringPoolIndices.map((ringIdx) => {
              const testId =
                ringIdx < rangeRings.length ? `arc-tier-${rangeRings[ringIdx]}` : `arc-tier-pool-${ringIdx}`;
              return (
                <group key={`yz-tier-${ringIdx}`} name={testId}>
                  {quadrantData.yz[ringIdx].map((q, qIdx) => (
                    <primitive key={`yz-${ringIdx}-q${qIdx}`} object={q.line} />
                  ))}
                </group>
              );
            })}
            {tickData.yz.map((qTick, qIdx) => (
              <primitive key={`yz-ticks-q${qIdx}`} object={qTick.line} />
            ))}
          </group>
        </group>
      )}

      {/* Axis Lines */}
      {showAxisLines && (
        <group name="cardinal-bearings">
          {/* Structural Fin Axis Spokes: Rendered only when both bordering fins rendered */}
          <primitive object={axisSpokes.negX.line} name="axis-spoke-neg-x" />
          <primitive object={axisSpokes.negY.line} name="axis-spoke-neg-y" />
          <primitive object={axisSpokes.posZ.line} name="axis-spoke-pos-z" />
          <primitive object={axisSpokes.negZ.line} name="axis-spoke-neg-z" />

          {/* Prominent Extended Cardinal Bearing Lines: +X (Galactic Core Accent), +Y (Galactic Orbit) */}
          <primitive object={extendedBearings.core.line} name="bearing-core" />
          <primitive object={extendedBearings.orbital.line} name="bearing-orbital" />
        </group>
      )}

      {/* Galactic Equator (Z=0) Datum Plane */}
      {isDatumPlaneVisible && (
        <group ref={datumGroupRef} position={[0, 0, -initialPosition[2]]} name="datum-plane">
          {/* Ethereal Planar Fill Disc */}
          <mesh ref={datumFillRef} name="datum-plane-fill">
            <circleGeometry args={[1, 64]} />
            <meshBasicMaterial
              color={tokens.datumPlaneFillColor}
              opacity={tokens.datumPlaneFillAlpha}
              transparent
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Outermost Projected Aperture Boundary */}
          <primitive object={datumBoundaryData.line} name="datum-plane-boundary" />

          {/* Hierarchical Concentric Range Rings */}
          {ringPoolIndices.map((ringIdx) => {
            const testId =
              ringIdx < rangeRings.length ? `full-ring-${rangeRings[ringIdx]}` : `full-ring-pool-${ringIdx}`;
            return (
              <primitive
                key={`datum-ring-${ringIdx}`}
                object={datumRingData[ringIdx].line}
                name={testId}
              />
            );
          })}
        </group>
      )}
    </group>
  );
};
