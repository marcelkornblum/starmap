import type React from 'react';
import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
 * Uses React createPortal into a detached DOM node appended to canvas container,
 * completely preserving React context trees and eliminating isolated nested root lifecycles.
 */
const SafeHtmlClient: React.FC<SafeHtmlProps> = ({
  children,
  position,
  calculatePosition,
  center = true,
  wrapperClass,
  className,
  pointerEvents = 'auto',
  zIndexRange,
  onOcclude,
  'data-testid': dataTestId,
}) => {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const scratchPos = useRef<THREE.Vector3>(new THREE.Vector3());
  const scratchNdc = useRef<THREE.Vector3>(new THREE.Vector3());
  const scratchV4 = useRef<THREE.Vector4>(new THREE.Vector4());
  const scratchTargetCoords = useRef<[number, number]>([0, 0]);
  const lastTransform = useRef<string>('');
  const lastZIndex = useRef<number | null>(null);
  const lastVisible = useRef<boolean | null>(null);

  const onOccludeRef = useRef(onOcclude);
  useLayoutEffect(() => {
    onOccludeRef.current = onOcclude;
  }, [onOcclude]);

  const nextHiddenRef = useRef<boolean | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const flushOccludeRaf = useCallback(() => {
    rafIdRef.current = null;
    if (nextHiddenRef.current !== null && onOccludeRef.current) {
      onOccludeRef.current(nextHiddenRef.current);
      nextHiddenRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null && typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
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
    setContainer(div);

    return () => {
      if (div.parentNode) {
        div.parentNode.removeChild(div);
      }
      containerRef.current = null;
      setContainer(null);
    };
  }, [gl, pointerEvents, wrapperClass]);

  useFrame(() => {
    const activeContainer = containerRef.current;
    if (!activeContainer || !groupRef.current) return;

    groupRef.current.getWorldPosition(scratchPos.current);
    const pos = scratchPos.current;

    let isVisible = true;
    if (camera instanceof THREE.PerspectiveCamera || camera instanceof THREE.OrthographicCamera) {
      scratchV4.current.set(pos.x, pos.y, pos.z, 1.0).applyMatrix4(camera.matrixWorldInverse);
      if (camera instanceof THREE.PerspectiveCamera) {
        isVisible = scratchV4.current.z < -camera.near && scratchV4.current.z > -camera.far;
      } else {
        isVisible = scratchV4.current.z <= -camera.near && scratchV4.current.z >= -camera.far;
      }
    }

    if (lastVisible.current !== isVisible) {
      lastVisible.current = isVisible;
      activeContainer.style.display = isVisible ? '' : 'none';
      const hidden = !isVisible;
      if (onOccludeRef.current) {
        nextHiddenRef.current = hidden;
        if (rafIdRef.current === null && typeof requestAnimationFrame !== 'undefined') {
          rafIdRef.current = requestAnimationFrame(flushOccludeRaf);
        }
      }
    }

    if (!isVisible) return;

    let x = 0;
    let y = 0;

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
      x = ((ndc.x + 1) * size.width) / 2;
      y = ((-ndc.y + 1) * size.height) / 2;
    }

    const transform = center
      ? `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0) translate3d(-50%, -50%, 0)`
      : `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;

    if (lastTransform.current !== transform) {
      lastTransform.current = transform;
      activeContainer.style.transform = transform;
    }

    if (
      zIndexRange &&
      isVisible &&
      (camera instanceof THREE.PerspectiveCamera || camera instanceof THREE.OrthographicCamera)
    ) {
      const dist = scratchPos.current.distanceTo(camera.position);
      const aFactor = (zIndexRange[1] - zIndexRange[0]) / (camera.far - camera.near);
      const bFactor = zIndexRange[1] - aFactor * camera.far;
      const nextZIndex = Math.round(aFactor * dist + bFactor);
      if (lastZIndex.current !== nextZIndex) {
        lastZIndex.current = nextZIndex;
        activeContainer.style.zIndex = String(nextZIndex);
      }
    }
  });

  return (
    <>
      <group ref={groupRef} position={position} />
      {container &&
        createPortal(
          <div className={className} data-testid={dataTestId}>
            {children}
          </div>,
          container
        )}
    </>
  );
};

export const SafeHtml: React.FC<SafeHtmlProps> = (props) => {
  if (typeof document === 'undefined') {
    return <group position={props.position} />;
  }
  return <SafeHtmlClient {...props} />;
};
