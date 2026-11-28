import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useThreeTokenStore } from '../../../stores/useThreeTokenStore';
import { useActiveStarsStore } from '../../../stores/useActiveStarsStore';
import { useSpatialFrameSafe } from '../instrument/spatialFrameContext';
import { useLazyRef } from '../../../hooks/useLazyRef';
import { SectorStreamingManager } from '../../../services/sectorStreamingService';
import { createSceneSectorPointsFactory } from './sectorPointCloudGeometry';
import { InstrumentHydrationBridge } from '../../../services/instrumentHydrationService';
import type { SystemSummaryNode } from '../../../types/astro';
import {
  STARFIELD_PASSIVE_POINT_SIZE,
  STARFIELD_ACTIVE_POINT_SIZE,
  computeStarfieldHorizonRadius,
  createStarfieldPointsMaterial,
} from './sectorPointCloudShaders';

const DEFAULT_STARFIELD_APERTURE_RADIUS_PC = 15.0;

export interface SectorPointCloudProps {
  readonly manager?: SectorStreamingManager;
  readonly pointSize?: number;
  readonly pointOpacity?: number;
  readonly activePointSize?: number;
  readonly onHydratedSummariesChange?: (
    summaries: readonly SystemSummaryNode[],
    focusPointPc?: readonly [number, number, number],
  ) => void;
}

/**
 * SectorPointCloud: Hardware-budgeted spatial starfield point cloud.
 * Streams 16-byte binary sector partitions with asynchronous GPU uploading,
 * LRU RAM caching, custom starfield shader material, and zero-allocation frame updates.
 */
