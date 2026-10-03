import type React from 'react';
import { useMemo } from 'react';
import * as THREE from 'three';
import { useThreeTokenStore } from '../../../stores/useThreeTokenStore';
import { rotateToOrbitalPlane, DEG_TO_RADIANS } from '../../../utils/astroMath';

export interface OrbitalRingProps {
  /** Semi-major axis in AU or scene units */
  semiMajorAxis: number;
  /** Orbital eccentricity (0 <= e < 1). Default: 0 */
  eccentricity?: number;
  /** Orbital inclination relative to datum plane in degrees. Default: 0 */
  inclination?: number;
  /** Longitude of ascending node in degrees. Default: 0 */
  ascendingNode?: number;
  /** Argument of periapsis in degrees. Default: 0 */
  argumentOfPeriapsis?: number;
  /** Whether this orbit belongs to the currently focused entity. Default: false */
  isFocused?: boolean;
  /** Whether to render a tick marker at periapsis. Default: true */
  showPeriapsisTick?: boolean;
  /** Number of radial curve segments. Default: 128 */
  segments?: number;
  /** Optional origin offset. Default: [0, 0, 0] */
  position?: [number, number, number];
}

/**
 * OrbitalRing: 3D Keplerian elliptical orbit ring.
 * Calculates Keplerian orbital geometry with focal anchoring at (0,0,0),
 * orbital plane inclination, ascending node orientation, and periapsis indication.
 * Consumes design tokens via useThreeTokenStore with zero-shader-recompile in-place mutation.
 */
export const OrbitalRing: React.FC<OrbitalRingProps> = ({
  semiMajorAxis,
  eccentricity = 0,
  inclination = 0,
  ascendingNode = 0,
  argumentOfPeriapsis = 0,
  isFocused = false,
  showPeriapsisTick = true,
  segments = 128,
  position = [0, 0, 0],
}) => {
  const tokens = useThreeTokenStore((state) => state.tokens);

  const ringColor = isFocused ? tokens.stateFocus : tokens.categoryOrbit;
  const ringOpacity = isFocused ? 0.95 : 0.45;
  const tickOpacity = isFocused ? 1.0 : 0.6;

  // Memoized geometry computation
  const { orbitGeometry, tickGeometry } = useMemo(() => {
    const a = Math.max(0.001, semiMajorAxis);
    const e = Math.max(0, Math.min(0.99, eccentricity));
    const omegaRad = argumentOfPeriapsis * DEG_TO_RADIANS;

    // Buffer for orbit vertices: (segments + 1) * 3 floats
    const orbitBuffer = new Float32Array((segments + 1) * 3);

    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      // Keplerian polar equation with focus at origin:
      const r = (a * (1 - e * e)) / (1 + e * Math.cos(theta));
      // Rotate by argument of periapsis (omega) in orbital plane:
      const phi = theta + omegaRad;
      const xOrb = r * Math.cos(phi);
      const yOrb = r * Math.sin(phi);

      const idx = i * 3;
      orbitBuffer[idx] = xOrb;
      orbitBuffer[idx + 1] = yOrb;
      orbitBuffer[idx + 2] = 0;
    }

    // Rotate into final 3D orbital plane (inclination & ascending node)
    rotateToOrbitalPlane(orbitBuffer, inclination, ascendingNode, { degrees: true });

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(orbitBuffer, 3));

    // Periapsis tick geometry (at theta = 0)
    let periapsisGeom: THREE.BufferGeometry | null = null;
    if (showPeriapsisTick) {
      const rPeri = a * (1 - e);
      const tickHalfLen = a * 0.04;
      const phiPeri = omegaRad;
      const perpAngle = phiPeri + Math.PI / 2;

      const px = rPeri * Math.cos(phiPeri);
      const py = rPeri * Math.sin(phiPeri);

      const dx = tickHalfLen * Math.cos(perpAngle);
      const dy = tickHalfLen * Math.sin(perpAngle);

      const tickBuffer = new Float32Array([
        px - dx, py - dy, 0,
        px + dx, py + dy, 0,
      ]);

      rotateToOrbitalPlane(tickBuffer, inclination, ascendingNode, { degrees: true });
      periapsisGeom = new THREE.BufferGeometry();
      periapsisGeom.setAttribute('position', new THREE.BufferAttribute(tickBuffer, 3));
    }

    return { orbitGeometry: geom, tickGeometry: periapsisGeom };
  }, [semiMajorAxis, eccentricity, inclination, ascendingNode, argumentOfPeriapsis, showPeriapsisTick, segments]);

  return (
    <group position={position} data-testid="orbital-ring">
      <lineLoop geometry={orbitGeometry}>
        <lineBasicMaterial
          color={ringColor}
          opacity={ringOpacity}
          transparent
          depthWrite={false}
        />
      </lineLoop>

      {showPeriapsisTick && tickGeometry && (
        <lineSegments geometry={tickGeometry}>
          <lineBasicMaterial
            color={ringColor}
            opacity={tickOpacity}
            transparent
            depthWrite={false}
          />
        </lineSegments>
      )}
    </group>
  );
};
