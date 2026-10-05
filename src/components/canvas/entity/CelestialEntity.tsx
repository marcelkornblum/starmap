import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { type ThreeEvent, useFrame } from '@react-three/fiber';
import { useLazyRef } from '../../../hooks/useLazyRef';
import { useSpatialEntityStoreApi, useSpatialEntityStore, useEntityTier } from './SpatialEntityContext';
import { BodyMarker } from './BodyMarker';
import { Reticle } from './Reticle';
import { DropStalk } from './DropStalk';
import { KinematicVector } from './KinematicVector';
import { OrbitPath } from './OrbitPath';
import { EntityLabel } from './EntityLabel';
import { useSpatialFrameSafe } from '../instrument/SpatialFrameProvider';
import {
  celestialOcclusionManager,
  type CelestialFootprint,
} from '../cartography/celestialOcclusionRegistry';
import { DEFAULT_RETICLE_SIZE } from '../cartography/reticleGeometry';
import { reticleSizeToScreenPx } from '../engineConfig';
import { calculateKeplerianPosition, calculateKeplerianVelocity } from '../math/kepler';
import {
  projectedPixelDiameter,
  nodeVisibility,
  DEFAULT_BODY_MIN_PIXEL_SIZE,
  DEFAULT_BODY_FADE_RANGE,
  CROSSFADE_VISIBILITY_EPSILON,
} from '../math/bodyCrossfade';
import {
  activateEntity,
  focusEntity,
  occlusionCyclicTargetResolver,
} from './interactionActions';
import type {
  SpatialEntityDefinition,
  CelestialInteractionState,
} from './types';

