import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useSpatialFrame } from './spatialFrameContext';
import { useThreeTokenStore } from '../../../stores/useThreeTokenStore';
import { populateCurvedDashedLineBuffer } from '../cartography/cartographyDashedLines';
import { calculateBearingProximityFade } from '../math';
import {
  DEFAULT_GALACTIC_CENTER_DISTANCE_PC,
  DEFAULT_INSTRUMENT_EXTENT,
} from './instrumentDefaults';
import { NOOP_RAYCAST } from '../engineConfig';

export interface BearingVectorsProps {
  /** Whether to render axis spokes */
  showAxisLines?: boolean;
  /** Whether to render cardinal bearings (Core, Orbital, etc.) */
  showCardinalBearings?: boolean;
  /** Distance to system/galactic centre for curved orbital calculation */
  centerDistance?: number;
  /** @deprecated Use centerDistance instead */
  rGc?: number;
  /** Extent to which extended bearings project into the scene (default: 1200) */
  extent?: number;
}

export const BearingVectors: React.FC<BearingVectorsProps> = React.memo(({
  showAxisLines = true,
  showCardinalBearings = true,
  centerDistance,
  rGc,
  extent = DEFAULT_INSTRUMENT_EXTENT,
}) => {
  const { frame, frameRef } = useSpatialFrame();
  const axisLineColor = useThreeTokenStore((s) => s.tokens.axisLineColor);
  const axisLineAlpha = useThreeTokenStore((s) => s.tokens.axisLineAlpha);
  const bearingCoreColor = useThreeTokenStore((s) => s.tokens.bearingCoreColor);
  const bearingCoreAlpha = useThreeTokenStore((s) => s.tokens.bearingCoreAlpha);
  const bearingOrbitalColor = useThreeTokenStore((s) => s.tokens.bearingOrbitalColor);
  const bearingOrbitalAlpha = useThreeTokenStore((s) => s.tokens.bearingOrbitalAlpha);

  const rootGroupRef = useRef<THREE.Group>(null);
  const spokeGroupRef = useRef<THREE.Group>(null);
  const spokeMatsRef = useRef<{
    negX: THREE.LineBasicMaterial | null;
    negY: THREE.LineBasicMaterial | null;
    posZ: THREE.LineBasicMaterial | null;
    negZ: THREE.LineBasicMaterial | null;
  }>({ negX: null, negY: null, posZ: null, negZ: null });
  const bearingCoreRef = useRef<THREE.LineSegments>(null);
  const bearingCoreMatRef = useRef<THREE.LineBasicMaterial>(null);
  const bearingOrbitalRef = useRef<THREE.LineSegments>(null);
  const bearingOrbitalMatRef = useRef<THREE.LineBasicMaterial>(null);
  const lastOrbitalDashRef = useRef({ extent: -1, centerDist: -1, scale: -1 });

  const spokeGeoms = useMemo(() => {
    const makeSpoke = (x: number, y: number, z: number) => {
      const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(x, y, z)]);
      g.computeBoundingSphere();
      return g;
    };
    return {
      negX: makeSpoke(0, 0, 0),
      negY: makeSpoke(0, -1, 0),
      posZ: makeSpoke(0, 0, 1),
      negZ: makeSpoke(0, 0, -1),
    };
  }, []);

  const coreBearingGeom = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0)]);
    g.computeBoundingSphere();
    return g;
  }, []);

  const orbitalBuffer = useMemo(() => new Float32Array(30000), []);
  const orbitalGeom = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(orbitalBuffer, 3));
    return geom;
  }, [orbitalBuffer]);

  useEffect(() => {
    return () => {
      Object.values(spokeGeoms).forEach((g) => g.dispose());
      coreBearingGeom.dispose();
      orbitalGeom.dispose();
    };
  }, [spokeGeoms, coreBearingGeom, orbitalGeom]);

  const hasCore = frame.bearings.some((b) => b.id === 'core');
  const hasOrbital = frame.bearings.some((b) => b.id === 'orbital');

  useFrame(({ camera }) => {
    const { apertureRadius, focusPoint, planeWeights, orientation, screenScale } = frameRef.current;
    if (rootGroupRef.current) {
      rootGroupRef.current.position.copy(focusPoint);
      rootGroupRef.current.quaternion.copy(orientation);
    }

    if (spokeGroupRef.current) {
      spokeGroupRef.current.scale.set(apertureRadius, apertureRadius, apertureRadius);
      const { qwXY, qwXZ, qwYZ, fadeXY, fadeXZ, fadeYZ } = planeWeights;
      if (spokeMatsRef.current.negX) spokeMatsRef.current.negX.opacity = 0;

      const alphaNegY = axisLineAlpha * Math.min(Math.max(qwXY[2], qwXY[3]) * fadeXY, Math.max(qwYZ[1], qwYZ[2]) * fadeYZ);
      if (spokeMatsRef.current.negY) spokeMatsRef.current.negY.opacity = alphaNegY;

      const alphaPosZ = axisLineAlpha * Math.min(Math.max(qwXZ[0], qwXZ[1]) * fadeXZ, Math.max(qwYZ[0], qwYZ[1]) * fadeYZ);
      if (spokeMatsRef.current.posZ) spokeMatsRef.current.posZ.opacity = alphaPosZ;

      const alphaNegZ = axisLineAlpha * Math.min(Math.max(qwXZ[2], qwXZ[3]) * fadeXZ, Math.max(qwYZ[2], qwYZ[3]) * fadeYZ);
      if (spokeMatsRef.current.negZ) spokeMatsRef.current.negZ.opacity = alphaNegZ;
    }

    const effectiveCenterDistance = centerDistance ?? rGc ?? frame.centerDistance ?? DEFAULT_GALACTIC_CENTER_DISTANCE_PC;
    const coreProximityFade = calculateBearingProximityFade(camera.position, focusPoint, 'core', extent, effectiveCenterDistance, apertureRadius, orientation);
    const orbitalProximityFade = calculateBearingProximityFade(camera.position, focusPoint, 'orbital', extent, effectiveCenterDistance, apertureRadius, orientation);

    if (bearingCoreRef.current) {
      bearingCoreRef.current.scale.set(extent, extent, 1);
      bearingCoreRef.current.visible = hasCore && coreProximityFade > 1e-3;
    }
    if (bearingCoreMatRef.current) {
      bearingCoreMatRef.current.opacity = bearingCoreAlpha * coreProximityFade;
    }

    const invScale = screenScale;
    if (bearingOrbitalRef.current && orbitalGeom) {
      const showOrbital = hasOrbital && orbitalProximityFade > 1e-3;
      bearingOrbitalRef.current.visible = showOrbital;
      if (showOrbital) {
        const prevDash = lastOrbitalDashRef.current;
        if (
          Math.abs(prevDash.extent - extent) > 1e-4 ||
          Math.abs(prevDash.centerDist - effectiveCenterDistance) > 1e-4 ||
          Math.abs(prevDash.scale - invScale) > 1e-4
        ) {
          prevDash.extent = extent;
          prevDash.centerDist = effectiveCenterDistance;
          prevDash.scale = invScale;
          const vCount = populateCurvedDashedLineBuffer(orbitalBuffer, extent, effectiveCenterDistance, 1, 0.18 * invScale, 0.12 * invScale);
          (orbitalGeom.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
          orbitalGeom.setDrawRange(0, vCount);
        }
      }
    }
    if (bearingOrbitalMatRef.current) {
      bearingOrbitalMatRef.current.opacity = bearingOrbitalAlpha * orbitalProximityFade;
    }
  });

  useEffect(() => {
    Object.values(spokeMatsRef.current).forEach((mat) => { if (mat?.color) mat.color.set(axisLineColor); });
    if (bearingCoreMatRef.current?.color) bearingCoreMatRef.current.color.set(bearingCoreColor);
    if (bearingOrbitalMatRef.current?.color) bearingOrbitalMatRef.current.color.set(bearingOrbitalColor);
  }, [axisLineColor, bearingCoreColor, bearingOrbitalColor]);

  const spokeList: { name: string; geom: THREE.BufferGeometry; matKey: keyof typeof spokeMatsRef.current }[] = [
    { name: 'axis-neg-x', geom: spokeGeoms.negX, matKey: 'negX' },
    { name: 'axis-neg-y', geom: spokeGeoms.negY, matKey: 'negY' },
    { name: 'axis-pos-z', geom: spokeGeoms.posZ, matKey: 'posZ' },
    { name: 'axis-neg-z', geom: spokeGeoms.negZ, matKey: 'negZ' },
  ];

  return (
    <group ref={rootGroupRef} name="bearing-vectors">
      {showAxisLines && (
        <group ref={spokeGroupRef} name="axis-spokes">
          {spokeList.map(({ name, geom, matKey }) => (
            <lineSegments key={name} name={name} frustumCulled={false} raycast={NOOP_RAYCAST}>
              <primitive object={geom} attach="geometry" />
              <lineBasicMaterial
                ref={(el: THREE.LineBasicMaterial | null) => { spokeMatsRef.current[matKey] = el; }}
                color={axisLineColor}
                opacity={axisLineAlpha}
                transparent
                depthWrite={false}
              />
            </lineSegments>
          ))}
        </group>
      )}

      {showCardinalBearings && (
        <group name="cardinal-bearings">
          {hasCore && (
            <lineSegments ref={bearingCoreRef} name="bearing-core" scale={[extent, extent, 1]} frustumCulled={false} raycast={NOOP_RAYCAST}>
              <primitive object={coreBearingGeom} attach="geometry" />
              <lineBasicMaterial
                ref={bearingCoreMatRef}
                color={bearingCoreColor}
                opacity={bearingCoreAlpha}
                transparent
                depthWrite={false}
              />
            </lineSegments>
          )}
          {hasOrbital && (
            <lineSegments ref={bearingOrbitalRef} name="bearing-orbital" frustumCulled={false} raycast={NOOP_RAYCAST}>
              <primitive object={orbitalGeom} attach="geometry" />
              <lineBasicMaterial
                ref={bearingOrbitalMatRef}
                color={bearingOrbitalColor}
                opacity={bearingOrbitalAlpha}
                transparent
                depthWrite={false}
              />
            </lineSegments>
          )}
        </group>
      )}
    </group>
  );
});
