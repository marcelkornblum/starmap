import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useLazyRef } from '../../../hooks/useLazyRef';
import { useThreeTokenStore } from '../../../stores/useThreeTokenStore';
import {
  createReticleGeometry,
  classifyPlanet,
  DEFAULT_RETICLE_SIZE,
  type CelestialClassification,
  type PlanetCensusEntry,
} from '../cartography/reticleGeometry';
import { celestialOcclusionManager } from '../cartography/celestialOcclusionRegistry';
import { calculateScreenInvariantScale } from '../engineConfig';
import type { CelestialInteractionState, NodeAlphaRef } from './types';

export interface ReticleProps {
  id: string;
  position?: [number, number, number] | THREE.Vector3;
  classification?: CelestialClassification;
  state?: CelestialInteractionState;
  size?: number;
  multiplicity?: number;
  planets?: Array<PlanetCensusEntry | { id: string; name: string; radiusRearth?: number; radiusRjup?: number; massMearth?: number; massMjup?: number; classification?: string }>;
  spectralType?: string;
  color?: string | THREE.Color;
  opacity?: number;
  /** Optional cross-fade alpha multiplied into the resolved opacity each frame. */
  nodeAlphaRef?: NodeAlphaRef;
}

/**
 * Reticle (Layer 2: Tactical Geometric Reticle):
 * Renders universal taxonomy category frame and facet decorations (multiplicity, census pips, spectral symbol).
 * Implements Reticle Attention Gating (unannotated basic frame in active, Four-Facet composite in selected/focused).
 */
export const Reticle: React.FC<ReticleProps> = ({
  id,
  position,
  classification = 'star',
  state = 'active',
  size = DEFAULT_RETICLE_SIZE,
  multiplicity = 1,
  planets,
  spectralType: _spectralType,
  color: explicitColor,
  opacity: explicitOpacity,
  nodeAlphaRef,
}) => {
  const stateFocus = useThreeTokenStore((s) => s.tokens.stateFocus);
  const stateSelected = useThreeTokenStore((s) => s.tokens.stateSelected);
  const reticleBracketColor = useThreeTokenStore((s) => s.tokens.reticleBracketColor);
  const reticleActiveAlpha = useThreeTokenStore((s) => s.tokens.reticleActiveAlpha);
  const reticleSelectedAlpha = useThreeTokenStore((s) => s.tokens.reticleSelectedAlpha);
  const reticleFocusedAlpha = useThreeTokenStore((s) => s.tokens.reticleFocusedAlpha);

  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.LineBasicMaterial>(null);

  // Attention Gating: Annotations only activate in selected or focused states
  const isAnnotated = state === 'selected' || state === 'focused';

  const resolvedPlanets = useMemo<PlanetCensusEntry[] | undefined>(() => {
    if (!planets || planets.length === 0) return undefined;
    return planets.map((p) => ({
      id: p.id,
      name: p.name,
      classification: classifyPlanet(p),
    }));
  }, [planets]);

  const reticleGeom = useMemo(() => {
    return createReticleGeometry(classification, size, {
      isAnnotated,
      multiplicity,
      planets: resolvedPlanets,
    });
  }, [classification, size, isAnnotated, multiplicity, resolvedPlanets]);

  useEffect(() => {
    return () => {
      reticleGeom.dispose();
    };
  }, [reticleGeom]);

  const resolvedColor = useMemo(() => {
    if (explicitColor) return explicitColor;
    if (state === 'focused') return stateFocus;
    if (state === 'selected') return stateSelected;
    return reticleBracketColor;
  }, [explicitColor, state, stateFocus, stateSelected, reticleBracketColor]);

  const resolvedOpacity = useMemo(() => {
    if (explicitOpacity !== undefined) return explicitOpacity;
    if (state === 'focused') return reticleFocusedAlpha;
    if (state === 'selected') return reticleSelectedAlpha;
    return reticleActiveAlpha;
  }, [explicitOpacity, state, reticleFocusedAlpha, reticleSelectedAlpha, reticleActiveAlpha]);

  const resolvedPos = useMemo(() => {
    if (!position) return undefined;
    if (position instanceof THREE.Vector3) return position;
    return new THREE.Vector3(position[0], position[1], position[2]);
  }, [position]);

  const scratchWorldPos = useLazyRef(() => new THREE.Vector3());

  // Keep reticle billboarded to face camera directly with invariant screen-space scaling
  useFrame(({ camera }) => {
    if (groupRef.current) {
      groupRef.current.quaternion.copy(camera.quaternion);

      groupRef.current.getWorldPosition(scratchWorldPos.current);
      const camDist = Math.max(camera.position.distanceTo(scratchWorldPos.current), 1e-4);
      const invScale = calculateScreenInvariantScale(camDist, camera);
      groupRef.current.scale.set(invScale, invScale, invScale);

      // Priority Occlusion Masking for Geometric Reticles (Spec 2.2):
      // An active focused target or selected node occludes/suppresses lesser background reticles colliding directly beneath it.
      const isSuppressed = celestialOcclusionManager.evaluateReticleOcclusion(id);
      groupRef.current.visible = !isSuppressed;
    }

    if (materialRef.current) {
      materialRef.current.color.set(resolvedColor);
      materialRef.current.opacity = resolvedOpacity * (nodeAlphaRef?.current ?? 1);
    }
  });

  return (
    <group ref={groupRef} position={resolvedPos} name={`reticle-${id}`}>
      {/* Primary Geometric Frame */}
      <lineSegments name="reticle-geometry">
        <primitive object={reticleGeom} attach="geometry" />
        <lineBasicMaterial
          ref={materialRef}
          color={resolvedColor}
          opacity={resolvedOpacity}
          transparent
          depthWrite={false}
        />
      </lineSegments>

      {/* Auxiliary Facet Indicators for Testing & Structural Introspection */}
      {isAnnotated && multiplicity > 1 && (
        <group name="multiplicity-pips" data-multiplicity={multiplicity} />
      )}

      {isAnnotated && planets && planets.length > 0 && (
        <group name="planetary-census-pips" data-planets-count={planets.length} />
      )}
    </group>
  );
};
