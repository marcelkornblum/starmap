import type * as THREE from 'three';

export type CelestialClassification =
  | 'star' | 'stellar-system' | 'brown-dwarf' | 'white-dwarf' | 'neutron-star'
  | 'hazard' | 'black-hole' | 'barycentre' | 'stellar-cluster' | 'construct'
  | 'terrestrial' | 'super-earth' | 'gas-giant' | 'ice-giant';

export interface PlanetCensusEntry {
  id: string;
  name: string;
  classification: 'terrestrial' | 'super-earth' | 'gas-giant' | 'ice-giant';
}

export interface ReticleAnnotationOptions {
  multiplicity?: number;
  planets?: PlanetCensusEntry[];
  isAnnotated?: boolean;
}

export type CelestialInteractionState = 'passive' | 'active' | 'selected' | 'focused';

export interface NodeAlphaRef {
  readonly current: number;
}

export interface SpatialOrbitDefinition {
  primaryEntityId?: string;
  primaryPosition?: [number, number, number] | THREE.Vector3;
  meanAnomaly?: number;
  semiMajorAxis: number;
  eccentricity?: number;
  inclination?: number;
  ascendingNode?: number;
  argumentOfPeriapsis?: number;
  period?: number;
  color?: string | THREE.Color;
  lineStyle?: 'dashed' | 'solid' | 'dotted';
  showPeriapsisTick?: boolean;
  showDirectionArrow?: boolean;
}

export interface SpatialEntityDefinition {
  id: string;
  name: string;
  position: [number, number, number] | THREE.Vector3;
  classification?: CelestialClassification;
  spectralType?: string;
  multiplicity?: number;
  planets?: PlanetCensusEntry[];
  velocity?: [number, number, number] | THREE.Vector3;
  orbit?: SpatialOrbitDefinition;
  parentBodyId?: string;
  bodyRadius?: number;
  bodyMinPixelSize?: number;
  bodyFadeRange?: number;
  data?: Record<string, unknown>;
}

export interface JourneyChordLeg {
  readonly id: string;
  readonly stepIndex: number;
  readonly fromId: string;
  readonly fromName: string;
  readonly toId: string;
  readonly toName: string;
  readonly fromPosition: readonly [number, number, number];
  readonly toPosition: readonly [number, number, number];
  readonly distanceLabel: string;
  readonly secondaryLabel?: string;
  readonly methodId?: string;
  readonly lineStyle?: 'solid' | 'dashed' | 'dotted';
  readonly domain?: 'interstellar' | 'intra-system';
  readonly originId?: string;
  readonly originName?: string;
  readonly originPos?: readonly [number, number, number];
  readonly targetId?: string;
  readonly targetName?: string;
  readonly targetPos?: readonly [number, number, number];
  readonly distanceLy?: number;
  readonly distanceAu?: number;
  readonly methodBadge?: string;
}

export interface JourneyChordWaypoint {
  readonly id: string;
  readonly name: string;
  readonly position: readonly [number, number, number];
  readonly role: 'origin' | 'waypoint' | 'destination';
  readonly stepIndex: number;
}

export interface JourneyChordLegGeometryData {
  readonly id: string;
  readonly stepIndex: number;
  readonly fromId: string;
  readonly toId: string;
  readonly positions: readonly [number, number, number, number, number, number];
  readonly midpoint: readonly [number, number, number];
  readonly euclideanLength: number;
  readonly deltaZ: number;
  readonly elevationProjectionSegments?: readonly number[];
  readonly distanceLabel: string;
  readonly secondaryLabel?: string;
  readonly lineStyle: 'solid' | 'dashed' | 'dotted';
}

export interface JourneyChordRenderData {
  readonly legs: readonly JourneyChordLegGeometryData[];
  readonly waypoints: readonly JourneyChordWaypoint[];
  readonly totalEuclideanLength: number;
}

export type SpatialUnit = 'pc' | 'AU' | 'km';

export interface BearingDefinition {
  id: string;
  name: string;
  angle: number;
  elevation?: number;
  color?: string | THREE.Color;
  alpha?: number;
  style?: 'solid' | 'dashed' | 'dotted';
  lineWidth?: number;
  showEdgeCue?: boolean;
  cueLabel?: string;
  extent?: number;
  curvedDash?: boolean;
  target?: [number, number, number] | THREE.Vector3;
}

export interface RangeRingConfig {
  progression: '1-2-5' | 'linear';
  baseStep?: number;
  minDecade?: number;
  maxDecade?: number;
  fixedRings?: number[];
  majorRingIndex?: number;
}

export interface CameraRigConfig {
  baseFov: number;
  minDistance: number;
  maxDistance: number;
  defaultPosition: [number, number, number];
  defaultTarget: [number, number, number];
  adaptiveProjection?: boolean;
  thresholdStart?: number;
  thresholdEnd?: number;
}

export interface FrameLightingConfig {
  ambientIntensity: number;
  ambientColor?: string | THREE.Color;
  directionalIntensity?: number;
  directionalColor?: string | THREE.Color;
  directionalPosition?: [number, number, number];
}

