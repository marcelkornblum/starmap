import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useSpatialFrame } from './SpatialFrameProvider';
import { useThreeTokenStore } from '../../../stores/useThreeTokenStore';
import { populateCurvedDashedLineBuffer } from '../cartography/cartographyMath';
import { calculateBearingProximityFade } from '../math';

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

export const BearingVectors: React.FC<BearingVectorsProps> = ({
  showAxisLines = true,
  showCardinalBearings = true,
  centerDistance,
  rGc,
  extent = 1200,
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

  // Unit axis spokes: -X, -Y, +Z, -Z
  const spokeGeoms = useMemo(() => {
    const makeSpokeGeom = (direction: [number, number, number]) => {
      const geom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(...direction),
      ]);
      geom.computeBoundingSphere();
      return geom;
    };
    return {
      negX: makeSpokeGeom([0, 0, 0]),
      negY: makeSpokeGeom([0, -1, 0]),
      posZ: makeSpokeGeom([0, 0, 1]),
      negZ: makeSpokeGeom([0, 0, -1]),
    };
  }, []);

  // Unit Core bearing geometry along +X (heads into centre from +X, terminating at (0,0,0))
  const coreBearingGeom = useMemo(() => {
    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 0, 0),
    ]);
    geom.computeBoundingSphere();
    return geom;
  }, []);

  // Curved orbital bearing line buffer & geometry extending to extent (1200)
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
      if (spokeMatsRef.current.negX) {
        // Suppress -X spoke so the Core bearing terminates at (0, 0, 0) without continuing past center
        spokeMatsRef.current.negX.opacity = 0;
      }

      const presenceXY_negY = Math.max(qwXY[2], qwXY[3]) * fadeXY;
      const presenceYZ_negY = Math.max(qwYZ[1], qwYZ[2]) * fadeYZ;
      const alphaNegY = axisLineAlpha * Math.min(presenceXY_negY, presenceYZ_negY);
      if (spokeMatsRef.current.negY) {
        spokeMatsRef.current.negY.opacity = alphaNegY;
      }

      const presenceXZ_posZ = Math.max(qwXZ[0], qwXZ[1]) * fadeXZ;
      const presenceYZ_posZ = Math.max(qwYZ[0], qwYZ[1]) * fadeYZ;
      const alphaPosZ = axisLineAlpha * Math.min(presenceXZ_posZ, presenceYZ_posZ);
      if (spokeMatsRef.current.posZ) {
        spokeMatsRef.current.posZ.opacity = alphaPosZ;
      }

      const presenceXZ_negZ = Math.max(qwXZ[2], qwXZ[3]) * fadeXZ;
      const presenceYZ_negZ = Math.max(qwYZ[2], qwYZ[3]) * fadeYZ;
      const alphaNegZ = axisLineAlpha * Math.min(presenceXZ_negZ, presenceYZ_negZ);
      if (spokeMatsRef.current.negZ) {
        spokeMatsRef.current.negZ.opacity = alphaNegZ;
      }
    }

    const effectiveCenterDistance = centerDistance ?? rGc ?? frame.centerDistance ?? 2000;

    // Bearing Proximity Fades: smoothly fade lines before hitting the camera
    const coreProximityFade = calculateBearingProximityFade(
      camera.position,
      focusPoint,
      'core',
      extent,
      effectiveCenterDistance,
      apertureRadius,
      orientation,
    );
    const orbitalProximityFade = calculateBearingProximityFade(
      camera.position,
      focusPoint,
      'orbital',
      extent,
      effectiveCenterDistance,
      apertureRadius,
      orientation,
    );

    // Extended Core bearing (+X) extending to destination/infinity (extent)
    if (bearingCoreRef.current) {
      bearingCoreRef.current.scale.set(extent, extent, 1);
      bearingCoreRef.current.visible = coreProximityFade > 1e-4;
    }
    if (bearingCoreMatRef.current) {
      bearingCoreMatRef.current.opacity = bearingCoreAlpha * coreProximityFade;
    }

    // Extended Orbital bearing (+Y curved dashed) extending to destination/infinity (extent)
    if (hasOrbital && orbitalGeom) {
      if (bearingOrbitalRef.current) {
        bearingOrbitalRef.current.visible = orbitalProximityFade > 1e-4;
      }
      if (bearingOrbitalMatRef.current) {
        bearingOrbitalMatRef.current.opacity = bearingOrbitalAlpha * orbitalProximityFade;
      }

      if (orbitalProximityFade > 1e-4) {
        const invScale = screenScale;

        const vCount = populateCurvedDashedLineBuffer(
          orbitalBuffer,
          extent,
          effectiveCenterDistance,
          1,
          0.18 * invScale,
          0.12 * invScale,
        );
        const posAttr = orbitalGeom.getAttribute('position') as THREE.BufferAttribute;
        posAttr.needsUpdate = true;
        orbitalGeom.setDrawRange(0, vCount);
      }
    }
  });

  return (
    <group ref={rootGroupRef} name="bearing-vectors">
      {/* Structural Axis Spokes of length R (scaled to apertureRadius) */}
      {showAxisLines && (
        <group ref={spokeGroupRef} name="axis-spokes">
          <lineSegments name="axis-neg-x" visible={false} frustumCulled={false}>
            <primitive object={spokeGeoms.negX} attach="geometry" />
            <lineBasicMaterial
              ref={(el) => { spokeMatsRef.current.negX = el; }}
              color={axisLineColor}
              opacity={0}
              transparent
              depthWrite={false}
            />
          </lineSegments>
          <lineSegments name="axis-neg-y" frustumCulled={false}>
            <primitive object={spokeGeoms.negY} attach="geometry" />
            <lineBasicMaterial
              ref={(el) => { spokeMatsRef.current.negY = el; }}
              color={axisLineColor}
              opacity={axisLineAlpha}
              transparent
              depthWrite={false}
            />
          </lineSegments>
          <lineSegments name="axis-pos-z" frustumCulled={false}>
            <primitive object={spokeGeoms.posZ} attach="geometry" />
            <lineBasicMaterial
              ref={(el) => { spokeMatsRef.current.posZ = el; }}
              color={axisLineColor}
              opacity={axisLineAlpha}
              transparent
              depthWrite={false}
            />
          </lineSegments>
          <lineSegments name="axis-neg-z" frustumCulled={false}>
            <primitive object={spokeGeoms.negZ} attach="geometry" />
            <lineBasicMaterial
              ref={(el) => { spokeMatsRef.current.negZ = el; }}
              color={axisLineColor}
              opacity={axisLineAlpha}
              transparent
              depthWrite={false}
            />
          </lineSegments>
        </group>
      )}

      {/* Prominent Extended Cardinal Bearing Lines: +X (Galactic Core Accent), +Y (Galactic Orbit Dashed) */}
      {showCardinalBearings && (
        <group name="cardinal-bearings">
          {hasCore && (
            <lineSegments
              ref={bearingCoreRef}
              name="bearing-core"
              scale={[extent, extent, 1]}
              frustumCulled={false}
            >
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
            <lineSegments
              ref={bearingOrbitalRef}
              name="bearing-orbital"
              frustumCulled={false}
            >
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
};
