import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useLazyRef } from '../../../../hooks/useLazyRef';
import { SafeHtml } from '../SafeHtml';
import {
  calculateScreenEdgeBearing,
  type ScreenEdgeSide,
  type ScreenEdgeBearingType,
  type ScreenEdgeBearingResult,
} from '../cartography/cartographyMath';
import { useSpatialFrame } from './SpatialFrameProvider';
import { type BearingDefinition } from './referenceFrame';
import styles from '../cartography/ScreenEdgeBearingIndicators.module.css';

export interface ScreenEdgeCueProps {
  bearing: BearingDefinition;
  origin?: [number, number, number] | THREE.Vector3;
  margin?: number;
  extent?: number;
  rGc?: number;
  minLineLength?: number;
}

const HTML_Z_INDEX_RANGE: [number, number] = [100, 0];
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

export const ScreenEdgeCue: React.FC<ScreenEdgeCueProps> = ({
  bearing,
  origin: explicitOrigin,
  margin = 28,
  extent = 2000,
  rGc = 2000,
  minLineLength = 40,
}) => {
  const { frameRef } = useSpatialFrame();
  const groupRef = useRef<THREE.Group>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const chevronRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);

  const scratchOrigin = useLazyRef(() => new THREE.Vector3());
  const scratchScreenSize = useLazyRef(() => ({ width: 0, height: 0 }));
  const scratchResult = useLazyRef<ScreenEdgeBearingResult>(() => ({
    x: 0,
    y: 0,
    edge: 'right' as ScreenEdgeSide,
    angle: 0,
    isAttached: false,
    visible: false,
  }));

  const lastEdge = useRef<ScreenEdgeSide | null>(null);
  const lastDetached = useRef<boolean | null>(null);

  useFrame(({ camera: activeCamera, size: viewportSize }) => {
    const width = viewportSize?.width || (typeof window !== 'undefined' ? window.innerWidth : 1920);
    const height = viewportSize?.height || (typeof window !== 'undefined' ? window.innerHeight : 1080);
    const screenSize = scratchScreenSize.current;
    screenSize.width = width;
    screenSize.height = height;

    const originVec = scratchOrigin.current;
    if (explicitOrigin) {
      if (explicitOrigin instanceof THREE.Vector3) {
        originVec.copy(explicitOrigin);
      } else {
        originVec.set(explicitOrigin[0], explicitOrigin[1], explicitOrigin[2]);
      }
    } else if (frameRef?.current?.focusPoint) {
      originVec.copy(frameRef.current.focusPoint);
    } else if (groupRef.current) {
      groupRef.current.getWorldPosition(originVec);
    } else {
      originVec.set(0, 0, 0);
    }

    const bType: ScreenEdgeBearingType = bearing.id === 'orbital' ? 'orbital' : 'core';

    calculateScreenEdgeBearing(
      activeCamera,
      screenSize,
      margin,
      bType,
      originVec,
      rGc,
      bearing.extent ?? extent,
      scratchResult.current,
      minLineLength,
      frameRef?.current?.orientation,
    );

    const res = scratchResult.current;
    const rootEl = rootRef.current;
    const chevEl = chevronRef.current;
    const labelEl = labelRef.current;

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

    // Chevron maintains course pinned at line terminus.
    // Label is placed adjacent to chevron with screen boundary collision avoidance:
    const safeMargin = Math.min(margin, Math.min(width, height) * 0.45);
    const distX = 44; // half chevron (8) + gap (6) + half label width (~30)
    const distY = 22; // half chevron (8) + gap (6) + half label height (~8)
    const hw = 30;
    const hh = 8;

    const angleRad = (res.angle * Math.PI) / 180;
    const hx = Math.cos(angleRad);
    const hy = Math.sin(angleRad);

    let labelOffsetX = 0;
    let labelOffsetY = 0;

    if (res.edge === 'right') {
      labelOffsetX = -distX;
      labelOffsetY = 0;
    } else if (res.edge === 'left') {
      labelOffsetX = distX;
      labelOffsetY = 0;
    } else if (res.edge === 'top') {
      labelOffsetX = 0;
      labelOffsetY = distY;
    } else if (res.edge === 'bottom') {
      labelOffsetX = 0;
      labelOffsetY = -distY;
    } else {
      // Line terminus at horizon in-view (res.edge === 'none'):
      // Bearing line comes from (-hx, -hy) into (res.x, res.y).
      // Position label away from the incoming line so it never cuts across:
      if (Math.abs(hx) >= 0.25) {
        labelOffsetX = hx < 0 ? -distX : distX;
        labelOffsetY = 0;
      } else {
        labelOffsetX = 0;
        labelOffsetY = hy > 0 ? distY : -distY;
      }
    }

    // Clamp label to viewport screen edges
    const clampedLabelX = Math.min(width - safeMargin - hw, Math.max(safeMargin + hw, res.x + labelOffsetX));
    const clampedLabelY = Math.min(height - safeMargin - hh, Math.max(safeMargin + hh, res.y + labelOffsetY));

    const finalOffsetX = clampedLabelX - res.x;
    const finalOffsetY = clampedLabelY - res.y;

    labelEl.style.transform = `translate(calc(${finalOffsetX.toFixed(1)}px - 50%), calc(${finalOffsetY.toFixed(1)}px - 50%))`;

    if (lastEdge.current !== res.edge) {
      rootEl.setAttribute('data-edge', res.edge);
      lastEdge.current = res.edge;
    }
    const isDetached = !res.isAttached;
    if (lastDetached.current !== isDetached) {
      rootEl.setAttribute('data-detached', String(isDetached));
      lastDetached.current = isDetached;
    }
  });

  const label = bearing.cueLabel ?? (bearing.id === 'core' ? 'CORE 000°' : 'ORB 090°');

  return (
    <group ref={groupRef} name={`screen-edge-cue-${bearing.id}`}>
      <group
        name={`bearing-indicator-${bearing.id}`}
        data-testid={`bearing-indicator-${bearing.id}`}
        data-bearing={bearing.id}
        data-label={label}
      />
      <SafeHtml
        wrapperClass={styles.htmlOverlayContainer}
        calculatePosition={pinToViewportOrigin}
        zIndexRange={HTML_Z_INDEX_RANGE}
      >
        <div
          ref={rootRef}
          className={styles.indicator}
          data-bearing={bearing.id === 'orbital' ? 'orbital' : 'core'}
          data-edge="right"
          data-detached="false"
          data-name={`bearing-indicator-${bearing.id}`}
        >
          <div ref={chevronRef} className={styles.chevronWrapper} aria-hidden="true">
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
          <div ref={labelRef} className={styles.labelWrapper}>
            <span className={styles.label}>{label}</span>
          </div>
        </div>
      </SafeHtml>
    </group>
  );
};
