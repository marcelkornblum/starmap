import type React from 'react';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useThreeTokenStore } from '../../../stores/useThreeTokenStore';
import styles from './CelestialNode.module.css';

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

  // Reticle group ref for native Three.js onBeforeRender orientation
  const reticleGroupRef = useRef<THREE.Group>(null);
  const handleReticleBeforeRender = (_renderer: unknown, _scene: unknown, camera: THREE.Camera) => {
    if (reticleGroupRef.current) {
      reticleGroupRef.current.quaternion.copy(camera.quaternion);
    }
  };

  // Node color
  const nodeColor = isFocused
    ? tokens.stateFocus
    : isSelected
      ? tokens.stateSelectedBorder
      : tokens.reticleBracketColor;

  // Reticle color and opacity
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
    <group position={[x, y, z]} data-testid={`celestial-node-${id}`} data-state={state}>
      {/* Layer 1: Physical System Node (Unobstructed Centre) */}
      <mesh
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
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color={nodeColor} />
      </mesh>

      {/* Layer 2: Geometric Reticle (Oriented to Camera via onBeforeRender) */}
      {shouldRenderReticle && (
        <group
          ref={reticleGroupRef}
          onBeforeRender={handleReticleBeforeRender as unknown as undefined}
          data-testid="reticle-frame"
        >
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
        </group>
      )}

      {/* Strict Single-Stalk Rule: Drop Stalk down to Datum Plane Z=0 */}
      {shouldRenderStalk && stalkGeometry && (
        <group data-testid="drop-stalk">
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

      {/* Layer 3: Typographic Label (HTML Overlay with CUBE Tokens) */}
      {shouldRenderLabel && (
        <Html
          position={[reticleSize * 1.1, reticleSize * 0.8, 0]}
          center={false}
          distanceFactor={15}
          data-testid="celestial-label"
        >
          <div className={styles.nodeLabel} data-state={state}>
            <span>{name}</span>
            {spectralType && <span className={styles.spectralTag}>{spectralType}</span>}
          </div>
        </Html>
      )}
    </group>
  );
};
