import type React from 'react';
import { useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useThreeTokenStore } from '../../../stores/useThreeTokenStore';
import { useUIStore } from '../../../stores/useUIStore';
import { rotateToOrbitalPlane, DEG_TO_RADIANS } from '../../../utils/astroMath';
import {
  ScreenSpaceLineMaterial,
  SCREEN_SPACE_LINE_CONSTANTS,
} from './ScreenSpaceLineMaterial';

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
  /** Optional body ID this orbit belongs to. When selected in useUIStore, orbit intrinsically turns red. */
  bodyId?: string;
  /** Whether the orbit belongs to a selected or focused body (boosts opacity and applies bearing red color). Default: false */
  isFocused?: boolean;
  /** Alias for isFocused (applies bearing red color and boosted opacity). Default: false */
  isSelected?: boolean;
  /** Whether to render a tick marker at periapsis. Default: true */
  showPeriapsisTick?: boolean;
  /** Whether to render a prograde motion direction chevron along the orbit. Default: true */
  showDirectionIndicator?: boolean;
  /** Tactical line styling. Default: 'dashed' (schematic vector styling). Can also be 'solid' or 'dotted'. */
  lineStyle?: 'dashed' | 'solid' | 'dotted';
  /** Optional custom color override. Default: bearing red if selected/focused, gridPrimaryColor for passive orbits */
  color?: THREE.Color | string;
  /** Number of radial curve samples. Default: 256 */
  segments?: number;
  /** Optional origin offset. Default: [0, 0, 0] */
  position?: [number, number, number];
  /** Optional click handler when clicking the orbit line directly */
  onClick?: (bodyId?: string) => void;
}

/**
 * OrbitalRing: 3D Keplerian elliptical orbit ring rendered with tactical vector line styling.
 * Calculates Keplerian orbital geometry with focal anchoring at (0,0,0),
 * orbital plane inclination, ascending node orientation, periapsis indication,
 * prograde velocity vector indicator, and perspective-invariant schematic linework.
 * Intrinsically reacts to body selection via useUIStore.
 */
export const OrbitalRing: React.FC<OrbitalRingProps> = ({
  semiMajorAxis,
  eccentricity = 0,
  inclination = 0,
  ascendingNode = 0,
  argumentOfPeriapsis = 0,
  bodyId,
  isFocused = false,
  isSelected = false,
  showPeriapsisTick = true,
  showDirectionIndicator = true,
  lineStyle = 'dashed',
  color,
  segments = 256,
  position = [0, 0, 0],
  onClick,
}) => {
  const bearingColor = useThreeTokenStore(
    (state) => state.tokens.bearingOrbitalColor ?? state.tokens.bearingLineColor,
  );
  const gridPrimaryColor = useThreeTokenStore((state) => state.tokens.gridPrimaryColor);
  const selectedNodeId = useUIStore((state) => state.selectedNodeId);

  // Intrinsic selection: orbit activates if explicitly focused/selected, or if its bodyId
  // is selected in useUIStore (or if bodyId is omitted and any node in the scene is selected)
  const isBodySelected = Boolean(bodyId)
    ? selectedNodeId === bodyId
    : Boolean(selectedNodeId);
  const isActive = isFocused || isSelected || isBodySelected;

  const resolvedColor = useMemo(() => {
    if (color) return color instanceof THREE.Color ? `#${color.getHexString()}` : color;
    const activeColor = isActive ? bearingColor : gridPrimaryColor;
    return `#${activeColor.getHexString()}`;
  }, [color, isActive, bearingColor, gridPrimaryColor]);

  const ringOpacity = isActive ? 0.95 : 0.32;
  const markerOpacity = isActive ? 1.0 : 0.60;
  const scratchCenterRef = useRef(new THREE.Vector3());

  // Memoized geometry computation
  const { orbitGeometry, tickGeometry, directionGeometry, perimeter } = useMemo(() => {
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

    // Continuous loop geometry sampled cleanly along the Keplerian ellipse
    const loopBuffer = new Float32Array((sampleCount + 1) * 3);
    const distBuffer = new Float32Array(sampleCount + 1);
    for (let i = 0; i <= sampleCount; i++) {
      loopBuffer[i * 3] = ptsX[i];
      loopBuffer[i * 3 + 1] = ptsY[i];
      loopBuffer[i * 3 + 2] = 0;
      distBuffer[i] = cumulativeDist[i];
    }
    rotateToOrbitalPlane(loopBuffer, inclination, ascendingNode, { degrees: true });
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(loopBuffer, 3));
    geom.setAttribute('lineDistance', new THREE.BufferAttribute(distBuffer, 1));

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

    return {
      orbitGeometry: geom,
      tickGeometry: periapsisGeom,
      directionGeometry: dirGeom,
      perimeter: totalPerimeter,
    };
  }, [
    semiMajorAxis,
    eccentricity,
    inclination,
    ascendingNode,
    argumentOfPeriapsis,
    showPeriapsisTick,
    showDirectionIndicator,
    segments,
  ]);

  const orbitMaterial = useMemo(() => {
    return new ScreenSpaceLineMaterial({
      color: resolvedColor,
      opacity: ringOpacity,
      lineStyle,
      transparent: true,
      depthWrite: false,
    });
  }, [lineStyle]);

  useEffect(() => {
    orbitMaterial.setColor(resolvedColor);
    orbitMaterial.setOpacity(ringOpacity);
  }, [orbitMaterial, resolvedColor, ringOpacity]);

  useEffect(() => {
    return () => {
      orbitGeometry.dispose();
      tickGeometry?.dispose();
      directionGeometry?.dispose();
      orbitMaterial.dispose();
    };
  }, [orbitGeometry, tickGeometry, directionGeometry, orbitMaterial]);

  // Perspective-invariant schematic line dashing update
  useFrame(({ camera, size }) => {
    orbitMaterial.updateResolution(camera, size.height);

    if (lineStyle === 'dashed') {
      const centerVec = scratchCenterRef.current.set(position[0], position[1], position[2]);
      const camDist = camera.position.distanceTo(centerVec);
      const proj11 = camera.projectionMatrix.elements[5];
      const resScale = proj11 * (size.height * 0.5);
      const approxScreenPerimeter = perimeter * (resScale / Math.max(0.001, camDist));
      const nominalCycle = SCREEN_SPACE_LINE_CONSTANTS.dashSize + SCREEN_SPACE_LINE_CONSTANTS.gapSize; // 13px
      const numCycles = Math.max(4, Math.round(approxScreenPerimeter / nominalCycle));
      const actualCycle = approxScreenPerimeter / numCycles;
      const microScale = actualCycle / nominalCycle;
      orbitMaterial.setPattern(
        SCREEN_SPACE_LINE_CONSTANTS.dashSize * microScale,
        SCREEN_SPACE_LINE_CONSTANTS.gapSize * microScale,
      );
    } else if (lineStyle === 'dotted') {
      orbitMaterial.setPattern(
        SCREEN_SPACE_LINE_CONSTANTS.dotSize,
        SCREEN_SPACE_LINE_CONSTANTS.dotGap,
      );
    } else {
      orbitMaterial.setPattern(1.0, 0.0);
    }
  });

  return (
    <group position={position} name="orbital-ring" data-testid="orbital-ring">
      <lineLoop
        geometry={orbitGeometry}
        name="orbit-path"
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          if (bodyId) {
            useUIStore.getState().setSelectedNodeId(bodyId);
          }
          onClick?.(bodyId);
        }}
      >
        <primitive object={orbitMaterial} attach="material" />
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
