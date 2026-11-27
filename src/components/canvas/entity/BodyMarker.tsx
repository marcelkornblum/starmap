import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useThreeTokenStore } from '../../../stores/useThreeTokenStore';
import { useLazyRef } from '../../../hooks/useLazyRef';
import { useIsomorphicLayoutEffect } from '../../../hooks/useIsomorphicLayoutEffect';
import { useOcclusionManager } from './SpatialEntityContext';
import { useEntityDotsBatchRegistry } from './entityDotsBatchContext';
import { useSpatialFrameSafe } from '../instrument/spatialFrameContext';
import {
  NOOP_RAYCAST,
  POINTER_TAP_SLOP_MOUSE_PX,
  POINTER_TAP_SLOP_TOUCH_PX,
  getCoarsePointerSnapshot,
  promoteCoarseTouch,
  subscribeCoarsePointer,
} from '../engineConfig';
import {
  SHARED_DOT_GEOMETRY,
  SHARED_HITAREA_GEOMETRY,
  SHARED_HITAREA_INVISIBLE_MATERIAL,
  captureThreePointer,
  computeMarkerDotWorldScale,
  getPointerCoord,
  getThreePointerId,
  markEntityPointerActive,
  releaseThreePointer,
  syncBodyMarkerHitareaTransform,
  type BillboardSyncState,
} from './bodyMarkerHelpers';
import type { NodeAlphaRef } from './types';

export interface BodyMarkerProps {
  id: string;
  position: [number, number, number] | THREE.Vector3;
  worldPosition?: THREE.Vector3 | readonly [number, number, number];
  pixelSize?: number;
  hitRadius?: number;
  reticleSize?: number;
  /** Optional physical body radius in world units (ensures hitarea covers large close-up discs). */
  minWorldHitRadius?: number;
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
  minWorldHitRadius,
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

  const setMarkerRef = useCallback((node: THREE.Mesh | null) => { if (node === null || 'isMesh' in node) markerRef.current = node; }, []);
  const setHitareaRef = useCallback((node: THREE.Mesh | null) => { if (node === null || 'isMesh' in node) hitareaRef.current = node; }, []);
  const setBillboardRef = useCallback((node: THREE.Group | null) => { if (node === null || 'isGroup' in node) billboardRef.current = node; }, []);
  const setGroupRef = useCallback((node: THREE.Group | null) => { if (node === null || 'isGroup' in node) groupRef.current = node; }, [groupRef]);

  const pointerDownPosRef = useRef<{ x: number; y: number; isTouch: boolean } | null>(null);
  const isCoarseOrTouchRef = useLazyRef(() => getCoarsePointerSnapshot());
  const isLocalHoveredRef = useRef(false);
  const hasSyncedFrameRef = useRef(false);
  const lastAlphaRef = useRef(Number.NaN);
  const lastBillboardSyncRef = useRef<BillboardSyncState>({ qx: Number.NaN, qy: Number.NaN, qz: Number.NaN, qw: Number.NaN, scale: Number.NaN, hx: Number.NaN, hy: Number.NaN });

  useEffect(() => {
    const syncCoarse = () => {
      const next = getCoarsePointerSnapshot();
      if (next && !isCoarseOrTouchRef.current) {
        isCoarseOrTouchRef.current = true;
        hasSyncedFrameRef.current = false;
        invalidate();
      }
    };
    syncCoarse();
    return subscribeCoarsePointer(syncCoarse);
  }, [isCoarseOrTouchRef, invalidate]);

  useIsomorphicLayoutEffect(() => {
    if (!batchRegistry) return;
    if (groupRef.current) groupRef.current.position.set(posX, posY, posZ);
    batchRegistry.register({ id, groupRef, worldPosition, pixelSize, color, nodeAlphaRef });
    return () => {
      batchRegistry.unregister(id);
    };
  }, [batchRegistry, id, posX, posY, posZ, worldPosition, pixelSize, color, nodeAlphaRef, groupRef]);

  useEffect(() => {
    lastBillboardSyncRef.current.qx = Number.NaN;
    hasSyncedFrameRef.current = false;
    invalidate();
  }, [id, posX, posY, posZ, worldPosition, pixelSize, hitRadius, reticleSize, minWorldHitRadius, interactive, debugHitarea, invalidate]);