export function SectorPointCloud({
  manager,
  pointSize = STARFIELD_PASSIVE_POINT_SIZE,
  pointOpacity = 0.9,
  activePointSize = STARFIELD_ACTIVE_POINT_SIZE,
  onHydratedSummariesChange,
}: SectorPointCloudProps) {
  const reticleBracketColor = useThreeTokenStore((s) => s.tokens.reticleBracketColor);
  const frameCtx = useSpatialFrameSafe();
  const invalidate = useThree((s) => s.invalidate);
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);

  const targetRef = useRef<{ group: THREE.Group | null; material: THREE.Material | null }>({
    group: null,
    material: null,
  });

  useLayoutEffect(() => {
    const mat = createStarfieldPointsMaterial();
    const target = targetRef.current;
    materialRef.current = mat;
    target.group = groupRef.current;
    target.material = mat;
    return () => {
      materialRef.current = null;
      target.material = null;
      target.group = null;
      mat.dispose();
    };
  }, []);

  useEffect(() => {
    const mat = materialRef.current;
    if (!mat) return;
    mat.uniforms.uPointSize.value = pointSize;
    mat.uniforms.uBaseOpacity.value = pointOpacity;
    mat.uniforms.uActivePointSize.value = activePointSize;
    invalidate();
  }, [pointSize, pointOpacity, activePointSize, invalidate]);

  useEffect(() => {
    const mat = materialRef.current;
    if (mat) {
      mat.uniforms.uColor.value.set(reticleBracketColor);
      invalidate();
    }
  }, [reticleBracketColor, invalidate]);

  const internalManagerRef = useRef<SectorStreamingManager | null>(null);
  const hydrationBridgeRef = useRef<InstrumentHydrationBridge | null>(null);

  useLayoutEffect(() => {
    const bridge = new InstrumentHydrationBridge();
    hydrationBridgeRef.current = bridge;
    return () => {
      hydrationBridgeRef.current = null;
      bridge.dispose();
    };
  }, []);

  useLayoutEffect(() => {
    if (manager) return;
    const mgr = new SectorStreamingManager({
      gpuResourceFactory: createSceneSectorPointsFactory(() => targetRef.current),
    });
    internalManagerRef.current = mgr;
    return () => {
      internalManagerRef.current = null;
      mgr.dispose();
    };
  }, [manager]);

  const onSummariesRef = useRef(onHydratedSummariesChange);
  useEffect(() => { onSummariesRef.current = onHydratedSummariesChange; }, [onHydratedSummariesChange]);

  const frameCtxRef = useRef(frameCtx);
  useEffect(() => { frameCtxRef.current = frameCtx; }, [frameCtx]);

  const lastXRef = useRef(Number.NaN);
  const lastYRef = useRef(Number.NaN);
  const lastZRef = useRef(Number.NaN);
  const scratchPosRef = useLazyRef<[number, number, number]>(() => [0, 0, 0]);

  const lastHydratedXRef = useRef(Number.NaN);
  const lastHydratedYRef = useRef(Number.NaN);
  const lastHydratedZRef = useRef(Number.NaN);
  const lastHydratedRadiusRef = useRef(Number.NaN);
  const hydratingRef = useRef(false);
  const pendingHydrationRef = useRef(false);
  const hasNotifiedHydrationRef = useRef(false);
  const prevFrameXRef = useRef(Number.NaN);
  const prevFrameYRef = useRef(Number.NaN);
  const prevFrameZRef = useRef(Number.NaN);
  const prevFrameRadiusRef = useRef(Number.NaN);
  const settledFramesRef = useRef(0);
  const lastHydrationTimeRef = useRef(0);

  const triggerHydrationRef = useRef<((fx: number, fy: number, fz: number, apertureRadius: number) => void) | null>(null);

  const triggerHydration = useCallback(
    (fx: number, fy: number, fz: number, apertureRadius: number) => {
      const resolvedManager = manager ?? internalManagerRef.current;
      const bridge = hydrationBridgeRef.current;
      if (!resolvedManager || !bridge) return;
      if (
        typeof (resolvedManager as unknown as { isActiveRingReady?: () => boolean }).isActiveRingReady === 'function' &&
        !(resolvedManager as unknown as { isActiveRingReady: () => boolean }).isActiveRingReady()
      ) {
        return;
      }
      if (hydratingRef.current) {
        pendingHydrationRef.current = true;
        return;
      }
      hydratingRef.current = true;
      lastHydrationTimeRef.current = performance.now();
      lastHydratedXRef.current = fx;
      lastHydratedYRef.current = fy;
      lastHydratedZRef.current = fz;
      lastHydratedRadiusRef.current = apertureRadius;

      const queryInputs = resolvedManager.getActiveSectorQueryInputs();
      scratchPosRef.current[0] = fx;
      scratchPosRef.current[1] = fy;
      scratchPosRef.current[2] = fz;

      void bridge
        .updateInstrumentPerimeter(queryInputs, scratchPosRef.current, apertureRadius)
        .then((state) => {
          if (hydrationBridgeRef.current !== bridge) return;
          hydratingRef.current = false;
          if (!hasNotifiedHydrationRef.current || state.hasActiveSummariesChanged) {
            hasNotifiedHydrationRef.current = true;
            onSummariesRef.current?.(state.activeSummaries, [fx, fy, fz]);
          }
          invalidate();
          if (pendingHydrationRef.current) {
            pendingHydrationRef.current = false;
            const currentFocus = frameCtxRef.current?.frameRef?.current?.focusPoint;
            const currentFx = currentFocus ? currentFocus.x : lastHydratedXRef.current;
            const currentFy = currentFocus ? currentFocus.y : lastHydratedYRef.current;
            const currentFz = currentFocus ? currentFocus.z : lastHydratedZRef.current;
            const currentRadius = frameCtxRef.current?.frameRef?.current?.apertureRadius ?? DEFAULT_STARFIELD_APERTURE_RADIUS_PC;
            triggerHydrationRef.current?.(currentFx, currentFy, currentFz, currentRadius);
          }
        })
        .catch(() => {
          if (hydrationBridgeRef.current === bridge) {
            hydratingRef.current = false;
          }
        });
    },
    [manager, scratchPosRef, invalidate],
  );

  useEffect(() => {
    triggerHydrationRef.current = triggerHydration;
  }, [triggerHydration]);

  useEffect(() => {
    const resolvedManager = manager ?? internalManagerRef.current;
    if (!resolvedManager) return;

    const unsubscribe = resolvedManager.subscribe(() => {
      invalidate();
      const focus = frameCtxRef.current?.frameRef?.current?.focusPoint;
      const fx = focus ? focus.x : (Number.isNaN(lastXRef.current) ? 0 : lastXRef.current);
      const fy = focus ? focus.y : (Number.isNaN(lastYRef.current) ? 0 : lastYRef.current);
      const fz = focus ? focus.z : (Number.isNaN(lastZRef.current) ? 0 : lastZRef.current);
      const apertureRadius = frameCtxRef.current?.frameRef?.current?.apertureRadius ?? DEFAULT_STARFIELD_APERTURE_RADIUS_PC;
      triggerHydrationRef.current?.(fx, fy, fz, apertureRadius);
    });

    if (Number.isNaN(lastXRef.current)) {
      lastXRef.current = scratchPosRef.current[0];
      lastYRef.current = scratchPosRef.current[1];
      lastZRef.current = scratchPosRef.current[2];
      useActiveStarsStore.getState().setHydrating();
      void resolvedManager.updateCameraPosition(scratchPosRef.current);
    }

    return () => {
      unsubscribe();
      lastXRef.current = Number.NaN;
      lastYRef.current = Number.NaN;
      lastZRef.current = Number.NaN;
      lastHydratedXRef.current = Number.NaN;
      lastHydratedYRef.current = Number.NaN;
      lastHydratedZRef.current = Number.NaN;
      lastHydratedRadiusRef.current = Number.NaN;
      hydratingRef.current = false;
      pendingHydrationRef.current = false;
      hasNotifiedHydrationRef.current = false;
    };
  }, [manager, scratchPosRef, invalidate]);

  useFrame(({ camera }) => {
    const resolvedManager = manager ?? internalManagerRef.current;
    if (!resolvedManager) return;

    const focusPoint = frameCtx?.frameRef?.current?.focusPoint;
    const fx = focusPoint ? focusPoint.x : (Number.isNaN(lastXRef.current) ? 0 : lastXRef.current);
    const fy = focusPoint ? focusPoint.y : (Number.isNaN(lastYRef.current) ? 0 : lastYRef.current);
    const fz = focusPoint ? focusPoint.z : (Number.isNaN(lastZRef.current) ? 0 : lastZRef.current);
    const apertureRadius = frameCtx?.frameRef?.current?.apertureRadius ?? DEFAULT_STARFIELD_APERTURE_RADIUS_PC;
    if (!Number.isFinite(fx) || !Number.isFinite(fy) || !Number.isFinite(fz) || !Number.isFinite(apertureRadius)) return;
    const mat = materialRef.current;
    if (mat) {
      mat.uniforms.uFocusCenter.value.set(fx, fy, fz);
      mat.uniforms.uApertureRadius.value = apertureRadius;
      mat.uniforms.uHorizonRadius.value = computeStarfieldHorizonRadius(apertureRadius);
      mat.uniforms.uCameraPos.value.set(camera.position.x, camera.position.y, camera.position.z);
    }

    const stepDx = fx - prevFrameXRef.current;
    const stepDy = fy - prevFrameYRef.current;
    const stepDz = fz - prevFrameZRef.current;
    const stepSq = stepDx * stepDx + stepDy * stepDy + stepDz * stepDz;
    const stepRad = Math.abs(apertureRadius - prevFrameRadiusRef.current);

    prevFrameXRef.current = fx;
    prevFrameYRef.current = fy;
    prevFrameZRef.current = fz;
    prevFrameRadiusRef.current = apertureRadius;

    if (!Number.isFinite(stepSq) || (stepSq <= 0.0004 && (!Number.isFinite(stepRad) || stepRad <= 0.01))) {
      settledFramesRef.current += 1;
    } else {
      settledFramesRef.current = 0;
    }

    const lx = lastXRef.current;
    const ly = lastYRef.current;
    const lz = lastZRef.current;

    const dx = fx - lx;
    const dy = fy - ly;
    const dz = fz - lz;
    const distSq = dx * dx + dy * dy + dz * dz;

    if (!Number.isFinite(distSq) || distSq > 4.0) {
      lastXRef.current = fx;
      lastYRef.current = fy;
      lastZRef.current = fz;

      scratchPosRef.current[0] = fx;
      scratchPosRef.current[1] = fy;
      scratchPosRef.current[2] = fz;
      void resolvedManager.updateCameraPosition(scratchPosRef.current);
    }

    const hx = lastHydratedXRef.current;
    const hy = lastHydratedYRef.current;
    const hz = lastHydratedZRef.current;
    const hr = lastHydratedRadiusRef.current;

    const hdx = fx - hx;
    const hdy = fy - hy;
    const hdz = fz - hz;
    const hDistSq = hdx * hdx + hdy * hdy + hdz * hdz;
    const rDiff = Math.abs(apertureRadius - hr);

    if (!Number.isFinite(hDistSq) || hDistSq > 0.25 || !Number.isFinite(rDiff) || rDiff > 0.25) {
      if (
        !Number.isFinite(hDistSq) ||
        !Number.isFinite(rDiff) ||
        settledFramesRef.current >= 3 ||
        performance.now() - lastHydrationTimeRef.current >= 1200
      ) {
        triggerHydration(fx, fy, fz, apertureRadius);
      } else {
        invalidate();
      }
    }

    const uploaded = resolvedManager.processFrameUploads();
    const hasPending =
      typeof resolvedManager.hasPendingUploads === 'function' &&
      resolvedManager.hasPendingUploads();
    if (uploaded.length > 0 || hasPending) {
      invalidate();
    }
  });

  return <group ref={groupRef} name="galactic-sector-point-cloud" />;
}
