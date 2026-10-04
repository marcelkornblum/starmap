import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useThreeTokenStore } from '../../../stores/useThreeTokenStore';
import { populateDashedLineBuffer } from '../cartography/cartographyMath';
import type { CelestialInteractionState } from './types';

export interface KinematicVectorProps {
  id: string;
  position: [number, number, number] | THREE.Vector3;
  velocity?: [number, number, number] | THREE.Vector3;
  deltaTime?: number; // e.g. fixed time delta Δt (default: 1.0)
  state?: CelestialInteractionState;
  visible?: boolean;
}

/**
 * KinematicVector (§5: Projected Kinematic Velocity Vectors):
 * Renders a projected dotted/dashed velocity vector line to a fixed time delta Δt:
 * p(t + Δt) = p(t) + v * Δt.
 * Uses semantic kinematic color and perspective-invariant dashed line styling.
 */
export const KinematicVector: React.FC<KinematicVectorProps> = ({
  id,
  position,
  velocity,
  deltaTime = 1.0,
  state = 'passive',
  visible: explicitVisible,
}) => {
  const kinematicColor = useThreeTokenStore((s) => s.tokens.kinematicColor);
  const kinematicAlpha = useThreeTokenStore((s) => s.tokens.kinematicAlpha);

  const groupRef = useRef<THREE.Group>(null);
  const lineMeshRef = useRef<THREE.LineSegments>(null);
  const lineMatRef = useRef<THREE.LineBasicMaterial>(null);
  const terminusRef = useRef<THREE.Mesh>(null);
  const terminusMatRef = useRef<THREE.MeshBasicMaterial>(null);

  // Render if explicitly visible or when entity is selected/focused and velocity is defined
  const isEnabled = explicitVisible ?? (state === 'selected' || state === 'focused');

  const [p0, p1, dir, dist, hasVelocity] = useMemo(() => {
    if (!velocity) return [null, null, null, 0, false];

    const posX = position instanceof THREE.Vector3 ? position.x : position[0];
    const posY = position instanceof THREE.Vector3 ? position.y : position[1];
    const posZ = position instanceof THREE.Vector3 ? position.z : position[2];

    const velX = velocity instanceof THREE.Vector3 ? velocity.x : velocity[0];
    const velY = velocity instanceof THREE.Vector3 ? velocity.y : velocity[1];
    const velZ = velocity instanceof THREE.Vector3 ? velocity.z : velocity[2];

    const speedSq = velX * velX + velY * velY + velZ * velZ;
    if (speedSq < 1e-6) return [null, null, null, 0, false];

    const start = new THREE.Vector3(posX, posY, posZ);
    const end = new THREE.Vector3(
      posX + velX * deltaTime,
      posY + velY * deltaTime,
      posZ + velZ * deltaTime,
    );
    const distance = start.distanceTo(end);
    const direction = new THREE.Vector3().subVectors(end, start).divideScalar(distance);

    return [start, end, direction, distance, true];
  }, [position, velocity, deltaTime]);

  const lineBuffer = useMemo(() => new Float32Array(3000), []);
  const lineGeom = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(lineBuffer, 3));
    return geom;
  }, [lineBuffer]);

  useEffect(() => {
    return () => {
      lineGeom.dispose();
    };
  }, [lineGeom]);

  const scratchDirArr = useRef<[number, number, number]>([0, 0, 0]);

  useFrame(({ camera }) => {
    if (!isEnabled || !hasVelocity || !p0 || !p1 || !dir) return;

    const camDist = Math.max(camera.position.distanceTo(p0), 1e-4);
    const fovFactor = camera instanceof THREE.PerspectiveCamera
      ? Math.tan((camera.fov * Math.PI) / 360) / Math.tan((45 * Math.PI) / 360)
      : 1.0;
    const invScale = (camDist / 16.47) * fovFactor;

    const dirArr = scratchDirArr.current;
    dirArr[0] = dir.x;
    dirArr[1] = dir.y;
    dirArr[2] = dir.z;

    const vCount = populateDashedLineBuffer(
      lineBuffer,
      dist,
      dirArr,
      0.18 * invScale,
      0.12 * invScale,
    );
    const posAttr = lineGeom.getAttribute('position') as THREE.BufferAttribute;
    posAttr.needsUpdate = true;
    lineGeom.setDrawRange(0, vCount);

    if (lineMatRef.current) {
      lineMatRef.current.color.copy(kinematicColor);
      lineMatRef.current.opacity = kinematicAlpha;
    }

    if (terminusRef.current) {
      terminusRef.current.scale.set(invScale, invScale, invScale);
    }
    if (terminusMatRef.current) {
      terminusMatRef.current.color.copy(kinematicColor);
      terminusMatRef.current.opacity = kinematicAlpha;
    }
  });

  if (!isEnabled || !hasVelocity || !p0 || !p1) return null;

  return (
    <group ref={groupRef} name={`kinematic-vector-${id}`}>
      {/* Projected Velocity Vector Line (3D dashes with invariant screen scale) */}
      <lineSegments
        ref={lineMeshRef}
        position={p0}
        name="velocity-vector-line"
        frustumCulled={false}
      >
        <primitive object={lineGeom} attach="geometry" />
        <lineBasicMaterial
          ref={lineMatRef}
          color={kinematicColor}
          opacity={kinematicAlpha}
          transparent
          depthWrite={false}
        />
      </lineSegments>

      {/* Terminus Waypoint Pip */}
      <mesh ref={terminusRef} position={p1} name="velocity-vector-terminus">
        <sphereGeometry args={[0.035, 12, 12]} />
        <meshBasicMaterial
          ref={terminusMatRef}
          color={kinematicColor}
          opacity={kinematicAlpha}
          transparent
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};