export interface CelestialEntityProps extends Partial<SpatialEntityDefinition> {
  id: string;
  name: string;
  position?: [number, number, number] | THREE.Vector3;
  debugHitarea?: boolean;
  stateOverride?: CelestialInteractionState;
  bodyRadius?: number;
  bodyMinPixelSize?: number;
  bodyFadeRange?: number;
  onClick?: (id: string, e: ThreeEvent<MouseEvent>) => void;
  onDoubleClick?: (id: string, e: ThreeEvent<MouseEvent>) => void;
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
  stateOverride,
  spectralType,
  multiplicity = 1,
  planets,
  velocity,
  orbit,
  debugHitarea = false,
  bodyRadius,
  bodyMinPixelSize,
  bodyFadeRange,
  onClick,
  onDoubleClick,
  onPointerOver,
  onPointerOut,
  children,
}) => {
  const storeApi = useSpatialEntityStoreApi();
  const nodeGroupRef = useRef<THREE.Group>(null);
  const nodeAlphaRef = useRef(1);
  const hasBodyCrossfade = bodyRadius !== undefined && bodyRadius > 0;

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

  const frameCtx = useSpatialFrameSafe();

  // Seed initial aperture containment synchronously for SSR & first render pass
  if (frameCtx?.frameRef?.current) {
    const { focusPoint, apertureRadius } = frameCtx.frameRef.current;
    const inAperture = resolvedPos.distanceTo(focusPoint) <= apertureRadius;
    if (inAperture && !storeApi.getState().apertureIds.has(id)) {
      storeApi.getState().setEntityInAperture(id, true);
    }
  }

  // Derived visual tier from authoritative FSM store (§2.1 / §2.2)
  const storeTier = useEntityTier(id);
  const activeState = stateOverride ?? storeTier;

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
        spectralType,
        multiplicity,
        planets,
        velocity: resolvedVelocity,
        orbit,
        bodyRadius,
        bodyMinPixelSize,
        bodyFadeRange,
      });
    } else {
      store.updateEntity(id, {
        name,
        position: resolvedPos,
        classification,
        spectralType,
        multiplicity,
        planets,
        velocity: resolvedVelocity,
        orbit,
        bodyRadius,
        bodyMinPixelSize,
        bodyFadeRange,
      });
    }
  }, [
    id,
    name,
    resolvedPos,
    classification,
    spectralType,
    multiplicity,
    planets,
    resolvedVelocity,
    orbit,
    bodyRadius,
    bodyMinPixelSize,
    bodyFadeRange,
    storeApi,
  ]);

  // Occlusion evaluation refs
  const footprintRef = useRef<CelestialFootprint>({
    id,
    name,
    state: activeState,
    worldPos: [resolvedPos.x, resolvedPos.y, resolvedPos.z],
    classification,
    reticleSize: DEFAULT_RETICLE_SIZE,
    multiplicity,
    planets,
    screenX: 0,
    screenY: 0,
    camDist: 0,
    reticleRadius: DEFAULT_RETICLE_SIZE,
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
    footprintRef.current.reticleSize = DEFAULT_RETICLE_SIZE;
    footprintRef.current.multiplicity = multiplicity;
    footprintRef.current.planets = planets;
    if (footprintRef.current.worldPos) {
      footprintRef.current.worldPos[0] = resolvedPos.x;
      footprintRef.current.worldPos[1] = resolvedPos.y;
      footprintRef.current.worldPos[2] = resolvedPos.z;
    }
  }, [name, activeState, multiplicity, planets, resolvedPos]);

  useEffect(() => {
    celestialOcclusionManager.register(footprintRef.current);
    return () => {
      celestialOcclusionManager.unregister(id);
    };
  }, [id]);

  const scratchNdcRef = useLazyRef(() => new THREE.Vector3());
  const scratchWorldPosRef = useLazyRef(() => new THREE.Vector3());
  const scratchCamSpaceRef = useLazyRef(() => new THREE.Vector3());

  useFrame(({ camera, size }) => {
    // 1. Physical body cross-fade (§4: Seamless PlanetBody to Node Takeover).
    // Publishes a node alpha consumed by BodyMarker and Reticle; never mutates child materials.
    if (hasBodyCrossfade && bodyRadius !== undefined && nodeGroupRef.current) {
      const worldPos = nodeGroupRef.current.getWorldPosition(scratchWorldPosRef.current);
      const diameterPx = projectedPixelDiameter(camera, worldPos, bodyRadius, size.height);
      const alpha = nodeVisibility(
        diameterPx,
        bodyMinPixelSize ?? DEFAULT_BODY_MIN_PIXEL_SIZE,
        bodyFadeRange ?? DEFAULT_BODY_FADE_RANGE,
      );
      nodeAlphaRef.current = alpha;
      nodeGroupRef.current.visible = alpha > CROSSFADE_VISIBILITY_EPSILON;
    }

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
    const reticleRadiusPx = reticleSizeToScreenPx(DEFAULT_RETICLE_SIZE, size.height);

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

  return (
    <group
      position={resolvedPos}
      data-position={`${resolvedPos.x},${resolvedPos.y},${resolvedPos.z}`}
      name={`celestial-entity-${id}`}
    >
      {/* Node Representation Group (Cross-fades inversely when bodyRadius is provided) */}
      <group ref={nodeGroupRef} name={`node-representation-${id}`}>
        {/* Layer 1: Physical System Node (Monochrome, Invariant Screen Size) */}
        <BodyMarker
          id={id}
          position={[0, 0, 0]}
          reticleSize={DEFAULT_RETICLE_SIZE}
          debugHitarea={debugHitarea}
          interactive={activeState !== 'passive'}
          nodeAlphaRef={hasBodyCrossfade ? nodeAlphaRef : undefined}
          onClick={(targetId, e) => {
            if (activeState === 'passive') return;
            if (onClick) {
              onClick(targetId, e);
            } else {
              activateEntity(storeApi, targetId, occlusionCyclicTargetResolver);
            }
          }}
          onDoubleClick={(targetId, e) => {
            if (activeState === 'passive') return;
            if (onDoubleClick) {
              onDoubleClick(targetId, e);
            } else {
              focusEntity(storeApi, targetId);
            }
          }}
          onPointerOver={(targetId, e) => {
            if (activeState === 'passive') return;
            storeApi.getState().setHovered(targetId);
            onPointerOver?.(targetId, e);
          }}
          onPointerOut={(targetId, e) => {
            if (activeState === 'passive') return;
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
            size={DEFAULT_RETICLE_SIZE}
            multiplicity={multiplicity}
            planets={planets}
            spectralType={spectralType}
            nodeAlphaRef={hasBodyCrossfade ? nodeAlphaRef : undefined}
          />
        )}
      </group>

      {/* Layer 3: Typographic Label */}
      {activeState !== 'passive' && (
        <EntityLabel
          id={id}
          name={name}
          position={[0, 0, 0]}
          spectralType={spectralType}
          state={activeState}
          reticleSize={DEFAULT_RETICLE_SIZE}
          footprintRef={footprintRef}
        />
      )}

      {/* State-Driven Drop Stalk (§2.4) */}
      {stalkMounted && (
        <DropStalk
          id={id}
          position={[0, 0, 0]}
          entityZ={resolvedPos.z}
          state={activeState}
          classification={classification}
          footprintSize={DEFAULT_RETICLE_SIZE}
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
