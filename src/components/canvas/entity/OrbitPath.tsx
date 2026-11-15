import React, { useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { useThreeTokenStore } from '../../../stores/useThreeTokenStore';
import { useLazyRef } from '../../../hooks/useLazyRef';
import { CARTO_LINE_CONSTANTS } from '../../../styles/tokens/cartography';
import { CartoLineMaterial } from '../materials/CartoLineMaterial';
import { useSpatialFrameSafe } from '../instrument/spatialFrameContext';
import { calculateScreenInvariantScale } from '../engineConfig';
import type { CelestialInteractionState } from './types';
import { buildOrbitGeometries } from './orbitPathGeometry';

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
  const shouldRender = layerVisible || isStateElevated;

  const resolvedColor = useMemo(() => {
    if (explicitColor) return explicitColor;
    return isStateElevated ? kinematicColor : orbitColor;
  }, [explicitColor, isStateElevated, kinematicColor, orbitColor]);

  const resolvedAlpha = isStateElevated ? kinematicAlpha : orbitAlpha;

  const { orbitGeometry, tickGeometry, directionGeometry, arrowPosition, arrowTangent } = useMemo(
    () =>
      buildOrbitGeometries({
        semiMajorAxis, eccentricity, inclination, ascendingNode,
        argumentOfPeriapsis, segments, showPeriapsisTick, showDirectionIndicator,
      }),
    [semiMajorAxis, eccentricity, inclination, ascendingNode, argumentOfPeriapsis, segments, showPeriapsisTick, showDirectionIndicator],
  );

  const lineMat = useMemo(() => {
    return new CartoLineMaterial({
      lineWidth: 2.0,
      lineStyle: lineStyle ?? orbitStyle ?? 'dashed',
      dashSize: CARTO_LINE_CONSTANTS.dashSize,
      gapSize: CARTO_LINE_CONSTANTS.gapSize,
      transparent: true,
      depthWrite: false,
    });
  }, [lineStyle, orbitStyle]);

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

  useEffect(() => {
    lineMat.setColor(resolvedColor);
    lineMat.setOpacity(resolvedAlpha);
    if (directionMatRef.current?.color) {
      if (resolvedColor instanceof THREE.Color) {
        directionMatRef.current.color.copy(resolvedColor);
      } else {
        directionMatRef.current.color.set(resolvedColor);
      }
      directionMatRef.current.opacity = resolvedAlpha;
    }
  }, [lineMat, resolvedColor, resolvedAlpha]);

  useFrame(({ camera, size }) => {
    if (!shouldRender) return;
    lineMat.updateResolution(camera, size.width, size.height);

    if (arrowBillboardRef.current && showDirectionIndicator) {
      arrowBillboardRef.current.getWorldPosition(scratchArrowWorldPos.current);
      const camDist = Math.max(camera.position.distanceTo(scratchArrowWorldPos.current), 1e-4);
      const frameState = frameCtx?.frameRef?.current;
      const invScale = frameState ? frameState.screenScale : calculateScreenInvariantScale(camDist, camera);
      arrowBillboardRef.current.scale.set(invScale, invScale, invScale);

      scratchWorldTangent.current.set(arrowTangent[0], arrowTangent[1], arrowTangent[2]);
      scratchCamDir.current.copy(scratchWorldTangent.current).transformDirection(camera.matrixWorldInverse);
      const screenAngle = Math.atan2(scratchCamDir.current.y, scratchCamDir.current.x);
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
      userData={{ stateForced: !layerVisible && isStateElevated }}
    >
      <group name="orbit-path-line">
        <primitive object={lineMesh} />
      </group>

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
