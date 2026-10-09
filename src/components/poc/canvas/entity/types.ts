import type * as THREE from 'three';
import type {
  CelestialClassification,
  PlanetCensusEntry,
  ReticleAnnotationOptions,
} from '../../../canvas/cartography/reticleGeometry';

export type { CelestialClassification, PlanetCensusEntry, ReticleAnnotationOptions };

export type CelestialInteractionState = 'passive' | 'active' | 'selected' | 'focused';

/**
 * Read-only per-frame handle to the node-representation alpha (0..1) published by
 * CelestialEntity during the PlanetBody → node cross-fade. Consumers multiply it into
 * their own material opacity each frame.
 */
export interface NodeAlphaRef {
  readonly current: number;
}

export interface SpatialOrbitDefinition {
  /** Optional ID of the parent/primary entity this body revolves around (e.g. host star or primary planet). */
  primaryEntityId?: string;
  /** Explicit 3D focal coordinates of the primary body (defaults to [0, 0, 0]). */
  primaryPosition?: [number, number, number] | THREE.Vector3;
  /** Mean anomaly at epoch in degrees [0, 360). Used to calculate or verify orbital position. */
  meanAnomaly?: number;
  semiMajorAxis: number;
  eccentricity?: number;
  inclination?: number; // degrees
  ascendingNode?: number; // degrees
  argumentOfPeriapsis?: number; // degrees
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
  /** Radius of physical 3D sphere when rendered via PlanetBody (enables seamless node cross-fade) */
  bodyRadius?: number;
  bodyMinPixelSize?: number;
  bodyFadeRange?: number;
  data?: Record<string, unknown>;
}
