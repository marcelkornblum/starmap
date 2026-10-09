import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { useThreeTokenStore } from '../../../../stores/useThreeTokenStore';
import {
  CartoLineMaterial,
  CARTO_LINE_CONSTANTS,
} from '../materials/CartoLineMaterial';
import { useSpatialFrameSafe } from '../instrument/SpatialFrameProvider';
import { calculateScreenInvariantScale } from '../engineConfig';
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
 * Uses semantic kinematic color and perspective-invariant dashed line styling matching OrbitPath.
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
  const terminusRef = useRef<THREE.Mesh>(null);
  const terminusMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const frameCtx = useSpatialFrameSafe();

  // Render if explicitly visible or when entity is selected/focused and velocity is defined
  const isEnabled = explicitVisible ?? (state === 'selected' || state === 'focused');

  const [p0, p1, dir, hasVelocity] = useMemo(() => {
    if (!velocity) return [null, null, null, false];

    const posX = position instanceof THREE.Vector3 ? position.x : position[0];
    const posY = position instanceof THREE.Vector3 ? position.y : position[1];
    const posZ = position instanceof THREE.Vector3 ? position.z : position[2];

    const velX = velocity instanceof THREE.Vector3 ? velocity.x : velocity[0];
    const velY = velocity instanceof THREE.Vector3 ? velocity.y : velocity[1];
    const velZ = velocity instanceof THREE.Vector3 ? velocity.z : velocity[2];

    const speedSq = velX * velX + velY * velY + velZ * velZ;
    if (speedSq < 1e-6) return [null, null, null, false];

    const start = new THREE.Vector3(posX, posY, posZ);
    const end = new THREE.Vector3(
      posX + velX * deltaTime,
      posY + velY * deltaTime,
      posZ + velZ * deltaTime,
    );
    const distance = start.distanceTo(end);
    const direction = new THREE.Vector3().subVectors(end, start).divideScalar(distance);

    return [start, end, direction, true];
  }, [position, velocity, deltaTime]);

  const lineGeom = useMemo(() => new LineGeometry(), []);
  const lineMat = useMemo(() => {
    return new CartoLineMaterial({
      color: kinematicColor,
      opacity: kinematicAlpha,
      lineWidth: 2.0,
      lineStyle: 'dashed',
      dashSize: CARTO_LINE_CONSTANTS.dashSize,
      gapSize: CARTO_LINE_CONSTANTS.gapSize,
      transparent: true,
      depthWrite: false,
    });
  }, [kinematicColor, kinematicAlpha]);

  const lineMesh = useMemo(() => {
    const mesh = new Line2(lineGeom, lineMat);
    mesh.frustumCulled = false;
    return mesh;
  }, [lineGeom, lineMat]);

  useEffect(() => {
    if (!p0 || !p1) return;
    lineGeom.setPositions([p0.x, p0.y, p0.z, p1.x, p1.y, p1.z]);
    lineMesh.computeLineDistances();
  }, [p0, p1, lineGeom, lineMesh]);

  useEffect(() => {
    return () => {
      lineGeom.dispose();
      lineMat.dispose();
    };
  }, [lineGeom, lineMat]);

  useFrame(({ camera, size }) => {
    if (!isEnabled || !hasVelocity || !p0 || !p1 || !dir) return;

    lineMat.updateResolution(camera, size.width, size.height);
    lineMat.setColor(kinematicColor);
    lineMat.setOpacity(kinematicAlpha);

    const camDist = Math.max(camera.position.distanceTo(p0), 1e-4);
    const frameState = frameCtx?.frameRef?.current;
    const invScale = frameState
      ? (camDist / frameState.referenceFootprint) * frameState.fovFactor
      : calculateScreenInvariantScale(camDist, camera);

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
      {/* Projected Velocity Vector Line (Screen-Space Invariant Dashed 2px Line) */}
      <group name="velocity-vector-line">
        <primitive object={lineMesh} />
      </group>

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
