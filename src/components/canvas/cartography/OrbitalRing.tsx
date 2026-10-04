import type React from 'react';
import { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useThreeTokenStore } from '../../../stores/useThreeTokenStore';
import { rotateToOrbitalPlane, DEG_TO_RADIANS } from '../../../utils/astroMath';
import { LINE_STYLE_CONSTANTS } from './cartographyMath';

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
  /** Tactical line styling. Default: 'dashed' (tactical vector styling). Can also be 'solid'. */
  lineStyle?: 'dashed' | 'solid';
  /** Optional custom color override. Default: stateFocus if focused, gridPrimaryColor for tactical vector styling */
  color?: THREE.Color | string;
  /** Number of radial curve samples. Default: 256 */
  segments?: number;
  /** Optional origin offset. Default: [0, 0, 0] */
  position?: [number, number, number];
}

/**
 * OrbitalRing: 3D Keplerian elliptical orbit ring rendered with tactical vector line styling.
 * Calculates Keplerian orbital geometry with focal anchoring at (0,0,0),
 * orbital plane inclination, ascending node orientation, periapsis indication,
 * prograde velocity vector indicator, and unstretched dashed vector linework.
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
  lineStyle = 'dashed',
  color,
  segments = 256,
  position = [0, 0, 0],
}) => {
  const stateFocus = useThreeTokenStore((state) => state.tokens.stateFocus);
  const gridPrimaryColor = useThreeTokenStore((state) => state.tokens.gridPrimaryColor);

  const resolvedColor = useMemo(() => {
    if (color) return color instanceof THREE.Color ? color : new THREE.Color(color);
    return isFocused ? stateFocus : gridPrimaryColor;
  }, [color, isFocused, stateFocus, gridPrimaryColor]);

  const ringOpacity = isFocused ? 0.95 : 0.32;
  const markerOpacity = isFocused ? 1.0 : 0.60;

  // Memoized geometry computation
  const { orbitGeometry, tickGeometry, directionGeometry } = useMemo(() => {
    const a = Number.isFinite(semiMajorAxis) && semiMajorAxis > 0 ? semiMajorAxis : 0.001;
    const e = Number.isFinite(eccentricity) ? Math.max(0, Math.min(0.99, eccentricity)) : 0;
    const omegaRad = argumentOfPeriapsis * DEG_TO_RADIANS;
    const sampleCount = Math.max(256, segments);

    // Sample points along the Keplerian ellipse in the orbital plane (z = 0)
    const ptsX = new Float32Array(sampleCount + 1);
    const ptsY = new Float32Array(sampleCount + 1);
    const cumulativeDist = new Float32Array(sampleCount + 1);

    let totalPerimeter = 0;
    for (let i = 0; i <= sampleCount; i++) {
      const theta = (i / sampleCount) * Math.PI * 2;
      const r = (a * (1 - e * e)) / (1 + e * Math.cos(theta));
      const phi = theta + omegaRad;
      const px = r * Math.cos(phi);
      const py = r * Math.sin(phi);
      ptsX[i] = px;
      ptsY[i] = py;

      if (i > 0) {
        const dx = px - ptsX[i - 1];
        const dy = py - ptsY[i - 1];
        totalPerimeter += Math.hypot(dx, dy);
      }
      cumulativeDist[i] = totalPerimeter;
    }

    let geom: THREE.BufferGeometry;

    if (lineStyle === 'solid') {
      // Solid continuous line loop
      const loopBuffer = new Float32Array(sampleCount * 3);
      for (let i = 0; i < sampleCount; i++) {
        loopBuffer[i * 3] = ptsX[i];
        loopBuffer[i * 3 + 1] = ptsY[i];
        loopBuffer[i * 3 + 2] = 0;
      }
      rotateToOrbitalPlane(loopBuffer, inclination, ascendingNode, { degrees: true });
      geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(loopBuffer, 3));
    } else {
      // Tactical vector styling: unstretched dashes along the ellipse perimeter
      const baseDash = LINE_STYLE_CONSTANTS.dashLength; // 0.2
      const baseGap = LINE_STYLE_CONSTANTS.dashGap; // 0.1
      const nominalCycle = baseDash + baseGap; // 0.3

      // Whole number of cycles to close seamlessly around the full 360-degree orbit
      const numCycles = Math.max(6, Math.round(totalPerimeter / nominalCycle));
      const cycleLen = totalPerimeter / numCycles;
      const scale = cycleLen / nominalCycle;
      const dashLen = baseDash * scale;

      const segmentBuffer = new Float32Array(numCycles * 2 * 3);
      let bufIdx = 0;

      let currSampleIdx = 0;
      const getPointAtDist = (s: number): [number, number] => {
        while (currSampleIdx < sampleCount && cumulativeDist[currSampleIdx + 1] < s) {
          currSampleIdx++;
        }
        const s0 = cumulativeDist[currSampleIdx];
        const s1 = cumulativeDist[currSampleIdx + 1];
        const t = (s1 - s0) > 1e-7 ? (s - s0) / (s1 - s0) : 0;
        const ix = ptsX[currSampleIdx] + (ptsX[currSampleIdx + 1] - ptsX[currSampleIdx]) * t;
        const iy = ptsY[currSampleIdx] + (ptsY[currSampleIdx + 1] - ptsY[currSampleIdx]) * t;
        return [ix, iy];
      };

      for (let c = 0; c < numCycles; c++) {
        const sStart = c * cycleLen;
        const sEnd = Math.min(sStart + dashLen, totalPerimeter);

        const [x1, y1] = getPointAtDist(sStart);
        const [x2, y2] = getPointAtDist(sEnd);

        segmentBuffer[bufIdx++] = x1;
        segmentBuffer[bufIdx++] = y1;
        segmentBuffer[bufIdx++] = 0;

        segmentBuffer[bufIdx++] = x2;
        segmentBuffer[bufIdx++] = y2;
        segmentBuffer[bufIdx++] = 0;
      }

      rotateToOrbitalPlane(segmentBuffer, inclination, ascendingNode, { degrees: true });
      geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(segmentBuffer, 3));
    }

    // Periapsis tick geometry (at theta = 0)
    let periapsisGeom: THREE.BufferGeometry | null = null;
    if (showPeriapsisTick) {
      const rPeri = a * (1 - e);
      const tickHalfLen = Math.max(0.06, Math.min(a * 0.05, 0.35));
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

        const chevronSize = Math.max(0.08, Math.min(a * 0.06, 0.45));
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
  }, [
    semiMajorAxis,
    eccentricity,
    inclination,
    ascendingNode,
    argumentOfPeriapsis,
    showPeriapsisTick,
    showDirectionIndicator,
    lineStyle,
    segments,
  ]);

  useEffect(() => {
    return () => {
      orbitGeometry.dispose();
      tickGeometry?.dispose();
      directionGeometry?.dispose();
    };
  }, [orbitGeometry, tickGeometry, directionGeometry]);

  return (
    <group position={position} data-testid="orbital-ring">
      {lineStyle === 'solid' ? (
        <lineLoop geometry={orbitGeometry} name="orbit-path">
          <lineBasicMaterial
            color={resolvedColor}
            opacity={ringOpacity}
            transparent
            depthWrite={false}
          />
        </lineLoop>
      ) : (
        <lineSegments geometry={orbitGeometry} name="orbit-path">
          <lineBasicMaterial
            color={resolvedColor}
            opacity={ringOpacity}
            transparent
            depthWrite={false}
          />
        </lineSegments>
      )}

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
