import type React from 'react';
import { useMemo, useRef, useEffect, useSyncExternalStore } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useShallow } from 'zustand/react/shallow';
import { useThreeTokenStore } from '../../../stores/useThreeTokenStore';
import {
  QUADRANTS,
  createQuadrantArcGeometry,
  createQuadrantTickGeometry,
  computeCardinalAlignment,
  computeTransitionWeights,
  populateZoomAdaptiveRings,
  type ScaledRingInfo,
} from './cartographyMath';
import {
  createReticleGeometry,
  type CelestialClassification,
  type PlanetCensusEntry,
} from './reticleGeometry';
import {
  celestialOcclusionManager,
} from './celestialOcclusionRegistry';

const PLANES = ['xy', 'xz', 'yz'] as const;

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

export interface PlanarFootprintItem {
  id: string;
  position: [number, number, number] | THREE.Vector3;
  classification?: CelestialClassification;
  size?: number;
  multiplicity?: number;
  planets?: PlanetCensusEntry[];
  color?: string | THREE.Color;
  opacity?: number;
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
  /** Whether to render planar footprints stamped on the Galactic Equator (Z=0) datum plane. Default: true */
  showPlanarFootprint?: boolean;
  /** Shape classification of the primary focus planar footprint. Default: 'star' */
  footprintClassification?: CelestialClassification;
  /** Radius of the primary planar footprint in scene coordinate units. Default: 0.45 */
  footprintSize?: number;
  /** Optional explicit list of planar footprints to render on the datum plane */
  footprints?: PlanarFootprintItem[];
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
 * ReticleFootprintNode
 * Dedicated subcomponent for rendering an individual planar reticle footprint.
 * Manages geometry lifecycle with useMemo and cleanup via useEffect to prevent WebGL memory leaks.
 */
interface ReticleFootprintNodeProps {
  id: string | number;
  position: [number, number, number];
  classification: CelestialClassification;
  size: number;
  color: THREE.Color | string;
  opacity: number;
  multiplicity?: number;
  planets?: PlanetCensusEntry[];
  isAnnotated?: boolean;
}

const ReticleFootprintNode: React.FC<ReticleFootprintNodeProps> = ({
  id,
  position,
  classification,
  size,
  color,
  opacity,
  multiplicity,
  planets,
  isAnnotated,
}) => {
  const geom = useMemo(() => {
    return createReticleGeometry(classification, size, {
      multiplicity,
      planets,
      isAnnotated,
    });
  }, [classification, size, multiplicity, planets, isAnnotated]);

  useEffect(() => {
    return () => {
      geom.dispose();
    };
  }, [geom]);

  return (
    <group position={position} name={`planar-footprint-${id}`}>
      <lineSegments geometry={geom}>
        <lineBasicMaterial
          color={color}
          opacity={opacity}
          transparent
          depthWrite={false}
        />
      </lineSegments>
    </group>
  );
};

/**
 * Dynamic Stalked Footprints Layer
 * Automatically projects planar ground footprints on the Galactic Equator (Z=0)
 * for any CelestialNodes with active drop stalks in the scene.
 */
interface StalkedFootprintsLayerProps {
  originRef: React.RefObject<THREE.Vector3>;
  initialPosition: [number, number, number];
  defaultColor: THREE.Color;
  defaultAlpha: number;
  tokens: ReturnType<typeof useThreeTokenStore.getState>['tokens'];
}

const StalkedFootprintsLayer: React.FC<StalkedFootprintsLayerProps> = ({
  originRef,
  initialPosition,
  defaultColor,
  defaultAlpha,
  tokens,
}) => {
  const stalked = useSyncExternalStore(
    celestialOcclusionManager.subscribeStalked,
    celestialOcclusionManager.getStalkedFootprintsSnapshot,
    celestialOcclusionManager.getStalkedFootprintsSnapshot,
  );
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current && originRef.current) {
      groupRef.current.position.set(-originRef.current.x, -originRef.current.y, 0.002);
    }
  });

  if (stalked.length === 0) return null;

  return (
    <group
      ref={groupRef}
      position={[-initialPosition[0], -initialPosition[1], 0.002]}
      name="dynamic-stalked-footprints"
    >
      {stalked.map((node) => {
        if (!node.worldPos) return null;
        const isFocused = node.state === 'focused';
        const isSelected = node.state === 'selected';
        const fpColor = isFocused
          ? tokens.stateFocus
          : isSelected
            ? tokens.stateSelectedBorder
            : defaultColor;
        const fpAlpha = isFocused ? 0.95 : isSelected ? 0.85 : defaultAlpha;

        return (
          <ReticleFootprintNode
            key={node.id}
            id={node.id}
            position={[node.worldPos[0], node.worldPos[1], 0]}
            classification={(node.classification as CelestialClassification) ?? 'star'}
            size={node.reticleSize ?? 0.45}
            color={fpColor}
            opacity={fpAlpha}
            multiplicity={node.multiplicity}
            planets={node.planets}
            isAnnotated={isSelected || isFocused}
          />
        );
      })}
    </group>
  );
};

