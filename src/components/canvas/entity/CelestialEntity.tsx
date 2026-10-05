import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { type ThreeEvent, useFrame } from '@react-three/fiber';
import { useLazyRef } from '../../../hooks/useLazyRef';
import { useSpatialEntityStoreApi, useSpatialEntityStore } from './SpatialEntityContext';
import { BodyMarker } from './BodyMarker';
import { Reticle } from './Reticle';
import { DropStalk } from './DropStalk';
import { KinematicVector } from './KinematicVector';
import { OrbitPath } from './OrbitPath';
import { EntityLabel } from './EntityLabel';
import { useSpatialFrame } from '../instrument/SpatialFrameProvider';
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
  const { frameRef } = useSpatialFrame();

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

  // Focal aperture (R_fin) proximity check (§2.1):
  // Entities within R_fin of the camera focal point are 'active' (display tactical taxonomy reticle).
  // Entities beyond R_fin remain 'passive' baseline unreticled dots to eliminate visual clutter.
  const [isInAperture, setIsInAperture] = useState<boolean>(() => {
    const fp = frameRef?.current?.focusPoint ?? new THREE.Vector3(0, 0, 0);
    const r = frameRef?.current?.apertureRadius ?? 10;
    return resolvedPos.distanceTo(fp) <= r;
  });
  const isInApertureRef = useRef(isInAperture);

  const isHovered = useSpatialEntityStore((s) => s.hoveredId === id);
  const isSelected = useSpatialEntityStore((s) => s.selectedId === id);
  const isFocused = useSpatialEntityStore((s) => s.focusedId === id);
  const storedEntityState = useSpatialEntityStore((s) => s.entities[id]?.state);

  const baseState: CelestialInteractionState = isInAperture ? 'active' : 'passive';
  let activeState: CelestialInteractionState;
  if (isFocused || explicitState === 'focused') {
    activeState = 'focused';
  } else if (isHovered || isSelected || explicitState === 'selected') {
    activeState = 'selected';
  } else if (explicitState) {
    activeState = explicitState;
  } else if (storedEntityState) {
    activeState = storedEntityState;
  } else {
    activeState = baseState;
  }

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
      Math.abs(ox) < 1e-6 ? 0 : ox,
      Math.abs(oy) < 1e-6 ? 0 : oy,
      Math.abs(oz) < 1e-6 ? 0 : oz,
    ];
  }, [resolvedPrimaryPos.x, resolvedPrimaryPos.y, resolvedPrimaryPos.z, resolvedPos.x, resolvedPos.y, resolvedPos.z]);

  // Unregister entity from SpatialEntityStore on unmount or id change
  useEffect(() => {
    return () => {
      storeApi.getState().unregisterEntity(id);
    };
  }, [storeApi, id]);

  // Synchronize entity registration and prop changes to SpatialEntityStore cleanly
  useEffect(() => {
    const store = storeApi.getState();
    if (!store.entities[id]) {
      store.registerEntity({
        id,
        name,
        position: resolvedPos,
        classification,
        state: explicitState,
        spectralType,
        multiplicity,
        planets,
        velocity: resolvedVelocity,
        orbit,
        reticleSize,
      });
    } else {
      store.updateEntity(id, {
        name,
        position: resolvedPos,
        classification,
        state: explicitState,
        spectralType,
        multiplicity,
        planets,
        velocity: resolvedVelocity,
        orbit,
        reticleSize,
      });
    }
  }, [
    id,
    name,
    resolvedPos,
    classification,
    explicitState,
    spectralType,
    multiplicity,
    planets,
    resolvedVelocity,
    orbit,
    reticleSize,
    storeApi,
  ]);

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

  const scratchNdcRef = useLazyRef(() => new THREE.Vector3());
  const scratchWorldPosRef = useLazyRef(() => new THREE.Vector3());
  const scratchCamSpaceRef = useLazyRef(() => new THREE.Vector3());

  useFrame(({ camera, size }) => {
    // 1. Evaluate focal aperture boundary crossing (R_fin)
    if (frameRef?.current) {
      const fp = frameRef.current.focusPoint;
      const r = frameRef.current.apertureRadius;
      const inAperture = resolvedPos.distanceTo(fp) <= r;
      if (inAperture !== isInApertureRef.current) {
        isInApertureRef.current = inAperture;
        setIsInAperture(inAperture);
      }
    }

    if (!enableOcclusion) return;

    // Batch Occlusion Optimization: If OcclusionPass is evaluating projections in a single batch pass,
    // skip duplicate per-entity projection matrix multiplications.
    if (celestialOcclusionManager.isBatchEvaluating()) {
      return;
    }

    scratchWorldPosRef.current.copy(resolvedPos);
    const camDist = Math.max(camera.position.distanceTo(scratchWorldPosRef.current), 1e-4);
    const zNear = ('near' in camera && typeof camera.near === 'number') ? camera.near : 0.1;
    const isBehindCamera = scratchCamSpaceRef.current
      .copy(scratchWorldPosRef.current)
      .applyMatrix4(camera.matrixWorldInverse).z > -zNear;
    const ndc = scratchNdcRef.current.copy(scratchWorldPosRef.current).project(camera);
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
        interactive={true}
        onClick={(targetId, e) => {
          if (onClick) {
            onClick(targetId, e);
          } else {
            storeApi.getState().setSelected(targetId);
          }
        }}
        onPointerOver={(targetId, e) => {
          storeApi.getState().setHovered(targetId);
          onPointerOver?.(targetId, e);
        }}
        onPointerOut={(targetId, e) => {
          storeApi.getState().setHovered(null);
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
