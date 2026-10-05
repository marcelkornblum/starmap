import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { type ThreeEvent, useFrame } from '@react-three/fiber';
import { useSpatialEntityStoreApi, useSpatialEntityStore } from './SpatialEntityContext';
import { BodyMarker } from './BodyMarker';
import { Reticle } from './Reticle';
import { DropStalk } from './DropStalk';
import { KinematicVector } from './KinematicVector';
import { OrbitPath } from './OrbitPath';
import { EntityLabel } from './EntityLabel';
import {
  celestialOcclusionManager,
  type CelestialFootprint,
} from '../cartography/celestialOcclusionRegistry';
import { DEFAULT_RETICLE_SIZE } from '../cartography/reticleGeometry';
import { calculateKeplerianPosition, calculateKeplerianVelocity } from '../math/kepler';
import type {
  SpatialEntityDefinition,
  CelestialInteractionState,
} from './types';

export interface CelestialEntityProps extends Partial<SpatialEntityDefinition> {
  id: string;
  name: string;
  position?: [number, number, number] | THREE.Vector3;
  debugHitarea?: boolean;
  onClick?: (id: string, e: ThreeEvent<MouseEvent>) => void;
  onPointerOver?: (id: string, e: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: (id: string, e: ThreeEvent<PointerEvent>) => void;
  children?: React.ReactNode;
}

function isVelocityEqual(
  v1?: THREE.Vector3 | [number, number, number],
  v2?: THREE.Vector3 | [number, number, number],
): boolean {
  if (v1 === v2) return true;
  if (!v1 || !v2) return false;
  const x1 = 'x' in v1 ? v1.x : v1[0];
  const y1 = 'y' in v1 ? v1.y : v1[1];
  const z1 = 'z' in v1 ? v1.z : v1[2];
  const x2 = 'x' in v2 ? v2.x : v2[0];
  const y2 = 'y' in v2 ? v2.y : v2[1];
  const z2 = 'z' in v2 ? v2.z : v2[2];
  return x1 === x2 && y1 === y2 && z1 === z2;
}

/**
 * CelestialEntity: Unified architectural composite composing:
 * - Layer 1: BodyMarker (Physical System Node, Invariant Screen Size)
 * - Layer 2: Reticle (Tactical Geometric Reticle & Facet Decorations)
 * - Layer 3: EntityLabel (Typographic Designation & Proximity Occlusion)
 * - Supporting Features: DropStalk (§2.4), KinematicVector (§5), OrbitPath (§4.4).
 */
export const CelestialEntity: React.FC<CelestialEntityProps> = ({
  id,
  name,
  position,
  classification = 'star',
  state: explicitState,
  spectralType,
  multiplicity = 1,
  planets,
  velocity,
  orbit,
  reticleSize = DEFAULT_RETICLE_SIZE,
  showStalk: explicitShowStalk,
  showLabel: explicitShowLabel = true,
  enableOcclusion = true,
  debugHitarea = false,
  onClick,
  onPointerOver,
  onPointerOut,
  children,
}) => {
  const storeApi = useSpatialEntityStoreApi();

  // Subscribe to store state
  const isHovered = useSpatialEntityStore((s) => s.hoveredId === id);
  const derivedState = useSpatialEntityStore((s) => s.getEntityState(id));
  const activeState: CelestialInteractionState =
    isHovered && explicitState !== 'focused'
      ? 'selected'
      : (explicitState ?? derivedState);

  const primaryEntityPos = useSpatialEntityStore((s) => {
    if (!orbit?.primaryEntityId) return null;
    const ent = s.entities[orbit.primaryEntityId];
    return ent?.position ?? null;
  });

  // Extract scalar coordinates to ensure robust memoization against literal reference changes
  const pEntX = primaryEntityPos ? (primaryEntityPos instanceof THREE.Vector3 ? primaryEntityPos.x : primaryEntityPos[0]) : null;
  const pEntY = primaryEntityPos ? (primaryEntityPos instanceof THREE.Vector3 ? primaryEntityPos.y : primaryEntityPos[1]) : null;
  const pEntZ = primaryEntityPos ? (primaryEntityPos instanceof THREE.Vector3 ? primaryEntityPos.z : primaryEntityPos[2]) : null;

  const orbPrimX = orbit?.primaryPosition ? (orbit.primaryPosition instanceof THREE.Vector3 ? orbit.primaryPosition.x : orbit.primaryPosition[0]) : null;
  const orbPrimY = orbit?.primaryPosition ? (orbit.primaryPosition instanceof THREE.Vector3 ? orbit.primaryPosition.y : orbit.primaryPosition[1]) : null;
  const orbPrimZ = orbit?.primaryPosition ? (orbit.primaryPosition instanceof THREE.Vector3 ? orbit.primaryPosition.z : orbit.primaryPosition[2]) : null;

  const resolvedPrimaryPos = useMemo<THREE.Vector3>(() => {
    if (pEntX !== null && pEntY !== null && pEntZ !== null) {
      return new THREE.Vector3(pEntX, pEntY, pEntZ);
    }
    if (orbPrimX !== null && orbPrimY !== null && orbPrimZ !== null) {
      return new THREE.Vector3(orbPrimX, orbPrimY, orbPrimZ);
    }
    return new THREE.Vector3(0, 0, 0);
  }, [pEntX, pEntY, pEntZ, orbPrimX, orbPrimY, orbPrimZ]);

  const rawPosX = position ? (position instanceof THREE.Vector3 ? position.x : position[0]) : null;
  const rawPosY = position ? (position instanceof THREE.Vector3 ? position.y : position[1]) : null;
  const rawPosZ = position ? (position instanceof THREE.Vector3 ? position.z : position[2]) : null;

  const orbitA = orbit?.semiMajorAxis;
  const orbitE = orbit?.eccentricity ?? 0;
  const orbitInc = orbit?.inclination ?? 0;
  const orbitNode = orbit?.ascendingNode ?? 0;
  const orbitPeri = orbit?.argumentOfPeriapsis ?? 0;
  const orbitM = orbit?.meanAnomaly;

  const resolvedPos = useMemo(() => {
    if (orbitA !== undefined && (orbitM !== undefined || rawPosX === null)) {
      const [ox, oy, oz] = calculateKeplerianPosition(
        orbitA,
        orbitE,
        orbitInc,
        orbitNode,
        orbitPeri,
        orbitM ?? 0,
      );
      return new THREE.Vector3(
        resolvedPrimaryPos.x + ox,
        resolvedPrimaryPos.y + oy,
        resolvedPrimaryPos.z + oz,
      );
    }
    if (rawPosX !== null && rawPosY !== null && rawPosZ !== null) {
      return new THREE.Vector3(rawPosX, rawPosY, rawPosZ);
    }
    return new THREE.Vector3(0, 0, 0);
  }, [rawPosX, rawPosY, rawPosZ, orbitA, orbitE, orbitInc, orbitNode, orbitPeri, orbitM, resolvedPrimaryPos]);

  const velX = velocity ? (velocity instanceof THREE.Vector3 ? velocity.x : velocity[0]) : null;
  const velY = velocity ? (velocity instanceof THREE.Vector3 ? velocity.y : velocity[1]) : null;
  const velZ = velocity ? (velocity instanceof THREE.Vector3 ? velocity.z : velocity[2]) : null;

  const resolvedVelocity = useMemo(() => {
    if (velX !== null && velY !== null && velZ !== null) {
      return new THREE.Vector3(velX, velY, velZ);
    }
    if (orbitA !== undefined && orbitM !== undefined) {
      const [vx, vy, vz] = calculateKeplerianVelocity(
        orbitA,
        orbitE,
        orbitInc,
        orbitNode,
        orbitPeri,
        orbitM,
      );
      return new THREE.Vector3(vx, vy, vz);
    }
    return undefined;
  }, [velX, velY, velZ, orbitA, orbitE, orbitInc, orbitNode, orbitPeri, orbitM]);

  const orbitOffset = useMemo<[number, number, number]>(() => {
    const ox = resolvedPrimaryPos.x - resolvedPos.x;
    const oy = resolvedPrimaryPos.y - resolvedPos.y;
    const oz = resolvedPrimaryPos.z - resolvedPos.z;
    return [
      Math.abs(ox) < 1e-6 ? 0 : Number(ox.toFixed(6)),
      Math.abs(oy) < 1e-6 ? 0 : Number(oy.toFixed(6)),
      Math.abs(oz) < 1e-6 ? 0 : Number(oz.toFixed(6)),
    ];
  }, [resolvedPrimaryPos.x, resolvedPrimaryPos.y, resolvedPrimaryPos.z, resolvedPos.x, resolvedPos.y, resolvedPos.z]);

  // Register in SpatialEntityStore on mount, unregister on unmount
  useEffect(() => {
    storeApi.getState().registerEntity({
      id,
      name,
      position: resolvedPos,
      classification,
      state: explicitState,
      spectralType,
      multiplicity,
      planets,
      velocity,
      orbit,
      reticleSize,
    });

    return () => {
      storeApi.getState().unregisterEntity(id);
    };
  }, [storeApi, id]);

  // Synchronize prop changes to SpatialEntityStore with shallow comparison on complex objects
  const prevEntityPropsRef = useRef({
    name,
    px: resolvedPos.x,
    py: resolvedPos.y,
    pz: resolvedPos.z,
    classification,
    state: explicitState,
    spectralType,
    multiplicity,
    planets,
    velocity,
    orbit,
    reticleSize,
  });

  useEffect(() => {
    const prev = prevEntityPropsRef.current;
    const posChanged = prev.px !== resolvedPos.x || prev.py !== resolvedPos.y || prev.pz !== resolvedPos.z;
    const planetsChanged = prev.planets !== planets && (
      !prev.planets || !planets || prev.planets.length !== planets.length ||
      prev.planets.some((p, i) => p.name !== planets[i]?.name || p.classification !== planets[i]?.classification)
    );
    const orbitChanged = prev.orbit !== orbit && (
      prev.orbit?.semiMajorAxis !== orbit?.semiMajorAxis ||
      prev.orbit?.eccentricity !== orbit?.eccentricity ||
      prev.orbit?.inclination !== orbit?.inclination ||
      prev.orbit?.ascendingNode !== orbit?.ascendingNode ||
      prev.orbit?.argumentOfPeriapsis !== orbit?.argumentOfPeriapsis
    );
    const velocityChanged = !isVelocityEqual(prev.velocity, velocity);

    if (
      prev.name !== name ||
      posChanged ||
      prev.classification !== classification ||
      prev.state !== explicitState ||
      prev.spectralType !== spectralType ||
      prev.multiplicity !== multiplicity ||
      prev.reticleSize !== reticleSize ||
      planetsChanged ||
      orbitChanged ||
      velocityChanged
    ) {
      prevEntityPropsRef.current = {
        name,
        px: resolvedPos.x,
        py: resolvedPos.y,
        pz: resolvedPos.z,
        classification,
        state: explicitState,
        spectralType,
        multiplicity,
        planets,
        velocity,
        orbit,
        reticleSize,
      };

      storeApi.getState().updateEntity(id, {
        name,
        position: resolvedPos,
        classification,
        state: explicitState,
        spectralType,
        multiplicity,
        planets,
        velocity,
        orbit,
        reticleSize,
      });
    }
  });

  // Occlusion evaluation refs
  const footprintRef = useRef<CelestialFootprint>({
    id,
    name,
    state: activeState,
    worldPos: [resolvedPos.x, resolvedPos.y, resolvedPos.z],
    classification,
    reticleSize,
    multiplicity,
    planets,
    screenX: 0,
    screenY: 0,
    camDist: 0,
    reticleRadius: reticleSize,
    starRadius: 0.035,
    hasReticle: activeState !== 'passive',
    visible: true,
    updatedAt: 0,
  });

  // Keep footprint state fresh
  useEffect(() => {
    footprintRef.current.name = name;
    footprintRef.current.state = activeState;
    footprintRef.current.hasReticle = activeState !== 'passive';
    footprintRef.current.reticleSize = reticleSize;
    footprintRef.current.multiplicity = multiplicity;
    footprintRef.current.planets = planets;
    if (footprintRef.current.worldPos) {
      footprintRef.current.worldPos[0] = resolvedPos.x;
      footprintRef.current.worldPos[1] = resolvedPos.y;
      footprintRef.current.worldPos[2] = resolvedPos.z;
    }
  }, [name, activeState, reticleSize, multiplicity, planets, resolvedPos]);

  useEffect(() => {
    if (enableOcclusion) {
      celestialOcclusionManager.register(footprintRef.current);
      return () => {
        celestialOcclusionManager.unregister(id);
      };
    }
  }, [enableOcclusion, id]);

  const scratchNdcRef = useRef(new THREE.Vector3());
  const scratchWorldPosRef = useRef(new THREE.Vector3());

  useFrame(({ camera, size }) => {
    if (!enableOcclusion) return;

    // Batch Occlusion Optimization: If OcclusionPass is evaluating projections in a single batch pass,
    // skip duplicate per-entity projection matrix multiplications.
    if (celestialOcclusionManager.isBatchEvaluating()) {
      return;
    }

    scratchWorldPosRef.current.copy(resolvedPos);
    const camDist = Math.max(camera.position.distanceTo(scratchWorldPosRef.current), 1e-4);
    const ndc = scratchNdcRef.current.copy(scratchWorldPosRef.current).project(camera);
    const isBehindCamera = ndc.z > 1.0;
    const screenX = (ndc.x * 0.5 + 0.5) * size.width;
    const screenY = (-ndc.y * 0.5 + 0.5) * size.height;
    const reticleRadiusPx = (reticleSize / 13.644) * size.height;

    const fp = footprintRef.current;
    fp.screenX = screenX;
    fp.screenY = screenY;
    fp.camDist = camDist;
    fp.reticleRadius = reticleRadiusPx;
    fp.visible = !isBehindCamera;
    fp.updatedAt = performance.now();

    celestialOcclusionManager.register(fp);
  });

  // Single-Stalk Rule (§2.4): Drop stalk renders for selected or focused entities.
  // Stays mounted during retraction (250ms) to ensure smooth exit animation before unmounting.
  const isStalkTier = activeState === 'selected' || activeState === 'focused';
  const [stalkMounted, setStalkMounted] = useState(isStalkTier);

  useEffect(() => {
    if (isStalkTier) {
      setStalkMounted(true);
    } else {
      const timer = setTimeout(() => {
        setStalkMounted(false);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [isStalkTier]);

  const shouldRenderStalk = explicitShowStalk ?? stalkMounted;
  const isPassive = activeState === 'passive';

  return (
    <group
      position={resolvedPos}
      data-position={`${resolvedPos.x},${resolvedPos.y},${resolvedPos.z}`}
      name={`celestial-entity-${id}`}
    >
      {/* Layer 1: Physical System Node (Monochrome, Invariant Screen Size) */}
      <BodyMarker
        id={id}
        position={[0, 0, 0]}
        reticleSize={reticleSize}
        state={activeState}
        debugHitarea={debugHitarea}
        interactive={!isPassive}
        onClick={isPassive ? undefined : (targetId, e) => {
          storeApi.getState().setSelected(targetId);
          onClick?.(targetId, e);
        }}
        onPointerOver={isPassive ? undefined : (targetId, e) => {
          storeApi.getState().setHovered(targetId);
          if (typeof document !== 'undefined') {
            document.body.style.cursor = 'pointer';
          }
          onPointerOver?.(targetId, e);
        }}
        onPointerOut={isPassive ? undefined : (targetId, e) => {
          storeApi.getState().setHovered(null);
          if (typeof document !== 'undefined') {
            document.body.style.cursor = 'auto';
          }
          onPointerOut?.(targetId, e);
        }}
      />

      {/* Layer 2: Tactical Geometric Reticle (Universal Taxonomy Frames) */}
      {activeState !== 'passive' && (
        <Reticle
          id={id}
          position={[0, 0, 0]}
          classification={classification}
          state={activeState}
          size={reticleSize}
          multiplicity={multiplicity}
          planets={planets}
          spectralType={spectralType}
        />
      )}

      {/* Layer 3: Typographic Label */}
      {explicitShowLabel && (
        <EntityLabel
          id={id}
          name={name}
          position={[0, 0, 0]}
          spectralType={spectralType}
          state={activeState}
          reticleSize={reticleSize}
          footprintRef={footprintRef}
        />
      )}

      {/* State-Driven Drop Stalk (§2.4) */}
      {shouldRenderStalk && (
        <DropStalk
          id={id}
          position={[0, 0, 0]}
          entityZ={resolvedPos.z}
          state={activeState}
          classification={classification}
          footprintSize={reticleSize}
        />
      )}

      {/* Projected Kinematic Velocity Vector (§5) */}
      {resolvedVelocity && (
        <KinematicVector
          id={id}
          position={[0, 0, 0]}
          velocity={resolvedVelocity}
          state={activeState}
        />
      )}

      {/* Keplerian Orbit Path (§4.4) */}
      {orbit && (
        <OrbitPath
          id={id}
          semiMajorAxis={orbit.semiMajorAxis}
          eccentricity={orbit.eccentricity}
          inclination={orbit.inclination}
          ascendingNode={orbit.ascendingNode}
          argumentOfPeriapsis={orbit.argumentOfPeriapsis}
          state={activeState}
          color={orbit.color}
          lineStyle={orbit.lineStyle}
          showPeriapsisTick={orbit.showPeriapsisTick}
          showDirectionIndicator={orbit.showDirectionArrow}
          position={orbitOffset}
        />
      )}

      {children}
    </group>
  );
};
