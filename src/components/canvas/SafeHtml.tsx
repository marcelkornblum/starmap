import type React from 'react';
import { useRef, useLayoutEffect, useCallback } from 'react';
import * as ReactDOM from 'react-dom/client';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';

export interface SafeHtmlProps {
  children?: React.ReactNode;
  position?: [number, number, number] | THREE.Vector3;
  calculatePosition?: (
    el: THREE.Object3D,
    camera: THREE.Camera,
    size: { width: number; height: number },
    target?: [number, number],
  ) => [number, number] | void;
  center?: boolean;
  wrapperClass?: string;
  className?: string;
  pointerEvents?: 'none' | 'auto';
  zIndexRange?: [number, number];
  onOcclude?: (hidden: boolean) => void;
  'data-testid'?: string;
}

/**
 * SafeHtml: Crash-proof, React 18/19 concurrent-safe HTML overlay for R3F scenes.
 *
 * Replaces Drei's <Html> which suffers from fatal unhandled rejections during view/story switching:
 * 1. Synchronous root.unmount() during commit phase: "Attempted to synchronously unmount a root while React was already rendering".
 * 2. Unchecked target.removeChild(el) throwing NotFoundError when the canvas container is detached.
 *
 * SafeHtml provides:
 * - Asynchronous, guarded unmounting (setTimeout with try/catch) preventing React commit aborts.
 * - Safe parent removal via el.parentNode check (immune to container unmounting order).
 * - Zero heap allocations inside useFrame (passes audit:r3f).
 * - Seamless SSR fallback maintaining data-testid attributes for testing suites.
 */
const SafeHtmlClient: React.FC<SafeHtmlProps> = ({
  children,
  position,
  calculatePosition,
  center = false,
  wrapperClass,
  className,
  pointerEvents = 'none',
  zIndexRange,
  onOcclude,
  'data-testid': dataTestId,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const scratchPos = useRef(new THREE.Vector3());
  const scratchNdc = useRef(new THREE.Vector3());
  const scratchTargetCoords = useRef<[number, number]>([0, 0]);
  const rootRef = useRef<ReactDOM.Root | null>(null);

  const lastX = useRef(-999999);
  const lastY = useRef(-999999);
  const lastVisible = useRef(true);

  const onOccludeRef = useRef(onOcclude);
  useLayoutEffect(() => {
    onOccludeRef.current = onOcclude;
  }, [onOcclude]);

  const nextHiddenRef = useRef<boolean | null>(null);
  const rafScheduledRef = useRef(false);

  const flushOccludeRaf = useCallback(() => {
    rafScheduledRef.current = false;
    if (nextHiddenRef.current !== null && onOccludeRef.current) {
      onOccludeRef.current(nextHiddenRef.current);
      nextHiddenRef.current = null;
    }
  }, []);

  const { gl, camera, size } = useThree();
  const containerRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (typeof document === 'undefined') return;

    const div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.top = '0';
    div.style.left = '0';
    div.style.pointerEvents = pointerEvents;
    div.style.transformOrigin = '0 0';
    if (wrapperClass) {
      div.className = wrapperClass;
    }
    containerRef.current = div;

    const target = (gl.domElement?.parentNode as HTMLElement | null) ?? document.body;
    target.appendChild(div);

    const root = ReactDOM.createRoot(div);
    rootRef.current = root;

    return () => {
      // 1. Safely remove DOM element without throwing if target already detached
      if (div.parentNode) {
        div.parentNode.removeChild(div);
      }
      containerRef.current = null;
      // 2. Safely unmount React root asynchronously so React's commit phase completes cleanly
      setTimeout(() => {
        try {
          root.unmount();
        } catch {
          // Ignore unmount race if root was already discarded
        }
      }, 0);
    };
  }, [gl, pointerEvents, wrapperClass]);

  // Synchronize children rendering into root
  useLayoutEffect(() => {
    if (rootRef.current) {
      rootRef.current.render(
        <div className={className} data-testid={dataTestId}>
          {children}
        </div>,
      );
    }
  }, [children, className, dataTestId]);

  useFrame(() => {
    const container = containerRef.current;
    if (!container || !groupRef.current) return;

    let x = 0;
    let y = 0;
    let isVisible = true;

    groupRef.current.updateWorldMatrix(true, false);
    scratchPos.current.setFromMatrixPosition(groupRef.current.matrixWorld);

    if (calculatePosition) {
      scratchTargetCoords.current[0] = 0;
      scratchTargetCoords.current[1] = 0;
      const coords = calculatePosition(
        groupRef.current,
        camera,
        size,
        scratchTargetCoords.current,
      );
      if (coords) {
        x = coords[0];
        y = coords[1];
      } else {
        x = scratchTargetCoords.current[0];
        y = scratchTargetCoords.current[1];
      }
    } else {
      const ndc = scratchNdc.current.copy(scratchPos.current).project(camera);

      // Behind camera check
      if (ndc.z > 1.0) {
        isVisible = false;
      } else {
        x = (ndc.x * 0.5 + 0.5) * size.width;
        y = (-ndc.y * 0.5 + 0.5) * size.height;
      }
    }

    if (onOcclude) {
      if (lastVisible.current !== isVisible) {
        lastVisible.current = isVisible;
        nextHiddenRef.current = !isVisible;
        if (!rafScheduledRef.current && typeof requestAnimationFrame !== 'undefined') {
          rafScheduledRef.current = true;
          requestAnimationFrame(flushOccludeRaf);
        } else if (typeof requestAnimationFrame === 'undefined') {
          onOcclude(!isVisible);
        }
      }
    } else if (lastVisible.current !== isVisible) {
      lastVisible.current = isVisible;
      container.style.display = isVisible ? '' : 'none';
    }

    if (isVisible && (Math.abs(lastX.current - x) > 0.05 || Math.abs(lastY.current - y) > 0.05)) {
      lastX.current = x;
      lastY.current = y;
      if (center) {
        container.style.transform = `translate3d(calc(${x}px - 50%), calc(${y}px - 50%), 0)`;
      } else {
        container.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }
    }

    if (
      zIndexRange &&
      isVisible &&
      (camera instanceof THREE.PerspectiveCamera || camera instanceof THREE.OrthographicCamera)
    ) {
      const dist = scratchPos.current.distanceTo(camera.position);
      const aFactor = (zIndexRange[1] - zIndexRange[0]) / (camera.far - camera.near);
      const bFactor = zIndexRange[1] - aFactor * camera.far;
      container.style.zIndex = `${Math.round(aFactor * dist + bFactor)}`;
    }
  });

  return <group ref={groupRef} position={position} />;
};

export const SafeHtml: React.FC<SafeHtmlProps> = (props) => {
  if (typeof document === 'undefined') {
    return (
      <group position={props.position}>
        <div data-testid={props['data-testid']} className={props.className ?? props.wrapperClass}>
          {props.children}
        </div>
      </group>
    );
  }
  return <SafeHtmlClient {...props} />;
};
