import type React from 'react';
import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useThreeTokenStore } from '../../../stores/useThreeTokenStore';
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
  | 'brown-dwarf'
  | 'white-dwarf'
  | 'hazard'
  | 'black-hole'
  | 'terrestrial'
  | 'gas-giant'
  | 'ice-giant';

export type CelestialInteractionState = 'passive' | 'active' | 'selected' | 'focused';

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
  onClick?: (id: string) => void;
  onPointerOver?: (id: string) => void;
  onPointerOut?: (id: string) => void;
}

/**
 * Builds 2D line geometry in the local XY plane for each reticle taxonomy type.
 */
function createReticleGeometry(classification: CelestialClassification, s: number): THREE.BufferGeometry {
  const points: THREE.Vector3[] = [];

  switch (classification) {
    case 'star': {
      // Closed 45-degree diamond
      points.push(
        new THREE.Vector3(0, s, 0),
        new THREE.Vector3(s, 0, 0),
        new THREE.Vector3(0, -s, 0),
        new THREE.Vector3(-s, 0, 0),
        new THREE.Vector3(0, s, 0),
      );
      break;
    }
    case 'brown-dwarf': {
      // Broken Diamond: Top and bottom vertical chevrons
      points.push(
        new THREE.Vector3(-s, 0.25 * s, 0),
        new THREE.Vector3(0, s, 0),
        new THREE.Vector3(s, 0.25 * s, 0),
        new THREE.Vector3(s, 0.25 * s, 0),
        new THREE.Vector3(-s, -0.25 * s, 0),
        new THREE.Vector3(0, -s, 0),
        new THREE.Vector3(s, -0.25 * s, 0),
      );
      break;
    }
    case 'white-dwarf': {
      // Fractured Diamond: 4 diagonal disjoint corner lines
      const c = 0.5 * s;
      points.push(
        new THREE.Vector3(0, s, 0), new THREE.Vector3(c, c, 0),
        new THREE.Vector3(s, 0, 0), new THREE.Vector3(c, -c, 0),
        new THREE.Vector3(0, -s, 0), new THREE.Vector3(-c, -c, 0),
        new THREE.Vector3(-s, 0, 0), new THREE.Vector3(-c, c, 0),
      );
      break;
    }
    case 'hazard': {
      // Fractured diamond with outward radiating beam spines
      points.push(
        // Diamond facets
        new THREE.Vector3(-0.7 * s, 0.2 * s, 0), new THREE.Vector3(0, 0.7 * s, 0), new THREE.Vector3(0.7 * s, 0.2 * s, 0),
        new THREE.Vector3(-0.7 * s, -0.2 * s, 0), new THREE.Vector3(0, -0.7 * s, 0), new THREE.Vector3(0.7 * s, -0.2 * s, 0),
        // Lateral beam spines
        new THREE.Vector3(-1.2 * s, 0, 0), new THREE.Vector3(-0.6 * s, 0, 0),
        new THREE.Vector3(0.6 * s, 0, 0), new THREE.Vector3(1.2 * s, 0, 0),
      );
      break;
    }
    case 'black-hole': {
      // 4 inward convergent spines targeting empty centre (infall geometry)
      const inner = 0.25 * s;
      const outer = 1.0 * s;
      points.push(
        new THREE.Vector3(-outer, 0, 0), new THREE.Vector3(-inner, 0, 0),
        new THREE.Vector3(outer, 0, 0), new THREE.Vector3(inner, 0, 0),
        new THREE.Vector3(0, -outer, 0), new THREE.Vector3(0, -inner, 0),
        new THREE.Vector3(0, outer, 0), new THREE.Vector3(0, inner, 0),
      );
      break;
    }
    case 'terrestrial': {
      // Small 1px open circle (~0.35s)
      const r = 0.35 * s;
      const segs = 32;
      for (let i = 0; i <= segs; i++) {
        const th = (i / segs) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(th) * r, Math.sin(th) * r, 0));
      }
      break;
    }
    case 'gas-giant': {
      // Large 1px open circle (~0.7s)
      const r = 0.7 * s;
      const segs = 32;
      for (let i = 0; i <= segs; i++) {
        const th = (i / segs) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(th) * r, Math.sin(th) * r, 0));
      }
      break;
    }
    case 'ice-giant': {
      // Ringed open circle: central disk + split lateral ring flanges
      const r = 0.5 * s;
      const segs = 32;
      for (let i = 0; i <= segs; i++) {
        const th = (i / segs) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(th) * r, Math.sin(th) * r, 0));
      }
      // Lateral ring flanges
      points.push(
        new THREE.Vector3(-0.9 * s, 0, 0), new THREE.Vector3(-0.55 * s, 0, 0),
        new THREE.Vector3(0.55 * s, 0, 0), new THREE.Vector3(0.9 * s, 0, 0),
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
  state = 'passive',
  spectralType,
  reticleSize = 0.45,
  showStalk: explicitShowStalk,
  showLabel: explicitShowLabel,
  onClick,
  onPointerOver,
  onPointerOut,
}) => {
  const tokens = useThreeTokenStore((stateStore) => stateStore.tokens);

  const [x, y, z] = position;
  const isSelected = state === 'selected';
  const isFocused = state === 'focused';
  const isPassive = state === 'passive';

  // Exactly one drop stalk rendered when selected or focused (Single-Stalk Rule)
  const shouldRenderStalk = explicitShowStalk !== undefined ? explicitShowStalk : isSelected || isFocused;
  const shouldRenderReticle = !isPassive;
  const shouldRenderLabel = explicitShowLabel !== undefined ? explicitShowLabel : !isPassive;

  // Star intrinsic spectral color (never changes with state)
  const starColor = useMemo(() => getSpectralColor(spectralType), [spectralType]);

  // Screen-space invariance and camera-facing refs
  const dotMeshRef = useRef<THREE.Mesh>(null);
  const reticleGroupRef = useRef<THREE.Group>(null);
  const worldPosRef = useRef(new THREE.Vector3(x, y, z));

  useEffect(() => {
    worldPosRef.current.set(x, y, z);
  }, [x, y, z]);

  useFrame(({ camera }) => {
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

  // Geometries memoized
  const reticleGeometry = useMemo(() => {
    return createReticleGeometry(classification, reticleSize);
  }, [classification, reticleSize]);

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
    const pts: THREE.Vector3[] = [];
    const r = reticleSize * 0.5;
    const segs = 24;
    for (let i = 0; i <= segs; i++) {
      const th = (i / segs) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(th) * r, Math.sin(th) * r, 0));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [shouldRenderStalk, reticleSize]);

  return (
    <group position={[x, y, z]} name={`celestial-node-${id}`} userData={{ state }}>
      {/* Layer 1: Physical System Node - 1px-2px invariant dot with permanent spectral hue */}
      <mesh
        ref={dotMeshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onPointerOver?.(id);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onPointerOut?.(id);
        }}
      >
        <sphereGeometry args={[0.035, 16, 16]} />
        <meshBasicMaterial color={starColor} />
      </mesh>

      {/* Layer 2: Geometric Reticle & Typographic Label (Facing Camera, invariant screen size) */}
      {shouldRenderReticle && (
        <group ref={reticleGroupRef} name="reticle-frame">
          {classification === 'terrestrial' || classification === 'gas-giant' || classification === 'star' ? (
            <lineLoop geometry={reticleGeometry}>
              <lineBasicMaterial
                color={reticleColor}
                opacity={reticleOpacity}
                transparent
                depthWrite={false}
              />
            </lineLoop>
          ) : (
            <lineSegments geometry={reticleGeometry}>
              <lineBasicMaterial
                color={reticleColor}
                opacity={reticleOpacity}
                transparent
                depthWrite={false}
              />
            </lineSegments>
          )}

          {/* Layer 3: Typographic Label (HTML Overlay with CUBE Tokens, never scales on screen) */}
          {shouldRenderLabel && (
            <Html
              position={[reticleSize * 1.1, reticleSize * 0.8, 0]}
              center={false}
              data-testid="celestial-label"
            >
              <div className={styles.nodeLabel} data-state={state}>
                <span>{name}</span>
                {spectralType && <span className={styles.spectralTag}>{spectralType}</span>}
              </div>
            </Html>
          )}
        </group>
      )}

      {/* Typographic Label fallback if reticle is hidden (e.g. passive with explicit showLabel) */}
      {!shouldRenderReticle && shouldRenderLabel && (
        <Html
          position={[0.2, 0.2, 0]}
          center={false}
          data-testid="celestial-label"
        >
          <div className={styles.nodeLabel} data-state={state}>
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

          {/* Datum Footprint Ring stamped on Galactic Equator Z=0 */}
          {footprintGeometry && (
            <group position={[0, 0, -z]}>
              <lineLoop geometry={footprintGeometry}>
                <lineBasicMaterial
                  color={stalkColor}
                  opacity={0.5}
                  transparent
                  depthWrite={false}
                />
              </lineLoop>
            </group>
          )}
        </group>
      )}
    </group>
  );
};
