import type React from 'react';
import { useMemo, useEffect } from 'react';
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
  /** Whether to render a prograde motion direction chevron along the orbit. Default: true */
  showDirectionIndicator?: boolean;
  /** Optional custom color override. Default: stateFocus if focused, gridPrimaryColor for tactical vector styling */
  color?: THREE.Color | string;
  /** Number of radial curve segments. Default: 128 */
  segments?: number;
  /** Optional origin offset. Default: [0, 0, 0] */
  position?: [number, number, number];
}

/**
 * OrbitalRing: 3D Keplerian elliptical orbit ring rendered with tactical vector line styling.
 * Calculates Keplerian orbital geometry with focal anchoring at (0,0,0),
 * orbital plane inclination, ascending node orientation, periapsis indication,
 * and prograde velocity vector indicator.
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
  showDirectionIndicator = true,
  color,
  segments = 128,
  position = [0, 0, 0],
}) => {
  const stateFocus = useThreeTokenStore((state) => state.tokens.stateFocus);
  const gridPrimaryColor = useThreeTokenStore((state) => state.tokens.gridPrimaryColor);

  const resolvedColor = useMemo(() => {
    if (color) return color instanceof THREE.Color ? color : new THREE.Color(color);
    return isFocused ? stateFocus : gridPrimaryColor;
  }, [color, isFocused, stateFocus, gridPrimaryColor]);

  const ringOpacity = isFocused ? 0.95 : 0.28;
  const markerOpacity = isFocused ? 1.0 : 0.55;

  // Memoized geometry computation
  const { orbitGeometry, tickGeometry, directionGeometry } = useMemo(() => {
    const a = Number.isFinite(semiMajorAxis) && semiMajorAxis > 0 ? semiMajorAxis : 0.001;
    const e = Number.isFinite(eccentricity) ? Math.max(0, Math.min(0.99, eccentricity)) : 0;
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
      const tickHalfLen = Math.max(0.04, Math.min(a * 0.04, 0.25));
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

    // Prograde motion direction indicator geometry (tangent chevron at theta = PI / 2)
    let dirGeom: THREE.BufferGeometry | null = null;
    if (showDirectionIndicator) {
      const thetaDir = Math.PI / 2;
      const rDir = (a * (1 - e * e)) / (1 + e * Math.cos(thetaDir));
      const phiDir = thetaDir + omegaRad;

      const px = rDir * Math.cos(phiDir);
      const py = rDir * Math.sin(phiDir);

      // Derivatives with respect to theta for tangent vector
      const rPrime = (rDir * e * Math.sin(thetaDir)) / (1 + e * Math.cos(thetaDir));
      const dx = rPrime * Math.cos(phiDir) - rDir * Math.sin(phiDir);
      const dy = rPrime * Math.sin(phiDir) + rDir * Math.cos(phiDir);

      const tanLen = Math.hypot(dx, dy);
      if (tanLen > 1e-6) {
        const tx = dx / tanLen;
        const ty = dy / tanLen;
        const nx = -ty;
        const ny = tx;

        const chevronSize = Math.max(0.05, Math.min(a * 0.04, 0.25));
        const halfAhead = chevronSize * 0.5;
        const halfSpan = chevronSize * 0.35;

        const tipX = px + tx * halfAhead;
        const tipY = py + ty * halfAhead;

        const w1X = px - tx * halfAhead + nx * halfSpan;
        const w1Y = py - ty * halfAhead + ny * halfSpan;

        const w2X = px - tx * halfAhead - nx * halfSpan;
        const w2Y = py - ty * halfAhead - ny * halfSpan;

        const dirBuffer = new Float32Array([
          w1X, w1Y, 0,
          tipX, tipY, 0,
          w2X, w2Y, 0,
          tipX, tipY, 0,
        ]);

        rotateToOrbitalPlane(dirBuffer, inclination, ascendingNode, { degrees: true });
        dirGeom = new THREE.BufferGeometry();
        dirGeom.setAttribute('position', new THREE.BufferAttribute(dirBuffer, 3));
      }
    }

    return { orbitGeometry: geom, tickGeometry: periapsisGeom, directionGeometry: dirGeom };
  }, [semiMajorAxis, eccentricity, inclination, ascendingNode, argumentOfPeriapsis, showPeriapsisTick, showDirectionIndicator, segments]);

  useEffect(() => {
    return () => {
      orbitGeometry.dispose();
      tickGeometry?.dispose();
      directionGeometry?.dispose();
    };
  }, [orbitGeometry, tickGeometry, directionGeometry]);

  return (
    <group position={position} data-testid="orbital-ring">
      <lineLoop geometry={orbitGeometry}>
        <lineBasicMaterial
          color={resolvedColor}
          opacity={ringOpacity}
          transparent
          depthWrite={false}
        />
      </lineLoop>

      {showPeriapsisTick && tickGeometry && (
        <lineSegments geometry={tickGeometry} name="periapsis-tick">
          <lineBasicMaterial
            color={resolvedColor}
            opacity={markerOpacity}
            transparent
            depthWrite={false}
          />
        </lineSegments>
      )}

      {showDirectionIndicator && directionGeometry && (
        <lineSegments geometry={directionGeometry} name="prograde-indicator">
          <lineBasicMaterial
            color={resolvedColor}
            opacity={markerOpacity}
            transparent
            depthWrite={false}
          />
        </lineSegments>
      )}
    </group>
  );
};
