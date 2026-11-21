import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { useThreeTokenStore } from '../../../stores/useThreeTokenStore';
import { useSpatialFrameSafe } from '../instrument/spatialFrameContext';
import { calculateScreenInvariantScale, NOOP_RAYCAST } from '../engineConfig';
import type { CelestialInteractionState } from './types';
import { getSharedKinematicLineMaterial } from './kinematicVectorMaterial';

export interface KinematicVectorProps {
  id: string;
  position: [number, number, number] | THREE.Vector3;
  velocity?: [number, number, number] | THREE.Vector3;
  deltaTime?: number; // e.g. fixed time delta Δt (default: 1.0)
  state?: CelestialInteractionState;
  visible?: boolean;
}

interface KinematicVectorActiveProps {
  id: string;
  p0: THREE.Vector3;
  p1: THREE.Vector3;
}

const KinematicVectorActive: React.FC<KinematicVectorActiveProps> = ({ id, p0, p1 }) => {
  const kinematicColor = useThreeTokenStore((s) => s.tokens.kinematicColor);
  const kinematicAlpha = useThreeTokenStore((s) => s.tokens.kinematicAlpha);

  const groupRef = useRef<THREE.Group>(null);
  const terminusRef = useRef<THREE.Mesh>(null);
  const terminusMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const frameCtx = useSpatialFrameSafe();

  const lineGeom = useMemo(() => new LineGeometry(), []);
  const lineMat = useMemo(() => getSharedKinematicLineMaterial(), []);

  const lineMesh = useMemo(() => {
    const mesh = new Line2(lineGeom, lineMat);
    mesh.raycast = NOOP_RAYCAST;
    mesh.frustumCulled = false;
    return mesh;
  }, [lineGeom, lineMat]);

  useEffect(() => {
    lineGeom.setPositions([p0.x, p0.y, p0.z, p1.x, p1.y, p1.z]);
    lineMesh.computeLineDistances();
  }, [p0, p1, lineGeom, lineMesh]);

  useEffect(() => {
    return () => {
      lineGeom.dispose();
    };
  }, [lineGeom]);

  useEffect(() => {
    lineMat.setColor(kinematicColor);
    lineMat.setOpacity(kinematicAlpha);
    if (terminusMatRef.current?.color) {
      terminusMatRef.current.color.set(kinematicColor);
      terminusMatRef.current.opacity = kinematicAlpha;
    }
  }, [lineMat, kinematicColor, kinematicAlpha]);

  useFrame(({ camera, size }) => {
    lineMat.updateResolution(camera, size.width, size.height);

    const camDist = Math.max(camera.position.distanceTo(p0), 1e-4);
    const frameState = frameCtx?.frameRef?.current;
    const invScale = frameState
      ? frameState.screenScale
      : calculateScreenInvariantScale(camDist, camera);

    if (terminusRef.current) {
      terminusRef.current.scale.set(invScale, invScale, invScale);
    }
  });

  return (
    <group ref={groupRef} name={`kinematic-vector-${id}`}>
      {/* Projected Velocity Vector Line (Screen-Space Invariant Dashed 2px Line) */}
      <group name="velocity-vector-line">
        <primitive object={lineMesh} />
      </group>

      {/* Terminus Waypoint Pip */}
      <mesh ref={terminusRef} position={p1} name="velocity-vector-terminus" raycast={NOOP_RAYCAST}>
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

/**
 * KinematicVector (§5: Projected Kinematic Velocity Vectors):
 * Thin guard wrapper evaluating enablement and velocity before mounting GPU resources.
 * p(t + Δt) = p(t) + v * Δt.
 */
export const KinematicVector: React.FC<KinematicVectorProps> = ({
  id,
  position,
  velocity,
  deltaTime = 1.0,
  state = 'passive',
  visible: explicitVisible,
}) => {
  const isEnabled = explicitVisible ?? (state === 'selected' || state === 'focused');

  const [p0, p1, hasVelocity] = useMemo(() => {
    if (!isEnabled || !velocity) return [null, null, false] as const;

    const posX = position instanceof THREE.Vector3 ? position.x : position[0];
    const posY = position instanceof THREE.Vector3 ? position.y : position[1];
    const posZ = position instanceof THREE.Vector3 ? position.z : position[2];

    const velX = velocity instanceof THREE.Vector3 ? velocity.x : velocity[0];
    const velY = velocity instanceof THREE.Vector3 ? velocity.y : velocity[1];
    const velZ = velocity instanceof THREE.Vector3 ? velocity.z : velocity[2];

    const speedSq = velX * velX + velY * velY + velZ * velZ;
    if (speedSq < 1e-6) return [null, null, false] as const;

    const start = new THREE.Vector3(posX, posY, posZ);
    const end = new THREE.Vector3(
      posX + velX * deltaTime,
      posY + velY * deltaTime,
      posZ + velZ * deltaTime,
    );

    return [start, end, true] as const;
  }, [isEnabled, position, velocity, deltaTime]);

  if (!isEnabled || !hasVelocity || !p0 || !p1) return null;

  return <KinematicVectorActive id={id} p0={p0} p1={p1} />;
};
