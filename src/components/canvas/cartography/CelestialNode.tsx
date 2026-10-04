import type React from 'react';
import { useMemo, useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useThreeTokenStore } from '../../../stores/useThreeTokenStore';
import { celestialOcclusionManager, type Box2D } from './celestialOcclusionRegistry';
import styles from './CelestialNode.module.css';

/**
 * Maps spectral classification class to intrinsic stellar hue.
 * Spectral colors never change with interaction state.
 */
function getSpectralColor(spectralType?: string): string {
  if (!spectralType) return '#ffffff';
  const s = spectralType.charAt(0).toUpperCase();
  switch (s) {
    case 'O': return '#9db4ff';
    case 'B': return '#bbccff';
    case 'A': return '#f8f9ff';
    case 'F': return '#ffffed';
    case 'G': return '#fff4e8';
    case 'K': return '#ffd2a1';
    case 'M': return '#ffaa80';
    default: return '#ffffff';
  }
}

export type CelestialClassification =
  | 'star'
  | 'stellar-system'
  | 'brown-dwarf'
  | 'white-dwarf'
  | 'degenerate-remnant'
  | 'neutron-star'
  | 'hazard'
  | 'black-hole'
  | 'singularity'
  | 'barycentre'
  | 'stellar-cluster'
  | 'cluster'
  | 'construct'
  | 'artificial'
  | 'terrestrial'
  | 'gas-giant'
  | 'ice-giant';

export type CelestialInteractionState = 'passive' | 'active' | 'selected' | 'focused';

export interface PlanetCensusEntry {
  id: string;
  name: string;
  classification: 'terrestrial' | 'gas-giant' | 'ice-giant';
}

export interface CelestialNodeProps {
  id: string;
  name: string;
  position: [number, number, number];
  classification?: CelestialClassification;
  state?: CelestialInteractionState;
  spectralType?: string;
  reticleSize?: number;
  showStalk?: boolean;
  showLabel?: boolean;
  multiplicity?: number;
  planets?: PlanetCensusEntry[];
  onClick?: (id: string) => void;
  onPointerOver?: (id: string) => void;
  onPointerOut?: (id: string) => void;
}

export interface ReticleAnnotationOptions {
  multiplicity?: number;
  planets?: PlanetCensusEntry[];
  isAnnotated?: boolean;
}

/**
 * Appends stellar multiplicity pips along the outer edge of the Top-Left diamond facet.
 * (Approach B: 0 pips for single star; 2 pips for binary/twin stars; 3 pips for trinary).
 */
function appendMultiplicityPips(
  points: THREE.Vector3[],
  s: number,
  multiplicity: number,
): void {
  const count = Math.min(multiplicity, 4);
  const dOut = 0.14 * s;
  const nX = -Math.SQRT1_2;
  const nY = Math.SQRT1_2;
  const pipR = 0.045 * s;
  const pipSegs = 8;

  for (let i = 1; i <= count; i++) {
    const t = i / (count + 1);
    // Point on top-left edge: from (-s, 0) to (0, s)
    const edgeX = (t - 1) * s;
    const edgeY = t * s;
    const cX = edgeX + dOut * nX;
    const cY = edgeY + dOut * nY;

    for (let p = 0; p < pipSegs; p++) {
      const a1 = (p / pipSegs) * Math.PI * 2;
      const a2 = ((p + 1) / pipSegs) * Math.PI * 2;
      points.push(
        new THREE.Vector3(cX + Math.cos(a1) * pipR, cY + Math.sin(a1) * pipR, 0),
        new THREE.Vector3(cX + Math.cos(a2) * pipR, cY + Math.sin(a2) * pipR, 0),
      );
    }
  }
}

/**
 * Appends planetary system census pips along the outer edge of the Bottom-Left diamond facet.
 * Renders miniature open circles for terrestrial planets, ringed circles for ice giants,
 * and slashed circles for gas giants.
 */
