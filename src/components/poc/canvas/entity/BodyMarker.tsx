import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useThreeTokenStore } from '../../../../stores/useThreeTokenStore';
import { useLazyRef } from '../../../../hooks/useLazyRef';

import { celestialOcclusionManager } from '../cartography/celestialOcclusionRegistry';
import { DEFAULT_RETICLE_SIZE } from '../cartography/reticleGeometry';
import {
  calculateScreenInvariantScale,
  reticleSizeToScreenPx,
} from '../engineConfig';
import type { NodeAlphaRef } from './types';

export interface BodyMarkerProps {
  id: string;
  position: [number, number, number] | THREE.Vector3;
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

  const markerRef = useRef<THREE.Mesh>(null);
  const markerMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const hitareaRef = useRef<THREE.Mesh>(null);
  const billboardRef = useRef<THREE.Group>(null);
  const groupRef = useRef<THREE.Group>(null);
  const worldPosRef = useLazyRef(() => new THREE.Vector3());
  const [posX, posY, posZ] = position instanceof THREE.Vector3 ? [position.x, position.y, position.z] : position;

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
    groupRef.current.getWorldPosition(worldPosRef.current);
    const camDist = Math.max(camera.position.distanceTo(worldPosRef.current), 1e-4);
    let worldScale = (pixelSize / Math.max(size.height, 1)) * 2;

    if (camera instanceof THREE.PerspectiveCamera) {
      const vFovRad = (camera.fov * Math.PI) / 180;
      worldScale *= Math.tan(vFovRad / 2) * camDist;
    } else if (camera instanceof THREE.OrthographicCamera) {
      worldScale *= (camera.top - camera.bottom) / 2;
    }

    markerRef.current.scale.set(worldScale, worldScale, worldScale);

    // 2. Align invisible hitarea to face camera directly with invariant screen footprint matching reticle
    if (billboardRef.current && hitareaRef.current) {
      billboardRef.current.quaternion.copy(camera.quaternion);

      const invScale = calculateScreenInvariantScale(camDist, camera);
      const rSize = reticleSize ?? DEFAULT_RETICLE_SIZE;
      const effectiveHitRadius = (hitRadius ?? rSize) * invScale;
      hitareaRef.current.scale.set(effectiveHitRadius, effectiveHitRadius, 1);

      // Interactive Hit-Testing Fan-Out (Spec 2.2):
      // When systems overlap in screen space, underlying invisible hit areas fan out radially around cluster centroid
      const hitOffset = celestialOcclusionManager.evaluateHitAreaOffset(id);
      const reticleRadiusPx = reticleSizeToScreenPx(rSize, size.height);
      const pxToLocal = reticleRadiusPx > 0 ? (rSize * invScale) / reticleRadiusPx : 0;
      hitareaRef.current.position.set(hitOffset.x * pxToLocal, -hitOffset.y * pxToLocal, 0);
    }
  });

  return (
    <group ref={groupRef} position={[posX, posY, posZ]} name={`body-marker-${id}`}>
      {/* Physical System Dot (Invariant Screen Size, Monochrome) */}
      <mesh ref={markerRef} name="celestial-point-dot" geometry={SHARED_DOT_GEOMETRY}>
        <meshBasicMaterial
          ref={markerMaterialRef}
          color={color ?? reticleBracketColor}
          transparent
          depthWrite={false}
        />
      </mesh>

      {/* Camera-Facing Invisible Hitarea (Billboarded with Screen-Space Fan-Out) */}
      {interactive && (
        <group ref={billboardRef} name={`hitarea-billboard-${id}`}>
          <mesh
            ref={hitareaRef}
            name="celestial-hitarea"
            geometry={SHARED_HITAREA_GEOMETRY}
            onClick={onClick ? (e) => {
              e.stopPropagation();
              onClick(id, e);
            } : undefined}
            onDoubleClick={onDoubleClick ? (e) => {
              e.stopPropagation();
              onDoubleClick(id, e);
            } : undefined}
            onPointerOver={onPointerOver ? (e) => {
              e.stopPropagation();
              document.body.style.cursor = 'pointer';
              onPointerOver(id, e);
            } : undefined}
            onPointerOut={onPointerOut ? (e) => {
              e.stopPropagation();
              document.body.style.cursor = 'auto';
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

