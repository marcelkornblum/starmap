import { useCallback, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
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
  STARFIELD_DEFAULT_APERTURE_RADIUS,
  computeStarfieldHorizonRadius,
  StarfieldPointsMaterial,
  createStarfieldPointsMaterial,
} from './sectorPointCloudShaders';

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
  const groupRef = useRef<THREE.Group>(null);

  const material = useMemo(() => {
    return createStarfieldPointsMaterial();
  }, []);

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  useEffect(() => {
    material.uniforms.uPointSize.value = pointSize;
    material.uniforms.uBaseOpacity.value = pointOpacity;
    material.uniforms.uActivePointSize.value = activePointSize;
  }, [material, pointSize, pointOpacity, activePointSize]);

  useEffect(() => {
    material.uniforms.uColor.value.set(reticleBracketColor);
  }, [material, reticleBracketColor]);

  const targetRef = useRef<{ group: THREE.Group | null; material: THREE.Material | null }>({
    group: null,
    material: null,
  });

  useEffect(() => {
    targetRef.current.group = groupRef.current;
    targetRef.current.material = material;
  }, [material]);

  const internalManager = useMemo(() => {
    if (manager) return null;
    return new SectorStreamingManager({
      gpuResourceFactory: createSceneSectorPointsFactory(() => targetRef.current),
    });
  }, [manager]);

  useEffect(() => {
    return () => {
      internalManager?.dispose();
    };
  }, [internalManager]);

  const resolvedManager = manager ?? internalManager;

  const hydrationBridge = useMemo(() => new InstrumentHydrationBridge(), []);

  useEffect(() => {
    return () => {
      hydrationBridge.dispose();
    };
  }, [hydrationBridge]);

  const onSummariesRef = useRef(onHydratedSummariesChange);
  useEffect(() => {
    onSummariesRef.current = onHydratedSummariesChange;
  }, [onHydratedSummariesChange]);

  const frameCtxRef = useRef(frameCtx);
  useEffect(() => {
    frameCtxRef.current = frameCtx;
  }, [frameCtx]);

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

  const triggerHydrationRef = useRef<((fx: number, fy: number, fz: number, apertureRadius: number) => void) | null>(null);

  const triggerHydration = useCallback(
    (fx: number, fy: number, fz: number, apertureRadius: number) => {
      if (!resolvedManager) return;
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
      lastHydratedXRef.current = fx;
      lastHydratedYRef.current = fy;
      lastHydratedZRef.current = fz;
      lastHydratedRadiusRef.current = apertureRadius;

      const queryInputs = resolvedManager.getActiveSectorQueryInputs();
      // querySectorsWithinInstrumentSphere reads coordinates synchronously on entry,
      // and hydratingRef.current guarantees exclusive single-flight execution.
      scratchPosRef.current[0] = fx;
      scratchPosRef.current[1] = fy;
      scratchPosRef.current[2] = fz;

      void hydrationBridge
        .updateInstrumentPerimeter(queryInputs, scratchPosRef.current, apertureRadius)
        .then((state) => {
          hydratingRef.current = false;
          onSummariesRef.current?.(state.activeSummaries, [fx, fy, fz]);
          if (pendingHydrationRef.current) {
            pendingHydrationRef.current = false;
            const currentFocus = frameCtxRef.current?.frameRef?.current?.focusPoint;
            const currentFx = currentFocus ? currentFocus.x : lastHydratedXRef.current;
            const currentFy = currentFocus ? currentFocus.y : lastHydratedYRef.current;
            const currentFz = currentFocus ? currentFocus.z : lastHydratedZRef.current;
            const currentRadius = frameCtxRef.current?.frameRef?.current?.apertureRadius ?? 15.0;
            triggerHydrationRef.current?.(currentFx, currentFy, currentFz, currentRadius);
          }
        })
        .catch(() => {
          hydratingRef.current = false;
        });
    },
    [resolvedManager, hydrationBridge, scratchPosRef],
  );
  useEffect(() => {
    triggerHydrationRef.current = triggerHydration;
  }, [triggerHydration]);

  useEffect(() => {
    if (!resolvedManager) return;

    const unsubscribe = resolvedManager.subscribe(() => {
      const focus = frameCtxRef.current?.frameRef?.current?.focusPoint;
      const fx = focus ? focus.x : (Number.isNaN(lastXRef.current) ? 0 : lastXRef.current);
      const fy = focus ? focus.y : (Number.isNaN(lastYRef.current) ? 0 : lastYRef.current);
      const fz = focus ? focus.z : (Number.isNaN(lastZRef.current) ? 0 : lastZRef.current);
      const apertureRadius = frameCtxRef.current?.frameRef?.current?.apertureRadius ?? 15.0;
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
    };
  }, [resolvedManager, hydrationBridge, scratchPosRef]);

  useFrame(({ camera }) => {
    if (!resolvedManager) return;

    const focusPoint = frameCtx?.frameRef?.current?.focusPoint;
    const fx = focusPoint ? focusPoint.x : (Number.isNaN(lastXRef.current) ? 0 : lastXRef.current);
    const fy = focusPoint ? focusPoint.y : (Number.isNaN(lastYRef.current) ? 0 : lastYRef.current);
    const fz = focusPoint ? focusPoint.z : (Number.isNaN(lastZRef.current) ? 0 : lastZRef.current);
    const apertureRadius = frameCtx?.frameRef?.current?.apertureRadius ?? 15.0;

    material.uniforms.uFocusCenter.value.set(fx, fy, fz);
    material.uniforms.uApertureRadius.value = apertureRadius;
    material.uniforms.uHorizonRadius.value = computeStarfieldHorizonRadius(apertureRadius);
    material.uniforms.uCameraPos.value.set(
      camera.position.x,
      camera.position.y,
      camera.position.z,
    );

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
      triggerHydration(fx, fy, fz, apertureRadius);
    }

    resolvedManager.processFrameUploads();
  });

  return <group ref={groupRef} name="galactic-sector-point-cloud" />;
}
