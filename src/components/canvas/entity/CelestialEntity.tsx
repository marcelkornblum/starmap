import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { type ThreeEvent, useFrame } from '@react-three/fiber';
import { useLazyRef } from '../../../hooks/useLazyRef';
import {
  useSpatialEntityStoreApi,
  useSpatialEntityStore,
  useEntityTier,
  useOcclusionManager,
} from './SpatialEntityContext';
import { BodyMarker } from './BodyMarker';
import { Reticle } from './Reticle';
import { DropStalk } from './DropStalk';
import { KinematicVector } from './KinematicVector';
import { OrbitPath } from './OrbitPath';
import { EntityLabel } from './EntityLabel';
import { useSpatialFrameSafe } from '../instrument/spatialFrameContext';
import { useActiveStarsStore } from '../../../stores/useActiveStarsStore';
import { getApertureActiveCutoffForViewportWidth } from '../../../services/deviceTierService';
import { DEFAULT_RETICLE_SIZE } from '../cartography/reticleGeometry';
import {
  projectedPixelDiameter,
  nodeVisibility,
  DEFAULT_BODY_MIN_PIXEL_SIZE,
  DEFAULT_BODY_FADE_RANGE,
  CROSSFADE_VISIBILITY_EPSILON,
} from '../math/bodyCrossfade';
import type {
  SpatialEntityDefinition,
  CelestialInteractionState,
} from '../../../types/spatial';
import {
  areCelestialEntityPropsEqual,
  resolvePrimaryEntityPosition,
  resolveKeplerianEntityPosition,
  resolveEntityVelocity,
  calculateOrbitOffset,
} from './celestialEntityHelpers';
import { useCelestialEntityInteractions } from './useCelestialEntityInteractions';
import { useCelestialEntityOcclusion } from './useCelestialEntityOcclusion';

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

const ZERO_POS: [number, number, number] = [0, 0, 0];

interface BodyCrossfadeTrackerProps {
  readonly nodeGroupRef: React.RefObject<THREE.Group | null>;
  readonly nodeAlphaRef: React.RefObject<number>;
  readonly bodyRadius: number;
  readonly bodyMinPixelSize?: number;
  readonly bodyFadeRange?: number;
}

