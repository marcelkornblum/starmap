import React, { useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useThreeTokenStore } from '../../../stores/useThreeTokenStore';
import { rotateToOrbitalPlane, DEG_TO_RADIANS } from '../../../utils/astroMath';
import { ScreenSpaceLineMaterial } from '../cartography/ScreenSpaceLineMaterial';
import type { CelestialInteractionState } from './types';

export interface OrbitPathProps {
  id: string;
  semiMajorAxis: number;
  eccentricity?: number;
  inclination?: number; // degrees
  ascendingNode?: number; // degrees
  argumentOfPeriapsis?: number; // degrees
  state?: CelestialInteractionState;
  visible?: boolean;
  color?: string | THREE.Color;
  lineStyle?: 'dashed' | 'solid' | 'dotted';
  showPeriapsisTick?: boolean;
  showDirectionIndicator?: boolean;
  segments?: number;
  position?: [number, number, number] | THREE.Vector3;
}

/**
 * OrbitPath (§4.4: State-Driven Orbits):
 * 3D Keplerian elliptical orbit ring rendered with tactical vector line styling.
 * Supports the State Exception Rule: selected/focused orbits force rendering regardless of layer toggle.
 * Consumes semantic tokens for orbit style, orbit color, and kinematic accents.
 */
export const OrbitPath: React.FC<OrbitPathProps> = ({
  id,
  semiMajorAxis,
  eccentricity = 0,
  inclination = 0,
  ascendingNode = 0,
  argumentOfPeriapsis = 0,
  state = 'passive',
  visible: layerVisible = true,
  color: explicitColor,
  lineStyle,
  showPeriapsisTick = true,
  showDirectionIndicator = true,
  segments = 256,
  position = [0, 0, 0],
}) => {
  const orbitColor = useThreeTokenStore((s) => s.tokens.orbitColor);
  const orbitAlpha = useThreeTokenStore((s) => s.tokens.orbitAlpha);
  const orbitStyle = useThreeTokenStore((s) => s.tokens.orbitStyle);
  const kinematicColor = useThreeTokenStore((s) => s.tokens.kinematicColor);
  const kinematicAlpha = useThreeTokenStore((s) => s.tokens.kinematicAlpha);

  const groupRef = useRef<THREE.Group>(null);

  const isStateElevated = state === 'selected' || state === 'focused';

  // State Exception Rule: elevated state forces rendering even if layerVisible is false
  const shouldRender = layerVisible || isStateElevated;

  const resolvedColor = useMemo(() => {
    if (explicitColor) return explicitColor;
    return isStateElevated ? kinematicColor : orbitColor;
  }, [explicitColor, isStateElevated, kinematicColor, orbitColor]);

  const resolvedAlpha = isStateElevated ? kinematicAlpha : orbitAlpha;

  // Compute Keplerian geometry
  const { orbitGeometry, tickGeometry, directionGeometry } = useMemo(() => {
    const a = Number.isFinite(semiMajorAxis) && semiMajorAxis > 0 ? semiMajorAxis : 0.001;
    const e = Number.isFinite(eccentricity) ? Math.max(0, Math.min(0.99, eccentricity)) : 0;
    const omegaRad = argumentOfPeriapsis * DEG_TO_RADIANS;
    const sampleCount = Math.max(256, segments);
    const loopBuffer = new Float32Array((sampleCount + 1) * 3);
    const distBuffer = new Float32Array(sampleCount + 1);
    const b = a * Math.sqrt(1 - e * e);
    const focalOffset = a * e;

    let prevX = 0;
    let prevY = 0;
    let cumDist = 0;

    for (let i = 0; i <= sampleCount; i++) {
      const theta = (i / sampleCount) * Math.PI * 2;
      const xOrb = a * Math.cos(theta) - focalOffset;
      const yOrb = b * Math.sin(theta);
      const xRot = xOrb * Math.cos(omegaRad) - yOrb * Math.sin(omegaRad);
      const yRot = xOrb * Math.sin(omegaRad) + yOrb * Math.cos(omegaRad);
      loopBuffer[i * 3] = xRot;
      loopBuffer[i * 3 + 1] = yRot;
      loopBuffer[i * 3 + 2] = 0;

      if (i > 0) {
        cumDist += Math.hypot(xRot - prevX, yRot - prevY);
      }
      distBuffer[i] = cumDist;
      prevX = xRot;
      prevY = yRot;
    }

    rotateToOrbitalPlane(loopBuffer, inclination, ascendingNode, { degrees: true });
    const orbitGeom = new THREE.BufferGeometry();
    orbitGeom.setAttribute('position', new THREE.BufferAttribute(loopBuffer, 3));
    orbitGeom.setAttribute('lineDistance', new THREE.BufferAttribute(distBuffer, 1));
    orbitGeom.computeBoundingSphere();

    // Periapsis tick geometry
    let tickGeom: THREE.BufferGeometry | null = null;
    if (showPeriapsisTick) {
      const pDist = a * (1 - e);
      const tickLength = Math.max(0.04, a * 0.035);
      const perpAngle = omegaRad + Math.PI / 2;
      const pX = pDist * Math.cos(omegaRad);
      const pY = pDist * Math.sin(omegaRad);
      const dx = tickLength * Math.cos(perpAngle);
      const dy = tickLength * Math.sin(perpAngle);

      const tickBuffer = new Float32Array([
        pX - dx, pY - dy, 0,
        pX + dx, pY + dy, 0,
      ]);

      rotateToOrbitalPlane(tickBuffer, inclination, ascendingNode, { degrees: true });
      tickGeom = new THREE.BufferGeometry();
      tickGeom.setAttribute('position', new THREE.BufferAttribute(tickBuffer, 3));
      tickGeom.computeBoundingSphere();
    }

    // Direction indicator chevron geometry
    let dirGeom: THREE.BufferGeometry | null = null;
    if (showDirectionIndicator) {
      const theta = Math.PI / 2;
      const xOrb = a * Math.cos(theta) - focalOffset;
      const yOrb = b * Math.sin(theta);
      const xRot = xOrb * Math.cos(omegaRad) - yOrb * Math.sin(omegaRad);
      const yRot = xOrb * Math.sin(omegaRad) + yOrb * Math.cos(omegaRad);

      const tangent = new THREE.Vector3(-a * Math.sin(theta), b * Math.cos(theta), 0).normalize();
      const rotTangentX = tangent.x * Math.cos(omegaRad) - tangent.y * Math.sin(omegaRad);
      const rotTangentY = tangent.x * Math.sin(omegaRad) + tangent.y * Math.cos(omegaRad);
      const normalX = -rotTangentY;
      const normalY = rotTangentX;
      const arrowSize = Math.max(0.05, a * 0.035);

      const tipX = xRot + rotTangentX * arrowSize;
      const tipY = yRot + rotTangentY * arrowSize;
      const leftX = xRot - rotTangentX * arrowSize * 0.5 + normalX * arrowSize * 0.5;
      const leftY = yRot - rotTangentY * arrowSize * 0.5 + normalY * arrowSize * 0.5;
      const rightX = xRot - rotTangentX * arrowSize * 0.5 - normalX * arrowSize * 0.5;
      const rightY = yRot - rotTangentY * arrowSize * 0.5 - normalY * arrowSize * 0.5;

      const dirBuffer = new Float32Array([
        leftX, leftY, 0,
        tipX, tipY, 0,
        tipX, tipY, 0,
        rightX, rightY, 0,
      ]);

      rotateToOrbitalPlane(dirBuffer, inclination, ascendingNode, { degrees: true });
      dirGeom = new THREE.BufferGeometry();
      dirGeom.setAttribute('position', new THREE.BufferAttribute(dirBuffer, 3));
      dirGeom.computeBoundingSphere();
    }

    return {
      orbitGeometry: orbitGeom,
      tickGeometry: tickGeom,
      directionGeometry: dirGeom,
    };
  }, [semiMajorAxis, eccentricity, inclination, ascendingNode, argumentOfPeriapsis, segments, showPeriapsisTick, showDirectionIndicator]);

  const lineMat = useMemo(() => {
    return new ScreenSpaceLineMaterial({
      color: resolvedColor,
      opacity: resolvedAlpha,
      lineStyle: lineStyle ?? orbitStyle ?? 'dashed',
      transparent: true,
      depthWrite: false,
    });
  }, [resolvedColor, resolvedAlpha, lineStyle, orbitStyle]);

  useEffect(() => {
    return () => {
      orbitGeometry.dispose();
      tickGeometry?.dispose();
      directionGeometry?.dispose();
      lineMat.dispose();
    };
  }, [orbitGeometry, tickGeometry, directionGeometry, lineMat]);

  useFrame(({ camera, size }) => {
    if (!shouldRender) return;
    lineMat.updateResolution(camera, size.height);
  });

  if (!shouldRender) return null;

  return (
    <group
      ref={groupRef}
      position={position}
      name={`orbital-ring-${id}`}
      data-state-forced={String(!layerVisible && isStateElevated)}
    >
      {/* 3D Keplerian Ellipse Line */}
      <lineLoop name="orbit-path-line" material={lineMat}>
        <primitive object={orbitGeometry} attach="geometry" />
      </lineLoop>

      {/* Periapsis Indicator Tick */}
      {showPeriapsisTick && tickGeometry && (
        <lineSegments name="orbit-periapsis-tick">
          <primitive object={tickGeometry} attach="geometry" />
          <lineBasicMaterial
            color={resolvedColor}
            opacity={resolvedAlpha}
            transparent
            depthWrite={false}
          />
        </lineSegments>
      )}

      {/* Prograde Direction Arrow Chevron */}
      {showDirectionIndicator && directionGeometry && (
        <lineSegments name="orbit-direction-arrow">
          <primitive object={directionGeometry} attach="geometry" />
          <lineBasicMaterial
            color={resolvedColor}
            opacity={resolvedAlpha}
            transparent
            depthWrite={false}
          />
        </lineSegments>
      )}
    </group>
  );
};
