import React, { useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import * as THREE from 'three';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useThreeTokenStore } from '../../../stores/useThreeTokenStore';
import { useLazyRef } from '../../../hooks/useLazyRef';

import { useOcclusionManager } from './SpatialEntityContext';
import { useEntityDotsBatchRegistry } from './entityDotsBatchContext';
import { useSpatialFrameSafe } from '../instrument/spatialFrameContext';
import { DEFAULT_RETICLE_SIZE } from '../cartography/reticleGeometry';
import { NOOP_RAYCAST, resolveEntityScreenInvariantScale, reticleSizeToScreenPx } from '../engineConfig';
import type { NodeAlphaRef } from './types';

export interface BodyMarkerProps {
  id: string;
  position: [number, number, number] | THREE.Vector3;
  worldPosition?: THREE.Vector3 | readonly [number, number, number];
  pixelSize?: number;
  hitRadius?: number;
  reticleSize?: number;
  color?: string | THREE.Color;
  interactive?: boolean;
  debugHitarea?: boolean;
  /** Optional cross-fade alpha driving the dot opacity each frame (hit area is unaffected). */
  nodeAlphaRef?: NodeAlphaRef;
  onClick?: (id: string, e: ThreeEvent<MouseEvent>) => void;
  onDoubleClick?: (id: string, e: ThreeEvent<MouseEvent>) => void;
  onPointerOver?: (id: string, e: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: (id: string, e: ThreeEvent<PointerEvent>) => void;
}

const SHARED_DOT_GEOMETRY = new THREE.SphereGeometry(0.5, 16, 16);
const SHARED_HITAREA_GEOMETRY = new THREE.CircleGeometry(1.0, 32);
const SHARED_HITAREA_INVISIBLE_MATERIAL = new THREE.MeshBasicMaterial({
  transparent: true,
  opacity: 0,
  depthWrite: false,
  side: THREE.DoubleSide,
});
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

function getPointerCoord(e: ThreeEvent<PointerEvent>): { x: number; y: number } {
  const n = e.nativeEvent as (PointerEvent | MouseEvent | undefined);
  return {
    x: typeof e.clientX === 'number' ? e.clientX : (typeof n?.clientX === 'number' ? n.clientX : 0),
    y: typeof e.clientY === 'number' ? e.clientY : (typeof n?.clientY === 'number' ? n.clientY : 0),
  };
}

/**
 * BodyMarker (Layer 1: Physical System Node):
 * Renders central celestial marker at strictly invariant screen-pixel size in monochrome.
 * Features camera-facing invisible hitarea mesh for pointer interactions.
 */
export const BodyMarker: React.FC<BodyMarkerProps> = React.memo(({
  id,
  position,
  worldPosition,
  pixelSize = 5,
  hitRadius,
  reticleSize,
  color,
  interactive = true,
  debugHitarea = false,
  nodeAlphaRef,
  onClick,
  onDoubleClick,
  onPointerOver,
  onPointerOut,
}) => {
  const reticleBracketColor = useThreeTokenStore((s) => s.tokens.reticleBracketColor);
  const stateFocus = useThreeTokenStore((s) => s.tokens.stateFocus);
  const invalidate = useThree((s) => s.invalidate);

  const [posX, posY, posZ] = position instanceof THREE.Vector3 ? [position.x, position.y, position.z] : position;

  const markerRef = useRef<THREE.Mesh | null>(null);
  const markerMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const hitareaRef = useRef<THREE.Mesh | null>(null);
  const billboardRef = useRef<THREE.Group | null>(null);
  const groupRef = useLazyRef<THREE.Group | null>(() => {
    const g = new THREE.Group();
    g.position.set(posX, posY, posZ);
    return g;
  });
  const worldPosRef = useLazyRef(() => new THREE.Vector3());
  const occlusionManager = useOcclusionManager();
  const batchRegistry = useEntityDotsBatchRegistry();
  const isBatched = batchRegistry !== null;
  const frameCtx = useSpatialFrameSafe();

  const setMarkerRef = useCallback((node: THREE.Mesh | null) => {
    if (node === null || 'isMesh' in node) markerRef.current = node;
  }, []);
  const setHitareaRef = useCallback((node: THREE.Mesh | null) => {
    if (node === null || 'isMesh' in node) hitareaRef.current = node;
  }, []);
  const setBillboardRef = useCallback((node: THREE.Group | null) => {
    if (node === null || 'isGroup' in node) billboardRef.current = node;
  }, []);
  const setGroupRef = useCallback((node: THREE.Group | null) => {
    if (node === null || 'isGroup' in node) groupRef.current = node;
  }, [groupRef]);

  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const hasSyncedFrameRef = useRef(false);
  const lastAlphaRef = useRef(Number.NaN);
  const lastBillboardSyncRef = useRef({
    qx: Number.NaN, qy: Number.NaN, qz: Number.NaN, qw: Number.NaN,
    scale: Number.NaN, hx: Number.NaN, hy: Number.NaN,
  });

  useIsomorphicLayoutEffect(() => {
    if (!batchRegistry) return;
    if (groupRef.current) {
      groupRef.current.position.set(posX, posY, posZ);
    }
    batchRegistry.register({
      id,
      groupRef,
      worldPosition,
      pixelSize,
      color,
      nodeAlphaRef,
    });
    return () => {
      batchRegistry.unregister(id);
    };
  }, [batchRegistry, id, posX, posY, posZ, worldPosition, pixelSize, color, nodeAlphaRef, groupRef]);

  useEffect(() => {
    lastBillboardSyncRef.current.qx = Number.NaN;
    hasSyncedFrameRef.current = false;
    invalidate();
  }, [id, posX, posY, posZ, worldPosition, pixelSize, hitRadius, reticleSize, interactive, debugHitarea, invalidate]);

  const triggerClick = useCallback(
    (e: ThreeEvent<MouseEvent | PointerEvent>) => {
      onClick?.(id, e as unknown as ThreeEvent<MouseEvent>);
    },
    [id, onClick],
  );

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    pointerDownPosRef.current = getPointerCoord(e);
  }, []);

