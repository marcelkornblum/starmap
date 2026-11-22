import { useEffect, useRef } from 'react';
import type React from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { FRAME_PRIORITY } from '../engineConfig';
import { useUIStore } from '../../../stores/useUIStore';
import { computeOpticalCenterOffsetPx } from '../../../utils/viewportSafeRect';
import { easeOutCubic } from '../../../utils/cameraEasing';
import { prefersReducedMotion } from '../../../utils/reducedMotion';

const VIEW_OFFSET_TRANSITION_DURATION_SEC = 0.35;
const VIEW_OFFSET_ZERO_EPSILON_PX = 0.25;

export interface UseCameraRigViewOffsetOptions {
  perspCamRef: React.RefObject<THREE.PerspectiveCamera | null>;
  orthoCamRef: React.RefObject<THREE.OrthographicCamera | null>;
  sizeWidth?: number;
  sizeHeight?: number;
  invalidate?: () => void;
}

function applyCameraViewOffset(
  cam: THREE.PerspectiveCamera | THREE.OrthographicCamera | null | undefined,
  width: number,
  height: number,
  offsetX: number,
  offsetY: number,
): void {
  if (!cam || !(width > 0 && height > 0)) return;
  if (
    Math.abs(offsetX) < VIEW_OFFSET_ZERO_EPSILON_PX &&
    Math.abs(offsetY) < VIEW_OFFSET_ZERO_EPSILON_PX
  ) {
    cam.clearViewOffset();
  } else {
    cam.setViewOffset(width, height, offsetX, offsetY, width, height);
  }
}

/**
 * Synchronises the optical-centre view offset from `useUIStore.viewportSafeRect`
 * across both perspective and orthographic cameras, smoothly easing over 0.35s
 * unless `prefersReducedMotion()` is active.
 */
export function useCameraRigViewOffset(options: UseCameraRigViewOffsetOptions): void {
  const { perspCamRef, orthoCamRef, sizeWidth, sizeHeight, invalidate } = options;

  const viewportSafeRect = useUIStore((s) => s.viewportSafeRect);
  const { offsetX, offsetY } = computeOpticalCenterOffsetPx(viewportSafeRect);

  const curXRef = useRef(0);
  const curYRef = useRef(0);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const targetXRef = useRef(0);
  const targetYRef = useRef(0);
  const elapsedSecRef = useRef(0);
  const isAnimatingRef = useRef(false);

  const sizeWidthRef = useRef(sizeWidth ?? 0);
  const sizeHeightRef = useRef(sizeHeight ?? 0);
  const invalidateRef = useRef(invalidate);

  useEffect(() => {
    sizeWidthRef.current = sizeWidth ?? 0;
    sizeHeightRef.current = sizeHeight ?? 0;
    invalidateRef.current = invalidate;
  }, [sizeWidth, sizeHeight, invalidate]);

  useEffect(() => {
    if (offsetX === targetXRef.current && offsetY === targetYRef.current) {
      return;
    }

    targetXRef.current = offsetX;
    targetYRef.current = offsetY;

    if (prefersReducedMotion()) {
      curXRef.current = offsetX;
      curYRef.current = offsetY;
      elapsedSecRef.current = 0;
      isAnimatingRef.current = false;

      const w = sizeWidthRef.current;
      const h = sizeHeightRef.current;
      applyCameraViewOffset(perspCamRef.current, w, h, offsetX, offsetY);
      applyCameraViewOffset(orthoCamRef.current, w, h, offsetX, offsetY);
      invalidateRef.current?.();
      return;
    }

    startXRef.current = curXRef.current;
    startYRef.current = curYRef.current;
    elapsedSecRef.current = 0;
    isAnimatingRef.current = true;
    invalidateRef.current?.();
  }, [offsetX, offsetY, perspCamRef, orthoCamRef]);

  useEffect(() => {
    const w = sizeWidth ?? 0;
    const h = sizeHeight ?? 0;
    if (!(w > 0 && h > 0)) return;

    const hasActiveOffset =
      Math.abs(curXRef.current) >= VIEW_OFFSET_ZERO_EPSILON_PX ||
      Math.abs(curYRef.current) >= VIEW_OFFSET_ZERO_EPSILON_PX ||
      Boolean(perspCamRef.current?.view?.enabled) ||
      Boolean(orthoCamRef.current?.view?.enabled);

    if (!hasActiveOffset) return;

    applyCameraViewOffset(perspCamRef.current, w, h, curXRef.current, curYRef.current);
    applyCameraViewOffset(orthoCamRef.current, w, h, curXRef.current, curYRef.current);
    invalidateRef.current?.();
  }, [sizeWidth, sizeHeight, perspCamRef, orthoCamRef]);

  useFrame((_, delta) => {
    if (!isAnimatingRef.current) return;

    const safeDelta = Number.isFinite(delta) && delta > 0 ? delta : 0;
    elapsedSecRef.current += safeDelta;

    const progress = Math.min(1, elapsedSecRef.current / VIEW_OFFSET_TRANSITION_DURATION_SEC);
    const eased = easeOutCubic(progress);

    curXRef.current = startXRef.current + (targetXRef.current - startXRef.current) * eased;
    curYRef.current = startYRef.current + (targetYRef.current - startYRef.current) * eased;

    if (progress >= 1) {
      curXRef.current = targetXRef.current;
      curYRef.current = targetYRef.current;
      isAnimatingRef.current = false;
    }

    const w = sizeWidthRef.current;
    const h = sizeHeightRef.current;
    applyCameraViewOffset(perspCamRef.current, w, h, curXRef.current, curYRef.current);
    applyCameraViewOffset(orthoCamRef.current, w, h, curXRef.current, curYRef.current);

    if (isAnimatingRef.current) {
      invalidateRef.current?.();
    }
  }, FRAME_PRIORITY.cameraRig);

  useEffect(() => {
    const perspCam = perspCamRef.current;
    const orthoCam = orthoCamRef.current;
    return () => {
      perspCam?.clearViewOffset();
      orthoCam?.clearViewOffset();
    };
  }, [perspCamRef, orthoCamRef]);
}
