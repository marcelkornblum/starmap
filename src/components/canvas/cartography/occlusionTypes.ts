import type { PlanetCensusEntry } from '../../../types/spatial';

export interface Box2D {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface LabelOcclusionResult {
  visible: boolean;
  behindCanvas: boolean;
  displacementX: number;
  displacementY: number;
  isDisplaced: boolean;
}

export interface CelestialFootprint {
  id: string;
  name?: string;
  state: 'passive' | 'active' | 'selected' | 'focused';
  worldPos?: [number, number, number];
  classification?: string;
  reticleSize?: number;
  hasStalk?: boolean;
  multiplicity?: number;
  planets?: PlanetCensusEntry[];
  screenX: number;
  screenY: number;
  camDist?: number;
  reticleRadius: number;
  starRadius: number;
  hasReticle: boolean;
  labelBox?: Box2D;
  visible: boolean;
  hitAreaOffsetX?: number;
  hitAreaOffsetY?: number;
  hitAreaEvaluatedAt?: number;
  updatedAt: number;
}

export const CANDIDATE_MULTIPLIERS = [
  { x: 0, y: 0 },
  { x: 0, y: 1.4 },               // Downward displacement
  { x: 1.25, y: 0 },              // Outward right displacement along leader stem
  { x: 0, y: -1.4 },              // Upward displacement
  { x: -1.25, y: 0 },             // Leftward displacement
  { x: 1.1 * 0.7071, y: 1.1 * 0.7071 },   // Down-right
  { x: -1.1 * 0.7071, y: 1.1 * 0.7071 },  // Down-left
  { x: 1.1 * 0.7071, y: -1.1 * 0.7071 },  // Up-right
  { x: -1.1 * 0.7071, y: -1.1 * 0.7071 }, // Up-left
] as const;
