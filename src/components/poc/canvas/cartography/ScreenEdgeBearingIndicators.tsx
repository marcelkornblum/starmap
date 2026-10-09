import type React from 'react';
import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { SafeHtml } from '../SafeHtml';
import { useLazyRef } from '../../../../hooks/useLazyRef';
import {
  calculateScreenEdgeBearing,
  type ScreenEdgeSide,
  type ScreenEdgeBearingResult,
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
  /** Minimum screen-space line length in pixels before indicator is shown (default: 40) */
  minLineLength?: number;
  /** Whether to show the Core bearing indicator (default: true) */
  showCore?: boolean;
  /** Whether to show the Orbital bearing indicator (default: true) */
  showOrbital?: boolean;
}

const HTML_Z_INDEX_RANGE: [number, number] = [100, 0];
const noopOcclude = () => {};
const pinToViewportOrigin = (
  _el: THREE.Object3D,
  _camera: THREE.Camera,
  _size: { width: number; height: number },
  target?: [number, number],
): void => {
  if (target) {
    target[0] = 0;
    target[1] = 0;
  }
};

const LABEL_DIST_X = 44;
const LABEL_DIST_Y = 22;
const LABEL_HALF_WIDTH = 30;
const LABEL_HALF_HEIGHT = 8;

function applyBearingPlacement(
  res: { x: number; y: number; edge: ScreenEdgeSide; angle: number; isAttached: boolean; visible: boolean },
  rootEl: HTMLDivElement | null,
  chevEl: HTMLDivElement | null,
  labelEl: HTMLDivElement | null,
  lastEdgeRef: React.MutableRefObject<ScreenEdgeSide | null>,
  lastDetachedRef: React.MutableRefObject<boolean | null>,
  width: number,
  height: number,
  safeMargin: number,
): void {
  if (!rootEl || !chevEl || !labelEl) return;
  if (!res.visible) {
    rootEl.style.opacity = '0';
    rootEl.style.display = 'none';
    return;
  }

  rootEl.style.display = 'block';
  rootEl.style.opacity = '1';
  rootEl.style.transform = `translate3d(${res.x.toFixed(1)}px, ${res.y.toFixed(1)}px, 0)`;
  chevEl.style.transform = `translate(-50%, -50%) rotate(${res.angle.toFixed(1)}deg)`;

  const angleRad = (res.angle * Math.PI) / 180;
  const hx = Math.cos(angleRad);
  const hy = Math.sin(angleRad);

  let labelOffsetX = 0;
  let labelOffsetY = 0;

  if (res.edge === 'right') {
    labelOffsetX = -LABEL_DIST_X;
    labelOffsetY = 0;
  } else if (res.edge === 'left') {
    labelOffsetX = LABEL_DIST_X;
    labelOffsetY = 0;
  } else if (res.edge === 'top') {
    labelOffsetX = 0;
    labelOffsetY = LABEL_DIST_Y;
  } else if (res.edge === 'bottom') {
    labelOffsetX = 0;
    labelOffsetY = -LABEL_DIST_Y;
  } else {
    if (Math.abs(hx) >= 0.25) {
      labelOffsetX = hx < 0 ? -LABEL_DIST_X : LABEL_DIST_X;
      labelOffsetY = 0;
    } else {
      labelOffsetX = 0;
      labelOffsetY = hy > 0 ? LABEL_DIST_Y : -LABEL_DIST_Y;
    }
  }

  const clampedLabelX = Math.min(width - safeMargin - LABEL_HALF_WIDTH, Math.max(safeMargin + LABEL_HALF_WIDTH, res.x + labelOffsetX));
  const clampedLabelY = Math.min(height - safeMargin - LABEL_HALF_HEIGHT, Math.max(safeMargin + LABEL_HALF_HEIGHT, res.y + labelOffsetY));

  const finalOffsetX = clampedLabelX - res.x;
  const finalOffsetY = clampedLabelY - res.y;

  labelEl.style.transform = `translate(calc(${finalOffsetX.toFixed(1)}px - 50%), calc(${finalOffsetY.toFixed(1)}px - 50%))`;

  if (lastEdgeRef.current !== res.edge) {
    lastEdgeRef.current = res.edge;
    rootEl.setAttribute('data-edge', res.edge);
  }
  const isDetached = !res.isAttached;
  if (lastDetachedRef.current !== isDetached) {
    lastDetachedRef.current = isDetached;
    rootEl.setAttribute('data-detached', isDetached ? 'true' : 'false');
  }
}

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
  minLineLength = 40,
  showCore = true,
  showOrbital = true,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<HTMLDivElement>(null);
  const coreChevronRef = useRef<HTMLDivElement>(null);
  const coreLabelRef = useRef<HTMLDivElement>(null);
  const orbitalRef = useRef<HTMLDivElement>(null);
  const orbitalChevronRef = useRef<HTMLDivElement>(null);
  const orbLabelRef = useRef<HTMLDivElement>(null);

  // Scratch objects for zero-allocation per-frame computation
  const scratchOrigin = useLazyRef(() => new THREE.Vector3());
  const scratchScreenSize = useLazyRef(() => ({ width: 0, height: 0 }));
  const scratchCoreResult = useLazyRef<ScreenEdgeBearingResult>(() => ({
    x: 0,
    y: 0,
    edge: 'right' as ScreenEdgeSide,
    angle: 0,
    isAttached: false,
    visible: false,
  }));
  const scratchOrbResult = useLazyRef<ScreenEdgeBearingResult>(() => ({
    x: 0,
    y: 0,
    edge: 'top' as ScreenEdgeSide,
    angle: 0,
    isAttached: false,
    visible: false,
  }));
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

    const safeMargin = Math.min(margin, Math.min(width, height) * 0.45);
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
    if (showCore) {
      const coreResult = calculateScreenEdgeBearing(
        activeCamera,
        screenSize,
        margin,
        'core',
        originVec,
        rGc,
        extent,
        scratchCoreResult.current,
        minLineLength,
      );
      applyBearingPlacement(
        coreResult,
        coreRef.current,
        coreChevronRef.current,
        coreLabelRef.current,
        lastCoreEdge,
        lastCoreDetached,
        width,
        height,
        safeMargin,
      );
    }

    // Update Orbital bearing indicator
    if (showOrbital) {
      const orbResult = calculateScreenEdgeBearing(
        activeCamera,
        screenSize,
        margin,
        'orbital',
        originVec,
        rGc,
        extent,
        scratchOrbResult.current,
        minLineLength,
      );
      applyBearingPlacement(
        orbResult,
        orbitalRef.current,
        orbitalChevronRef.current,
        orbLabelRef.current,
        lastOrbEdge,
        lastOrbDetached,
        width,
        height,
        safeMargin,
      );
    }
  });

  return (
    <group ref={groupRef} name="screen-edge-bearing-indicators">
      {showCore && (
        <group
          name="bearing-indicator-core"
          data-testid="bearing-indicator-core"
          data-label="CORE 000°"
        />
      )}
      {showOrbital && (
        <group
          name="bearing-indicator-orbital"
          data-testid="bearing-indicator-orbital"
          data-label="ORB 090°"
        />
      )}
      <SafeHtml
        calculatePosition={pinToViewportOrigin}
        wrapperClass={styles.htmlOverlayContainer}
        pointerEvents="none"
        onOcclude={noopOcclude}
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
              <div className={styles.chevronWrapper} ref={coreChevronRef} aria-hidden="true">
                <svg
                  className={styles.chevron}
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M4 2.5L11.5 8L4 13.5L6.5 8L4 2.5Z"
                    fill="currentColor"
                  />
                </svg>
              </div>
              <div className={styles.labelWrapper} ref={coreLabelRef}>
                <span className={styles.label}>CORE 000°</span>
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
              <div className={styles.chevronWrapper} ref={orbitalChevronRef} aria-hidden="true">
                <svg
                  className={styles.chevron}
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M4 2.5L11.5 8L4 13.5L6.5 8L4 2.5Z"
                    fill="currentColor"
                  />
                </svg>
              </div>
              <div className={styles.labelWrapper} ref={orbLabelRef}>
                <span className={styles.label}>ORB 090°</span>
              </div>
            </div>
          )}
        </div>
      </SafeHtml>
    </group>
  );
};
