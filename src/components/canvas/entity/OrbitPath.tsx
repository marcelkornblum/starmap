import React, { useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { useThreeTokenStore } from '../../../stores/useThreeTokenStore';
import { useLazyRef } from '../../../hooks/useLazyRef';
import { useIsomorphicLayoutEffect } from '../../../hooks/useIsomorphicLayoutEffect';
import { computeCrossScaleOrbitAttenuation } from '../../../utils/referenceFrameOrientation';
import { CartoLineMaterial } from '../materials/CartoLineMaterial';
import { getCrossScaleInstrumentFade } from '../instrument/crossScaleFadeState';
import { getCrossScaleSceneScale } from '../instrument/crossScaleVisualState';
import { useSpatialFrameSafe } from '../instrument/spatialFrameContext';
import { calculateScreenInvariantScale, NOOP_RAYCAST } from '../engineConfig';
import type { CelestialInteractionState } from './types';
import { buildOrbitGeometries } from './orbitPathGeometry';

export interface OrbitPathProps {
  id: string;
  semiMajorAxis: number;
  eccentricity?: number;
  inclination?: number;
  ascendingNode?: number;
  argumentOfPeriapsis?: number;
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
  segments = 64,
  position = [0, 0, 0],
}) => {
  const orbitColor = useThreeTokenStore((s) => s.tokens.orbitColor);
  const orbitAlpha = useThreeTokenStore((s) => s.tokens.orbitAlpha);
  const orbitStyle = useThreeTokenStore((s) => s.tokens.orbitStyle);
  const kinematicColor = useThreeTokenStore((s) => s.tokens.kinematicColor);
  const kinematicAlpha = useThreeTokenStore((s) => s.tokens.kinematicAlpha);

  const groupRef = useRef<THREE.Group>(null);
  const directionMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const periapsisMatRef = useRef<THREE.LineBasicMaterial>(null);
  const arrowBillboardRef = useRef<THREE.Group>(null);
  const lastLineOpacityRef = useRef<number>(Number.NaN);
  const lastDirectionOpacityRef = useRef<number>(Number.NaN);
  const lastPeriapsisOpacityRef = useRef<number>(Number.NaN);
  const lastResolutionRef = useRef({ width: -1, height: -1, proj11: Number.NaN });
  const frameCtx = useSpatialFrameSafe();
  const getThreeState = useThree((s) => s.get);

  const scratchWorldTangent = useLazyRef(() => new THREE.Vector3());
  const scratchCamDir = useLazyRef(() => new THREE.Vector3());
  const scratchQuat = useLazyRef(() => new THREE.Quaternion());
  const scratchArrowWorldPos = useLazyRef(() => new THREE.Vector3());
  const scratchZAxis = useLazyRef(() => new THREE.Vector3(0, 0, 1));

  const isEllipticOrbit =
    Number.isFinite(semiMajorAxis) &&
    semiMajorAxis > 0 &&
    Number.isFinite(eccentricity) &&
    eccentricity >= 0 &&
    eccentricity < 1;
  const isStateElevated = state === 'selected' || state === 'focused';
  const shouldRender = (layerVisible || isStateElevated) && isEllipticOrbit;

  const resolvedColor = useMemo(() => {
    if (explicitColor) return explicitColor;
    return isStateElevated ? kinematicColor : orbitColor;
  }, [explicitColor, isStateElevated, kinematicColor, orbitColor]);

  const resolvedAlpha = isStateElevated ? kinematicAlpha : orbitAlpha;

  const geometries = useMemo(
    () =>
      shouldRender
        ? buildOrbitGeometries({
            semiMajorAxis,
            eccentricity,
            inclination,
            ascendingNode,
            argumentOfPeriapsis,
            segments,
            showPeriapsisTick,
            showDirectionIndicator,
          })
        : null,
    [
      shouldRender,
      semiMajorAxis,
      eccentricity,
      inclination,
      ascendingNode,
      argumentOfPeriapsis,
      segments,
      showPeriapsisTick,
      showDirectionIndicator,
    ],
  );

  const lineMat = useMemo(() => {
    if (!shouldRender) return null;
    const mat = new CartoLineMaterial({
      lineWidth: 2.0,
      lineStyle: lineStyle ?? orbitStyle ?? 'dashed',
      opacity: 0,
      transparent: true,
      depthWrite: false,
    });
    const liveState = typeof getThreeState === 'function' ? getThreeState() : undefined;
    if (liveState?.camera && liveState?.size) {
      mat.updateResolution(liveState.camera, liveState.size.width, liveState.size.height);
    }
    return mat;
  }, [shouldRender, lineStyle, orbitStyle, getThreeState]);

  const lineMesh = useMemo(() => {
    if (!geometries || !lineMat) return null;
    const mesh = new Line2(geometries.orbitGeometry, lineMat);
    mesh.raycast = NOOP_RAYCAST;
    mesh.computeLineDistances();
    mesh.frustumCulled = false;
    return mesh;
  }, [geometries, lineMat]);

  useEffect(() => {
    return () => {
      geometries?.orbitGeometry.dispose();
      geometries?.tickGeometry?.dispose();
      geometries?.directionGeometry?.dispose();
      lineMat?.dispose();
    };
  }, [geometries, lineMat]);

  useIsomorphicLayoutEffect(() => {
    if (!lineMat) return;
    const instrumentFade = frameCtx?.frameRef?.current?.instrumentFade ?? getCrossScaleInstrumentFade();
    const initialAlpha =
      resolvedAlpha * instrumentFade * computeCrossScaleOrbitAttenuation(getCrossScaleSceneScale());
    lineMat.setColor(resolvedColor);
    lineMat.setOpacity(initialAlpha);
    lastLineOpacityRef.current = initialAlpha;
    if (directionMatRef.current?.color) {
      if (resolvedColor instanceof THREE.Color) {
        directionMatRef.current.color.copy(resolvedColor);
      } else {
        directionMatRef.current.color.set(resolvedColor);
      }
      directionMatRef.current.opacity = initialAlpha;
      lastDirectionOpacityRef.current = initialAlpha;
    } else {
      lastDirectionOpacityRef.current = Number.NaN;
    }
    if (periapsisMatRef.current) {
      periapsisMatRef.current.opacity = initialAlpha;
      lastPeriapsisOpacityRef.current = initialAlpha;
    } else {
      lastPeriapsisOpacityRef.current = Number.NaN;
    }
  }, [
    lineMat,
    resolvedColor,
    resolvedAlpha,
    frameCtx,
    showPeriapsisTick,
    showDirectionIndicator,
    geometries,
  ]);

  useFrame(({ camera, size }) => {
    if (!shouldRender || !lineMat || !geometries) return;
    const proj11 = camera.projectionMatrix.elements[5];
    const lastRes = lastResolutionRef.current;
    if (
      lastRes.width !== size.width ||
      lastRes.height !== size.height ||
      lastRes.proj11 !== proj11
    ) {
      lineMat.updateResolution(camera, size.width, size.height);
      lastRes.width = size.width;
      lastRes.height = size.height;
      lastRes.proj11 = proj11;
    }

    const frameState = frameCtx?.frameRef?.current;
    const instrumentFade = frameState?.instrumentFade ?? getCrossScaleInstrumentFade();
    const nextAlpha =
      resolvedAlpha * instrumentFade * computeCrossScaleOrbitAttenuation(getCrossScaleSceneScale());
    if (Number.isNaN(lastLineOpacityRef.current) || Math.abs(nextAlpha - lastLineOpacityRef.current) > 1e-4) {
      lineMat.setOpacity(nextAlpha);
      lastLineOpacityRef.current = nextAlpha;
    }
    if (
      directionMatRef.current &&
      (Number.isNaN(lastDirectionOpacityRef.current) || Math.abs(nextAlpha - lastDirectionOpacityRef.current) > 1e-4)
    ) {
      directionMatRef.current.opacity = nextAlpha;
      lastDirectionOpacityRef.current = nextAlpha;
    }
    if (
      periapsisMatRef.current &&
      (Number.isNaN(lastPeriapsisOpacityRef.current) || Math.abs(nextAlpha - lastPeriapsisOpacityRef.current) > 1e-4)
    ) {
      periapsisMatRef.current.opacity = nextAlpha;
      lastPeriapsisOpacityRef.current = nextAlpha;
    }

    if (arrowBillboardRef.current && showDirectionIndicator) {
      arrowBillboardRef.current.getWorldPosition(scratchArrowWorldPos.current);
      const camDist = Math.max(camera.position.distanceTo(scratchArrowWorldPos.current), 1e-4);
      const invScale = frameState ? frameState.screenScale : calculateScreenInvariantScale(camDist, camera);
      arrowBillboardRef.current.scale.set(invScale, invScale, invScale);

      scratchWorldTangent.current.set(
        geometries.arrowTangent[0],
        geometries.arrowTangent[1],
        geometries.arrowTangent[2],
      );
      scratchCamDir.current.copy(scratchWorldTangent.current).transformDirection(camera.matrixWorldInverse);
      const screenAngle = Math.atan2(scratchCamDir.current.y, scratchCamDir.current.x);
      scratchQuat.current.setFromAxisAngle(scratchZAxis.current, screenAngle);
      arrowBillboardRef.current.quaternion.copy(camera.quaternion).multiply(scratchQuat.current);
    }
  });

  if (!shouldRender || !geometries || !lineMesh) return null;

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

      {showPeriapsisTick && geometries.tickGeometry && (
        <lineSegments name="orbit-periapsis-tick" raycast={NOOP_RAYCAST}>
          <primitive object={geometries.tickGeometry} attach="geometry" />
          <lineBasicMaterial
            ref={periapsisMatRef}
            color={resolvedColor}
            transparent
            depthWrite={false}
          />
        </lineSegments>
      )}

      {showDirectionIndicator && geometries.directionGeometry && (
        <group
          ref={arrowBillboardRef}
          position={geometries.arrowPosition}
          name="orbit-direction-arrow-billboard"
        >
          <mesh name="orbit-direction-arrow" raycast={NOOP_RAYCAST}>
            <primitive object={geometries.directionGeometry} attach="geometry" />
            <meshBasicMaterial
              ref={directionMatRef}
              color={resolvedColor}
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
