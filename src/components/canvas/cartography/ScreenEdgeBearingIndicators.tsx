import type React from 'react';
import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import {
  calculateScreenEdgeBearing,
  type ScreenEdgeSide,
} from './cartographyMath';
import styles from './ScreenEdgeBearingIndicators.module.css';

export interface ScreenEdgeBearingIndicatorsProps {
  /** Origin point of bearing lines in world space. If omitted, uses parent group world position. */
  origin?: [number, number, number] | THREE.Vector3;
  /** Galactocentric curvature radius for orbital bearing (default: 2000) */
  rGc?: number;
  /** Extent of bearing line to trace for screen bounds exit (default: 2000) */
  extent?: number;
  /** Safe padding margin from screen boundary in pixels (default: 28) */
  margin?: number;
  /** Whether to show the Core bearing indicator (default: true) */
  showCore?: boolean;
  /** Whether to show the Orbital bearing indicator (default: true) */
  showOrbital?: boolean;
}

const HTML_Z_INDEX_RANGE: [number, number] = [100, 0];

/**
 * ScreenEdgeBearingIndicators: Visual HUD vector arrowheads that terminate
 * bearing lines at the screen boundary.
 *
 * Implements Section 1.4 of docs/3d-spatial-architecture.md:
 * - Galactic Core ($l=0^\circ$) and Galactic Orbital ($l=90^\circ$) bearing lines
 *   terminate at the viewport perimeter with illuminated vector chevrons.
 * - When orientation or zoom causes a bearing line to leave the visible field of view,
 *   its arrowhead detaches from the 3D line and pins to the nearest screen edge
 *   (28px safe margin), permanently maintaining cardinal orientation.
 */