  const triggerClick = useCallback(
    (e: ThreeEvent<MouseEvent | PointerEvent>) => {
      onClick?.(id, e as unknown as ThreeEvent<MouseEvent>);
    },
    [id, onClick],
  );

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    captureThreePointer(e);
    markEntityPointerActive(getThreePointerId(e));
    const pointerType = e.pointerType || (e.nativeEvent as PointerEvent | undefined)?.pointerType;
    const isTouch = pointerType === 'touch';
    if (isTouch) {
      promoteCoarseTouch();
      if (!isCoarseOrTouchRef.current) {
        isCoarseOrTouchRef.current = true;
        hasSyncedFrameRef.current = false;
        invalidate();
      }
    }
    const coords = getPointerCoord(e);
    pointerDownPosRef.current = { x: coords.x, y: coords.y, isTouch };
  }, [isCoarseOrTouchRef, invalidate]);

  const handlePointerUp = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      releaseThreePointer(e);
      if (!pointerDownPosRef.current) return;
      const { x: startX, y: startY, isTouch: downTouch } = pointerDownPosRef.current;
      const pointerType = e.pointerType || (e.nativeEvent as PointerEvent | undefined)?.pointerType;
      const isTouch = downTouch || pointerType === 'touch';
      pointerDownPosRef.current = null;
      const { x, y } = getPointerCoord(e);
      const tapSlopPx = isTouch ? POINTER_TAP_SLOP_TOUCH_PX : POINTER_TAP_SLOP_MOUSE_PX;
      if (Math.hypot(x - startX, y - startY) <= tapSlopPx) {
        triggerClick(e);
      }
    },
    [triggerClick],
  );

  const handlePointerCancel = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    releaseThreePointer(e);
    pointerDownPosRef.current = null;
  }, []);

  const handleDoubleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      onDoubleClick?.(id, e);
    },
    [id, onDoubleClick],
  );

  const handlePointerOver = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      if (e.pointerType === 'touch' || e.buttons > 0) return;
      isLocalHoveredRef.current = true;
      if (document.body.style.cursor !== 'pointer') document.body.style.cursor = 'pointer';
      onPointerOver?.(id, e);
    },
    [id, onPointerOver],
  );

  const handlePointerOut = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      if (e.pointerType === 'touch' || e.buttons > 0) return;
      isLocalHoveredRef.current = false;
      if (document.body.style.cursor !== 'auto') document.body.style.cursor = 'auto';
      onPointerOut?.(id, e);
    },
    [id, onPointerOut],
  );

  useEffect(() => {
    if (!interactive && isLocalHoveredRef.current) {
      isLocalHoveredRef.current = false;
      if (typeof document !== 'undefined' && document.body.style.cursor !== 'auto') {
        document.body.style.cursor = 'auto';
      }
    }
  }, [interactive]);

  useEffect(() => {
    return () => {
      if (isLocalHoveredRef.current) {
        isLocalHoveredRef.current = false;
        if (typeof document !== 'undefined') document.body.style.cursor = 'auto';
      }
    };
  }, []);

  useFrame(({ camera, size }) => {
    if (!groupRef.current || (isBatched && !interactive)) return;

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

    groupRef.current.position.set(posX, posY, posZ);
    if (worldPosition) {
      if (worldPosition instanceof THREE.Vector3) worldPosRef.current.copy(worldPosition);
      else worldPosRef.current.set(worldPosition[0], worldPosition[1], worldPosition[2]);
    } else {
      groupRef.current.getWorldPosition(worldPosRef.current);
    }
    const camDist = Math.max(camera.position.distanceTo(worldPosRef.current), 1e-4);

    if (!isBatched && markerRef.current) {
      const worldScale = computeMarkerDotWorldScale(camera, camDist, pixelSize, size.height);
      markerRef.current.scale.set(worldScale, worldScale, worldScale);
    }

    if (interactive && billboardRef.current && hitareaRef.current) {
      const hitOffset = occlusionManager.evaluateHitAreaOffset(id, isCoarseOrTouchRef.current);
      syncBodyMarkerHitareaTransform(
        camera, camDist, size.height, worldPosRef.current, frameCtx?.frameRef?.current,
        reticleSize, hitRadius, minWorldHitRadius, isCoarseOrTouchRef.current,
        hitOffset.x, hitOffset.y, billboardRef.current, hitareaRef.current, lastBillboardSyncRef.current,
      );
    }
  });

  return (
    <group ref={setGroupRef} position={[posX, posY, posZ]} name={`body-marker-${id}`}>
      {!isBatched && (
        <mesh ref={setMarkerRef} name="celestial-point-dot" geometry={SHARED_DOT_GEOMETRY} raycast={NOOP_RAYCAST}>
          <meshBasicMaterial ref={markerMaterialRef} color={color ?? reticleBracketColor} transparent depthWrite={false} />
        </mesh>
      )}
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
            onPointerCancel={onClick ? handlePointerCancel : undefined}
            onDoubleClick={onDoubleClick ? handleDoubleClick : undefined}
            onPointerOver={onPointerOver ? handlePointerOver : undefined}
            onPointerOut={onPointerOut ? handlePointerOut : undefined}
          >
            {debugHitarea && (
              <meshBasicMaterial color={stateFocus} transparent opacity={0.35} wireframe depthWrite={false} side={THREE.DoubleSide} />
            )}
          </mesh>
        </group>
      )}
    </group>
  );
});

BodyMarker.displayName = 'BodyMarker';
