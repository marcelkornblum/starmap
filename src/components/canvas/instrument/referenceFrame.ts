import * as THREE from 'three';

export type SpatialUnit = 'pc' | 'AU' | 'km';

export interface BearingDefinition {
  id: string;
  name: string;
  /** Heading angle in degrees [0, 360) in the primary horizontal plane */
  angle: number;
  /** Vertical elevation in degrees [-90, +90] relative to datum */
  elevation?: number;
  color?: string | THREE.Color;
  alpha?: number;
  style?: 'solid' | 'dashed' | 'dotted';
  lineWidth?: number;
  /** Whether a screen-edge arrowhead cue pins to the screen boundary for this bearing */
  showEdgeCue?: boolean;
  /** Label stamped onto the screen-edge indicator (e.g. 'CORE 000°') */
  cueLabel?: string;
  /** Projection extent in scene units */
  extent?: number;
  /** Whether the bearing exhibits orbital curvature (like the Galactic Orbital vector) */
  curvedDash?: boolean;
}

export interface RangeRingConfig {
  /** Logarithmic decade progression (e.g. 1-2-5 pc) or linear metric steps */
  progression: '1-2-5' | 'linear';
  baseStep?: number;
  minDecade?: number;
  maxDecade?: number;
  fixedRings?: number[];
  majorRingIndex?: number;
}

export interface CameraRigConfig {
  /** Baseline field of view in degrees (25° - 45°) */
  baseFov: number;
  minDistance: number;
  maxDistance: number;
  defaultPosition: [number, number, number];
  defaultTarget: [number, number, number];
  /** Whether to smoothly blend into pure orthographic projection when approaching cardinal axes */
  adaptiveProjection?: boolean;
  thresholdStart?: number;
  thresholdEnd?: number;
}

export interface ReferenceFrame {
  id: string;
  name: string;
  unit: SpatialUnit;
  /** Invariant screen footprint radius in scene coordinate units at reference camera distance */
  radius: number;
  screenConstant: boolean;
  referenceDistanceMultiplier: number;
  camera: CameraRigConfig;
  datumPlane: {
    enabled: boolean;
    fill: boolean;
    rings: boolean;
    planarGrid: boolean;
    planarGridGap?: number;
    footprints: boolean;
  };
  coordinateFins: {
    enabled: boolean;
    planes: ('xy' | 'xz' | 'yz')[];
    ticks: boolean;
    rangeArcs: boolean;
    /** Expands face-on plane into 360° Polar Cartographic Dial on cardinal alignment */
    polarDialExpansion: boolean;
  };
  bearings: BearingDefinition[];
  rangeRings: RangeRingConfig;
  /** Distance to primary centre node for curved grid arcs and orbital vector curvature (default: 2000) */
  centerDistance?: number;
  /** Extent to which extended bearings and planar grid project into the scene (default: 1200) */
  extent?: number;
  /** Optional base orientation of the reference frame in world space (Euler, Quaternion, or [x, y, z] / [x, y, z, w]) */
  orientation?: THREE.Quaternion | [number, number, number, number] | THREE.Euler | [number, number, number];
}

/**
 * GALACTIC_FRAME: Galactic disk inspection frame ($XY = \text{Galactic Equator}$).
 * Primary datum is Galactic Equator ($Z=0$), with Core ($l=0^\circ$) and Orbital ($l=90^\circ$) bearings.
 */
export const GALACTIC_FRAME: ReferenceFrame = {
  id: 'galactic',
  name: 'Galactic Frame',
  unit: 'pc',
  radius: 10,
  screenConstant: true,
  referenceDistanceMultiplier: 3.49,
  camera: {
    baseFov: 45,
    minDistance: 5,
    maxDistance: 500,
    defaultPosition: [0, -35, 20],
    defaultTarget: [0, 0, 0],
    adaptiveProjection: true,
    thresholdStart: 0.94,
    thresholdEnd: 0.985,
  },
  datumPlane: {
    enabled: true,
    fill: true,
    rings: true,
    planarGrid: true,
    planarGridGap: 2.5,
    footprints: true,
  },
  coordinateFins: {
    enabled: true,
    planes: ['xy', 'xz', 'yz'],
    ticks: true,
    rangeArcs: true,
    polarDialExpansion: true,
  },
  bearings: [
    {
      id: 'core',
      name: 'CORE',
      angle: 0,
      showEdgeCue: true,
      cueLabel: 'CORE 000°',
      extent: 1200,
      style: 'solid',
    },
    {
      id: 'orbital',
      name: 'ORB',
      angle: 90,
      showEdgeCue: true,
      cueLabel: 'ORB 090°',
      extent: 1200,
      curvedDash: true,
      style: 'dashed',
    },
  ],
  rangeRings: {
    progression: '1-2-5',
    minDecade: 0.1,
    maxDecade: 1000,
  },
  centerDistance: 2000,
  extent: 1200,
};