const BodyCrossfadeTracker: React.FC<BodyCrossfadeTrackerProps> = ({
  nodeGroupRef,
  nodeAlphaRef,
  bodyRadius,
  bodyMinPixelSize,
  bodyFadeRange,
}) => {
  const scratchWorldPosRef = useLazyRef(() => new THREE.Vector3());

  useFrame(({ camera, size }) => {
    if (nodeGroupRef.current) {
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
  });

  return null;
};

const CelestialEntityComponent: React.FC<CelestialEntityProps> = ({
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
  const occlusionManager = useOcclusionManager();
  const nodeGroupRef = useRef<THREE.Group>(null);
  const nodeAlphaRef = useRef(1);
  const hasBodyCrossfade = bodyRadius !== undefined && bodyRadius > 0;

  const primaryEntityPos = useSpatialEntityStore((s) => {
    if (!orbit?.primaryEntityId) return null;
    return s.entities[orbit.primaryEntityId]?.position ?? null;
  });

  const resolvedPrimaryPos = useMemo(
    () => resolvePrimaryEntityPosition(primaryEntityPos, orbit?.primaryPosition ?? null),
    [primaryEntityPos, orbit?.primaryPosition],
  );

  const resolvedPos = useMemo(
    () => resolveKeplerianEntityPosition(position, orbit, resolvedPrimaryPos),
    [position, orbit, resolvedPrimaryPos],
  );

  const frameCtx = useSpatialFrameSafe();

  useEffect(() => {
    if (frameCtx?.frameRef?.current) {
      const { summaries, isHydrated } = useActiveStarsStore.getState();
      if (!isHydrated || summaries.length > getApertureActiveCutoffForViewportWidth()) return;
      const { focusPoint, apertureRadius } = frameCtx.frameRef.current;
      if (resolvedPos.distanceTo(focusPoint) <= apertureRadius && !storeApi.getState().apertureIds.has(id)) {
        storeApi.getState().setEntityInAperture(id, true);
      }
    }
  }, [frameCtx, resolvedPos, id, storeApi]);

  const storeTier = useEntityTier(id);
  const activeState = stateOverride ?? storeTier;
  const suppressActiveLabels = useSpatialEntityStore((s) => s.apertureIds.size > 10);

  const resolvedVelocity = useMemo(() => resolveEntityVelocity(velocity, orbit), [velocity, orbit]);
  const orbitOffset = useMemo(() => calculateOrbitOffset(resolvedPrimaryPos, resolvedPos), [resolvedPrimaryPos, resolvedPos]);

  useEffect(() => () => { storeApi.getState().unregisterEntity(id); }, [storeApi, id]);

  useEffect(() => {
    const store = storeApi.getState();
    const entityPayload = {
      id, name, position: resolvedPos, classification, spectralType, multiplicity,
      planets, velocity: resolvedVelocity, orbit, bodyRadius, bodyMinPixelSize, bodyFadeRange,
    };
    if (!store.entities[id]) store.registerEntity(entityPayload);
    else store.updateEntity(id, entityPayload);
  }, [id, name, resolvedPos, classification, spectralType, multiplicity, planets, resolvedVelocity, orbit, bodyRadius, bodyMinPixelSize, bodyFadeRange, storeApi]);

  const { footprintRef } = useCelestialEntityOcclusion({
    id, name, activeState, classification, multiplicity, planets, resolvedPos, occlusionManager,
  });

  const isStalkTier = (activeState === 'selected' || activeState === 'focused') && Math.abs(resolvedPos.z) > 1e-4;
  const [isRetracting, setIsRetracting] = useState(false);
  const [prevIsStalkTier, setPrevIsStalkTier] = useState(isStalkTier);

  if (prevIsStalkTier !== isStalkTier) {
    setPrevIsStalkTier(isStalkTier);
    setIsRetracting(!isStalkTier);
  }

  useEffect(() => {
    if (!isRetracting) return;
    const timer = setTimeout(() => { setIsRetracting(false); }, 250);
    return () => clearTimeout(timer);
  }, [isRetracting]);

  const stalkMounted = isStalkTier || isRetracting;

  const {
    handleMarkerClick,
    handleMarkerDoubleClick,
    handleMarkerPointerOver,
    handleMarkerPointerOut,
  } = useCelestialEntityInteractions({
    activeState, storeApi, occlusionManager, onClick, onDoubleClick, onPointerOver, onPointerOut,
  });

  return (
    <group position={resolvedPos} userData={{ position: `${resolvedPos.x},${resolvedPos.y},${resolvedPos.z}` }} name={`celestial-entity-${id}`}>
      {hasBodyCrossfade && bodyRadius !== undefined && (
        <BodyCrossfadeTracker
          nodeGroupRef={nodeGroupRef}
          nodeAlphaRef={nodeAlphaRef}
          bodyRadius={bodyRadius}
          bodyMinPixelSize={bodyMinPixelSize}
          bodyFadeRange={bodyFadeRange}
        />
      )}
      <group ref={nodeGroupRef} name={`node-representation-${id}`}>
        <BodyMarker
          id={id} position={ZERO_POS} worldPosition={resolvedPos} reticleSize={DEFAULT_RETICLE_SIZE}
          debugHitarea={debugHitarea} interactive={activeState !== 'passive'}
          nodeAlphaRef={hasBodyCrossfade ? nodeAlphaRef : undefined}
          onClick={handleMarkerClick} onDoubleClick={handleMarkerDoubleClick}
          onPointerOver={handleMarkerPointerOver} onPointerOut={handleMarkerPointerOut}
        />
        {activeState !== 'passive' && (
          <Reticle
            id={id} position={ZERO_POS} worldPosition={resolvedPos} classification={classification}
            state={activeState} size={DEFAULT_RETICLE_SIZE} multiplicity={multiplicity} planets={planets}
            spectralType={spectralType} nodeAlphaRef={hasBodyCrossfade ? nodeAlphaRef : undefined}
          />
        )}
      </group>

      {(activeState === 'selected' || activeState === 'focused' || (activeState === 'active' && !suppressActiveLabels)) && (
        <EntityLabel
          id={id} name={name} position={ZERO_POS} worldPosition={resolvedPos}
          spectralType={spectralType} state={activeState} reticleSize={DEFAULT_RETICLE_SIZE} footprintRef={footprintRef}
        />
      )}

      {stalkMounted && (
        <DropStalk
          id={id} position={ZERO_POS} entityZ={resolvedPos.z} state={activeState}
          classification={classification} footprintSize={DEFAULT_RETICLE_SIZE}
        />
      )}

      {resolvedVelocity && (
        <KinematicVector id={id} position={ZERO_POS} velocity={resolvedVelocity} state={activeState} />
      )}

      {orbit && (
        <OrbitPath
          id={id} semiMajorAxis={orbit.semiMajorAxis} eccentricity={orbit.eccentricity}
          inclination={orbit.inclination} ascendingNode={orbit.ascendingNode}
          argumentOfPeriapsis={orbit.argumentOfPeriapsis} state={activeState} color={orbit.color}
          lineStyle={orbit.lineStyle} showPeriapsisTick={orbit.showPeriapsisTick}
          showDirectionIndicator={orbit.showDirectionArrow} position={orbitOffset}
        />
      )}

      {children}
    </group>
  );
};

export const CelestialEntity = React.memo(CelestialEntityComponent, areCelestialEntityPropsEqual);
CelestialEntity.displayName = 'CelestialEntity';