  const handlePointerUp = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      if (!pointerDownPosRef.current) return;
      const startX = pointerDownPosRef.current.x;
      const startY = pointerDownPosRef.current.y;
      pointerDownPosRef.current = null;
      const { x, y } = getPointerCoord(e);
      const distance = Math.hypot(x - startX, y - startY);
      if (distance <= 8) {
        triggerClick(e);
      }
    },
    [triggerClick],
  );

  useEffect(() => {
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, []);

  useFrame(({ camera, size }) => {
    if (!groupRef.current) return;
    if (isBatched && !interactive) return;

    if (!isBatched && nodeAlphaRef && markerMaterialRef.current) {
      const nextAlpha = nodeAlphaRef.current;
      if (lastAlphaRef.current !== nextAlpha) {
        markerMaterialRef.current.opacity = nextAlpha;
        lastAlphaRef.current = nextAlpha;
      }
    }

    if (
      hasSyncedFrameRef.current &&
      occlusionManager.isBatchEvaluating() &&
      !occlusionManager.didCameraOrFootprintsChange()
    ) {
      return;
    }
    hasSyncedFrameRef.current = true;

    // 1. Retrieve the actual world position of this node (supports arbitrary parent transforms)
    groupRef.current.position.set(posX, posY, posZ);
    if (worldPosition) {
      if (worldPosition instanceof THREE.Vector3) {
        worldPosRef.current.copy(worldPosition);
      } else {
        worldPosRef.current.set(worldPosition[0], worldPosition[1], worldPosition[2]);
      }
    } else {
      groupRef.current.getWorldPosition(worldPosRef.current);
    }
    const camDist = Math.max(camera.position.distanceTo(worldPosRef.current), 1e-4);

    if (!isBatched && markerRef.current) {
      let worldScale = (pixelSize / Math.max(size.height, 1)) * 2;
      if (camera instanceof THREE.PerspectiveCamera) {
        const vFovRad = (camera.fov * Math.PI) / 180;
        worldScale *= (Math.tan(vFovRad / 2) * camDist) / Math.max(camera.zoom, 1e-4);
      } else if (camera instanceof THREE.OrthographicCamera) {
        worldScale *= (camera.top - camera.bottom) / (2 * Math.max(camera.zoom, 1e-4));
      }
      markerRef.current.scale.set(worldScale, worldScale, worldScale);
    }

    // 2. Align invisible hitarea to face camera directly with invariant screen footprint matching reticle
    if (interactive && billboardRef.current && hitareaRef.current) {
      const invScale = resolveEntityScreenInvariantScale(
        camDist,
        camera,
        frameCtx?.frameRef?.current,
      );
      const rSize = reticleSize ?? DEFAULT_RETICLE_SIZE;
      const effectiveHitRadius = (hitRadius ?? rSize) * invScale;

      // Interactive Hit-Testing Fan-Out (Spec 2.2):
      // When systems overlap in screen space, underlying invisible hit areas fan out radially around cluster centroid
      const hitOffset = occlusionManager.evaluateHitAreaOffset(id);
      const reticleRadiusPx = reticleSizeToScreenPx(rSize, size.height);
      const pxToLocal = reticleRadiusPx > 0 ? (rSize * invScale) / reticleRadiusPx : 0;
      const localHitX = hitOffset.x * pxToLocal;
      const localHitY = -hitOffset.y * pxToLocal;

      const cq = camera.quaternion;
      const last = lastBillboardSyncRef.current;
      const quatChanged =
        Number.isNaN(last.qw) ||
        Math.abs(last.qx - cq.x) > 1e-6 ||
        Math.abs(last.qy - cq.y) > 1e-6 ||
        Math.abs(last.qz - cq.z) > 1e-6 ||
        Math.abs(last.qw - cq.w) > 1e-6;
      const scaleChanged =
        Number.isNaN(last.scale) ||
        Math.abs(last.scale - effectiveHitRadius) > 1e-6;
      const hitChanged =
        Number.isNaN(last.hx) ||
        Math.abs(last.hx - localHitX) > 1e-6 ||
        Math.abs(last.hy - localHitY) > 1e-6;

      if (quatChanged || scaleChanged || hitChanged) {
        billboardRef.current.quaternion.copy(cq);
        hitareaRef.current.scale.set(effectiveHitRadius, effectiveHitRadius, 1);
        hitareaRef.current.position.set(localHitX, localHitY, 0);
        billboardRef.current.updateMatrixWorld(true);

        last.qx = cq.x;
        last.qy = cq.y;
        last.qz = cq.z;
        last.qw = cq.w;
        last.scale = effectiveHitRadius;
        last.hx = localHitX;
        last.hy = localHitY;
      }
    }
  });

  return (
    <group ref={setGroupRef} position={[posX, posY, posZ]} name={`body-marker-${id}`}>
      {/* Standalone Fallback Dot when rendered outside EntityDotsBatch */}
      {!isBatched && (
        <mesh ref={setMarkerRef} name="celestial-point-dot" geometry={SHARED_DOT_GEOMETRY} raycast={NOOP_RAYCAST}>
          <meshBasicMaterial
            ref={markerMaterialRef}
            color={color ?? reticleBracketColor}
            transparent
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Camera-Facing Invisible Hitarea (Billboarded with Screen-Space Fan-Out) */}
      {interactive && (
        <group ref={setBillboardRef} name={`hitarea-billboard-${id}`}>
          <mesh
            ref={setHitareaRef}
            name="celestial-hitarea"
            geometry={SHARED_HITAREA_GEOMETRY}
            material={debugHitarea ? undefined : SHARED_HITAREA_INVISIBLE_MATERIAL}
            visible={debugHitarea}
            scale={0}
            onPointerDown={onClick ? handlePointerDown : undefined}
            onPointerUp={onClick ? handlePointerUp : undefined}
            onDoubleClick={onDoubleClick ? (e) => {
              e.stopPropagation();
              onDoubleClick(id, e);
            } : undefined}
            onPointerOver={onPointerOver ? (e) => {
              e.stopPropagation();
              if (e.pointerType === 'touch' || e.buttons > 0) return;
              if (document.body.style.cursor !== 'pointer') document.body.style.cursor = 'pointer';
              onPointerOver(id, e);
            } : undefined}
            onPointerOut={onPointerOut ? (e) => {
              e.stopPropagation();
              if (e.pointerType === 'touch' || e.buttons > 0) return;
              if (document.body.style.cursor !== 'auto') document.body.style.cursor = 'auto';
              onPointerOut(id, e);
            } : undefined}
          >
            {debugHitarea && (
              <meshBasicMaterial
                color={stateFocus}
                transparent
                opacity={0.35}
                wireframe
                depthWrite={false}
                side={THREE.DoubleSide}
              />
            )}
          </mesh>
        </group>
      )}
    </group>
  );
});

BodyMarker.displayName = 'BodyMarker';

