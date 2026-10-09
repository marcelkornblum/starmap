import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useLazyRef } from '../../../../hooks/useLazyRef';
import { useThreeTokenStore } from '../../../../stores/useThreeTokenStore';
import { CartoHairlineMaterial } from '../../../canvas/materials/CartoLineMaterial';
import { useSpatialFrameSafe } from '../../../canvas/instrument/SpatialFrameProvider';
import {
  createReticleGeometry,
  DEFAULT_RETICLE_SIZE,
  type CelestialClassification,
} from '../../../canvas/cartography/reticleGeometry';
import { calculateScreenInvariantScale } from '../engineConfig';
import type { CelestialInteractionState } from './types';

export interface DropStalkProps {
  id: string;
  position?: [number, number, number] | THREE.Vector3;
  entityZ?: number;
  state?: CelestialInteractionState;
  classification?: CelestialClassification;
  footprintSize?: number;
  datumZ?: number;
}

/**
 * DropStalk (§2.4: State-Driven Drop Stalks):
 * Renders vertical projection stalk down to datum plane (Z=0) strictly for selected/focused entities.
 * Solid line for +Z (North Hemisphere), dashed line for -Z (South Hemisphere).
 * Footprint exists on datum plane if and only if stalk exists.
 * Extend/retract animated with semantic motion tokens.
 */
