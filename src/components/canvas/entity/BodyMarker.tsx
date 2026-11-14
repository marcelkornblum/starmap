import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useThreeTokenStore } from '../../../stores/useThreeTokenStore';
import { useLazyRef } from '../../../hooks/useLazyRef';

import { useOcclusionManager } from './SpatialEntityContext';
import { useSpatialFrameSafe } from '../instrument/spatialFrameContext';
import { DEFAULT_RETICLE_SIZE } from '../cartography/reticleGeometry';
import {
  resolveEntityScreenInvariantScale,
  reticleSizeToScreenPx,
} from '../engineConfig';
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

/**
 * BodyMarker (Layer 1: Physical System Node):
 * Renders central celestial marker at strictly invariant screen-pixel size in monochrome.
 * Features camera-facing invisible hitarea mesh for pointer interactions.
 */
export const BodyMarker: React.FC<BodyMarkerProps> = ({
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

  const [posX, posY, posZ] = position instanceof THREE.Vector3 ? [position.x, position.y, position.z] : position;

  const markerRef = useLazyRef<THREE.Mesh | null>(() => new THREE.Mesh());
  const markerMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const hitareaRef = useLazyRef<THREE.Mesh | null>(() => new THREE.Mesh());
  const billboardRef = useLazyRef<THREE.Group | null>(() => new THREE.Group());
  const groupRef = useLazyRef<THREE.Group | null>(() => {
    const g = new THREE.Group();
    g.position.set(posX, posY, posZ);
    return g;
  });
  const worldPosRef = useLazyRef(() => new THREE.Vector3());
  const occlusionManager = useOcclusionManager();
  const frameCtx = useSpatialFrameSafe();

  const setMarkerRef = useCallback((node: THREE.Mesh | null) => {
    if (node === null || 'isMesh' in node) markerRef.current = node;
  }, [markerRef]);
  const setHitareaRef = useCallback((node: THREE.Mesh | null) => {
    if (node === null || 'isMesh' in node) hitareaRef.current = node;
  }, [hitareaRef]);
  const setBillboardRef = useCallback((node: THREE.Group | null) => {
    if (node === null || 'isGroup' in node) billboardRef.current = node;
  }, [billboardRef]);
  const setGroupRef = useCallback((node: THREE.Group | null) => {
    if (node === null || 'isGroup' in node) groupRef.current = node;
  }, [groupRef]);

  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastBillboardSyncRef = useRef({
    qx: Number.NaN,
    qy: Number.NaN,
    qz: Number.NaN,
    qw: Number.NaN,
    scale: Number.NaN,
    hx: Number.NaN,
    hy: Number.NaN,
  });

  useEffect(() => {
    lastBillboardSyncRef.current.qx = Number.NaN;
  }, [interactive]);

  const getPointerCoord = (e: ThreeEvent<PointerEvent>): { x: number; y: number } => {
    const n = e.nativeEvent as (PointerEvent | MouseEvent | undefined);
    return {
      x: typeof e.clientX === 'number' ? e.clientX : (typeof n?.clientX === 'number' ? n.clientX : 0),
      y: typeof e.clientY === 'number' ? e.clientY : (typeof n?.clientY === 'number' ? n.clientY : 0),
    };
  };

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
    if (!markerRef.current || !groupRef.current) return;

    if (nodeAlphaRef && markerMaterialRef.current) {
      markerMaterialRef.current.opacity = nodeAlphaRef.current;
    }

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
    let worldScale = (pixelSize / Math.max(size.height, 1)) * 2;

    if (camera instanceof THREE.PerspectiveCamera) {
      const vFovRad = (camera.fov * Math.PI) / 180;
      worldScale *= (Math.tan(vFovRad / 2) * camDist) / Math.max(camera.zoom, 1e-4);
    } else if (camera instanceof THREE.OrthographicCamera) {
      worldScale *= (camera.top - camera.bottom) / (2 * Math.max(camera.zoom, 1e-4));
    }

    markerRef.current.scale.set(worldScale, worldScale, worldScale);

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
      {/* Physical System Dot (Invariant Screen Size, Monochrome) */}
      <mesh ref={setMarkerRef} name="celestial-point-dot" geometry={SHARED_DOT_GEOMETRY}>
        <meshBasicMaterial
          ref={markerMaterialRef}
          color={color ?? reticleBracketColor}
          transparent
          depthWrite={false}
        />
      </mesh>

      {/* Camera-Facing Invisible Hitarea (Billboarded with Screen-Space Fan-Out) */}
      {interactive && (
        <group ref={setBillboardRef} name={`hitarea-billboard-${id}`}>
          <mesh
            ref={setHitareaRef}
            name="celestial-hitarea"
            geometry={SHARED_HITAREA_GEOMETRY}
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
            {debugHitarea ? (
              <meshBasicMaterial
                color={stateFocus}
                transparent
                opacity={0.35}
                wireframe
                depthWrite={false}
                side={THREE.DoubleSide}
              />
            ) : (
              <meshBasicMaterial
                transparent
                opacity={0}
                depthWrite={false}
                side={THREE.DoubleSide}
              />
            )}
          </mesh>
        </group>
      )}
    </group>
  );
};