export const ScreenEdgeBearingIndicators: React.FC<ScreenEdgeBearingIndicatorsProps> = ({
  origin: explicitOrigin,
  rGc = 2000,
  extent = 2000,
  margin = 28,
  showCore = true,
  showOrbital = true,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<HTMLDivElement>(null);
  const coreChevronRef = useRef<HTMLDivElement>(null);
  const orbitalRef = useRef<HTMLDivElement>(null);
  const orbitalChevronRef = useRef<HTMLDivElement>(null);

  // Scratch objects for zero-allocation per-frame computation
  const scratchOrigin = useRef(new THREE.Vector3());
  const scratchScreenSize = useRef({ width: 0, height: 0 });
  const scratchCoreResult = useRef({
    x: 0,
    y: 0,
    edge: 'right' as ScreenEdgeSide,
    angle: 0,
    isAttached: false,
    visible: false,
  });
  const scratchOrbResult = useRef({
    x: 0,
    y: 0,
    edge: 'top' as ScreenEdgeSide,
    angle: 0,
    isAttached: false,
    visible: false,
  });
  const lastCoreEdge = useRef<ScreenEdgeSide | null>(null);
  const lastCoreDetached = useRef<boolean | null>(null);
  const lastOrbEdge = useRef<ScreenEdgeSide | null>(null);
  const lastOrbDetached = useRef<boolean | null>(null);

  // Read camera and viewport size
  const threeContext = useThree();

  useFrame(() => {
    const activeCamera = threeContext.camera;
    const viewportSize = threeContext.size;
    const width = viewportSize?.width || (typeof window !== 'undefined' ? window.innerWidth : 1920);
    const height = viewportSize?.height || (typeof window !== 'undefined' ? window.innerHeight : 1080);
    const screenSize = scratchScreenSize.current;
    screenSize.width = width;
    screenSize.height = height;

    // Resolve world origin
    const originVec = scratchOrigin.current;
    if (explicitOrigin) {
      if (explicitOrigin instanceof THREE.Vector3) {
        originVec.copy(explicitOrigin);
      } else {
        originVec.set(explicitOrigin[0], explicitOrigin[1], explicitOrigin[2]);
      }
    } else if (groupRef.current) {
      groupRef.current.getWorldPosition(originVec);
    } else {
      originVec.set(0, 0, 0);
    }

    // Update Core bearing indicator
    if (showCore && coreRef.current) {
      const coreResult = calculateScreenEdgeBearing(
        activeCamera,
        screenSize,
        margin,
        'core',
        originVec,
        rGc,
        extent,
        scratchCoreResult.current,
      );

      if (coreResult.visible) {
        coreRef.current.style.setProperty('--indicator-x', `${coreResult.x}px`);
        coreRef.current.style.setProperty('--indicator-y', `${coreResult.y}px`);

        const isDetached = !coreResult.isAttached;
        if (lastCoreEdge.current !== coreResult.edge) {
          lastCoreEdge.current = coreResult.edge;
          coreRef.current.setAttribute('data-edge', coreResult.edge);
        }
        if (lastCoreDetached.current !== isDetached) {
          lastCoreDetached.current = isDetached;
          coreRef.current.setAttribute('data-detached', isDetached ? 'true' : 'false');
        }

        if (coreChevronRef.current) {
          coreChevronRef.current.style.transform = `rotate(${coreResult.angle}deg)`;
        }
        coreRef.current.style.display = '';
      } else {
        coreRef.current.style.display = 'none';
      }
    }

    // Update Orbital bearing indicator
    if (showOrbital && orbitalRef.current) {
      const orbResult = calculateScreenEdgeBearing(
        activeCamera,
        screenSize,
        margin,
        'orbital',
        originVec,
        rGc,
        extent,
        scratchOrbResult.current,
      );

      if (orbResult.visible) {
        orbitalRef.current.style.setProperty('--indicator-x', `${orbResult.x}px`);
        orbitalRef.current.style.setProperty('--indicator-y', `${orbResult.y}px`);

        const isDetached = !orbResult.isAttached;
        if (lastOrbEdge.current !== orbResult.edge) {
          lastOrbEdge.current = orbResult.edge;
          orbitalRef.current.setAttribute('data-edge', orbResult.edge);
        }
        if (lastOrbDetached.current !== isDetached) {
          lastOrbDetached.current = isDetached;
          orbitalRef.current.setAttribute('data-detached', isDetached ? 'true' : 'false');
        }

        if (orbitalChevronRef.current) {
          orbitalChevronRef.current.style.transform = `rotate(${orbResult.angle}deg)`;
        }
        orbitalRef.current.style.display = '';
      } else {
        orbitalRef.current.style.display = 'none';
      }
    }
  });

  return (
    <group ref={groupRef} name="screen-edge-bearings">
      <Html
        calculatePosition={() => [0, 0]}
        zIndexRange={HTML_Z_INDEX_RANGE}
        data-testid="screen-edge-bearing-indicators"
      >
        <div className={styles.overlay}>
          {showCore && (
            <div
              ref={coreRef}
              className={styles.indicator}
              data-bearing="core"
              data-edge="right"
              data-detached="false"
              data-testid="bearing-indicator-core"
            >
              <span className={styles.label}>CORE 000°</span>
              <div className={styles.chevronWrapper} ref={coreChevronRef}>
                <svg
                  className={styles.chevron}
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M4 2.5L11.5 8L4 13.5L6.5 8L4 2.5Z"
                    fill="currentColor"
                  />
                </svg>
              </div>
            </div>
          )}

          {showOrbital && (
            <div
              ref={orbitalRef}
              className={styles.indicator}
              data-bearing="orbital"
              data-edge="top"
              data-detached="false"
              data-testid="bearing-indicator-orbital"
            >
              <span className={styles.label}>ORB 090°</span>
              <div className={styles.chevronWrapper} ref={orbitalChevronRef}>
                <svg
                  className={styles.chevron}
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M4 2.5L11.5 8L4 13.5L6.5 8L4 2.5Z"
                    fill="currentColor"
                  />
                </svg>
              </div>
            </div>
          )}
        </div>
      </Html>
    </group>
  );
};