export const DropStalk: React.FC<DropStalkProps> = ({
  id,
  position = [0, 0, 0],
  entityZ,
  state = 'passive',
  classification = 'star',
  footprintSize = DEFAULT_RETICLE_SIZE,
  datumZ = 0,
}) => {
  const stalkSelectedColor = useThreeTokenStore((s) => s.tokens.stalkSelectedColor);
  const stalkFocusedColor = useThreeTokenStore((s) => s.tokens.stalkFocusedColor);
  const stalkFocusedAlpha = useThreeTokenStore((s) => s.tokens.stalkFocusedAlpha);
  const stalkSelectedAlpha = useThreeTokenStore((s) => s.tokens.stalkSelectedAlpha);
  const footprintColor = useThreeTokenStore((s) => s.tokens.footprintColor);
  const footprintAlpha = useThreeTokenStore((s) => s.tokens.footprintAlpha);
  const footprintSelectedColor = useThreeTokenStore((s) => s.tokens.footprintSelectedColor);
  const footprintSelectedAlpha = useThreeTokenStore((s) => s.tokens.footprintSelectedAlpha);
  const footprintFocusedColor = useThreeTokenStore((s) => s.tokens.footprintFocusedColor);
  const footprintFocusedAlpha = useThreeTokenStore((s) => s.tokens.footprintFocusedAlpha);
  const stalkExtendDuration = useThreeTokenStore((s) => s.tokens.stalkExtendDuration);
  const stalkRetractDuration = useThreeTokenStore((s) => s.tokens.stalkRetractDuration);

  // Single-Stalk Rule: Only render in selected or focused tiers
  const isStalkTier = state === 'selected' || state === 'focused';

  const [posX, posY, posZ] = useMemo(() => {
    if (position instanceof THREE.Vector3) {
      return [position.x, position.y, position.z];
    }
    return position;
  }, [position]);

  const isLocal = entityZ !== undefined || (posX === 0 && posY === 0);
  const z = entityZ ?? posZ;
  const x = isLocal ? 0 : posX;
  const y = isLocal ? 0 : posY;
  const startZ = isLocal ? 0 : z;
  const targetZ = isLocal ? (datumZ - z) : datumZ;

  const deltaZ = z - datumZ;
  const isDashed = deltaZ < 0;
  const hemisphere = isDashed ? 'south' : 'north';

  // Animation progress: 0 (retracted) -> 1 (fully extended)
  // In SSR / node tests without useFrame, initialize directly to 1.0 for stalk tiers so renderToString succeeds.
  // In browser, initialize to 0.0 so extension animates smoothly upon selection.
  const progressRef = useRef(
    typeof window === 'undefined' ? (isStalkTier ? 1.0 : 0.0) : 0.0,
  );
  const lineMeshRef = useRef<THREE.LineSegments>(null);
  const footprintRef = useRef<THREE.Group>(null);
  const footprintMatRef = useRef<THREE.LineBasicMaterial>(null);
  const scratchWorldPos = useLazyRef(() => new THREE.Vector3());

  const frameCtx = useSpatialFrameSafe();

  // Stalk vertical line remains neutral / monochrome; datum reticle adopts state color
  const stalkColor = state === 'focused' ? stalkFocusedColor : stalkSelectedColor;
  const stalkOpacity = state === 'focused' ? stalkFocusedAlpha : stalkSelectedAlpha;

  const resolvedFootprintColor = state === 'focused'
    ? footprintFocusedColor
    : (state === 'selected' ? footprintSelectedColor : footprintColor);
  const resolvedFootprintAlpha = state === 'focused'
    ? footprintFocusedAlpha
    : (state === 'selected' ? footprintSelectedAlpha : footprintAlpha);

  // Stalk line geometry: 2 vertices (entity position -> datum projection)
  const lineGeom = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array([
      x, y, startZ,
      x, y, targetZ,
    ]);
    const totalDist = Math.abs(targetZ - startZ);
    const lineDistances = new Float32Array([
      0,
      totalDist,
    ]);
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('lineDistance', new THREE.BufferAttribute(lineDistances, 1));
    geom.computeBoundingSphere();
    return geom;
  }, [x, y, startZ, targetZ]);

  // Footprint reticle geometry at base on datum plane
  const footprintGeom = useMemo(() => {
    return createReticleGeometry(classification, footprintSize);
  }, [classification, footprintSize]);

  const lineMaterial = useMemo(() => {
    return new CartoHairlineMaterial({
      color: stalkColor,
      opacity: stalkOpacity,
      lineStyle: isDashed ? 'dashed' : 'solid',
      transparent: true,
      depthWrite: false,
    });
  }, [stalkColor, stalkOpacity, isDashed]);

  useEffect(() => {
    return () => {
      lineGeom.dispose();
      footprintGeom.dispose();
      lineMaterial.dispose();
    };
  }, [lineGeom, footprintGeom, lineMaterial]);

  useFrame(({ camera, size }, delta) => {
    const target = isStalkTier ? 1.0 : 0.0;
    const dur = target > progressRef.current ? stalkExtendDuration : stalkRetractDuration;

    if (dur <= 0) {
      progressRef.current = target;
    } else {
      const step = delta / dur;
      if (target > progressRef.current) {
        progressRef.current = Math.min(target, progressRef.current + step);
      } else {
        progressRef.current = Math.max(target, progressRef.current - step);
      }
    }

    const p = progressRef.current;

    // Mutate stalk line vertex 2 in-place: current tip Z = startZ + p * (targetZ - startZ)
    const geom = lineMeshRef.current?.geometry as THREE.BufferGeometry | undefined;
    if (geom) {
      const posAttr = geom.getAttribute('position') as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      arr[5] = startZ + p * (targetZ - startZ);
      posAttr.needsUpdate = true;

      const distAttr = geom.getAttribute('lineDistance') as THREE.BufferAttribute | undefined;
      if (distAttr) {
        const dArr = distAttr.array as Float32Array;
        dArr[1] = p * Math.abs(targetZ - startZ);
        distAttr.needsUpdate = true;
      }
    }

    const isVisible = p > 0.001 && Math.abs(deltaZ) > 1e-4;
    if (lineMeshRef.current) {
      lineMeshRef.current.visible = isVisible;
    }

    const frameState = frameCtx?.frameRef?.current;
    const planeWeights = frameState?.planeWeights;
    const fadePlanar = planeWeights ? Math.max(0, 1.0 - planeWeights.maxAlpha) : 1.0;

    // Footprint visibility & invariant screen-space scaling (stamps as stalk reaches datum)
    if (footprintRef.current) {
      footprintRef.current.visible = (p > 0.85) && (fadePlanar > 1e-4);
      if (footprintRef.current.visible) {
        footprintRef.current.getWorldPosition(scratchWorldPos.current);
        const camDist = Math.max(camera.position.distanceTo(scratchWorldPos.current), 1e-4);
        const invScale = frameState
          ? (camDist / frameState.referenceFootprint) * frameState.fovFactor
          : calculateScreenInvariantScale(camDist, camera);
        footprintRef.current.scale.set(invScale, invScale, 1);
      }
    }

    if (footprintMatRef.current) {
      footprintMatRef.current.color.copy(resolvedFootprintColor);
      footprintMatRef.current.opacity = resolvedFootprintAlpha * fadePlanar;
    }

    lineMaterial.setColor(stalkColor);
    lineMaterial.setOpacity(stalkOpacity);
    lineMaterial.updateResolution(camera, size.height);
  });

  if (!isStalkTier && progressRef.current <= 0.001) return null;

  return (
    <group name={`drop-stalk-${id}`} data-hemisphere={hemisphere}>
      {/* Vertical Stalk Line */}
      <lineSegments ref={lineMeshRef} name="stalk-line" material={lineMaterial} frustumCulled={false}>
        <primitive object={lineGeom} attach="geometry" />
      </lineSegments>

      {/* Datum Floor Ground Footprint stamped at Z=datumZ */}
      <group
        ref={footprintRef}
        position={[x, y, targetZ + 0.002]}
        name="stalk-footprint"
      >
        <lineSegments frustumCulled={false}>
          <primitive object={footprintGeom} attach="geometry" />
          <lineBasicMaterial
            ref={footprintMatRef}
            color={resolvedFootprintColor}
            opacity={resolvedFootprintAlpha}
            transparent
            depthWrite={false}
          />
        </lineSegments>
      </group>
    </group>
  );
};
