import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useLazyRef } from '../../../hooks/useLazyRef';
import { useThreeTokenStore } from '../../../stores/useThreeTokenStore';
import { CartoHairlineMaterial } from '../materials/CartoLineMaterial';
import { useSpatialFrameSafe } from '../instrument/spatialFrameContext';
import { getCrossScaleSceneScale } from '../instrument/crossScaleVisualState';
import type { CelestialClassification } from '../../../types/spatial';
import {
  createReticleGeometry,
  DEFAULT_RETICLE_SIZE,
} from '../cartography/reticleGeometry';
import { resolveEntityScreenInvariantScale, NOOP_RAYCAST } from '../engineConfig';
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
export const DropStalk: React.FC<DropStalkProps> = React.memo(({
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

  const progressRef = useRef(
    typeof window === 'undefined' ? (isStalkTier ? 1.0 : 0.0) : 0.0,
  );
  const lastProgressRef = useRef<number>(Number.NaN);
  const lastFootprintOpacityRef = useRef<number>(Number.NaN);
  const lastStalkOpacityRef = useRef<number>(Number.NaN);
  const lineMeshRef = useRef<THREE.LineSegments>(null);
  const footprintRef = useLazyRef(() => {
    const g = new THREE.Group();
    g.position.set(x, y, targetZ + 0.002);
    return g;
  });
  const footprintMatRef = useRef<THREE.LineBasicMaterial>(null);
  const scratchWorldPos = useLazyRef(() => new THREE.Vector3());

  const frameCtx = useSpatialFrameSafe();
  const invalidate = useThree((s) => s.invalidate);

  const stalkColor = state === 'focused' ? stalkFocusedColor : stalkSelectedColor;
  const stalkOpacity = state === 'focused' ? stalkFocusedAlpha : stalkSelectedAlpha;

  const resolvedFootprintColor = state === 'focused'
    ? footprintFocusedColor
    : (state === 'selected' ? footprintSelectedColor : footprintColor);
  const resolvedFootprintAlpha = state === 'focused'
    ? footprintFocusedAlpha
    : (state === 'selected' ? footprintSelectedAlpha : footprintAlpha);

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

  const footprintGeom = useMemo(() => {
    return createReticleGeometry(classification, footprintSize);
  }, [classification, footprintSize]);

  const lineMaterial = useMemo(() => {
    return new CartoHairlineMaterial({
      lineStyle: isDashed ? 'dashed' : 'solid',
      transparent: true,
      depthWrite: false,
    });
  }, [isDashed]);

  useEffect(() => {
    lineMaterial.setColor(stalkColor);
    const initialFade = frameCtx?.frameRef?.current?.instrumentFade ?? 1.0;
    const initialOpacity = stalkOpacity * initialFade;
    lineMaterial.setOpacity(initialOpacity);
    lastStalkOpacityRef.current = initialOpacity;
  }, [lineMaterial, stalkColor, stalkOpacity, frameCtx]);

  useEffect(() => {
    lastProgressRef.current = Number.NaN;
    return () => {
      lineGeom.dispose();
    };
  }, [lineGeom]);

  useEffect(() => {
    return () => {
      lineMaterial.dispose();
    };
  }, [lineMaterial]);

  useEffect(() => {
    if (footprintMatRef.current?.color) {
      footprintMatRef.current.color.set(resolvedFootprintColor);
    }
  }, [resolvedFootprintColor]);

  useEffect(() => {
    if (Math.abs(deltaZ) <= 1e-4) return;
    invalidate();
  }, [invalidate, isStalkTier, deltaZ, stalkColor, stalkOpacity, resolvedFootprintColor, resolvedFootprintAlpha]);

  useFrame(({ camera, size }, delta) => {
    if (!isStalkTier && progressRef.current <= 0) return;
    const clampedDelta = Math.min(delta, 0.1);
    const target = isStalkTier ? 1.0 : 0.0;
    const dur = target > progressRef.current ? stalkExtendDuration : stalkRetractDuration;

    if (dur <= 0) {
      progressRef.current = target;
    } else {
      const step = clampedDelta / dur;
      if (target > progressRef.current) {
        progressRef.current = Math.min(target, progressRef.current + step);
      } else {
        progressRef.current = Math.max(target, progressRef.current - step);
      }
    }

    const p = progressRef.current;

    const geom = lineMeshRef.current?.geometry;
    if (
      geom instanceof THREE.BufferGeometry &&
      (Number.isNaN(lastProgressRef.current) || Math.abs(p - lastProgressRef.current) > 1e-5)
    ) {
      lastProgressRef.current = p;
      const posAttr = geom.getAttribute('position');
      if (posAttr instanceof THREE.BufferAttribute && posAttr.array instanceof Float32Array) {
        posAttr.array[5] = startZ + p * (targetZ - startZ);
        posAttr.needsUpdate = true;
      }

      const distAttr = geom.getAttribute('lineDistance');
      if (distAttr instanceof THREE.BufferAttribute && distAttr.array instanceof Float32Array) {
        distAttr.array[1] = p * Math.abs(targetZ - startZ);
        distAttr.needsUpdate = true;
      }
    }

    const isVisible = p > 0.001 && Math.abs(deltaZ) > 1e-4;
    if (lineMeshRef.current) {
      lineMeshRef.current.visible = isVisible;
    }

    const frameState = frameCtx?.frameRef?.current;
    const planeWeights = frameState?.planeWeights;
    const instrumentFade = frameState?.instrumentFade ?? 1.0;
    const fadePlanar = planeWeights ? Math.max(0, 1.0 - planeWeights.maxAlpha) : 1.0;

    if (footprintRef.current) {
      footprintRef.current.position.set(x, y, targetZ + 0.002);
      footprintRef.current.visible = (p > 0.85) && (fadePlanar * instrumentFade > 1e-4) && Math.abs(deltaZ) > 1e-4;
      if (footprintRef.current.visible) {
        footprintRef.current.getWorldPosition(scratchWorldPos.current);
        const camDist = Math.max(camera.position.distanceTo(scratchWorldPos.current), 1e-4);
        const invScale = resolveEntityScreenInvariantScale(
          camDist,
          camera,
          frameState,
        );
        const localInvScale = invScale / getCrossScaleSceneScale();
        footprintRef.current.scale.set(localInvScale, localInvScale, 1);
      }
    }

    const nextOpacity = resolvedFootprintAlpha * fadePlanar * instrumentFade;
    if (
      footprintMatRef.current &&
      (Number.isNaN(lastFootprintOpacityRef.current) || Math.abs(nextOpacity - lastFootprintOpacityRef.current) > 1e-4)
    ) {
      footprintMatRef.current.opacity = nextOpacity;
      lastFootprintOpacityRef.current = nextOpacity;
    }

    const nextStalkOpacity = stalkOpacity * instrumentFade;
    if (Number.isNaN(lastStalkOpacityRef.current) || Math.abs(nextStalkOpacity - lastStalkOpacityRef.current) > 1e-4) {
      lineMaterial.setOpacity(nextStalkOpacity);
      lastStalkOpacityRef.current = nextStalkOpacity;
    }

    lineMaterial.updateResolution(camera, size.height);

    if (Math.abs(deltaZ) > 1e-4 && Math.abs(target - p) > 1e-4) {
      invalidate();
    }
  });

  const groupUserData = useMemo(() => ({ hemisphere }), [hemisphere]);

  if (!isStalkTier && progressRef.current <= 0.001) return null;

  return (
    <group name={`drop-stalk-${id}`} userData={groupUserData}>
      {/* Vertical Stalk Line */}
      <lineSegments ref={lineMeshRef} name="stalk-line" material={lineMaterial} frustumCulled={false} raycast={NOOP_RAYCAST}>
        <primitive object={lineGeom} attach="geometry" />
      </lineSegments>

      {/* Datum Floor Ground Footprint stamped at Z=datumZ */}
      <group
        ref={footprintRef}
        position={[x, y, targetZ + 0.002]}
        name="stalk-footprint"
      >
        <lineSegments frustumCulled={false} raycast={NOOP_RAYCAST}>
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
});

DropStalk.displayName = 'DropStalk';
