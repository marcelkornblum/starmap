import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useThreeTokenStore } from '../../../stores/useThreeTokenStore';

import { celestialOcclusionManager } from '../cartography/celestialOcclusionRegistry';
import { DEFAULT_RETICLE_SIZE } from '../cartography/reticleGeometry';
import type { CelestialInteractionState } from './types';

const SHARED_SPHERE_GEOM = new THREE.SphereGeometry(0.5, 16, 16);
const SHARED_HITAREA_GEOM = new THREE.CircleGeometry(0.5, 16);
const SHARED_HITAREA_MAT = new THREE.MeshBasicMaterial({
  transparent: true,
  opacity: 0,
  depthWrite: false,
  side: THREE.DoubleSide,
});
const DEBUG_HITAREA_MAT = new THREE.MeshBasicMaterial({
  color: 0x00ffcc,
  transparent: true,
  opacity: 0.35,
  wireframe: true,
  depthWrite: false,
  side: THREE.DoubleSide,
});

export interface BodyMarkerProps {
  id: string;
  position: [number, number, number] | THREE.Vector3;
  pixelSize?: number;
  hitRadius?: number;
  reticleSize?: number;
  state?: CelestialInteractionState;
  color?: string | THREE.Color;
  interactive?: boolean;
  debugHitarea?: boolean;
  onClick?: (id: string, e: ThreeEvent<MouseEvent>) => void;
  onPointerOver?: (id: string, e: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: (id: string, e: ThreeEvent<PointerEvent>) => void;
}

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
  state,
  color,
  interactive = true,
  debugHitarea = false,
  onClick,
  onPointerOver,
  onPointerOut,
}) => {
  const reticleBracketColor = useThreeTokenStore((s) => s.tokens.reticleBracketColor);

  const markerRef = useRef<THREE.Mesh>(null);
  const hitareaRef = useRef<THREE.Mesh>(null);
  const billboardRef = useRef<THREE.Group>(null);
  const groupRef = useRef<THREE.Group>(null);

  const resolvedPos = React.useMemo(() => {
    if (position instanceof THREE.Vector3) return position;
    return new THREE.Vector3(position[0], position[1], position[2]);
  }, [position]);

  useFrame(({ camera, size }) => {
    if (!markerRef.current || !groupRef.current) return;

    // 1. Maintain invariant screen-space pixel diameter across perspective/ortho
    const camDist = Math.max(camera.position.distanceTo(resolvedPos), 1e-4);
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

      const fovFactor = camera instanceof THREE.PerspectiveCamera
        ? Math.tan((camera.fov * Math.PI) / 360) / Math.tan((45 * Math.PI) / 360)
        : 1.0;
      const invScale = (camDist / 16.47) * fovFactor;

      const rSize = reticleSize ?? DEFAULT_RETICLE_SIZE;
      const effectiveHitRadius = (hitRadius ?? (rSize * 1.35)) * invScale;
      hitareaRef.current.scale.set(effectiveHitRadius, effectiveHitRadius, 1);

      // Interactive Hit-Testing Fan-Out (Spec 2.2):
      // When systems overlap in screen space, underlying invisible hit areas fan out radially around cluster centroid
      const hitOffset = celestialOcclusionManager.evaluateHitAreaOffset(id);
      const reticleRadiusPx = (rSize / 13.644) * size.height;
      const pxToLocal = reticleRadiusPx > 0 ? (rSize * invScale) / reticleRadiusPx : 0;
      hitareaRef.current.position.set(hitOffset.x * pxToLocal, -hitOffset.y * pxToLocal, 0);
    }
  });

  return (
    <group ref={groupRef} position={resolvedPos} name={`body-marker-${id}`}>
      {/* Physical System Dot (Invariant Screen Size, Monochrome) */}
      <mesh ref={markerRef} name="celestial-point-dot">
        <primitive object={SHARED_SPHERE_GEOM} attach="geometry" />
        <meshBasicMaterial
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
            material={debugHitarea ? DEBUG_HITAREA_MAT : SHARED_HITAREA_MAT}
            onClick={onClick ? (e) => {
              e.stopPropagation();
              // Cyclic Selection (Spec 2.2): Only advance focus when clicking an already focused/selected node
              const isAlreadyFocused = state === 'focused' || state === 'selected';
              const targetId = isAlreadyFocused
                ? celestialOcclusionManager.getCyclicSelectionTarget(id)
                : id;
              onClick(targetId, e);
            } : undefined}
            onPointerOver={onPointerOver ? (e) => {
              e.stopPropagation();
              onPointerOver(id, e);
            } : undefined}
            onPointerOut={onPointerOut ? (e) => {
              e.stopPropagation();
              onPointerOut(id, e);
            } : undefined}
          >
            <primitive object={SHARED_HITAREA_GEOM} attach="geometry" />
          </mesh>
        </group>
      )}
    </group>
  );
};