function appendPlanetaryPips(
  points: THREE.Vector3[],
  s: number,
  planets: PlanetCensusEntry[],
): void {
  const count = planets.length;
  const dOut = 0.18 * s;
  const nX = -Math.SQRT1_2;
  const nY = -Math.SQRT1_2;

  for (let i = 0; i < count; i++) {
    const planet = planets[i];
    const t = (i + 1) / (count + 1);
    // Point on bottom-left edge: from (-s, 0) to (0, -s)
    const edgeX = (t - 1) * s;
    const edgeY = -t * s;
    const cX = edgeX + dOut * nX;
    const cY = edgeY + dOut * nY;

    if (planet.classification === 'terrestrial') {
      const pR = 0.04 * s;
      const segs = 12;
      for (let j = 0; j < segs; j++) {
        const a1 = (j / segs) * Math.PI * 2;
        const a2 = ((j + 1) / segs) * Math.PI * 2;
        points.push(
          new THREE.Vector3(cX + Math.cos(a1) * pR, cY + Math.sin(a1) * pR, 0),
          new THREE.Vector3(cX + Math.cos(a2) * pR, cY + Math.sin(a2) * pR, 0),
        );
      }
    } else if (planet.classification === 'gas-giant') {
      const pR = 0.07 * s;
      const segs = 16;
      for (let j = 0; j < segs; j++) {
        const a1 = (j / segs) * Math.PI * 2;
        const a2 = ((j + 1) / segs) * Math.PI * 2;
        points.push(
          new THREE.Vector3(cX + Math.cos(a1) * pR, cY + Math.sin(a1) * pR, 0),
          new THREE.Vector3(cX + Math.cos(a2) * pR, cY + Math.sin(a2) * pR, 0),
        );
      }
      const gap = 0.02 * s;
      const cos45 = Math.SQRT1_2;
      const sin45 = Math.SQRT1_2;
      points.push(
        new THREE.Vector3(cX - pR * cos45, cY - pR * sin45, 0),
        new THREE.Vector3(cX - gap * cos45, cY - gap * sin45, 0),
        new THREE.Vector3(cX + gap * cos45, cY + gap * sin45, 0),
        new THREE.Vector3(cX + pR * cos45, cY + pR * sin45, 0),
      );
    } else if (planet.classification === 'ice-giant') {
      const pR = 0.05 * s;
      const segs = 14;
      for (let j = 0; j < segs; j++) {
        const a1 = (j / segs) * Math.PI * 2;
        const a2 = ((j + 1) / segs) * Math.PI * 2;
        points.push(
          new THREE.Vector3(cX + Math.cos(a1) * pR, cY + Math.sin(a1) * pR, 0),
          new THREE.Vector3(cX + Math.cos(a2) * pR, cY + Math.sin(a2) * pR, 0),
        );
      }
      const rInner = 0.055 * s;
      const rOuter = 0.085 * s;
      const cos45 = Math.SQRT1_2;
      const sin45 = Math.SQRT1_2;
      points.push(
        new THREE.Vector3(cX - rOuter * cos45, cY - rOuter * sin45, 0),
        new THREE.Vector3(cX - rInner * cos45, cY - rInner * sin45, 0),
        new THREE.Vector3(cX + rInner * cos45, cY + rInner * sin45, 0),
        new THREE.Vector3(cX + rOuter * cos45, cY + rOuter * sin45, 0),
      );
    }
  }
}

/**
 * Builds 2D line geometry in the local XY plane for each reticle taxonomy type.
 * All reticle and footprint shapes are constructed as pairs of line segments for LineSegments.
 */
