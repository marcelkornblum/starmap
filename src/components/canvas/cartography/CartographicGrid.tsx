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
  populateDashedLineBuffer,
  createGalacticPlanarGridGeometry,
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
  const buffer = new Float32Array(steps * 3);
  for (let i = 0; i < steps; i++) {
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

const DATUM_FILL_VERTEX_SHADER = `
  varying vec2 vPosition;
  void main() {
    vPosition = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const DATUM_FILL_FRAGMENT_SHADER = `
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
`;


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
  /** Whether to render the nearly-squared off galactic planar grid on the datum plane. Default: true */
  showPlanarGrid?: boolean;
  /** Spacing between grid lines on the galactic planar grid (defaults to 2 radii of the footprint: radius * 2). */
  planarGridGap?: number;
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

  const groupRef = useRef<THREE.Group>(null);
  const scratchPosRef = useRef(new THREE.Vector3());
  const scratchDirRef = useRef(new THREE.Vector3());

  useFrame(({ camera }) => {
    if (!groupRef.current) return;
    const worldP = scratchPosRef.current.set(position[0], position[1], 0);
    const camDist = camera.position.distanceTo(worldP);
    const camDir = scratchDirRef.current.copy(camera.position).sub(worldP);
    if (camDist > 1e-4) camDir.divideScalar(camDist);
    const { alphaZ } = computeCardinalAlignment(camDir);
    const fovFactor = camera instanceof THREE.PerspectiveCamera
      ? Math.tan((camera.fov * Math.PI) / 360) / Math.tan((45 * Math.PI) / 360)
      : 1.0;
    const invScale = (camDist / 16.47) * fovFactor;
    const fpScale = THREE.MathUtils.lerp(invScale, 1.0, alphaZ);
    groupRef.current.scale.set(fpScale, fpScale, 1);
  });

  return (
    <group ref={groupRef} position={position} name={`planar-footprint-${id}`}>
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
  showPlanarGrid = true,
  planarGridGap,
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

  // Memoize unit quadrant arc geometries for each plane (shared across all rings and perimeter arcs)
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

  // Memoize unit axis spoke geometries
  const spokeGeoms = useMemo(() => {
    const makeSpokeGeom = (direction: [number, number, number]) => {
      const geom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(...direction),
      ]);
      geom.computeBoundingSphere();
      return geom;
    };
    return {
      negX: makeSpokeGeom([-1, 0, 0]),
      negY: makeSpokeGeom([0, -1, 0]),
      posZ: makeSpokeGeom([0, 0, 1]),
      negZ: makeSpokeGeom([0, 0, -1]),
    };
  }, []);

  // Memoize unit disk cardinal bearing geometries (1 radius long on the datum plane)
  const bearingGeoms = useMemo(() => {
    const makeBearingGeom = (direction: [number, number, number]) => {
      const geom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(...direction),
      ]);
      geom.computeBoundingSphere();
      return geom;
    };
    return {
      core: makeBearingGeom([1, 0, 0]),
      orbital: makeBearingGeom([0, 1, 0]),
      antiCore: makeBearingGeom([-1, 0, 0]),
      antiOrbital: makeBearingGeom([0, -1, 0]),
    };
  }, []);

  // Pre-allocated buffers and geometries for unstretched dashed orbital bearing lines
  const gridOrbitalGeom = useMemo(() => new THREE.BufferGeometry(), []);
  const gridOrbitalBuffer = useMemo(() => new Float32Array(6000), []);
  const diskOrbitalGeom = useMemo(() => new THREE.BufferGeometry(), []);
  const diskOrbitalBuffer = useMemo(() => new Float32Array(6000), []);

  // Memoize nearly-squared off galactic planar grid (arcs of concentric circles around distant Galactic Centre)
  const effectivePlanarGridGap = planarGridGap ?? radius * 2;
  const galacticGridGeom = useMemo(() => {
    return createGalacticPlanarGridGeometry(120, effectivePlanarGridGap, 500);
  }, [effectivePlanarGridGap]);

  // Memoize unit circle geometries for datum boundary & concentric rings
  const circleGeom = useMemo(() => {
    const geom = createCircleGeometry(1.0, 128);
    geom.computeBoundingSphere();
    return geom;
  }, []);

  const fillCircleGeom = useMemo(() => {
    const geom = new THREE.CircleGeometry(1.0, 128);
    geom.computeBoundingSphere();
    return geom;
  }, []);

  // Memoize datum plane gradient fill shader uniforms
  const datumFillUniforms = useMemo(() => ({
    uColor: { value: tokens.datumPlaneFillColor },
    uAlpha: { value: tokens.datumPlaneFillAlpha },
    uInnerRadius: { value: tokens.datumPlaneFillGradientInner },
    uExponent: { value: tokens.datumPlaneFillGradientExponent },
  }), [
    tokens.datumPlaneFillColor,
    tokens.datumPlaneFillAlpha,
    tokens.datumPlaneFillGradientInner,
    tokens.datumPlaneFillGradientExponent,
  ]);

  // Clean up geometries on unmount
  useEffect(() => {
    return () => {
      for (const plane of PLANES) {
        for (const g of quadrantGeoms[plane]) g.dispose();
        for (const g of tickGeoms[plane]) g.dispose();
      }
      spokeGeoms.negX.dispose();
      spokeGeoms.negY.dispose();
      spokeGeoms.posZ.dispose();
      spokeGeoms.negZ.dispose();
      bearingGeoms.core.dispose();
      bearingGeoms.orbital.dispose();
      bearingGeoms.antiCore.dispose();
      bearingGeoms.antiOrbital.dispose();
      gridOrbitalGeom.dispose();
      diskOrbitalGeom.dispose();
      galacticGridGeom.dispose();
      circleGeom.dispose();
      fillCircleGeom.dispose();
    };
  }, [quadrantGeoms, tickGeoms, spokeGeoms, bearingGeoms, gridOrbitalGeom, diskOrbitalGeom, galacticGridGeom, circleGeom, fillCircleGeom]);

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

  // Mutable Scene Graph References for useFrame
  const perimeterLinesRef = useRef<{
    xy: (THREE.LineSegments | null)[];
    xz: (THREE.LineSegments | null)[];
    yz: (THREE.LineSegments | null)[];
  }>({
    xy: [null, null, null, null],
    xz: [null, null, null, null],
    yz: [null, null, null, null],
  });

  const quadLinesRef = useRef<{
    xy: (THREE.LineSegments | null)[][];
    xz: (THREE.LineSegments | null)[][];
    yz: (THREE.LineSegments | null)[][];
  }>({
    xy: Array.from({ length: poolSize }, () => []),
    xz: Array.from({ length: poolSize }, () => []),
    yz: Array.from({ length: poolSize }, () => []),
  });

  const tickLinesRef = useRef<{
    xy: (THREE.LineSegments | null)[];
    xz: (THREE.LineSegments | null)[];
    yz: (THREE.LineSegments | null)[];
  }>({
    xy: [null, null, null, null],
    xz: [null, null, null, null],
    yz: [null, null, null, null],
  });

  const spokeLinesRef = useRef<{
    negX: THREE.LineSegments | null;
    negY: THREE.LineSegments | null;
    posZ: THREE.LineSegments | null;
    negZ: THREE.LineSegments | null;
  }>({
    negX: null,
    negY: null,
    posZ: null,
    negZ: null,
  });

  const gridBearingLinesRef = useRef<{
    core: THREE.LineSegments | null;
    orbital: THREE.LineSegments | null;
  }>({
    core: null,
    orbital: null,
  });

  const diskBearingLinesRef = useRef<{
    core: THREE.LineSegments | null;
    orbital: THREE.LineSegments | null;
    antiCore: THREE.LineSegments | null;
    antiOrbital: THREE.LineSegments | null;
  }>({
    core: null,
    orbital: null,
    antiCore: null,
    antiOrbital: null,
  });

  const primaryFootprintRef = useRef<THREE.Group>(null);

  const datumBoundaryLineRef = useRef<THREE.LineLoop | null>(null);
  const datumFillMeshRef = useRef<THREE.Mesh | null>(null);
  const datumRingLinesRef = useRef<(THREE.LineLoop | null)[]>(
    Array.from({ length: poolSize }, () => null)
  );

  // Sync ref pool array sizes if poolSize changes
  if (quadLinesRef.current.xy.length !== poolSize) {
    quadLinesRef.current = {
      xy: Array.from({ length: poolSize }, () => []),
      xz: Array.from({ length: poolSize }, () => []),
      yz: Array.from({ length: poolSize }, () => []),
    };
  }
  if (datumRingLinesRef.current.length !== poolSize) {
    datumRingLinesRef.current = Array.from({ length: poolSize }, () => null);
  }

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
        const pLines = perimeterLinesRef.current[plane];
        const fadePlane = plane === 'xy' ? fadeXY : plane === 'xz' ? fadeXZ : fadeYZ;
        const qwList = plane === 'xy' ? qwXY : plane === 'xz' ? qwXZ : qwYZ;

        for (let qIdx = 0; qIdx < 4; qIdx++) {
          const line = pLines[qIdx];
          if (!line) continue;
          line.scale.set(currentRadius, currentRadius, currentRadius);
          const mat = line.material as THREE.LineBasicMaterial;
          mat.opacity = tokens.gridPrimaryAlpha * 0.7 * qwList[qIdx] * fadePlane;
          line.visible = mat.opacity > 0.001;
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
            const quads = quadLinesRef.current[plane][ringIdx];
            if (!quads) continue;
            const fadePlane = plane === 'xy' ? fadeXY : plane === 'xz' ? fadeXZ : fadeYZ;
            const qwList = plane === 'xy' ? qwXY : plane === 'xz' ? qwXZ : qwYZ;

            for (let qIdx = 0; qIdx < 4; qIdx++) {
              const line = quads[qIdx];
              if (!line) continue;
              line.scale.set(r, r, r);
              const mat = line.material as THREE.LineBasicMaterial;
              mat.opacity = baseAlpha * ringFade * qwList[qIdx] * fadePlane;
              line.visible = mat.opacity > 0.001;
            }
          }
        } else {
          // Inactive ring in pool
          for (const plane of PLANES) {
            const quads = quadLinesRef.current[plane][ringIdx];
            if (!quads) continue;
            for (let qIdx = 0; qIdx < 4; qIdx++) {
              const line = quads[qIdx];
              if (!line) continue;
              (line.material as THREE.LineBasicMaterial).opacity = 0;
              line.visible = false;
            }
          }
        }
      }

      // 7. Update perimeter ticks with current aperture radius
      for (const plane of PLANES) {
        const ticks = tickLinesRef.current[plane];
        const fadePlane = plane === 'xy' ? fadeXY : plane === 'xz' ? fadeXZ : fadeYZ;
        const qwList = plane === 'xy' ? qwXY : plane === 'xz' ? qwXZ : qwYZ;

        for (let qIdx = 0; qIdx < 4; qIdx++) {
          const line = ticks[qIdx];
          if (!line) continue;
          line.scale.set(currentRadius, currentRadius, currentRadius);
          const mat = line.material as THREE.LineBasicMaterial;
          mat.opacity = Math.max(tokens.rangeTickAlpha * 1.6, 0.35) * qwList[qIdx] * fadePlane;
          line.visible = mat.opacity > 0.001;
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
      const sNegX = spokeLinesRef.current.negX;
      if (sNegX) {
        sNegX.scale.set(currentRadius, currentRadius, currentRadius);
        (sNegX.material as THREE.LineBasicMaterial).opacity = alphaNegX;
        sNegX.visible = alphaNegX > 0.001;
      }

      // -Y spoke bordered by XY (-Y) and YZ (-Y)
      const presenceXY_negY = Math.max(qwXY[2], qwXY[3]) * fadeXY;
      const presenceYZ_negY = Math.max(qwYZ[1], qwYZ[2]) * fadeYZ;
      const alphaNegY = spokeBaseAlpha * Math.min(presenceXY_negY, presenceYZ_negY);
      const sNegY = spokeLinesRef.current.negY;
      if (sNegY) {
        sNegY.scale.set(currentRadius, currentRadius, currentRadius);
        (sNegY.material as THREE.LineBasicMaterial).opacity = alphaNegY;
        sNegY.visible = alphaNegY > 0.001;
      }

      // +Z spoke bordered by XZ (+Z) and YZ (+Z)
      const presenceXZ_posZ = Math.max(qwXZ[0], qwXZ[1]) * fadeXZ;
      const presenceYZ_posZ = Math.max(qwYZ[0], qwYZ[1]) * fadeYZ;
      const alphaPosZ = spokeBaseAlpha * Math.min(presenceXZ_posZ, presenceYZ_posZ);
      const sPosZ = spokeLinesRef.current.posZ;
      if (sPosZ) {
        sPosZ.scale.set(currentRadius, currentRadius, currentRadius);
        (sPosZ.material as THREE.LineBasicMaterial).opacity = alphaPosZ;
        sPosZ.visible = alphaPosZ > 0.001;
      }

      // -Z spoke bordered by XZ (-Z) and YZ (-Z)
      const presenceXZ_negZ = Math.max(qwXZ[2], qwXZ[3]) * fadeXZ;
      const presenceYZ_negZ = Math.max(qwYZ[2], qwYZ[3]) * fadeYZ;
      const alphaNegZ = spokeBaseAlpha * Math.min(presenceXZ_negZ, presenceYZ_negZ);
      const sNegZ = spokeLinesRef.current.negZ;
      if (sNegZ) {
        sNegZ.scale.set(currentRadius, currentRadius, currentRadius);
        (sNegZ.material as THREE.LineBasicMaterial).opacity = alphaNegZ;
        sNegZ.visible = alphaNegZ > 0.001;
      }

      // Extended Bearings on Cartographic Grid Proper (+X Core, +Y Orbital Dashed)
      const extendedLen = currentRadius * 1.35;
      const gCore = gridBearingLinesRef.current.core;
      if (gCore) {
        gCore.scale.set(extendedLen, extendedLen, 1);
        (gCore.material as THREE.LineBasicMaterial).opacity = tokens.bearingCoreAlpha;
        gCore.visible = true;
      }

      const vCountGrid = populateDashedLineBuffer(
        gridOrbitalBuffer,
        extendedLen,
        [0, 1, 0],
      );
      let posAttrGrid = gridOrbitalGeom.getAttribute('position') as THREE.BufferAttribute | undefined;
      if (!posAttrGrid || posAttrGrid.array !== gridOrbitalBuffer) {
        posAttrGrid = new THREE.BufferAttribute(gridOrbitalBuffer, 3);
        gridOrbitalGeom.setAttribute('position', posAttrGrid);
      }
      posAttrGrid.needsUpdate = true;
      gridOrbitalGeom.setDrawRange(0, vCountGrid);
    }

    // 9. Datum Plane Update (Galactic Equator Z=0)
    if (datumGroupRef.current) {
      datumGroupRef.current.position.set(0, 0, -origin.z);
    }

    if (explicitFootprintsGroupRef.current) {
      explicitFootprintsGroupRef.current.position.set(-origin.x, -origin.y, 0.002);
    }

    if (isDatumPlaneVisible) {
      const dBoundary = datumBoundaryLineRef.current;
      if (dBoundary) {
        dBoundary.scale.set(currentRadius, currentRadius, 1);
        (dBoundary.material as THREE.LineBasicMaterial).opacity = tokens.datumPlaneAlpha;
        dBoundary.visible = tokens.datumPlaneAlpha > 0.001;
      }

      // Disk Cardinal Bearings: Extended offscreen across the planar grid (not truncated)
      const extendedPlanarLen = Math.max(120, currentRadius * 5);
      const dCore = diskBearingLinesRef.current.core;
      if (dCore) {
        dCore.scale.set(extendedPlanarLen, extendedPlanarLen, 1);
        (dCore.material as THREE.LineBasicMaterial).opacity = tokens.bearingCoreAlpha;
        dCore.visible = true;
      }

      // Orbital bearing on planar disk uses consistent unstretched dashed style extending offscreen
      const vCountDisk = populateDashedLineBuffer(
        diskOrbitalBuffer,
        extendedPlanarLen,
        [0, 1, 0],
      );
      let posAttrDisk = diskOrbitalGeom.getAttribute('position') as THREE.BufferAttribute | undefined;
      if (!posAttrDisk || posAttrDisk.array !== diskOrbitalBuffer) {
        posAttrDisk = new THREE.BufferAttribute(diskOrbitalBuffer, 3);
        diskOrbitalGeom.setAttribute('position', posAttrDisk);
      }
      posAttrDisk.needsUpdate = true;
      diskOrbitalGeom.setDrawRange(0, vCountDisk);

      const dAntiCore = diskBearingLinesRef.current.antiCore;
      if (dAntiCore) {
        dAntiCore.scale.set(extendedPlanarLen, extendedPlanarLen, 1);
        (dAntiCore.material as THREE.LineBasicMaterial).opacity = tokens.axisLineAlpha;
        dAntiCore.visible = true;
      }

      const dAntiOrbital = diskBearingLinesRef.current.antiOrbital;
      if (dAntiOrbital) {
        dAntiOrbital.scale.set(extendedPlanarLen, extendedPlanarLen, 1);
        (dAntiOrbital.material as THREE.LineBasicMaterial).opacity = tokens.axisLineAlpha;
        dAntiOrbital.visible = true;
      }

      // Continuous concentric range rings on the datum plane
      for (let ringIdx = 0; ringIdx < poolSize; ringIdx++) {
        const line = datumRingLinesRef.current[ringIdx];
        if (!line) continue;
        const ringActive = ringIdx < activeRingCount;
        const ringInfo = ringActive ? activeRingsPool[ringIdx] : null;
        if (ringInfo) {
          const r = ringInfo.radius;
          const isMajor = ringInfo.isMajor;
          const baseAlpha = (isMajor ? tokens.gridPrimaryAlpha : tokens.gridSecondaryAlpha) * ringInfo.fade;

          line.scale.set(r, r, 1);
          (line.material as THREE.LineBasicMaterial).opacity = baseAlpha;
          line.visible = baseAlpha > 0.001;
        } else {
          (line.material as THREE.LineBasicMaterial).opacity = 0;
          line.visible = false;
        }
      }

      if (datumFillMeshRef.current) {
        datumFillMeshRef.current.scale.set(currentRadius, currentRadius, 1);
      }
    }

    // 10. Dynamic Planar Footprint Scaling: matches star reticle screen size until orthographic mode
    const fovFactor = activeCamera instanceof THREE.PerspectiveCamera
      ? Math.tan((activeCamera.fov * Math.PI) / 360) / Math.tan((45 * Math.PI) / 360)
      : 1.0;
    const invScale = (camDist / 16.47) * fovFactor;
    const fpScale = THREE.MathUtils.lerp(invScale, 1.0, alphaZ);

    if (primaryFootprintRef.current) {
      primaryFootprintRef.current.scale.set(fpScale, fpScale, 1);
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
                    geometry={quadrantGeoms[plane][qIdx]}
                    scale={[radius, radius, radius]}
                    visible={isInitialVisible}
                    frustumCulled={false}
                  >
                    <lineBasicMaterial
                      color={tokens.gridPrimaryColor}
                      linewidth={tokens.gridSecondaryWidth}
                      transparent
                      depthWrite={false}
                      opacity={isInitialVisible ? tokens.gridPrimaryAlpha * 0.7 : 0}
                    />
                  </lineSegments>
                );
              })}

              {/* Concentric Tier Arcs */}
              {ringPoolIndices.map((ringIdx) => {
                const isExplicit = ringIdx < rangeRings.length;
                const initialR = isExplicit ? rangeRings[ringIdx] : radius * ((ringIdx + 1) / poolSize);
                const isMajor = majorRingIndex !== undefined ? ringIdx === majorRingIndex : ringIdx % 2 === 1;
                const color = isMajor ? tokens.gridPrimaryColor : tokens.gridSecondaryColor;
                const width = isMajor ? tokens.gridPrimaryWidth : tokens.gridSecondaryWidth;
                const baseAlpha = isMajor ? tokens.gridPrimaryAlpha * 1.3 : tokens.gridSecondaryAlpha * 1.1;
                const testId =
                  ringIdx < rangeRings.length ? `arc-tier-${rangeRings[ringIdx]}` : `arc-tier-pool-${ringIdx}`;

                return (
                  <group key={`${plane}-tier-${ringIdx}`} name={testId}>
                    {QUADRANTS.map((quad, qIdx) => {
                      const isInitialVisible = isExplicit && quad.qx === 1 && quad.qy === 1;
                      return (
                        <lineSegments
                          key={`${plane}-${ringIdx}-q${qIdx}`}
                          ref={(el) => {
                            if (!quadLinesRef.current[plane][ringIdx]) {
                              quadLinesRef.current[plane][ringIdx] = [];
                            }
                            quadLinesRef.current[plane][ringIdx][qIdx] = el;
                          }}
                          geometry={quadrantGeoms[plane][qIdx]}
                          scale={[initialR, initialR, initialR]}
                          visible={isInitialVisible}
                          frustumCulled={false}
                        >
                          <lineBasicMaterial
                            color={color}
                            linewidth={width}
                            transparent
                            depthWrite={false}
                            opacity={isInitialVisible ? baseAlpha : 0}
                          />
                        </lineSegments>
                      );
                    })}
                  </group>
                );
              })}

              {/* Quadrant Ticks */}
              {QUADRANTS.map((quad, qIdx) => {
                const isInitialVisible = quad.qx === 1 && quad.qy === 1;
                return (
                  <lineSegments
                    key={`${plane}-ticks-q${qIdx}`}
                    ref={(el) => {
                      tickLinesRef.current[plane][qIdx] = el;
                    }}
                    name={`${plane}-ticks-q${qIdx}`}
                    geometry={tickGeoms[plane][qIdx]}
                    scale={[radius, radius, radius]}
                    visible={isInitialVisible}
                    frustumCulled={false}
                  >
                    <lineBasicMaterial
                      color={tokens.rangeTickColor}
                      linewidth={tokens.rangeTickWidth}
                      transparent
                      depthWrite={false}
                      opacity={isInitialVisible ? Math.max(tokens.rangeTickAlpha * 1.6, 0.35) : 0}
                    />
                  </lineSegments>
                );
              })}
            </group>
          ))}
        </group>
      )}

      {/* Axis Lines */}
      {showAxisLines && (
        <group name="cardinal-bearings">
          {/* Structural Fin Axis Spokes: Rendered only when both bordering fins rendered */}
          <lineSegments
            ref={(el) => { spokeLinesRef.current.negX = el; }}
            name="axis-spoke-neg-x"
            geometry={spokeGeoms.negX}
            scale={[radius, radius, radius]}
            frustumCulled={false}
          >
            <lineBasicMaterial
              color={tokens.axisLineColor}
              linewidth={tokens.axisLineWidth}
              transparent
              depthWrite={false}
              opacity={tokens.axisLineAlpha}
            />
          </lineSegments>
          <lineSegments
            ref={(el) => { spokeLinesRef.current.negY = el; }}
            name="axis-spoke-neg-y"
            geometry={spokeGeoms.negY}
            scale={[radius, radius, radius]}
            frustumCulled={false}
          >
            <lineBasicMaterial
              color={tokens.axisLineColor}
              linewidth={tokens.axisLineWidth}
              transparent
              depthWrite={false}
              opacity={tokens.axisLineAlpha}
            />
          </lineSegments>
          <lineSegments
            ref={(el) => { spokeLinesRef.current.posZ = el; }}
            name="axis-spoke-pos-z"
            geometry={spokeGeoms.posZ}
            scale={[radius, radius, radius]}
            frustumCulled={false}
          >
            <lineBasicMaterial
              color={tokens.axisLineColor}
              linewidth={tokens.axisLineWidth}
              transparent
              depthWrite={false}
              opacity={tokens.axisLineAlpha}
            />
          </lineSegments>
          <lineSegments
            ref={(el) => { spokeLinesRef.current.negZ = el; }}
            name="axis-spoke-neg-z"
            geometry={spokeGeoms.negZ}
            scale={[radius, radius, radius]}
            frustumCulled={false}
          >
            <lineBasicMaterial
              color={tokens.axisLineColor}
              linewidth={tokens.axisLineWidth}
              transparent
              depthWrite={false}
              opacity={tokens.axisLineAlpha}
            />
          </lineSegments>

          {/* Prominent Extended Cardinal Bearing Lines: +X (Galactic Core Accent), +Y (Galactic Orbit Dashed) */}
          <lineSegments
            ref={(el) => { gridBearingLinesRef.current.core = el; }}
            name="bearing-core"
            geometry={bearingGeoms.core}
            scale={[radius * 1.35, radius * 1.35, 1]}
            frustumCulled={false}
          >
            <lineBasicMaterial
              color={tokens.bearingCoreColor}
              linewidth={tokens.bearingCoreWidth}
              transparent
              depthWrite={false}
              opacity={tokens.bearingCoreAlpha}
            />
          </lineSegments>
          <lineSegments
            ref={(el) => { gridBearingLinesRef.current.orbital = el; }}
            name="bearing-orbital"
            geometry={gridOrbitalGeom}
            scale={[1, 1, 1]}
            frustumCulled={false}
          >
            <lineBasicMaterial
              color={tokens.bearingOrbitalColor ?? tokens.bearingLineColor}
              linewidth={tokens.bearingOrbitalWidth ?? tokens.bearingLineWidth}
              transparent
              depthWrite={false}
              opacity={tokens.bearingOrbitalAlpha ?? tokens.bearingLineAlpha}
            />
          </lineSegments>
        </group>
      )}

      {/* Galactic Equator (Z=0) Datum Plane */}
      {isDatumPlaneVisible && (
        <group ref={datumGroupRef} position={[0, 0, -initialPosition[2]]} name="datum-plane">
          {/* Ethereal Planar Fill Disc with Radial Rim Gradient */}
          <mesh
            ref={datumFillMeshRef}
            name="datum-plane-fill"
            geometry={fillCircleGeom}
            frustumCulled={false}
          >
            <shaderMaterial
              uniforms={datumFillUniforms}
              vertexShader={DATUM_FILL_VERTEX_SHADER}
              fragmentShader={DATUM_FILL_FRAGMENT_SHADER}
              transparent
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Nearly-squared off Galactic Planar Grid (concentric arcs about distant GC + radial rays) */}
          {showPlanarGrid && (
            <lineSegments
              name="planar-galactic-grid"
              geometry={galacticGridGeom}
              frustumCulled={false}
            >
              <lineBasicMaterial
                color={tokens.datumPlaneMinorColor}
                linewidth={tokens.datumPlaneWidth}
                transparent
                depthWrite={false}
                opacity={tokens.datumPlaneMinorAlpha}
              />
            </lineSegments>
          )}

          {/* Outermost Projected Aperture Boundary */}
          <lineLoop
            ref={datumBoundaryLineRef}
            name="datum-plane-boundary"
            geometry={circleGeom}
            scale={[radius, radius, 1]}
            frustumCulled={false}
          >
            <lineBasicMaterial
              color={tokens.datumPlaneColor}
              linewidth={tokens.datumPlaneWidth}
              transparent
              depthWrite={false}
              opacity={tokens.datumPlaneAlpha}
            />
          </lineLoop>

          {/* Planar Disk Cardinal Bearing Lines (1 radius long, terminating at perimeter rim) */}
          {showAxisLines && (
            <group name="disk-bearings">
              <lineSegments
                ref={(el) => { diskBearingLinesRef.current.core = el; }}
                name="bearing-core"
                geometry={bearingGeoms.core}
                scale={[radius, radius, 1]}
                frustumCulled={false}
              >
                <lineBasicMaterial
                  color={tokens.bearingCoreColor}
                  linewidth={tokens.bearingCoreWidth}
                  transparent
                  depthWrite={false}
                  opacity={tokens.bearingCoreAlpha}
                />
              </lineSegments>
              <lineSegments
                ref={(el) => { diskBearingLinesRef.current.orbital = el; }}
                name="bearing-orbital"
                geometry={diskOrbitalGeom}
                scale={[1, 1, 1]}
                frustumCulled={false}
              >
                <lineBasicMaterial
                  color={tokens.bearingOrbitalColor ?? tokens.bearingLineColor}
                  linewidth={tokens.bearingOrbitalWidth ?? tokens.bearingLineWidth}
                  transparent
                  depthWrite={false}
                  opacity={tokens.bearingOrbitalAlpha ?? tokens.bearingLineAlpha}
                />
              </lineSegments>
              <lineSegments
                ref={(el) => { diskBearingLinesRef.current.antiCore = el; }}
                name="bearing-anti-core"
                geometry={bearingGeoms.antiCore}
                scale={[radius, radius, 1]}
                frustumCulled={false}
              >
                <lineBasicMaterial
                  color={tokens.axisLineColor}
                  linewidth={tokens.axisLineWidth}
                  transparent
                  depthWrite={false}
                  opacity={tokens.axisLineAlpha}
                />
              </lineSegments>
              <lineSegments
                ref={(el) => { diskBearingLinesRef.current.antiOrbital = el; }}
                name="bearing-anti-orbital"
                geometry={bearingGeoms.antiOrbital}
                scale={[radius, radius, 1]}
                frustumCulled={false}
              >
                <lineBasicMaterial
                  color={tokens.axisLineColor}
                  linewidth={tokens.axisLineWidth}
                  transparent
                  depthWrite={false}
                  opacity={tokens.axisLineAlpha}
                />
              </lineSegments>
            </group>
          )}

          {/* Planar Ground Footprint stamped on Galactic Equator Z=0 beneath Focus Origin */}
          {showPlanarFootprint && primaryFootprintGeom && (
            <group ref={primaryFootprintRef} position={[0, 0, 0.002]} name="planar-footprint">
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
              const isExplicit = ringIdx < rangeRings.length;
              const initialR = isExplicit ? rangeRings[ringIdx] : radius * ((ringIdx + 1) / poolSize);
              const isMajor = majorRingIndex !== undefined ? ringIdx === majorRingIndex : ringIdx % 2 === 1;
              const color = isMajor ? tokens.gridPrimaryColor : tokens.gridSecondaryColor;
              const width = isMajor ? tokens.gridPrimaryWidth : tokens.gridSecondaryWidth;
              const alpha = isMajor ? tokens.gridPrimaryAlpha : tokens.gridSecondaryAlpha;
              const testId =
                ringIdx < rangeRings.length ? `full-ring-${rangeRings[ringIdx]}` : `full-ring-pool-${ringIdx}`;

              return (
                <lineLoop
                  key={`datum-ring-${ringIdx}`}
                  ref={(el) => {
                    datumRingLinesRef.current[ringIdx] = el;
                  }}
                  name={testId}
                  geometry={circleGeom}
                  scale={[initialR, initialR, 1]}
                  visible={isExplicit}
                  frustumCulled={false}
                >
                  <lineBasicMaterial
                    color={color}
                    linewidth={width}
                    transparent
                    depthWrite={false}
                    opacity={isExplicit ? alpha : 0}
                  />
                </lineLoop>
              );
            })}
        </group>
      )}
    </group>
  );
};