/**
 * Calculates quadrant weight for a coordinate plane based on camera heading and transition parameters.
 * Defined at module scope to eliminate per-frame closure allocations in useFrame.
 */
function calcQuadWeight(
  qx: number,
  qy: number,
  targetSx: number,
  targetSy: number,
  transX: number,
  transY: number,
  alphaNormal: number,
): number {
  const matchX = qx === targetSx ? 1 : transX;
  const matchY = qy === targetSy ? 1 : transY;
  const segWeight = matchX * matchY;
  return Math.max(segWeight, alphaNormal);
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
  showPlanarFootprint = true,
  footprintClassification = 'star',
  footprintSize = 0.45,
  footprints,
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
  const tokens = useThreeTokenStore(useShallow((state) => state.tokens));
  const { camera } = useThree();

  const isDatumPlaneVisible = showGalacticPlane ?? showFullDatumCircle ?? true;
  const showDatumRings = showFullDatumCircle ?? true;

  const baseFovRef = useRef<number | null>(null);
  const rootGroupRef = useRef<THREE.Group>(null);
  const datumGroupRef = useRef<THREE.Group>(null);
  const explicitFootprintsGroupRef = useRef<THREE.Group>(null);
  const scratchOrigin = useRef(new THREE.Vector3());
  const scratchCamDir = useRef(new THREE.Vector3());
  const scratchQwXY = useRef([0, 0, 0, 0]);
  const scratchQwXZ = useRef([0, 0, 0, 0]);
  const scratchQwYZ = useRef([0, 0, 0, 0]);
  const activeRingsPoolRef = useRef<ScaledRingInfo[]>(
    Array.from({ length: 16 }, () => ({ radius: 0, isMajor: false, fade: 0 }))
  );

  // Auto-calculated reference distance ensuring instrument fits comfortably in viewport (~93% vertical span)
  const effectiveRefDist = Math.max(0.001, referenceDistance ?? radius * 3.49);

  const posX = position instanceof THREE.Vector3 ? position.x : position[0];
  const posY = position instanceof THREE.Vector3 ? position.y : position[1];
  const posZ = position instanceof THREE.Vector3 ? position.z : position[2];

  const initialPosition = useMemo<[number, number, number]>(() => {
    return [posX, posY, posZ];
  }, [posX, posY, posZ]);

  // Memoize primary planar ground footprint geometry stamped on Galactic Equator Z=0
  const primaryFootprintGeom = useMemo(() => {
    if (!showPlanarFootprint) return null;
    return createReticleGeometry(footprintClassification, footprintSize);
  }, [showPlanarFootprint, footprintClassification, footprintSize]);

  useEffect(() => {
    return () => {
      primaryFootprintGeom?.dispose();
    };
  }, [primaryFootprintGeom]);

  // Precompute static range rings for non-screenConstant rendering (avoids array allocations in useFrame)
  const staticRangeRings = useMemo(() => {
    return rangeRings.map((r, idx) => ({
      radius: r,
      isMajor: majorRingIndex !== undefined ? idx === majorRingIndex : idx % 2 === 1,
      fade: 1.0,
    }));
  }, [rangeRings, majorRingIndex]);

  // Pool size: allocates either the explicit rangeRings count or 8 rings for dynamic zoom adaptation
  const poolSize = screenConstant ? Math.max(rangeRings.length, 8) : rangeRings.length;
  if (activeRingsPoolRef.current.length < poolSize) {
    activeRingsPoolRef.current = Array.from({ length: poolSize }, () => ({
      radius: 0,
      isMajor: false,
      fade: 0,
    }));
  }
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
  }, [ringPoolIndices, rangeRings, radius, poolSize, majorRingIndex]);

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
  }, [radius]);

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
  }, [radius]);

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
  }, [radius]);

  // Planar Disk Cardinal Bearing Lines: 1 radius long on the datum plane, solid crosshairs (+X Core, +Y Orbit, -X, -Y)
  const diskBearings = useMemo(() => {
    const makeBearing = (
      direction: [number, number, number],
      color: THREE.Color,
      alpha: number,
      width: number,
    ) => {
      const geom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(...direction),
      ]);
      geom.computeBoundingSphere();
      const mat = new THREE.LineBasicMaterial({
        color,
        linewidth: width,
        transparent: true,
        depthWrite: false,
        opacity: alpha,
        visible: true,
      });
      const line = new THREE.Line(geom, mat);
      line.scale.set(radius, radius, 1);
      line.frustumCulled = false;
      return { geom, mat, line };
    };

    const orbitalColor = tokens.bearingOrbitalColor ?? tokens.bearingLineColor;
    const orbitalAlpha = tokens.bearingOrbitalAlpha ?? tokens.bearingLineAlpha;
    const orbitalWidth = tokens.bearingOrbitalWidth ?? tokens.bearingLineWidth;

    return {
      core: makeBearing(
        [1, 0, 0],
        tokens.bearingCoreColor,
        tokens.bearingCoreAlpha,
        tokens.bearingCoreWidth,
      ),
      orbital: makeBearing(
        [0, 1, 0],
        orbitalColor,
        orbitalAlpha,
        orbitalWidth,
      ),
      antiCore: makeBearing(
        [-1, 0, 0],
        tokens.axisLineColor,
        tokens.axisLineAlpha,
        tokens.axisLineWidth,
      ),
      antiOrbital: makeBearing(
        [0, -1, 0],
        tokens.axisLineColor,
        tokens.axisLineAlpha,
        tokens.axisLineWidth,
      ),
    };
  }, [radius]);

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
  }, [radius]);

  // Memoize Datum Plane Ethereal Gradient Fill Disc
  const datumFillData = useMemo(() => {
    const geom = new THREE.CircleGeometry(1.0, 128);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: tokens.datumPlaneFillColor },
        uAlpha: { value: tokens.datumPlaneFillAlpha },
        uInnerRadius: { value: tokens.datumPlaneFillGradientInner },
        uExponent: { value: tokens.datumPlaneFillGradientExponent },
      },
      vertexShader: `
        varying vec2 vPosition;
        void main() {
          vPosition = position.xy;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uAlpha;
        uniform float uInnerRadius;
        uniform float uExponent;
        varying vec2 vPosition;
        void main() {
          float r = length(vPosition);
          if (r > 1.0) discard;

          // Transparent in center (r < uInnerRadius):
          float t = clamp((r - uInnerRadius) / (1.0 - uInnerRadius), 0.0, 1.0);
          float smoothT = smoothstep(0.0, 1.0, t);
          float curve = pow(smoothT, uExponent);

          // Soft luminous halo near the outer rim (r in [0.70, 0.98]):
          float rimGlow = smoothstep(0.70, 0.98, r);
          float alpha = uAlpha * (curve * 0.65 + rimGlow * 0.35);

          // Soft feathering at the extreme edge so it smoothly melts into the rim line:
          float edgeFeather = 1.0 - smoothstep(0.985, 1.0, r);
          alpha *= (0.8 + 0.2 * edgeFeather);

          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.frustumCulled = false;
    return { geom, mat, mesh };
  }, []);

  // Memoize Datum Plane Concentric Range Rings: full solid 360-degree circles driven by main grid tokens
  const datumRingData = useMemo(() => {
    return ringPoolIndices.map((ringIdx) => {
      const isExplicit = ringIdx < rangeRings.length;
      const initialR = isExplicit ? rangeRings[ringIdx] : radius * ((ringIdx + 1) / poolSize);
      const isMajor = majorRingIndex !== undefined ? ringIdx === majorRingIndex : ringIdx % 2 === 1;
      const color = isMajor ? tokens.gridPrimaryColor : tokens.gridSecondaryColor;
      const width = isMajor ? tokens.gridPrimaryWidth : tokens.gridSecondaryWidth;
      const alpha = isMajor ? tokens.gridPrimaryAlpha : tokens.gridSecondaryAlpha;

      const geom = createCircleGeometry(1.0, 128);
      geom.computeBoundingSphere();
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
      return { ringIdx, geom, mat, line, isMajor, initialR };
    });
  }, [ringPoolIndices, rangeRings, radius, poolSize, majorRingIndex]);

  // Mutable Scene Graph References (Preserving React Compiler optimization)
  const quadrantDataRef = useRef(quadrantData);
  const perimeterArcDataRef = useRef(perimeterArcData);
  const tickDataRef = useRef(tickData);
  const axisSpokesRef = useRef(axisSpokes);
  const diskBearingsRef = useRef(diskBearings);
  const datumBoundaryDataRef = useRef(datumBoundaryData);
  const datumFillDataRef = useRef(datumFillData);
  const datumRingDataRef = useRef(datumRingData);

  useEffect(() => {
    quadrantDataRef.current = quadrantData;
    perimeterArcDataRef.current = perimeterArcData;
    tickDataRef.current = tickData;
    axisSpokesRef.current = axisSpokes;
    diskBearingsRef.current = diskBearings;
    datumBoundaryDataRef.current = datumBoundaryData;
    datumFillDataRef.current = datumFillData;
    datumRingDataRef.current = datumRingData;
  }, [
    quadrantData,
    perimeterArcData,
    tickData,
    axisSpokes,
    diskBearings,
    datumBoundaryData,
    datumFillData,
    datumRingData,
  ]);

  // Clean up geometries and materials on unmount or when structural data changes
  useEffect(() => {
    const qData = quadrantData;
    const pData = perimeterArcData;
    const tData = tickData;
    const aSpokes = axisSpokes;
    const dBear = diskBearings;
    const dBoundary = datumBoundaryData;
    const dFill = datumFillData;
    const dRings = datumRingData;

    return () => {
      for (const plane of PLANES) {
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

      dBear.core.geom.dispose();
      dBear.core.mat.dispose();
      dBear.orbital.geom.dispose();
      dBear.orbital.mat.dispose();
      dBear.antiCore.geom.dispose();
      dBear.antiCore.mat.dispose();
      dBear.antiOrbital.geom.dispose();
      dBear.antiOrbital.mat.dispose();

      dBoundary.geom.dispose();
      dBoundary.mat.dispose();
      dFill.geom.dispose();
      dFill.mat.dispose();
      for (const ringItem of dRings) {
        ringItem.geom.dispose();
        ringItem.mat.dispose();
      }
    };
  }, [
    quadrantData,
    perimeterArcData,
    tickData,
    axisSpokes,
    diskBearings,
    datumBoundaryData,
    datumFillData,
    datumRingData,
  ]);

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
    const dBear = diskBearingsRef.current;
    const dBoundary = datumBoundaryDataRef.current;
    const dRings = datumRingDataRef.current;

    for (const plane of PLANES) {
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
        tickItem.mat.linewidth = tokens.rangeTickWidth;
      }
    }

    for (const spoke of [aSpokes.negX, aSpokes.negY, aSpokes.posZ, aSpokes.negZ]) {
      spoke.mat.color.copy(tokens.axisLineColor);
      spoke.mat.linewidth = tokens.axisLineWidth;
    }

    // Planar Disk Cardinal Bearings (1 radius long, solid crosshairs)
    if (dBear) {
      dBear.core.mat.color.copy(tokens.bearingCoreColor);
      dBear.core.mat.opacity = tokens.bearingCoreAlpha;
      dBear.core.mat.linewidth = tokens.bearingCoreWidth;

      dBear.orbital.mat.color.copy(tokens.bearingOrbitalColor ?? tokens.bearingLineColor);
      dBear.orbital.mat.opacity = tokens.bearingOrbitalAlpha ?? tokens.bearingLineAlpha;
      dBear.orbital.mat.linewidth = tokens.bearingOrbitalWidth ?? tokens.bearingLineWidth;

      dBear.antiCore.mat.color.copy(tokens.axisLineColor);
      dBear.antiCore.mat.opacity = tokens.axisLineAlpha;
      dBear.antiCore.mat.linewidth = tokens.axisLineWidth;

      dBear.antiOrbital.mat.color.copy(tokens.axisLineColor);
      dBear.antiOrbital.mat.opacity = tokens.axisLineAlpha;
      dBear.antiOrbital.mat.linewidth = tokens.axisLineWidth;
    }

    // Galactic Equator Datum Plane tokens
    dBoundary.mat.color.copy(tokens.datumPlaneColor);
    dBoundary.mat.linewidth = tokens.datumPlaneWidth;
    dBoundary.mat.opacity = tokens.datumPlaneAlpha;

    const fillMat = datumFillDataRef.current.mat;
    fillMat.uniforms.uColor.value.copy(tokens.datumPlaneFillColor);
    fillMat.uniforms.uAlpha.value = tokens.datumPlaneFillAlpha;
    fillMat.uniforms.uInnerRadius.value = tokens.datumPlaneFillGradientInner;
    fillMat.uniforms.uExponent.value = tokens.datumPlaneFillGradientExponent;

    dRings.forEach((ringItem) => {
      const isMajor = ringItem.isMajor;
      const color = isMajor ? tokens.gridPrimaryColor : tokens.gridSecondaryColor;
      const width = isMajor ? tokens.gridPrimaryWidth : tokens.gridSecondaryWidth;
      const alpha = isMajor ? tokens.gridPrimaryAlpha : tokens.gridSecondaryAlpha;
      ringItem.mat.color.copy(color);
      ringItem.mat.linewidth = width;
      ringItem.mat.opacity = alpha;
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
      } else if ('target' in activeCamera && activeCamera.target instanceof THREE.Vector3) {
        origin.copy(activeCamera.target);
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
    const dBearings = diskBearingsRef.current;

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
    const activeRingsPool = activeRingsPoolRef.current;
    let activeRingCount = 0;

    if (screenConstant) {
      // Screen-constant scaling: aperture radius scales with distance to keep visual footprint invariant
      // Clamp distance so instrument never collapses below 3.5 pc or causes near-plane occlusion
      const clampedCamDist = Math.max(camDist, 3.5);
      currentRadius = radius * (clampedCamDist / effectiveRefDist);
      activeRingCount = populateZoomAdaptiveRings(currentRadius, activeRingsPool, poolSize);
    } else {
      currentRadius = radius;
      activeRingCount = staticRangeRings.length;
      for (let i = 0; i < activeRingCount; i++) {
        const src = staticRangeRings[i];
        const dst = activeRingsPool[i];
        dst.radius = src.radius;
        dst.isMajor = src.isMajor;
        dst.fade = src.fade;
      }
    }

    // Calculate quadrant weights for each plane using pre-allocated scratch arrays (zero allocations)
    const qwXY = scratchQwXY.current;
    const qwXZ = scratchQwXZ.current;
    const qwYZ = scratchQwYZ.current;
    for (let qIdx = 0; qIdx < 4; qIdx++) {
      const quad = QUADRANTS[qIdx];
      qwXY[qIdx] = calcQuadWeight(quad.qx, quad.qy, sx, sy, wTransX, wTransY, alphaZ);
      qwXZ[qIdx] = calcQuadWeight(quad.qx, quad.qy, sx, sz, wTransX, wTransZ, alphaY);
      qwYZ[qIdx] = calcQuadWeight(quad.qx, quad.qy, sy, sz, wTransY, wTransZ, alphaX);
    }

    // 5. Update Fin Perimeter Boundary Arcs with current aperture radius (Subtle perimeter boundary)
    if (showFins) {
      for (const plane of PLANES) {
        const pArcs = pArcData[plane];
        const fadePlane = plane === 'xy' ? fadeXY : plane === 'xz' ? fadeXZ : fadeYZ;
        const qwList = plane === 'xy' ? qwXY : plane === 'xz' ? qwXZ : qwYZ;

        for (let qIdx = 0; qIdx < pArcs.length; qIdx++) {
          const pItem = pArcs[qIdx];
          pItem.line.scale.set(currentRadius, currentRadius, currentRadius);
          pItem.mat.opacity = tokens.gridPrimaryAlpha * 0.7 * qwList[qIdx] * fadePlane;
          pItem.line.visible = pItem.mat.opacity > 0.001;
        }
      }

      // 6. Update Concentric Range Rings across all planes (Alternating Brighter vs Dimmer hierarchy)
      for (let ringIdx = 0; ringIdx < poolSize; ringIdx++) {
        const ringActive = ringIdx < activeRingCount;
        const ringInfo = ringActive ? activeRingsPool[ringIdx] : null;

        if (ringInfo) {
          const r = ringInfo.radius;
          const isMajor = ringInfo.isMajor;
          const baseAlpha = isMajor
            ? Math.max(tokens.gridPrimaryAlpha * 1.3, 0.38)
            : Math.max(tokens.gridSecondaryAlpha * 1.1, 0.18);
          const ringFade = ringInfo.fade;

          for (const plane of PLANES) {
            const quads = qData[plane][ringIdx];
            const fadePlane = plane === 'xy' ? fadeXY : plane === 'xz' ? fadeXZ : fadeYZ;
            const qwList = plane === 'xy' ? qwXY : plane === 'xz' ? qwXZ : qwYZ;

            for (let qIdx = 0; qIdx < quads.length; qIdx++) {
              const item = quads[qIdx];
              item.line.scale.set(r, r, r);
              item.mat.opacity = baseAlpha * ringFade * qwList[qIdx] * fadePlane;
              item.line.visible = item.mat.opacity > 0.001;
            }
          }
        } else {
          // Inactive ring in pool
          for (const plane of PLANES) {
            const quads = qData[plane][ringIdx];
            for (let qIdx = 0; qIdx < quads.length; qIdx++) {
              const item = quads[qIdx];
              item.mat.opacity = 0;
              item.line.visible = false;
            }
          }
        }
      }

      // 7. Update perimeter ticks with current aperture radius
      for (const plane of PLANES) {
        const ticks = tData[plane];
        const fadePlane = plane === 'xy' ? fadeXY : plane === 'xz' ? fadeXZ : fadeYZ;
        const qwList = plane === 'xy' ? qwXY : plane === 'xz' ? qwXZ : qwYZ;

        for (let qIdx = 0; qIdx < ticks.length; qIdx++) {
          const tickItem = ticks[qIdx];
          tickItem.line.scale.set(currentRadius, currentRadius, currentRadius);
          tickItem.mat.opacity = Math.max(tokens.rangeTickAlpha * 1.6, 0.35) * qwList[qIdx] * fadePlane;
          tickItem.line.visible = tickItem.mat.opacity > 0.001;
        }
      }
    }

    // 8. Structural Axis Spokes Rule:
    // Non-bearing axis lines are less luminous, matching the minor concentric lines
    if (showAxisLines) {
      const spokeBaseAlpha = tokens.axisLineAlpha;
      // -X spoke bordered by XY (-X) and XZ (-X)
      const presenceXY_negX = Math.max(qwXY[1], qwXY[2]) * fadeXY;
      const presenceXZ_negX = Math.max(qwXZ[1], qwXZ[2]) * fadeXZ;
      const alphaNegX = spokeBaseAlpha * Math.min(presenceXY_negX, presenceXZ_negX);
      aSpokes.negX.line.scale.set(currentRadius, currentRadius, currentRadius);
      aSpokes.negX.mat.opacity = alphaNegX;
      aSpokes.negX.line.visible = alphaNegX > 0.001;

      // -Y spoke bordered by XY (-Y) and YZ (-Y)
      const presenceXY_negY = Math.max(qwXY[2], qwXY[3]) * fadeXY;
      const presenceYZ_negY = Math.max(qwYZ[1], qwYZ[2]) * fadeYZ;
      const alphaNegY = spokeBaseAlpha * Math.min(presenceXY_negY, presenceYZ_negY);
      aSpokes.negY.line.scale.set(currentRadius, currentRadius, currentRadius);
      aSpokes.negY.mat.opacity = alphaNegY;
      aSpokes.negY.line.visible = alphaNegY > 0.001;

      // +Z spoke bordered by XZ (+Z) and YZ (+Z)
      const presenceXZ_posZ = Math.max(qwXZ[0], qwXZ[1]) * fadeXZ;
      const presenceYZ_posZ = Math.max(qwYZ[0], qwYZ[1]) * fadeYZ;
      const alphaPosZ = spokeBaseAlpha * Math.min(presenceXZ_posZ, presenceYZ_posZ);
      aSpokes.posZ.line.scale.set(currentRadius, currentRadius, currentRadius);
      aSpokes.posZ.mat.opacity = alphaPosZ;
      aSpokes.posZ.line.visible = alphaPosZ > 0.001;

      // -Z spoke bordered by XZ (-Z) and YZ (-Z)
      const presenceXZ_negZ = Math.max(qwXZ[2], qwXZ[3]) * fadeXZ;
      const presenceYZ_negZ = Math.max(qwYZ[2], qwYZ[3]) * fadeYZ;
      const alphaNegZ = spokeBaseAlpha * Math.min(presenceXZ_negZ, presenceYZ_negZ);
      aSpokes.negZ.line.scale.set(currentRadius, currentRadius, currentRadius);
      aSpokes.negZ.mat.opacity = alphaNegZ;
      aSpokes.negZ.line.visible = alphaNegZ > 0.001;

    }

    // 9. Datum Plane Update (Galactic Equator Z=0)
    if (datumGroupRef.current) {
      datumGroupRef.current.position.set(0, 0, -origin.z);
    }

    if (explicitFootprintsGroupRef.current) {
      explicitFootprintsGroupRef.current.position.set(-origin.x, -origin.y, 0.002);
    }

    if (isDatumPlaneVisible) {
      const dBoundary = datumBoundaryDataRef.current;
      dBoundary.line.scale.set(currentRadius, currentRadius, 1);
      dBoundary.mat.opacity = tokens.datumPlaneAlpha;
      dBoundary.line.visible = tokens.datumPlaneAlpha > 0.001;

      // Disk Cardinal Bearings (1 radius long on the datum plane, terminating at perimeter rim)
      if (dBearings) {
        dBearings.core.line.scale.set(currentRadius, currentRadius, 1);
        dBearings.core.mat.opacity = tokens.bearingCoreAlpha;
        dBearings.core.line.visible = true;

        dBearings.orbital.line.scale.set(currentRadius, currentRadius, 1);
        dBearings.orbital.mat.opacity = tokens.bearingOrbitalAlpha ?? tokens.bearingLineAlpha;
        dBearings.orbital.line.visible = true;

        dBearings.antiCore.line.scale.set(currentRadius, currentRadius, 1);
        dBearings.antiCore.mat.opacity = tokens.axisLineAlpha;
        dBearings.antiCore.line.visible = true;

        dBearings.antiOrbital.line.scale.set(currentRadius, currentRadius, 1);
        dBearings.antiOrbital.mat.opacity = tokens.axisLineAlpha;
        dBearings.antiOrbital.line.visible = true;
      }

      // Continuous concentric range rings on the datum plane
      for (let ringIdx = 0; ringIdx < poolSize; ringIdx++) {
        const ringActive = ringIdx < activeRingCount;
        const ringInfo = ringActive ? activeRingsPool[ringIdx] : null;
        const ringItem = datumRingDataRef.current[ringIdx];
        if (ringItem) {
          if (ringInfo) {
            const r = ringInfo.radius;
            const isMajor = ringInfo.isMajor;
            const baseAlpha = (isMajor ? tokens.gridPrimaryAlpha : tokens.gridSecondaryAlpha) * ringInfo.fade;

            ringItem.line.scale.set(r, r, 1);
            ringItem.mat.opacity = baseAlpha;
            ringItem.line.visible = baseAlpha > 0.001;
          } else {
            ringItem.mat.opacity = 0;
            ringItem.line.visible = false;
          }
        }
      }

      if (datumFillDataRef.current) {
        const { mesh } = datumFillDataRef.current;
        mesh.scale.set(currentRadius, currentRadius, 1);
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

      if (Math.abs(activeCamera.fov - targetFov) > 1e-4 || Math.abs(activeCamera.zoom - targetZoom) > 1e-4) {
        activeCamera.fov = targetFov;
        activeCamera.zoom = targetZoom;
        activeCamera.updateProjectionMatrix();
      }
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
        </group>
      )}

      {/* Galactic Equator (Z=0) Datum Plane */}
      {isDatumPlaneVisible && (
        <group ref={datumGroupRef} position={[0, 0, -initialPosition[2]]} name="datum-plane">
          {/* Ethereal Planar Fill Disc with Radial Rim Gradient */}
          <primitive object={datumFillData.mesh} name="datum-plane-fill" />

          {/* Outermost Projected Aperture Boundary */}
          <primitive object={datumBoundaryData.line} name="datum-plane-boundary" />

          {/* Planar Disk Cardinal Bearing Lines (1 radius long, solid, terminating at perimeter rim) */}
          {showAxisLines && (
            <group name="disk-bearings">
              <primitive object={diskBearings.core.line} name="bearing-core" />
              <primitive object={diskBearings.orbital.line} name="bearing-orbital" />
              <primitive object={diskBearings.antiCore.line} name="bearing-anti-core" />
              <primitive object={diskBearings.antiOrbital.line} name="bearing-anti-orbital" />
            </group>
          )}

          {/* Planar Ground Footprint stamped on Galactic Equator Z=0 beneath Focus Origin */}
          {showPlanarFootprint && primaryFootprintGeom && (
            <group position={[0, 0, 0.002]} name="planar-footprint">
              <lineSegments geometry={primaryFootprintGeom}>
                <lineBasicMaterial
                  color={tokens.datumFootprintColor}
                  opacity={tokens.datumFootprintAlpha}
                  transparent
                  depthWrite={false}
                />
              </lineSegments>
            </group>
          )}

          {/* Dynamic Stalked Footprints from active CelestialNodes */}
          <StalkedFootprintsLayer
            originRef={scratchOrigin}
            initialPosition={initialPosition}
            defaultColor={tokens.datumFootprintColor}
            defaultAlpha={tokens.datumFootprintAlpha}
            tokens={tokens}
          />

          {/* Explicit additional planar footprints stamped on Galactic Equator Z=0 */}
          {footprints && footprints.length > 0 && (
            <group
              ref={explicitFootprintsGroupRef}
              position={[-initialPosition[0], -initialPosition[1], 0.002]}
              name="explicit-planar-footprints"
            >
              {footprints.map((fp, idx) => {
                const fpX = Array.isArray(fp.position) ? fp.position[0] : fp.position.x;
                const fpY = Array.isArray(fp.position) ? fp.position[1] : fp.position.y;
                return (
                  <ReticleFootprintNode
                    key={fp.id ?? idx}
                    id={fp.id ?? idx}
                    position={[fpX, fpY, 0]}
                    classification={fp.classification ?? 'star'}
                    size={fp.size ?? footprintSize}
                    color={fp.color ?? tokens.datumFootprintColor}
                    opacity={fp.opacity ?? tokens.datumFootprintAlpha}
                    multiplicity={fp.multiplicity}
                    planets={fp.planets}
                  />
                );
              })}
            </group>
          )}

          {/* Hierarchical Concentric Range Rings driven by Main Grid Tokens */}
          {showDatumRings &&
            ringPoolIndices.map((ringIdx) => {
              const testId =
                ringIdx < rangeRings.length ? `full-ring-${rangeRings[ringIdx]}` : `full-ring-pool-${ringIdx}`;
              const ringItem = datumRingData[ringIdx];
              if (!ringItem) return null;
              return (
                <primitive
                  key={`datum-ring-${ringIdx}`}
                  object={ringItem.line}
                  name={testId}
                />
              );
            })}
        </group>
      )}
    </group>
  );
};
