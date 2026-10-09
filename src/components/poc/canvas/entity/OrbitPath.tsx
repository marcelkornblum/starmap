import React, { useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { useThreeTokenStore } from '../../../../stores/useThreeTokenStore';
import { useLazyRef } from '../../../../hooks/useLazyRef';
import { rotateToOrbitalPlane, DEG_TO_RADIANS } from '../../../../utils/astroMath';
import {
  CartoLineMaterial,
  CARTO_LINE_CONSTANTS,
} from '../../../canvas/materials/CartoLineMaterial';
import { useSpatialFrameSafe } from '../../../canvas/instrument/SpatialFrameProvider';
import { calculateScreenInvariantScale } from '../engineConfig';
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
  const directionMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const arrowBillboardRef = useRef<THREE.Group>(null);
  const frameCtx = useSpatialFrameSafe();

  const scratchWorldTangent = useLazyRef(() => new THREE.Vector3());
  const scratchCamDir = useLazyRef(() => new THREE.Vector3());
  const scratchQuat = useLazyRef(() => new THREE.Quaternion());
  const scratchArrowWorldPos = useLazyRef(() => new THREE.Vector3());
  const scratchZAxis = useLazyRef(() => new THREE.Vector3(0, 0, 1));

  const isStateElevated = state === 'selected' || state === 'focused';

  // State Exception Rule: elevated state forces rendering even if layerVisible is false
  const shouldRender = layerVisible || isStateElevated;

  const resolvedColor = useMemo(() => {
    if (explicitColor) return explicitColor;
    return isStateElevated ? kinematicColor : orbitColor;
  }, [explicitColor, isStateElevated, kinematicColor, orbitColor]);

  const resolvedAlpha = isStateElevated ? kinematicAlpha : orbitAlpha;

  // Compute Keplerian geometry
  const { orbitGeometry, tickGeometry, directionGeometry, arrowPosition, arrowTangent } = useMemo(() => {
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
    const orbitLineGeom = new LineGeometry();
    orbitLineGeom.setPositions(loopBuffer);

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

    // Direction indicator chevron: 2D billboarded swept dart matching ScreenEdgeCue
    let dirGeom: THREE.BufferGeometry | null = null;
    let arrowPosition: [number, number, number] = [0, 0, 0];
    let arrowTangent: [number, number, number] = [1, 0, 0];

    if (showDirectionIndicator) {
      const theta = Math.PI / 2;
      const xOrb = a * Math.cos(theta) - focalOffset;
      const yOrb = b * Math.sin(theta);
      const xRot = xOrb * Math.cos(omegaRad) - yOrb * Math.sin(omegaRad);
      const yRot = xOrb * Math.sin(omegaRad) + yOrb * Math.cos(omegaRad);

      const arrowPosBuf = new Float32Array([xRot, yRot, 0]);
      rotateToOrbitalPlane(arrowPosBuf, inclination, ascendingNode, { degrees: true });
      arrowPosition = [arrowPosBuf[0], arrowPosBuf[1], arrowPosBuf[2]];

      const tangent = new THREE.Vector3(-a * Math.sin(theta), b * Math.cos(theta), 0).normalize();
      const rotTangentX = tangent.x * Math.cos(omegaRad) - tangent.y * Math.sin(omegaRad);
      const rotTangentY = tangent.x * Math.sin(omegaRad) + tangent.y * Math.cos(omegaRad);
      const tanBuf = new Float32Array([rotTangentX, rotTangentY, 0]);
      rotateToOrbitalPlane(tanBuf, inclination, ascendingNode, { degrees: true });
      arrowTangent = [tanBuf[0], tanBuf[1], tanBuf[2]];

      // In local 2D screen space: pointing along local +X axis
      // Tip forward (+X), wingtips swept back (-X) with normal span (Y)
      const tipDist = 0.08;
      const wingDist = 0.05;
      const notchDist = 0.015;
      const wingWidth = 0.11;

      const dirBuffer = new Float32Array([
        // Triangle 1: Tip -> Left -> Notch
        tipDist, 0, 0,
        -wingDist, wingWidth, 0,
        -notchDist, 0, 0,
        // Triangle 2: Tip -> Notch -> Right
        tipDist, 0, 0,
        -notchDist, 0, 0,
        -wingDist, -wingWidth, 0,
      ]);

      dirGeom = new THREE.BufferGeometry();
      dirGeom.setAttribute('position', new THREE.BufferAttribute(dirBuffer, 3));
      dirGeom.computeVertexNormals();
      dirGeom.computeBoundingSphere();
    }

    return {
      orbitGeometry: orbitLineGeom,
      tickGeometry: tickGeom,
      directionGeometry: dirGeom,
      arrowPosition,
      arrowTangent,
    };
  }, [semiMajorAxis, eccentricity, inclination, ascendingNode, argumentOfPeriapsis, segments, showPeriapsisTick, showDirectionIndicator]);

  const lineMat = useMemo(() => {
    return new CartoLineMaterial({
      color: resolvedColor,
      opacity: resolvedAlpha,
      lineWidth: 2.0,
      lineStyle: lineStyle ?? orbitStyle ?? 'dashed',
      dashSize: CARTO_LINE_CONSTANTS.dashSize,
      gapSize: CARTO_LINE_CONSTANTS.gapSize,
      transparent: true,
      depthWrite: false,
    });
  }, [resolvedColor, resolvedAlpha, lineStyle, orbitStyle]);

  const lineMesh = useMemo(() => {
    const mesh = new Line2(orbitGeometry, lineMat);
    mesh.computeLineDistances();
    mesh.frustumCulled = false;
    return mesh;
  }, [orbitGeometry, lineMat]);

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
    lineMat.updateResolution(camera, size.width, size.height);
    lineMat.setColor(resolvedColor);
    lineMat.setOpacity(resolvedAlpha);

    if (directionMatRef.current) {
      if (resolvedColor instanceof THREE.Color) {
        directionMatRef.current.color.copy(resolvedColor);
      } else {
        directionMatRef.current.color.set(resolvedColor);
      }
      directionMatRef.current.opacity = resolvedAlpha;
    }

    // 2D Billboarding: ensure chevron always faces camera flat-on, oriented to orbital motion
    if (arrowBillboardRef.current && showDirectionIndicator) {
      arrowBillboardRef.current.getWorldPosition(scratchArrowWorldPos.current);
      const camDist = Math.max(camera.position.distanceTo(scratchArrowWorldPos.current), 1e-4);
      const frameState = frameCtx?.frameRef?.current;
      const invScale = frameState
        ? (camDist / frameState.referenceFootprint) * frameState.fovFactor
        : calculateScreenInvariantScale(camDist, camera);
      arrowBillboardRef.current.scale.set(invScale, invScale, invScale);

      // Transform 3D orbital tangent vector into camera view space
      scratchWorldTangent.current.set(arrowTangent[0], arrowTangent[1], arrowTangent[2]);
      scratchCamDir.current.copy(scratchWorldTangent.current).transformDirection(camera.matrixWorldInverse);

      // 2D screen motion angle in camera view plane: atan2(camDir.y, camDir.x)
      const screenAngle = Math.atan2(scratchCamDir.current.y, scratchCamDir.current.x);

      // Face the camera flat-on, then roll around local Z by screenAngle
      scratchQuat.current.setFromAxisAngle(scratchZAxis.current, screenAngle);
      arrowBillboardRef.current.quaternion.copy(camera.quaternion).multiply(scratchQuat.current);
    }
  });

  if (!shouldRender) return null;

  return (
    <group
      ref={groupRef}
      position={position}
      name={`orbital-ring-${id}`}
      data-state-forced={String(!layerVisible && isStateElevated)}
    >
      {/* 3D Keplerian Ellipse Line (Screen-Space Invariant Dashed 2px Line) */}
      <group name="orbit-path-line">
        <primitive object={lineMesh} />
      </group>

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

      {/* Prograde Direction Arrow Chevron (2D Billboarded flat-on to camera, pointing along orbital tangent) */}
      {showDirectionIndicator && directionGeometry && (
        <group
          ref={arrowBillboardRef}
          position={arrowPosition}
          name="orbit-direction-arrow-billboard"
        >
          <mesh name="orbit-direction-arrow">
            <primitive object={directionGeometry} attach="geometry" />
            <meshBasicMaterial
              ref={directionMatRef}
              color={resolvedColor}
              opacity={resolvedAlpha}
              side={THREE.DoubleSide}
              transparent
              depthWrite={false}
            />
          </mesh>
        </group>
      )}
    </group>
  );
};
