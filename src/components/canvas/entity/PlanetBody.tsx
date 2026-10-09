import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useLazyRef } from '../../../hooks/useLazyRef';
import type { CelestialClassification } from '../cartography/reticleGeometry';
import {
  projectedPixelDiameter,
  bodyVisibility,
  DEFAULT_BODY_MIN_PIXEL_SIZE,
  DEFAULT_BODY_FADE_RANGE,
  CROSSFADE_VISIBILITY_EPSILON,
} from '../math/bodyCrossfade';

import {
  type PlanetPalette,
  CLASSIFICATION_PALETTES,
  getClassificationPalette,
} from '../../../data/planetPalettes';
export { type PlanetPalette, CLASSIFICATION_PALETTES, getClassificationPalette };

/**
 * Generates an in-memory procedural cartographic texture matching classification.
 */
function createPlanetTexture(classification: CelestialClassification, palette: PlanetPalette): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Fill base planetary ocean/surface
    ctx.fillStyle = palette.baseColor;
    ctx.fillRect(0, 0, 512, 256);

    if (classification === 'gas-giant' || classification === 'ice-giant' || classification === 'brown-dwarf') {
      // Atmospheric planetary latitudinal bands
      const bands = palette.bands ?? [palette.accentColor, palette.baseColor];
      const bandHeight = 256 / bands.length;
      bands.forEach((color, i) => {
        ctx.fillStyle = color;
        ctx.fillRect(0, i * bandHeight, 512, bandHeight);

        // Subtle gradient transition
        const grad = ctx.createLinearGradient(0, i * bandHeight, 0, (i + 1) * bandHeight);
        grad.addColorStop(0, 'rgba(0, 0, 0, 0.15)');
        grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.08)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, i * bandHeight, 512, bandHeight);
      });

      // Gas giant storm spot
      if (classification === 'gas-giant') {
        ctx.fillStyle = '#b04020';
        ctx.beginPath();
        ctx.ellipse(320, 160, 42, 24, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Terrestrial continents & landmasses
      ctx.fillStyle = palette.accentColor;
      for (let i = 0; i < 6; i++) {
        const cx = 80 + i * 70;
        const cy = 70 + (i % 2) * 80;
        ctx.beginPath();
        ctx.arc(cx, cy, 32 + (i % 3) * 8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Polar ice caps
      ctx.fillStyle = 'rgba(235, 245, 255, 0.85)';
      ctx.fillRect(0, 0, 512, 24);
      ctx.fillRect(0, 232, 512, 24);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  } catch {
    return null;
  }
}

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
  const texture = useMemo(() => createPlanetTexture(classification, palette), [classification, palette]);

  useEffect(() => {
    return () => {
      texture?.dispose();
    };
  }, [texture]);

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

  const { camera, size } = useThree();

  useFrame(() => {
    if (!surfaceMatRef.current) return;

    const worldPos = groupRef.current
      ? groupRef.current.getWorldPosition(scratchPos.current)
      : scratchPos.current.set(resolvedPos[0], resolvedPos[1], resolvedPos[2]);

    const diameterPx = projectedPixelDiameter(camera, worldPos, radius, size.height);
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
      <mesh name="planet-surface">
        <sphereGeometry args={[radius, 48, 48]} />
        <meshBasicMaterial
          ref={surfaceMatRef}
          color={texture ? '#ffffff' : palette.baseColor}
          map={texture ?? undefined}
        />
      </mesh>

      {/* Atmospheric Haze Layer */}
      {hasAtmosphere && (
        <mesh name="planet-atmosphere">
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
