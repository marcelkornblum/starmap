import type React from 'react';
import { useMemo, useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useThreeTokenStore } from '../../../stores/useThreeTokenStore';
import { celestialOcclusionManager, type Box2D, type CelestialFootprint } from './celestialOcclusionRegistry';
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

const SHARED_STAR_DOT_GEOMETRY = new THREE.SphereGeometry(0.035, 16, 16);
const SHARED_UNIT_CIRCLE_GEOMETRY = new THREE.CircleGeometry(1.0, 16);
const SHARED_HITAREA_MATERIAL = new THREE.MeshBasicMaterial({
  transparent: true,
  opacity: 0,
  depthWrite: false,
  side: THREE.DoubleSide,
});

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
  const worldPosTupleRef = useRef<[number, number, number]>([x, y, z]);
  const scratchNdcRef = useRef(new THREE.Vector3());
  const labelContainerRef = useRef<HTMLDivElement>(null);
  const spectrumFacetRef = useRef<HTMLDivElement>(null);
  const labelDimensionsRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });
  const scratchBoxRef = useRef<Box2D>({ left: 0, top: 0, right: 0, bottom: 0 });
  const registrationRef = useRef<CelestialFootprint>({
    id,
    state: currentState,
    worldPos: worldPosTupleRef.current,
    classification,
    reticleSize,
    hasStalk: shouldRenderStalk,
    multiplicity,
    planets,
    screenX: 0,
    screenY: 0,
    reticleRadius: 0,
    starRadius: 0,
    hasReticle: shouldRenderReticle,
    labelBox: undefined,
    visible: true,
    updatedAt: 0,
  });

  useEffect(() => {
    worldPosRef.current.set(x, y, z);
    worldPosTupleRef.current = [x, y, z];
  }, [x, y, z]);

  useEffect(() => {
    const el = labelContainerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.borderBoxSize?.length > 0) {
          labelDimensionsRef.current = {
            width: entry.borderBoxSize[0].inlineSize,
            height: entry.borderBoxSize[0].blockSize,
          };
        } else {
          labelDimensionsRef.current = {
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          };
        }
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [name, spectralType, isAnnotated]);

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
    const ndc = scratchNdcRef.current.copy(worldPosRef.current).project(camera);
    const isBehindCamera = ndc.z > 1.0;
    const screenX = (ndc.x * 0.5 + 0.5) * size.width;
    const screenY = (-ndc.y * 0.5 + 0.5) * size.height;
    const reticleRadius = (reticleSize / 13.644) * size.height;
    const starRadius = Math.max(3, (0.035 / 13.644) * size.height);

    // Compute label bounding box in screen pixels analytically using cached dimensions (no DOM layout thrashing, zero allocations)
    let activeBox: Box2D | undefined;
    if (shouldRenderLabel) {
      const estimatedW = name.length * 8 + (spectralType ? 45 : 0) + 12;
      const w = labelDimensionsRef.current.width > 0 ? labelDimensionsRef.current.width : estimatedW;
      const h = labelDimensionsRef.current.height > 0 ? labelDimensionsRef.current.height : 18;
      const anchorX = screenX + 1.15 * reticleRadius;
      const anchorY = screenY - 0.75 * reticleRadius;
      const box = scratchBoxRef.current;
      box.left = anchorX;
      box.top = anchorY - h / 2;
      box.right = anchorX + w;
      box.bottom = anchorY + h / 2;
      activeBox = box;
    }

    // Reuse persistent scratch registration object stored in ref to avoid per-frame GC allocations
    const record = registrationRef.current;
    record.id = id;
    record.state = currentState;
    record.worldPos = worldPosTupleRef.current;
    record.classification = classification;
    record.reticleSize = reticleSize;
    record.hasStalk = shouldRenderStalk;
    record.multiplicity = multiplicity;
    record.planets = planets;
    record.screenX = screenX;
    record.screenY = screenY;
    record.reticleRadius = reticleRadius;
    record.starRadius = starRadius;
    record.hasReticle = shouldRenderReticle;
    record.labelBox = activeBox;
    record.visible = !isBehindCamera;
    record.updatedAt = performance.now();
    celestialOcclusionManager.register(record);

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

    if (labelContainerRef.current && labelContainerRef.current.style.display !== (shouldShowLabel ? 'flex' : 'none')) {
      labelContainerRef.current.style.display = shouldShowLabel ? 'flex' : 'none';
    }
    if (spectrumFacetRef.current && spectrumFacetRef.current.style.display !== (shouldShowLabel ? 'flex' : 'none')) {
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

  useEffect(() => {
    return () => {
      reticleGeometry.dispose();
    };
  }, [reticleGeometry]);

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

  useEffect(() => {
    return () => {
      stalkGeometry?.dispose();
    };
  }, [stalkGeometry]);

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
        geometry={SHARED_STAR_DOT_GEOMETRY}
      >
        <meshBasicMaterial color={starColor} />
      </mesh>

      {/* Camera-Facing Reticle Frame and Invisible Interactive Hit Area */}
      <group ref={reticleGroupRef} name="reticle-frame">
        {/* Invisible Hit Area matching the full reticle boundary */}
        <mesh
          name="reticle-hitarea"
          geometry={SHARED_UNIT_CIRCLE_GEOMETRY}
          material={SHARED_HITAREA_MATERIAL}
          scale={[reticleSize * 1.35, reticleSize * 1.35, 1]}
          onClick={handleClick}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        />

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