function createReticleGeometry(
  classification: CelestialClassification,
  s: number,
  annotations?: ReticleAnnotationOptions,
): THREE.BufferGeometry {
  const points: THREE.Vector3[] = [];

  switch (classification) {
    case 'star':
    case 'stellar-system': {
      // Closed 45-degree diamond: 4 connected edge segments
      points.push(
        new THREE.Vector3(0, s, 0), new THREE.Vector3(s, 0, 0),
        new THREE.Vector3(s, 0, 0), new THREE.Vector3(0, -s, 0),
        new THREE.Vector3(0, -s, 0), new THREE.Vector3(-s, 0, 0),
        new THREE.Vector3(-s, 0, 0), new THREE.Vector3(0, s, 0),
      );

      // The Four-Facet Diamond Architecture: Annotations in Selected or Focused State
      if (annotations?.isAnnotated) {
        // Top-Left Facet: Multiplicity census (Approach B: 2 pips for binary/twin stars, 3 pips for trinary)
        if (annotations.multiplicity && annotations.multiplicity >= 2) {
          appendMultiplicityPips(points, s, annotations.multiplicity);
        }

        // Bottom-Left Facet: Planetary system census (planetary symbology)
        if (annotations.planets && annotations.planets.length > 0) {
          appendPlanetaryPips(points, s, annotations.planets);
        }
      }
      break;
    }
    case 'brown-dwarf': {
      // Broken Diamond: Top and bottom vertical chevrons (waist open)
      points.push(
        // Top chevron ︿
        new THREE.Vector3(-0.6 * s, 0.4 * s, 0), new THREE.Vector3(0, s, 0),
        new THREE.Vector3(0, s, 0), new THREE.Vector3(0.6 * s, 0.4 * s, 0),
        // Bottom chevron ﹀
        new THREE.Vector3(-0.6 * s, -0.4 * s, 0), new THREE.Vector3(0, -s, 0),
        new THREE.Vector3(0, -s, 0), new THREE.Vector3(0.6 * s, -0.4 * s, 0),
      );
      break;
    }
    case 'white-dwarf':
    case 'degenerate-remnant': {
      // Fractured Diamond: 4 disjoint diagonal corner brackets (mid-facets open)
      const leg = 0.35 * s;
      points.push(
        // Top corner ◥◤
        new THREE.Vector3(-leg, s - leg, 0), new THREE.Vector3(0, s, 0),
        new THREE.Vector3(0, s, 0), new THREE.Vector3(leg, s - leg, 0),
        // Right corner
        new THREE.Vector3(s - leg, leg, 0), new THREE.Vector3(s, 0, 0),
        new THREE.Vector3(s, 0, 0), new THREE.Vector3(s - leg, -leg, 0),
        // Bottom corner ◢◣
        new THREE.Vector3(leg, -s + leg, 0), new THREE.Vector3(0, -s, 0),
        new THREE.Vector3(0, -s, 0), new THREE.Vector3(-leg, -s + leg, 0),
        // Left corner
        new THREE.Vector3(-s + leg, -leg, 0), new THREE.Vector3(-s, 0, 0),
        new THREE.Vector3(-s, 0, 0), new THREE.Vector3(-s + leg, leg, 0),
      );
      break;
    }
    case 'neutron-star':
    case 'hazard': {
      // Relativistic Hazards: Fractured diamond with outward radiating beam spines (divergent beam geometry)
      const leg = 0.35 * s;
      points.push(
        // Fractured diamond corner brackets
        new THREE.Vector3(-leg, s - leg, 0), new THREE.Vector3(0, s, 0),
        new THREE.Vector3(0, s, 0), new THREE.Vector3(leg, s - leg, 0),
        new THREE.Vector3(s - leg, leg, 0), new THREE.Vector3(s, 0, 0),
        new THREE.Vector3(s, 0, 0), new THREE.Vector3(s - leg, -leg, 0),
        new THREE.Vector3(leg, -s + leg, 0), new THREE.Vector3(0, -s, 0),
        new THREE.Vector3(0, -s, 0), new THREE.Vector3(-leg, -s + leg, 0),
        new THREE.Vector3(-s + leg, -leg, 0), new THREE.Vector3(-s, 0, 0),
        new THREE.Vector3(-s, 0, 0), new THREE.Vector3(-s + leg, leg, 0),
        // Outward radiating beam spines (divergent beam geometry)
        new THREE.Vector3(0, s, 0), new THREE.Vector3(0, 1.6 * s, 0),
        new THREE.Vector3(0, -s, 0), new THREE.Vector3(0, -1.6 * s, 0),
        new THREE.Vector3(-s, 0, 0), new THREE.Vector3(-1.4 * s, 0, 0),
        new THREE.Vector3(s, 0, 0), new THREE.Vector3(1.4 * s, 0, 0),
      );
      break;
    }
    case 'black-hole':
    case 'singularity': {
      // Four sharp 1px inward-pointing convergent spines (► ◄ / ▼ ▲) targeting empty central coordinate
      const inner = 0.25 * s;
      const outer = 1.0 * s;
      const barbL = 0.18 * s;
      const barbW = 0.12 * s;
      points.push(
        // Left spine (pointing inward to right ►)
        new THREE.Vector3(-outer, 0, 0), new THREE.Vector3(-inner, 0, 0),
        new THREE.Vector3(-inner - barbL, barbW, 0), new THREE.Vector3(-inner, 0, 0),
        new THREE.Vector3(-inner - barbL, -barbW, 0), new THREE.Vector3(-inner, 0, 0),

        // Right spine (pointing inward to left ◄)
        new THREE.Vector3(outer, 0, 0), new THREE.Vector3(inner, 0, 0),
        new THREE.Vector3(inner + barbL, barbW, 0), new THREE.Vector3(inner, 0, 0),
        new THREE.Vector3(inner + barbL, -barbW, 0), new THREE.Vector3(inner, 0, 0),

        // Top spine (pointing inward down ▼)
        new THREE.Vector3(0, outer, 0), new THREE.Vector3(0, inner, 0),
        new THREE.Vector3(barbW, inner + barbL, 0), new THREE.Vector3(0, inner, 0),
        new THREE.Vector3(-barbW, inner + barbL, 0), new THREE.Vector3(0, inner, 0),

        // Bottom spine (pointing inward up ▲)
        new THREE.Vector3(0, -outer, 0), new THREE.Vector3(0, -inner, 0),
        new THREE.Vector3(barbW, -inner - barbL, 0), new THREE.Vector3(0, -inner, 0),
        new THREE.Vector3(-barbW, -inner - barbL, 0), new THREE.Vector3(0, -inner, 0),
      );
      break;
    }
    case 'barycentre': {
      // Gravitational Barycentres: 1px Plus (+) with open centre
      const arm = 0.6 * s;
      const gap = 0.15 * s;
      points.push(
        new THREE.Vector3(-arm, 0, 0), new THREE.Vector3(-gap, 0, 0),
        new THREE.Vector3(gap, 0, 0), new THREE.Vector3(arm, 0, 0),
        new THREE.Vector3(0, -arm, 0), new THREE.Vector3(0, -gap, 0),
        new THREE.Vector3(0, gap, 0), new THREE.Vector3(0, arm, 0),
      );
      break;
    }
    case 'stellar-cluster':
    case 'cluster': {
      // Stellar Clusters / Echelons: Floating Double Top Chevron (︽) with no bottom chevron
      points.push(
        // Lower top chevron
        new THREE.Vector3(-0.6 * s, 0.25 * s, 0), new THREE.Vector3(0, 0.65 * s, 0),
        new THREE.Vector3(0, 0.65 * s, 0), new THREE.Vector3(0.6 * s, 0.25 * s, 0),
        // Upper top chevron
        new THREE.Vector3(-0.6 * s, 0.55 * s, 0), new THREE.Vector3(0, 0.95 * s, 0),
        new THREE.Vector3(0, 0.95 * s, 0), new THREE.Vector3(0.6 * s, 0.55 * s, 0),
      );
      break;
    }
    case 'construct':
    case 'artificial': {
      // Artificial Constructs & Vehicles: 90-degree orthogonal open corner box (┌ ┐ / └ ┘)
      const b = 0.75 * s;
      const leg = 0.35 * s;
      points.push(
        // Top-left ┌
        new THREE.Vector3(-b, b - leg, 0), new THREE.Vector3(-b, b, 0),
        new THREE.Vector3(-b, b, 0), new THREE.Vector3(-b + leg, b, 0),
        // Top-right ┐
        new THREE.Vector3(b - leg, b, 0), new THREE.Vector3(b, b, 0),
        new THREE.Vector3(b, b, 0), new THREE.Vector3(b, b - leg, 0),
        // Bottom-right ┘
        new THREE.Vector3(b, -b + leg, 0), new THREE.Vector3(b, -b, 0),
        new THREE.Vector3(b, -b, 0), new THREE.Vector3(b - leg, -b, 0),
        // Bottom-left └
        new THREE.Vector3(-b + leg, -b, 0), new THREE.Vector3(-b, -b, 0),
        new THREE.Vector3(-b, -b, 0), new THREE.Vector3(-b, -b + leg, 0),
      );
      break;
    }
    case 'terrestrial': {
      // Small 1px open circle (~3-4px diameter, radius ~0.4s)
      const r = 0.4 * s;
      const segs = 32;
      for (let i = 0; i < segs; i++) {
        const th1 = (i / segs) * Math.PI * 2;
        const th2 = ((i + 1) / segs) * Math.PI * 2;
        points.push(
          new THREE.Vector3(Math.cos(th1) * r, Math.sin(th1) * r, 0),
          new THREE.Vector3(Math.cos(th2) * r, Math.sin(th2) * r, 0),
        );
      }
      break;
    }
    case 'gas-giant': {
      // Large 1px open circle (~7-8px diameter, radius ~0.8s) with a 45-degree slash through the middle and a gap around the central dot
      const r = 0.8 * s;
      const segs = 32;
      for (let i = 0; i < segs; i++) {
        const th1 = (i / segs) * Math.PI * 2;
        const th2 = ((i + 1) / segs) * Math.PI * 2;
        points.push(
          new THREE.Vector3(Math.cos(th1) * r, Math.sin(th1) * r, 0),
          new THREE.Vector3(Math.cos(th2) * r, Math.sin(th2) * r, 0),
        );
      }
      // 45-degree slash through the middle with gap around central dot
      const gap = 0.22 * s;
      const cos45 = Math.SQRT1_2;
      const sin45 = Math.SQRT1_2;
      points.push(
        // Lower-left segment
        new THREE.Vector3(-r * cos45, -r * sin45, 0),
        new THREE.Vector3(-gap * cos45, -gap * sin45, 0),
        // Upper-right segment
        new THREE.Vector3(gap * cos45, gap * sin45, 0),
        new THREE.Vector3(r * cos45, r * sin45, 0),
      );
      break;
    }
    case 'ice-giant': {
      // Ringed open circle: central disk + lateral ring ticks angled at 45 degrees
      const r = 0.55 * s;
      const segs = 32;
      for (let i = 0; i < segs; i++) {
        const th1 = (i / segs) * Math.PI * 2;
        const th2 = ((i + 1) / segs) * Math.PI * 2;
        points.push(
          new THREE.Vector3(Math.cos(th1) * r, Math.sin(th1) * r, 0),
          new THREE.Vector3(Math.cos(th2) * r, Math.sin(th2) * r, 0),
        );
      }
      // Ring ticks angled at 45 degrees
      const rInner = 0.6 * s;
      const rOuter = 0.95 * s;
      const cos45 = Math.SQRT1_2;
      const sin45 = Math.SQRT1_2;
      points.push(
        // Lower-left tick
        new THREE.Vector3(-rOuter * cos45, -rOuter * sin45, 0),
        new THREE.Vector3(-rInner * cos45, -rInner * sin45, 0),
        // Upper-right tick
        new THREE.Vector3(rInner * cos45, rInner * sin45, 0),
        new THREE.Vector3(rOuter * cos45, rOuter * sin45, 0),
      );
      break;
    }
  }

  return new THREE.BufferGeometry().setFromPoints(points);
}

