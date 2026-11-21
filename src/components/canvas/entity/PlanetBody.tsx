import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useLazyRef } from '../../../hooks/useLazyRef';
import { NOOP_RAYCAST } from '../engineConfig';
import type { CelestialClassification } from '../../../types/spatial';
import {
  projectedPixelDiameter,
  bodyVisibility,
  DEFAULT_BODY_MIN_PIXEL_SIZE,
  DEFAULT_BODY_FADE_RANGE,
  CROSSFADE_VISIBILITY_EPSILON,
} from '../math/bodyCrossfade';

import {
  type PlanetPalette,
  getClassificationPalette,
} from '../../../data/planetPalettes';
import { getOrCreatePlanetTexture } from './planetBodyTexture';
export type { PlanetPalette };

export interface PlanetBodyProps {
  name: string;
  classification?: CelestialClassification;
  radius?: number;
  position?: [number, number, number] | THREE.Vector3;
  hasAtmosphere?: boolean;
  atmosphereColor?: string;
  minPixelSize?: number;
  fadeRange?: number;
  children?: React.ReactNode;
}

/**
 * PlanetBody: Canonical physical planetary disc / sphere rendered at true cartographic scale.
 * 
 * Invariants per architectural specification:
 * 1. Uniform cartographic lighting: zero day/night terminator or directional sun light shadow.
 * 2. Classification-keyed procedural surface texture manifest.
 * 3. Smooth fade-out when projected diameter < minPixelSize, seamlessly passing rendering
 *    to invariant BodyMarker / Reticle layers.
 */
export const PlanetBody: React.FC<PlanetBodyProps> = ({
  name,
  classification = 'terrestrial',
  radius = 2.0,
  position = [0, 0, 0],
  hasAtmosphere = true,
  atmosphereColor: explicitAtmoColor,
  minPixelSize = DEFAULT_BODY_MIN_PIXEL_SIZE,
  fadeRange = DEFAULT_BODY_FADE_RANGE,
  children,
}) => {
  const palette = useMemo(() => getClassificationPalette(classification), [classification]);
  const texture = useMemo(() => getOrCreatePlanetTexture(classification, palette), [classification, palette]);

  const groupRef = useRef<THREE.Group | null>(null);
  const surfaceMatRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const atmoMatRef = useRef<THREE.MeshBasicMaterial | null>(null);

  const scratchPos = useLazyRef(() => new THREE.Vector3());

  const resolvedPos = useMemo<[number, number, number]>(() => {
    if (position instanceof THREE.Vector3) {
      return [position.x, position.y, position.z];
    }
    return position;
  }, [position]);

  const camera = useThree((s) => s.camera);
  const sizeHeight = useThree((s) => s.size.height);

  useFrame(() => {
    if (!surfaceMatRef.current) return;

    const worldPos = groupRef.current
      ? groupRef.current.getWorldPosition(scratchPos.current)
      : scratchPos.current.set(resolvedPos[0], resolvedPos[1], resolvedPos[2]);

    const diameterPx = projectedPixelDiameter(camera, worldPos, radius, sizeHeight);
    const alpha = bodyVisibility(diameterPx, minPixelSize, fadeRange);

    surfaceMatRef.current.opacity = alpha;
    surfaceMatRef.current.transparent = alpha < 0.999;
    surfaceMatRef.current.visible = alpha > CROSSFADE_VISIBILITY_EPSILON;

    if (atmoMatRef.current) {
      atmoMatRef.current.opacity = alpha * 0.35;
      atmoMatRef.current.transparent = true;
      atmoMatRef.current.visible = alpha > CROSSFADE_VISIBILITY_EPSILON;
    }
  });

  const atmoColor = explicitAtmoColor ?? palette.atmosphereColor ?? '#88ccee';

  return (
    <group ref={groupRef} position={resolvedPos} name={`planet-body-${name}`}>
      {/* Planetary Core Surface (Uniform Cartographic Lit) */}
      <mesh name="planet-surface" raycast={NOOP_RAYCAST}>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshBasicMaterial
          ref={surfaceMatRef}
          color={texture ? '#ffffff' : palette.baseColor}
          map={texture ?? undefined}
        />
      </mesh>

      {/* Atmospheric Haze Layer */}
      {hasAtmosphere && (
        <mesh name="planet-atmosphere" raycast={NOOP_RAYCAST}>
          <sphereGeometry args={[radius * 1.05, 32, 32]} />
          <meshBasicMaterial
            ref={atmoMatRef}
            color={atmoColor}
            transparent
            opacity={0.3}
            side={THREE.FrontSide}
          />
        </mesh>
      )}

      {children}
    </group>
  );
};