export interface ReferenceFrame {
  id: string;
  name: string;
  unit: SpatialUnit;
  radius: number;
  screenConstant: boolean;
  referenceDistanceMultiplier: number;
  camera: CameraRigConfig;
  lighting?: FrameLightingConfig;
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
    polarDialExpansion: boolean;
  };
  bearings: BearingDefinition[];
  rangeRings: RangeRingConfig;
  centerDistance?: number;
  extent?: number;
  orientation?: THREE.Quaternion | [number, number, number, number] | THREE.Euler | [number, number, number];
}

export const GALACTIC_FRAME: ReferenceFrame = {
  id: 'galactic',
  name: 'Galactic Frame',
  unit: 'pc',
  radius: 10,
  screenConstant: true,
  referenceDistanceMultiplier: 3.49,
  camera: {
    baseFov: 45, minDistance: 5, maxDistance: 500,
    defaultPosition: [0, -35, 20], defaultTarget: [0, 0, 0],
    adaptiveProjection: true, thresholdStart: 0.94, thresholdEnd: 0.985,
  },
  lighting: { ambientIntensity: 0.4, directionalIntensity: 0.4, directionalPosition: [10, 20, 15] },
  datumPlane: { enabled: true, fill: true, rings: true, planarGrid: true, planarGridGap: 2.5, footprints: true },
  coordinateFins: { enabled: true, planes: ['xy', 'xz', 'yz'], ticks: true, rangeArcs: true, polarDialExpansion: true },
  bearings: [
    { id: 'core', name: 'CORE', angle: 0, showEdgeCue: true, cueLabel: 'CORE 000°', extent: 1200, target: [2000, 0, 0], style: 'solid' },
    { id: 'orbital', name: 'ORB', angle: 90, showEdgeCue: true, cueLabel: 'ORB 090°', extent: 1200, curvedDash: true, style: 'dashed' },
  ],
  rangeRings: { progression: '1-2-5', minDecade: 0.1, maxDecade: 1000 },
  centerDistance: 2000,
  extent: 1200,
};

export const SYSTEM_FRAME: ReferenceFrame = {
  id: 'system',
  name: 'System Frame',
  unit: 'AU',
  radius: 6,
  screenConstant: true,
  referenceDistanceMultiplier: 3.49,
  camera: {
    baseFov: 35, minDistance: 2, maxDistance: 150,
    defaultPosition: [0, -20, 12], defaultTarget: [0, 0, 0],
    adaptiveProjection: true, thresholdStart: 0.94, thresholdEnd: 0.985,
  },
  lighting: { ambientIntensity: 0.5, directionalIntensity: 0.5, directionalPosition: [10, 20, 15] },
  datumPlane: { enabled: true, fill: true, rings: true, planarGrid: true, planarGridGap: 1.5, footprints: true },
  coordinateFins: { enabled: true, planes: ['xy', 'xz', 'yz'], ticks: true, rangeArcs: true, polarDialExpansion: true },
  bearings: [
    { id: 'orbital', name: 'ORB', angle: 90, showEdgeCue: true, cueLabel: 'ORB 090°', extent: 1200, curvedDash: true, style: 'dashed' },
  ],
  rangeRings: { progression: '1-2-5', minDecade: 0.01, maxDecade: 100 },
  centerDistance: 1200,
  extent: 1200,
  orientation: [0, 0, 0],
};

export const PLANETARY_FRAME: ReferenceFrame = {
  id: 'planetary',
  name: 'Planetary Frame',
  unit: 'km',
  radius: 65,
  screenConstant: true,
  referenceDistanceMultiplier: 3.49,
  camera: {
    baseFov: 30, minDistance: 1.5, maxDistance: 350,
    defaultPosition: [0, -110, 65], defaultTarget: [0, 0, 0],
    adaptiveProjection: true, thresholdStart: 0.94, thresholdEnd: 0.985,
  },
  lighting: { ambientIntensity: 1.0, directionalIntensity: 0.0 },
  datumPlane: { enabled: true, fill: true, rings: true, planarGrid: true, planarGridGap: 10.0, footprints: true },
  coordinateFins: { enabled: true, planes: ['xy', 'xz', 'yz'], ticks: true, rangeArcs: true, polarDialExpansion: true },
  bearings: [],
  rangeRings: { progression: '1-2-5', minDecade: 100, maxDecade: 1000000 },
  centerDistance: 600,
  extent: 1200,
  orientation: [0, 0, 0],
};

export type Vec3Tuple = readonly [number, number, number] | [number, number, number];

export type InteractionTier = 'passive' | 'active' | 'selected' | 'focused';

export interface InteractionState {
  hoveredId?: string | null;
  selectedId?: string | null;
  selectedIds?: Set<string> | ReadonlyArray<string>;
  focusedId?: string | null;
  focusedIds?: Set<string> | ReadonlyArray<string>;
  apertureIds: Set<string> | ReadonlyArray<string>;
}

export type CardinalDirection = 'top' | 'bottom' | 'front' | 'back' | 'right' | 'left';
