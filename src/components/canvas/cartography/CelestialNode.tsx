import type React from 'react';
import { useMemo, useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
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

import {
  createReticleGeometry,
  type CelestialClassification,
  type PlanetCensusEntry,
  type ReticleAnnotationOptions,
} from './reticleGeometry';

export type { CelestialClassification, PlanetCensusEntry, ReticleAnnotationOptions };

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
  multiplicity?: number;
  planets?: PlanetCensusEntry[];
  onClick?: (id: string) => void;
  onPointerOver?: (id: string) => void;
  onPointerOut?: (id: string) => void;
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
      worldPos: [x, y, z],
      classification,
      reticleSize,
      hasStalk: shouldRenderStalk,
      multiplicity,
      planets,
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

  // Interactive rollover and click handlers
  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (typeof document !== 'undefined') {
      document.body.style.cursor = 'pointer';
    }
    if (currentState !== 'focused') {
      setInternalState('selected');
    }
    onPointerOver?.(id);
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (typeof document !== 'undefined') {
      document.body.style.cursor = 'auto';
    }
    if (currentState === 'selected') {
      setInternalState(state === 'selected' ? 'selected' : (state ?? 'active'));
    }
    onPointerOut?.(id);
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
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
        </group>
      )}
    </group>
  );
};