/**
 * Creates segmented points for dashed negative-Z drop stalks.
 */
function createDashedStalkPoints(zStart: number, zEnd: number, segments = 12): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const deltaZ = (zEnd - zStart) / segments;
  for (let i = 0; i < segments; i += 2) {
    const z1 = zStart + i * deltaZ;
    const z2 = zStart + (i + 1) * deltaZ;
    points.push(new THREE.Vector3(0, 0, z1), new THREE.Vector3(0, 0, z2));
  }
  return points;
}

/**
 * CelestialNode: Authoritative 3D entity representation.
 * Implements Layer 1 (Physical System Node), Layer 2 (Tactical Reticle),
 * Layer 3 (Typographic Label), and the Strict Single-Stalk Rule.
 */
export const CelestialNode: React.FC<CelestialNodeProps> = ({
  id,
  name,
  position,
  classification = 'star',
  state,
  spectralType,
  reticleSize = 0.45,
  showStalk: explicitShowStalk,
  showLabel: explicitShowLabel,
  multiplicity = 1,
  planets,
  onClick,
  onPointerOver,
  onPointerOut,
}) => {
  const tokens = useThreeTokenStore((stateStore) => stateStore.tokens);
  const { gl } = useThree();

  const [x, y, z] = position;
  const [prevPropState, setPrevPropState] = useState(state);
  const [internalState, setInternalState] = useState<CelestialInteractionState>(state ?? 'active');

  if (state !== prevPropState) {
    setPrevPropState(state);
    if (state !== undefined) {
      setInternalState(state);
    }
  }

  // Clean up cursor and unregister from occlusion manager on unmount
  useEffect(() => {
    return () => {
      celestialOcclusionManager.unregister(id);
      if (typeof document !== 'undefined') {
        document.body.style.cursor = 'auto';
      }
    };
  }, [id]);

  const currentState = internalState;
  const isSelected = currentState === 'selected';
  const isFocused = currentState === 'focused';
  const isPassive = currentState === 'passive';
  const isAnnotated = isSelected || isFocused;

  // Stalk rendered when selected or focused (Single-Stalk Rule)
  const shouldRenderStalk = explicitShowStalk !== undefined ? explicitShowStalk : isSelected || isFocused;
  const shouldRenderReticle = !isPassive;
  const shouldRenderLabel = explicitShowLabel !== undefined ? explicitShowLabel : !isPassive;

  // Star intrinsic spectral color (never changes with state)
  const starColor = useMemo(() => getSpectralColor(spectralType), [spectralType]);

  // Screen-space invariance and camera-facing refs
  const dotMeshRef = useRef<THREE.Mesh>(null);
  const reticleGroupRef = useRef<THREE.Group>(null);
  const footprintGroupRef = useRef<THREE.Group>(null);
  const worldPosRef = useRef(new THREE.Vector3(x, y, z));
  const labelContainerRef = useRef<HTMLDivElement>(null);
  const spectrumFacetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    worldPosRef.current.set(x, y, z);
  }, [x, y, z]);

  useFrame(({ camera, size }) => {
    const camDist = camera.position.distanceTo(worldPosRef.current);
    // Invariant screen footprint: neither dot nor reticle scales with camera zoom or perspective changes
    const fovFactor = camera instanceof THREE.PerspectiveCamera
      ? Math.tan((camera.fov * Math.PI) / 360) / Math.tan((45 * Math.PI) / 360)
      : 1.0;
    const invScale = (camDist / 16.47) * fovFactor;

    // Star dot: invariant ~2px dot
    if (dotMeshRef.current) {
      dotMeshRef.current.scale.set(invScale, invScale, invScale);
    }

    // Reticle: always faces the camera and never scales on screen
    if (reticleGroupRef.current) {
      reticleGroupRef.current.quaternion.copy(camera.quaternion);
      reticleGroupRef.current.scale.set(invScale, invScale, invScale);
    }

    // Datum footprint on plane: lies flat on Z=0 reference plane, scaled to match reticle size
    if (footprintGroupRef.current) {
      footprintGroupRef.current.scale.set(invScale, invScale, invScale);
    }

    // --- Occlusion & Intersection Tracking ---
    const ndc = worldPosRef.current.clone().project(camera);
    const isBehindCamera = ndc.z > 1.0;
    const screenX = (ndc.x * 0.5 + 0.5) * size.width;
    const screenY = (-ndc.y * 0.5 + 0.5) * size.height;
    const reticleRadius = (reticleSize / 13.644) * size.height;
    const starRadius = Math.max(3, (0.035 / 13.644) * size.height);

    // Compute label bounding box in screen pixels
    let activeBox: Box2D | undefined;
    if (labelContainerRef.current) {
      const rect = labelContainerRef.current.getBoundingClientRect();
      const canvasRect = gl?.domElement?.getBoundingClientRect();
      if (canvasRect && rect.width > 0 && rect.height > 0) {
        activeBox = {
          left: rect.left - canvasRect.left,
          top: rect.top - canvasRect.top,
          right: rect.right - canvasRect.left,
          bottom: rect.bottom - canvasRect.top,
        };
      }
    }

    // Fallback analytical box if DOM rect is unmeasured (e.g. initial frame or offscreen)
    if (!activeBox && shouldRenderLabel) {
      const estimatedW = name.length * 8 + (spectralType ? 45 : 0) + 12;
      const estimatedH = 18;
      const anchorX = screenX + 1.15 * reticleRadius;
      const anchorY = screenY - 0.75 * reticleRadius;
      activeBox = {
        left: anchorX,
        top: anchorY - estimatedH / 2,
        right: anchorX + estimatedW,
        bottom: anchorY + estimatedH / 2,
      };
    }

    // Register footprint in occlusion manager
    celestialOcclusionManager.register({
      id,
      state: currentState,
      screenX,
      screenY,
      reticleRadius,
      starRadius,
      hasReticle: shouldRenderReticle,
      labelBox: activeBox,
      visible: !isBehindCamera,
      updatedAt: performance.now(),
    });

    // Check if this label intersects ANY active star or reticle in the scene
    let hasIntersection = false;
    if (activeBox && !isBehindCamera && shouldRenderLabel) {
      const checkResult = celestialOcclusionManager.checkIntersection(id, activeBox);
      hasIntersection = checkResult.hasIntersection;
    }

    // Authoritative rule:
    // If they intersect, label disappears UNLESS it is for a selected or focused element.
    // Selected or focused elements appear behind the reticle and star, overlapping.
    const evalResult = celestialOcclusionManager.evaluateLabelVisibility(currentState, hasIntersection);
    const shouldShowLabel = evalResult.visible;

    if (labelContainerRef.current) {
      labelContainerRef.current.style.display = shouldShowLabel ? 'flex' : 'none';
    }
    if (spectrumFacetRef.current) {
      spectrumFacetRef.current.style.display = shouldShowLabel ? 'flex' : 'none';
    }
  });

  // Reticle color and opacity (highlights interactive state)
  const reticleColor = isFocused
    ? tokens.stateFocus
    : isSelected
      ? tokens.stateSelectedBorder
      : tokens.reticleBracketColor;
  const reticleOpacity = isFocused ? 1.0 : isSelected ? 0.9 : tokens.reticleBracketAlpha;

  // Stalk color and opacity
  const stalkColor = isFocused ? tokens.stateFocus : tokens.reticleBracketColor;
  const stalkOpacity = isFocused ? 0.8 : 0.4;

  // Geometries memoized with Four-Facet Diamond Architecture
  const reticleGeometry = useMemo(() => {
    return createReticleGeometry(classification, reticleSize, {
      multiplicity,
      planets,
      isAnnotated,
    });
  }, [classification, reticleSize, multiplicity, planets, isAnnotated]);

  const stalkGeometry = useMemo(() => {
    if (!shouldRenderStalk) return null;
    if (z >= 0) {
      // Solid vertical line (represented as two-point segment for lineSegments)
      return new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -z),
      ]);
    } else {
      // Dashed vertical line for negative Z
      const dashedPts = createDashedStalkPoints(0, -z, 10);
      return new THREE.BufferGeometry().setFromPoints(dashedPts);
    }
  }, [shouldRenderStalk, z]);

  const footprintGeometry = useMemo(() => {
    if (!shouldRenderStalk) return null;
    return createReticleGeometry(classification, reticleSize, {
      multiplicity,
      planets,
      isAnnotated,
    });
  }, [shouldRenderStalk, classification, reticleSize, multiplicity, planets, isAnnotated]);

  // Interactive rollover and click handlers
  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    if (typeof document !== 'undefined') {
      document.body.style.cursor = 'pointer';
    }
    if (currentState !== 'focused') {
      setInternalState('selected');
    }
    onPointerOver?.(id);
  };

  const handlePointerOut = (e: any) => {
    e.stopPropagation();
    if (typeof document !== 'undefined') {
      document.body.style.cursor = 'auto';
    }
    if (currentState === 'selected') {
      setInternalState(state === 'selected' ? 'selected' : (state ?? 'active'));
    }
    onPointerOut?.(id);
  };

  const handleClick = (e: any) => {
    e.stopPropagation();
    setInternalState((prev) => (prev === 'focused' ? 'selected' : 'focused'));
    onClick?.(id);
  };

  return (
    <group position={[x, y, z]} name={`celestial-node-${id}`} userData={{ state: currentState }}>
      {/* Layer 1: Physical System Node - 1px-2px invariant dot with permanent spectral hue */}
      <mesh
        ref={dotMeshRef}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <sphereGeometry args={[0.035, 16, 16]} />
        <meshBasicMaterial color={starColor} />
      </mesh>

      {/* Camera-Facing Reticle Frame and Invisible Interactive Hit Area */}
      <group ref={reticleGroupRef} name="reticle-frame">
        {/* Invisible Hit Area matching the full reticle boundary */}
        <mesh
          name="reticle-hitarea"
          onClick={handleClick}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          <circleGeometry args={[reticleSize * 1.35, 16]} />
          <meshBasicMaterial
            transparent
            opacity={0}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Layer 2: Geometric Reticle Frame (Basic vs Full Composite Annotated) */}
        {shouldRenderReticle && (
          <lineSegments geometry={reticleGeometry}>
            <lineBasicMaterial
              color={reticleColor}
              opacity={reticleOpacity}
              transparent
              depthWrite={false}
            />
          </lineSegments>
        )}

        {/* Top-Right Facet: Typographic Label (System Designation) */}
        {shouldRenderLabel && (
          <Html
            position={[reticleSize * 1.15, reticleSize * 0.75, 0]}
            center={false}
            prepend={true}
            zIndexRange={[0, 0]}
            data-testid="celestial-label"
          >
            <div
              ref={labelContainerRef}
              className={styles.nodeLabel}
              data-state={currentState}
            >
              <span>{name}</span>
              {!isAnnotated && spectralType && <span className={styles.spectralTag}>{spectralType}</span>}
            </div>
          </Html>
        )}

        {/* Bottom-Right Facet: Solar Spectrum Type */}
        {shouldRenderLabel && isAnnotated && spectralType && (
          <Html
            position={[reticleSize * 1.15, -reticleSize * 0.75, 0]}
            center={false}
            prepend={true}
            zIndexRange={[0, 0]}
            data-testid="celestial-spectrum-facet"
          >
            <div
              ref={spectrumFacetRef}
              className={styles.spectralFacet}
              data-state={currentState}
            >
              <span>{spectralType}</span>
            </div>
          </Html>
        )}
      </group>

      {/* Typographic Label fallback if reticle is hidden (e.g. passive with explicit showLabel) */}
      {!shouldRenderReticle && shouldRenderLabel && (
        <Html
          position={[0.2, 0.2, 0]}
          center={false}
          prepend={true}
          zIndexRange={[0, 0]}
          data-testid="celestial-label"
        >
          <div
            ref={labelContainerRef}
            className={styles.nodeLabel}
            data-state={currentState}
          >
            <span>{name}</span>
            {spectralType && <span className={styles.spectralTag}>{spectralType}</span>}
          </div>
        </Html>
      )}

      {/* Strict Single-Stalk Rule: Drop Stalk down to Datum Plane Z=0 */}
      {shouldRenderStalk && stalkGeometry && (
        <group name="drop-stalk">
          <lineSegments geometry={stalkGeometry}>
            <lineBasicMaterial
              color={stalkColor}
              opacity={stalkOpacity}
              transparent
              depthWrite={false}
            />
          </lineSegments>

          {/* Datum Footprint stamped on Galactic Equator Z=0, matching reticle shape */}
          {footprintGeometry && (
            <group ref={footprintGroupRef} position={[0, 0, -z]} name="datum-footprint">
              <lineSegments geometry={footprintGeometry}>
                <lineBasicMaterial
                  color={stalkColor}
                  opacity={0.45}
                  transparent
                  depthWrite={false}
                />
              </lineSegments>
            </group>
          )}
        </group>
      )}
    </group>
  );
};
