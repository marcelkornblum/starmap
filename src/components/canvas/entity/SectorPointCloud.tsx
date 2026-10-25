import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useThreeTokenStore } from '../../../stores/useThreeTokenStore';
import { useSpatialFrameSafe } from '../instrument/SpatialFrameProvider';
import { useLazyRef } from '../../../hooks/useLazyRef';
import {
  SectorStreamingManager,
  createSceneSectorPointsFactory,
} from '../../../services/sectorStreamingService';
import { InstrumentHydrationBridge } from '../../../services/instrumentHydrationService';
import type { SystemSummaryNode } from '../../../types/astro';

export interface SectorPointCloudProps {
  readonly manager?: SectorStreamingManager;
  readonly pointSize?: number;
  readonly pointOpacity?: number;
  readonly onHydratedSummariesChange?: (summaries: readonly SystemSummaryNode[]) => void;
}

/**
 * SectorPointCloud: Hardware-budgeted spatial starfield point cloud.
 * Streams 16-byte binary sector partitions with asynchronous GPU uploading,
 * LRU RAM caching, and zero-allocation frame updates.
 */
export function SectorPointCloud({
  manager,
  pointSize = 2.0,
  pointOpacity = 0.85,
  onHydratedSummariesChange,
}: SectorPointCloudProps) {
  const reticleBracketColor = useThreeTokenStore((s) => s.tokens.reticleBracketColor);
  const frameCtx = useSpatialFrameSafe();
  const groupRef = useRef<THREE.Group>(null);

  const material = useMemo(() => {
    return new THREE.PointsMaterial({
      size: 2.0,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
  }, []);

  useEffect(() => {
    material.size = pointSize;
    material.opacity = pointOpacity;
    material.needsUpdate = true;
  }, [material, pointSize, pointOpacity]);

  useEffect(() => {
    material.color.copy(reticleBracketColor);
  }, [material, reticleBracketColor]);

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

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

  const lastXRef = useRef(Number.NaN);
  const lastYRef = useRef(Number.NaN);
  const lastZRef = useRef(Number.NaN);
  const scratchPosRef = useLazyRef<[number, number, number]>(() => [0, 0, 0]);

  useEffect(() => {
    if (!resolvedManager) return;

    const handleSectorsChanged = async () => {
      const queryInputs = resolvedManager.getActiveSectorQueryInputs();
      const pos: [number, number, number] = [
        scratchPosRef.current[0],
        scratchPosRef.current[1],
        scratchPosRef.current[2],
      ];
      const apertureRadius = frameCtx?.frameRef?.current?.apertureRadius ?? 15.0;
      const state = await hydrationBridge.updateInstrumentPerimeter(
        queryInputs,
        pos,
        apertureRadius,
      );
      onSummariesRef.current?.(state.activeSummaries);
    };

    const unsubscribe = resolvedManager.subscribe(() => {
      void handleSectorsChanged();
    });

    if (Number.isNaN(lastXRef.current)) {
      void resolvedManager.updateCameraPosition([
        scratchPosRef.current[0],
        scratchPosRef.current[1],
        scratchPosRef.current[2],
      ]);
    }

    return () => {
      unsubscribe();
    };
  }, [resolvedManager, hydrationBridge, scratchPosRef, frameCtx]);

  useFrame(({ camera }) => {
    if (!resolvedManager) return;

    const focusPoint = frameCtx?.frameRef?.current?.focusPoint ?? camera.position;
    const fx = focusPoint.x;
    const fy = focusPoint.y;
    const fz = focusPoint.z;

    const lx = lastXRef.current;
    const ly = lastYRef.current;
    const lz = lastZRef.current;

    const dx = fx - lx;
    const dy = fy - ly;
    const dz = fz - lz;
    const distSq = dx * dx + dy * dy + dz * dz;

    if (Number.isNaN(distSq) || distSq > 16.0) {
      lastXRef.current = fx;
      lastYRef.current = fy;
      lastZRef.current = fz;

      const pos = scratchPosRef.current;
      pos[0] = fx;
      pos[1] = fy;
      pos[2] = fz;

      void resolvedManager.updateCameraPosition(pos);
    }

    resolvedManager.processFrameUploads();
  });

  return <group ref={groupRef} name="galactic-sector-point-cloud" />;
}