/**
 * SYSTEM_FRAME: Stellar system orbital inspection frame ($XY = \text{Invariable Plane}$).
 * Shares planar grid, footprints, and bearings reoriented to the stellar system invariable plane.
 * Radius is 6 AU (smaller than Galactic 10 pc) with 1.5 AU circular planar grid spacing.
 */
export const SYSTEM_FRAME: ReferenceFrame = {
  id: 'system',
  name: 'System Frame',
  unit: 'AU',
  radius: 6,
  screenConstant: true,
  referenceDistanceMultiplier: 3.49,
  camera: {
    baseFov: 35,
    minDistance: 2,
    maxDistance: 150,
    defaultPosition: [0, -20, 12],
    defaultTarget: [0, 0, 0],
    adaptiveProjection: true,
    thresholdStart: 0.94,
    thresholdEnd: 0.985,
  },
  datumPlane: {
    enabled: true,
    fill: true,
    rings: true,
    planarGrid: true,
    planarGridGap: 1.5,
    footprints: true,
  },
  coordinateFins: {
    enabled: true,
    planes: ['xy', 'xz', 'yz'],
    ticks: true,
    rangeArcs: true,
    polarDialExpansion: true,
  },
  bearings: [
    {
      id: 'core',
      name: 'CORE',
      angle: 0,
      showEdgeCue: true,
      cueLabel: 'CORE 000°',
      extent: 1200,
      style: 'solid',
    },
    {
      id: 'orbital',
      name: 'ORB',
      angle: 90,
      showEdgeCue: true,
      cueLabel: 'ORB 090°',
      extent: 1200,
      curvedDash: true,
      style: 'dashed',
    },
  ],
  rangeRings: {
    progression: '1-2-5',
    minDecade: 0.01,
    maxDecade: 100,
  },
  centerDistance: 1200,
  extent: 1200,
  // Invariable plane datum aligned horizontally (Z=0)
  orientation: [0, 0, 0],
};

/**
 * PLANETARY_FRAME: Planetary close-inspection frame ($XY = \text{Equatorial Plane}$).
 * Shares planar grid, footprints, and bearings reoriented to the planetary rotational equator (23.44° axial tilt).
 * Radius is 3 km (smaller still than System 6 AU) with 0.75 km circular planar grid spacing.
 */
export const PLANETARY_FRAME: ReferenceFrame = {
  id: 'planetary',
  name: 'Planetary Frame',
  unit: 'km',
  radius: 3,
  screenConstant: true,
  referenceDistanceMultiplier: 3.49,
  camera: {
    baseFov: 30,
    minDistance: 1,
    maxDistance: 50,
    defaultPosition: [0, -10, 6],
    defaultTarget: [0, 0, 0],
    adaptiveProjection: true,
    thresholdStart: 0.94,
    thresholdEnd: 0.985,
  },
  datumPlane: {
    enabled: true,
    fill: true,
    rings: true,
    planarGrid: true,
    planarGridGap: 0.75,
    footprints: true,
  },
  coordinateFins: {
    enabled: true,
    planes: ['xy', 'xz', 'yz'],
    ticks: true,
    rangeArcs: true,
    polarDialExpansion: true,
  },
  bearings: [
    {
      id: 'core',
      name: 'CORE',
      angle: 0,
      showEdgeCue: true,
      cueLabel: 'CORE 000°',
      extent: 1200,
      style: 'solid',
    },
    {
      id: 'orbital',
      name: 'ORB',
      angle: 90,
      showEdgeCue: true,
      cueLabel: 'ORB 090°',
      extent: 1200,
      curvedDash: true,
      style: 'dashed',
    },
  ],
  rangeRings: {
    progression: '1-2-5',
    minDecade: 100,
    maxDecade: 1000000,
  },
  centerDistance: 600,
  extent: 1200,
  // Planetary equatorial datum aligned horizontally (Z=0)
  orientation: [0, 0, 0],
};

/**
 * Creates a custom reference frame by applying partial overrides to a base frame.
 */
export function createCustomReferenceFrame(
  base: ReferenceFrame,
  overrides: Partial<ReferenceFrame>,
): ReferenceFrame {
  return {
    ...base,
    ...overrides,
    camera: {
      ...base.camera,
      ...(overrides.camera ?? {}),
    },
    datumPlane: {
      ...base.datumPlane,
      ...(overrides.datumPlane ?? {}),
    },
    coordinateFins: {
      ...base.coordinateFins,
      ...(overrides.coordinateFins ?? {}),
    },
    rangeRings: {
      ...base.rangeRings,
      ...(overrides.rangeRings ?? {}),
    },
    bearings: overrides.bearings ?? [...base.bearings],
    centerDistance: overrides.centerDistance ?? base.centerDistance,
    extent: overrides.extent ?? base.extent,
    orientation: overrides.orientation ?? base.orientation,
  };
}
